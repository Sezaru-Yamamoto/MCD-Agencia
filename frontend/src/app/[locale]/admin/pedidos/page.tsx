'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

import { getAdminOrders, AdminOrder } from '@/lib/api/admin';
import { Card, Badge, Button, Input, Select, Pagination, LoadingPage } from '@/components/ui';
import { formatPrice, formatDate, cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'pending_payment', label: 'Pendiente de pago' },
  { value: 'paid', label: 'Pagado' },
  { value: 'partially_paid', label: 'Pago parcial' },
  { value: 'in_production', label: 'En producción' },
  { value: 'ready', label: 'Listo' },
  { value: 'in_delivery', label: 'En camino' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const getStatusVariant = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    completed: 'success',
    paid: 'success',
    partially_paid: 'info',
    in_production: 'info',
    ready: 'info',
    in_delivery: 'warning',
    pending_payment: 'warning',
    draft: 'default',
    cancelled: 'error',
    refunded: 'error',
  };
  return variants[status] || 'default';
};

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [filters, setFilters] = useState({
    status: initialStatus,
    search: '',
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => getAdminOrders(filters),
  });

  const orders = data?.results || [];
  const totalPages = data?.total_pages || Math.ceil((data?.count || 0) / 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-neutral-400">
            Gestiona los pedidos de tus clientes
          </p>
        </div>

        <Button
          variant="outline"
          leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
        >
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por número de orden o cliente..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <Select
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
            options={STATUS_OPTIONS}
            className="w-48"
          />
        </div>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <LoadingPage message="Cargando pedidos..." />
      ) : orders.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-neutral-400">No se encontraron pedidos</p>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Pedido
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Cliente
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Estado
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Total
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Fecha
                  </th>
                  <th className="text-right text-sm font-medium text-neutral-400 py-3 px-4">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: AdminOrder) => (
                  <tr
                    key={order.id}
                    className="border-b border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="py-4 px-4">
                      <span className="text-white font-medium">
                        #{order.order_number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white">{order.customer.full_name}</p>
                        <p className="text-sm text-neutral-400">{order.customer.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status_display}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-medium">
                        {formatPrice(order.total)}
                      </span>
                      {!order.is_fully_paid && (
                        <p className="text-xs text-yellow-400">
                          Pendiente: {formatPrice(order.balance_due)}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-neutral-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link href={`/admin/pedidos/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="h-5 w-5" />
                        </Button>
                      </Link>
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
    </div>
  );
}
