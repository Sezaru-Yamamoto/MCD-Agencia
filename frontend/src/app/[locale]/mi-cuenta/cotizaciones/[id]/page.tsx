'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

import { getQuoteById, Quote } from '@/lib/api/quotes';
import { Card, Badge, Button, LoadingPage, Breadcrumb } from '@/components/ui';
import { formatPrice, formatDate, cn } from '@/lib/utils';

export default function CustomerQuoteDetailPage() {
  const params = useParams();
  const quoteId = params.id as string;

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuoteById(quoteId),
  });

  if (isLoading) {
    return <LoadingPage message="Cargando cotización..." />;
  }

  if (error || !quote) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="h-16 w-16 text-neutral-700 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-4">Cotización no encontrada</h2>
        <Link href="/mi-cuenta/cotizaciones">
          <Button>Volver a mis cotizaciones</Button>
        </Link>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    if (status === 'accepted') return 'success';
    if (status === 'rejected' || status === 'expired') return 'error';
    if (status === 'sent' || status === 'viewed') return 'info';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mi Cuenta', href: '/mi-cuenta' },
          { label: 'Cotizaciones', href: '/mi-cuenta/cotizaciones' },
          { label: `#${quote.quote_number}` },
        ]}
        showHome={false}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Cotización #{quote.quote_number}</h2>
          <p className="text-neutral-400">Recibida el {formatDate(quote.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(quote.status)} size="md">
            {quote.status_display}
          </Badge>
          {quote.is_expired && <Badge variant="error">Expirada</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Conceptos</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-neutral-500 text-sm border-b border-neutral-700">
                    <th className="pb-3 pr-4">Concepto</th>
                    <th className="pb-3 pr-4 text-right">Cant.</th>
                    <th className="pb-3 pr-4">Unidad</th>
                    <th className="pb-3 pr-4 text-right">P. Unit.</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {quote.lines?.map((line, index) => (
                    <tr key={line.id || index}>
                      <td className="py-3 pr-4">
                        <p className="text-white font-medium">{line.concept}</p>
                        {line.description && (
                          <p className="text-neutral-500 text-sm">{line.description}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-white">{line.quantity}</td>
                      <td className="py-3 pr-4 text-neutral-400">{line.unit}</td>
                      <td className="py-3 pr-4 text-right text-white">{formatPrice(line.unit_price)}</td>
                      <td className="py-3 text-right text-white font-medium">{formatPrice(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-neutral-700 space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{formatPrice(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>IVA ({Number(quote.tax_rate) * 100}%)</span>
                <span>{formatPrice(quote.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-neutral-700">
                <span>Total</span>
                <span className="text-cyan-400">{formatPrice(quote.total)}</span>
              </div>
            </div>
          </Card>

          {/* Terms */}
          {quote.terms && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Términos y Condiciones</h3>
              <p className="text-neutral-300 whitespace-pre-wrap">{quote.terms}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Validity */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Información</h3>
            <div className="space-y-4">
              <div>
                <p className="text-neutral-500 text-sm">Versión</p>
                <p className="text-white">v{quote.version}</p>
              </div>
              {quote.valid_until && (
                <div>
                  <p className="text-neutral-500 text-sm">Válida hasta</p>
                  <p className={`font-medium ${quote.is_expired ? 'text-red-400' : 'text-white'}`}>
                    {formatDate(quote.valid_until)}
                    {quote.is_expired && ' (Expirada)'}
                  </p>
                </div>
              )}
              {quote.delivery_time_text && (
                <div>
                  <p className="text-neutral-500 text-sm">Tiempo de entrega</p>
                  <p className="text-white">{quote.delivery_time_text}</p>
                </div>
              )}
              {quote.estimated_delivery_date && (
                <div>
                  <p className="text-neutral-500 text-sm">Fecha estimada de entrega</p>
                  <p className="text-white">{formatDate(quote.estimated_delivery_date)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Pago</h3>
            <div className="space-y-4">
              <div>
                <p className="text-neutral-500 text-sm">Modo de pago</p>
                <p className="text-white">
                  {quote.payment_mode === 'FULL' ? 'Pago completo' : 'Anticipo permitido'}
                </p>
              </div>
              {quote.payment_mode === 'DEPOSIT_ALLOWED' && quote.deposit_percentage && (
                <div>
                  <p className="text-neutral-500 text-sm">Anticipo requerido</p>
                  <p className="text-white">
                    {quote.deposit_percentage}% ({formatPrice(quote.deposit_amount || '0')})
                  </p>
                </div>
              )}
              {quote.payment_conditions && (
                <div>
                  <p className="text-neutral-500 text-sm">Condiciones</p>
                  <p className="text-neutral-300">{quote.payment_conditions}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Acciones</h3>
            <div className="space-y-2">
              {quote.token && (
                <Link href={`/cotizacion/${quote.token}`} className="block">
                  <Button variant="outline" className="w-full" leftIcon={<EyeIcon className="h-4 w-4" />}>
                    Ver cotización completa
                  </Button>
                </Link>
              )}
              {quote.pdf_file && (
                <a href={quote.pdf_file} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full" leftIcon={<DocumentTextIcon className="h-4 w-4" />}>
                    Descargar PDF
                  </Button>
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
