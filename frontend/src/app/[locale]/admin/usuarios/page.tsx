'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { getAdminUsers, activateUser, deactivateUser, changeUserRole, AdminUser } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';
import { Card, Badge, Button, Input, Select, Pagination, LoadingPage, Modal } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';

interface Role {
  id: number;
  name: string;
  display_name: string;
}

// Only 3 roles: admin, sales, customer
const ROLE_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: 'customer', label: 'Cliente' },
  { value: 'sales', label: 'Ventas' },
  { value: 'admin', label: 'Administrador' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    role: '',
    is_active: '',
    search: '',
    page: 1,
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [userToPromote, setUserToPromote] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => getAdminUsers({
      ...filters,
      is_active: filters.is_active === '' ? undefined : filters.is_active === 'true',
    }),
  });

  // Fetch roles to get the sales role ID
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<{ results: Role[] }>('/users/roles/'),
  });

  const salesRole = rolesData?.results?.find((r) => r.name === 'sales');

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => {
      toast.success('Vendedor activado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Error al activar vendedor'),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      toast.success('Vendedor desactivado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Error al desactivar vendedor'),
  });

  const promoteToSalesMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      changeUserRole(userId, roleId),
    onSuccess: () => {
      toast.success('Usuario promovido a Vendedor');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowPromoteModal(false);
      setUserToPromote(null);
    },
    onError: () => toast.error('Error al cambiar rol'),
  });

  const handlePromoteToSales = () => {
    if (userToPromote && salesRole) {
      promoteToSalesMutation.mutate({
        userId: userToPromote.id,
        roleId: salesRole.id.toString(),
      });
    }
  };

  const users = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-neutral-400">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-yellow-400">
            <UserPlusIcon className="h-4 w-4 inline mr-2" />
            Para agregar vendedores: usa el botón <ArrowPathIcon className="h-4 w-4 inline mx-1" /> en un cliente registrado
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <Select
            value={filters.role}
            onChange={(value) => setFilters({ ...filters, role: value, page: 1 })}
            options={ROLE_OPTIONS}
            className="w-40"
          />
          <Select
            value={filters.is_active}
            onChange={(value) => setFilters({ ...filters, is_active: value, page: 1 })}
            options={STATUS_OPTIONS}
            className="w-32"
          />
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <LoadingPage message="Cargando usuarios..." />
      ) : users.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-neutral-400">No se encontraron usuarios</p>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Usuario
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Rol
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Estado
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Pedidos
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Registro
                  </th>
                  <th className="text-right text-sm font-medium text-neutral-400 py-3 px-4">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: AdminUser) => (
                  <tr
                    key={user.id}
                    className="border-b border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center text-white font-bold text-sm">
                          {getInitials(user.full_name || user.email)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.full_name}</p>
                          <p className="text-sm text-neutral-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={user.role?.name === 'admin' ? 'cyan' : user.role?.name === 'sales' ? 'warning' : 'default'}>
                        {user.role?.display_name || 'Cliente'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={user.is_active ? 'success' : 'error'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-neutral-400">
                      {user.orders_count}
                    </td>
                    <td className="py-4 px-4 text-neutral-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user.id)}
                          title="Ver detalles"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Button>

                        {/* Solo mostrar activar/desactivar para vendedores */}
                        {user.role?.name === 'sales' && (
                          user.is_active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateMutation.mutate(user.id)}
                              title="Desactivar vendedor"
                            >
                              <XCircleIcon className="h-5 w-5 text-red-400" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => activateMutation.mutate(user.id)}
                              title="Activar vendedor"
                            >
                              <CheckCircleIcon className="h-5 w-5 text-green-400" />
                            </Button>
                          )
                        )}

                        {/* Opción para promover cliente a vendedor */}
                        {user.role?.name === 'customer' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToPromote({ id: user.id, name: user.full_name || user.email });
                              setShowPromoteModal(true);
                            }}
                            title="Promover a Vendedor"
                          >
                            <ArrowPathIcon className="h-5 w-5 text-yellow-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          )}
        </>
      )}

      {/* Modal para promover a vendedor */}
      <Modal
        isOpen={showPromoteModal}
        onClose={() => {
          setShowPromoteModal(false);
          setUserToPromote(null);
        }}
        title="Promover a Vendedor"
      >
        <div className="space-y-4">
          <p className="text-neutral-300">
            ¿Estás seguro de que deseas promover a <strong className="text-white">{userToPromote?.name}</strong> al rol de Vendedor?
          </p>
          <p className="text-sm text-neutral-400">
            Esta acción le dará acceso al panel de ventas y la capacidad de gestionar cotizaciones y pedidos.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPromoteModal(false);
                setUserToPromote(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePromoteToSales}
              isLoading={promoteToSalesMutation.isPending}
            >
              Promover a Vendedor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
