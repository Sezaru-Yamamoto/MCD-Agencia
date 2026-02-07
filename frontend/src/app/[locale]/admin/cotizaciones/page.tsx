'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  EyeIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

import { getAdminQuoteRequests, AdminQuoteRequest } from '@/lib/api/admin';
import { Card, Badge, Button, Input, Select, Pagination, LoadingPage } from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Nueva' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'quote_sent', label: 'Cotización enviada' },
  { value: 'accepted', label: 'Aceptada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Expirada' },
];

const getStatusVariant = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    draft: 'warning',
    in_review: 'info',
    quote_sent: 'info',
    accepted: 'success',
    rejected: 'error',
    expired: 'error',
    converted: 'success',
  };
  return variants[status] || 'default';
};

export default function AdminQuotesPage() {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quote-requests', filters],
    queryFn: () => getAdminQuoteRequests(filters),
  });

  const requests = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Cotizaciones</h1>
        <p className="text-neutral-400">
          Gestiona las solicitudes de cotización
        </p>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, email o empresa..."
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

      {/* Requests Table */}
      {isLoading ? (
        <LoadingPage message="Cargando solicitudes..." />
      ) : requests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-neutral-400">No se encontraron solicitudes</p>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Solicitud
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Cliente
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Producto/Servicio
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Estado
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Asignado a
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
                {requests.map((request: AdminQuoteRequest) => (
                  <tr
                    key={request.id}
                    className="border-b border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="py-4 px-4">
                      <span className="text-white font-medium">
                        #{request.request_number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white">{request.customer_name}</p>
                        <p className="text-sm text-neutral-400">{request.customer_email}</p>
                        {request.customer_company && (
                          <p className="text-sm text-neutral-500">{request.customer_company}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {request.catalog_item ? (
                        <span className="text-white">{request.catalog_item.name}</span>
                      ) : (
                        <span className="text-neutral-500">No especificado</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={getStatusVariant(request.status)}>
                        {request.status_display}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      {request.assigned_to ? (
                        <span className="text-white">{request.assigned_to.full_name}</span>
                      ) : (
                        <span className="text-neutral-500">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-neutral-400">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/cotizaciones/${request.id}`}>
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-5 w-5" />
                          </Button>
                        </Link>
                        {request.status === 'pending' && (
                          <Button variant="ghost" size="sm" title="Asignar">
                            <UserPlusIcon className="h-5 w-5" />
                          </Button>
                        )}
                        {request.status === 'in_review' && (
                          <Button variant="ghost" size="sm" title="Enviar cotización">
                            <PaperAirplaneIcon className="h-5 w-5" />
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
    </div>
  );
}
