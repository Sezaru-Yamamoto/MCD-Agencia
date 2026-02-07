'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { getQuotes } from '@/lib/api/quotes';
import { Card, Badge, Button, Pagination, LoadingPage, Select } from '@/components/ui';
import { formatPrice, formatDate, cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'sent', label: 'Enviada' },
  { value: 'viewed', label: 'Vista' },
  { value: 'accepted', label: 'Aceptada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Expirada' },
];

export default function QuotesPage() {
  const [filters, setFilters] = useState({ status: '', page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => getQuotes(filters),
  });

  const quotes = data?.results || [];
  const totalPages = data?.total_pages || Math.ceil((data?.count || 0) / 10);

  if (isLoading) {
    return <LoadingPage message="Cargando cotizaciones..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Mis Cotizaciones</h2>
          <p className="text-neutral-400">Historial de cotizaciones recibidas</p>
        </div>

        <Select
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
          options={STATUS_OPTIONS}
          placeholder="Filtrar por estado"
          className="w-48"
        />
      </div>

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <Card className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No tienes cotizaciones</h3>
          <p className="text-neutral-400 mb-6">
            Solicita una cotización para tus proyectos personalizados
          </p>
          <Link href="/cotizar">
            <Button>Solicitar cotización</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-medium">
                      Cotización #{quote.quote_number}
                    </span>
                    <Badge
                      variant={
                        quote.status === 'accepted'
                          ? 'success'
                          : quote.status === 'rejected' || quote.status === 'expired'
                          ? 'error'
                          : quote.status === 'sent' || quote.status === 'viewed'
                          ? 'info'
                          : 'warning'
                      }
                    >
                      {quote.status_display}
                    </Badge>
                    {quote.is_expired && (
                      <Badge variant="error">Expirada</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                    <span>Creada: {formatDate(quote.created_at)}</span>
                    {quote.valid_until && (
                      <span>Válida hasta: {formatDate(quote.valid_until)}</span>
                    )}
                    <span className="text-cyan-400 font-medium">
                      {formatPrice(quote.total)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {quote.status === 'sent' && !quote.is_expired && (
                    <Link href={`/mi-cuenta/cotizaciones/${quote.id}/aceptar`}>
                      <Button size="sm">Aceptar</Button>
                    </Link>
                  )}
                  <Link href={`/mi-cuenta/cotizaciones/${quote.id}`}>
                    <Button variant="ghost" rightIcon={<ChevronRightIcon className="h-5 w-5" />}>
                      Ver detalle
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          )}
        </div>
      )}
    </div>
  );
}
