'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  PencilIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage } from '@/components/ui';
import { getAdminQuoteById, sendQuote, deleteQuote, duplicateQuote, Quote, QuoteStatus } from '@/lib/api/quotes';
import { convertQuoteToOrder } from '@/lib/api/orders';

const statusColors: Record<QuoteStatus, string> = {
  draft: 'bg-neutral-500/20 text-neutral-400 border-neutral-500',
  sent: 'bg-cmyk-cyan/20 text-cmyk-cyan border-cmyk-cyan',
  viewed: 'bg-purple-500/20 text-purple-400 border-purple-500',
  accepted: 'bg-green-500/20 text-green-400 border-green-500',
  rejected: 'bg-red-500/20 text-red-400 border-red-500',
  expired: 'bg-cmyk-yellow/20 text-cmyk-yellow border-cmyk-yellow',
  changes_requested: 'bg-orange-500/20 text-orange-400 border-orange-500',
  converted: 'bg-blue-500/20 text-blue-400 border-blue-500',
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  changes_requested: 'Cambios Solicitados',
  converted: 'Convertida a Pedido',
};

const statusIcons: Record<QuoteStatus, React.ComponentType<{ className?: string }>> = {
  draft: PencilIcon,
  sent: PaperAirplaneIcon,
  viewed: EyeIcon,
  accepted: CheckCircleIcon,
  rejected: XCircleIcon,
  expired: ClockIcon,
  changes_requested: PencilIcon,
  converted: ShoppingCartIcon,
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const quoteId = params.id as string;
  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/dashboard/cotizaciones/${quoteId}`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale, quoteId]);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId || !isAuthenticated || !isSalesOrAdmin) return;

      setIsLoading(true);
      try {
        const data = await getAdminQuoteById(quoteId);
        setQuote(data);
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast.error('Error al cargar la cotizacion');
        router.push(`/${locale}/dashboard/cotizaciones`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId, isAuthenticated, isSalesOrAdmin, router, locale]);

  const handleSendQuote = async () => {
    if (!quote) return;

    setIsSending(true);
    try {
      const updated = await sendQuote(quote.id) as Quote & { email_sent?: boolean; email_error?: string };
      setQuote(updated);

      if (updated.email_sent) {
        toast.success(`Cotizacion enviada al cliente (${quote.customer_email})`);
      } else if (updated.email_error) {
        toast.error(`Estado actualizado pero error al enviar email: ${updated.email_error}`);
      } else {
        toast.success('Cotizacion marcada como enviada');
      }
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Error al enviar la cotizacion');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!quote) return;

    if (!confirm('¿Estas seguro de eliminar esta cotizacion? Esta accion no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteQuote(quote.id);
      toast.success('Cotizacion eliminada');
      router.push(`/${locale}/dashboard/cotizaciones`);
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Error al eliminar la cotizacion');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateQuote = async () => {
    if (!quote) return;

    setIsDuplicating(true);
    try {
      const newQuote = await duplicateQuote(quote.id);
      toast.success('Cotizacion duplicada');
      router.push(`/${locale}/dashboard/cotizaciones/${newQuote.id}`);
    } catch (error) {
      console.error('Error duplicating quote:', error);
      toast.error('Error al duplicar la cotizacion');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!quote) return;

    if (!confirm('¿Convertir esta cotización en un pedido? Se creará un pedido nuevo con los conceptos de la cotización.')) {
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertQuoteToOrder(quote.id, { payment_method: 'bank_transfer' });
      toast.success('Pedido creado exitosamente');
      // Navigate to the new order detail
      const order = result.order;
      router.push(`/${locale}/dashboard/pedidos/${order.id}`);
    } catch (error: unknown) {
      console.error('Error converting quote:', error);
      const errMsg = error && typeof error === 'object' && 'message' in error 
        ? (error as { message: string }).message 
        : 'Error al convertir la cotización en pedido';
      toast.error(errMsg);
    } finally {
      setIsConverting(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(amount) || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando cotizacion..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin || !quote) {
    return null;
  }

  const StatusIcon = statusIcons[quote.status];

  return (
    <div className="max-w-6xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/dashboard/cotizaciones`}
              className="p-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{quote.quote_number}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[quote.status]}`}>
                  <StatusIcon className="h-4 w-4" />
                  {statusLabels[quote.status]}
                </span>
              </div>
              <p className="text-neutral-400 mt-1">
                Creada el {formatDate(quote.created_at)}
                {quote.created_by_name && ` por ${quote.created_by_name}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {quote.status === 'draft' && (
              <>
                <Link href={`/${locale}/dashboard/cotizaciones/${quote.id}/editar`}>
                  <Button variant="outline" leftIcon={<PencilIcon className="h-4 w-4" />}>
                    Editar
                  </Button>
                </Link>
                <Button
                  onClick={handleSendQuote}
                  disabled={isSending}
                  leftIcon={<PaperAirplaneIcon className="h-4 w-4" />}
                >
                  {isSending ? 'Enviando...' : 'Enviar al cliente'}
                </Button>
              </>
            )}
            {quote.status === 'accepted' && (
              <Button
                onClick={handleConvertToOrder}
                disabled={isConverting}
                leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isConverting ? 'Convirtiendo...' : 'Convertir a Pedido'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDuplicateQuote}
              disabled={isDuplicating}
              leftIcon={<DocumentDuplicateIcon className="h-4 w-4" />}
            >
              {isDuplicating ? 'Duplicando...' : 'Duplicar'}
            </Button>
            {quote.pdf_file && (
              <a href={quote.pdf_file} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" leftIcon={<PrinterIcon className="h-4 w-4" />}>
                  Ver PDF
                </Button>
              </a>
            )}
            {quote.status === 'draft' && (
              <Button
                variant="outline"
                onClick={handleDeleteQuote}
                disabled={isDeleting}
                className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                leftIcon={<TrashIcon className="h-4 w-4" />}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Datos del Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-neutral-500 text-sm">Nombre</p>
                  <p className="text-white font-medium">{quote.customer_name}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Email</p>
                  <p className="text-white">{quote.customer_email}</p>
                </div>
                {quote.customer_company && (
                  <div>
                    <p className="text-neutral-500 text-sm">Empresa</p>
                    <p className="text-white">{quote.customer_company}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Line Items */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Conceptos</h2>
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
                        <td className="py-3 pr-4 text-right text-white">{formatCurrency(line.unit_price)}</td>
                        <td className="py-3 text-right text-white font-medium">{formatCurrency(line.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t border-neutral-700 space-y-2">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>IVA ({Number(quote.tax_rate) * 100}%)</span>
                  <span>{formatCurrency(quote.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-neutral-700">
                  <span>Total</span>
                  <span className="text-cmyk-cyan">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </Card>

            {/* Terms */}
            {quote.terms && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Terminos y Condiciones</h2>
                <p className="text-neutral-300 whitespace-pre-wrap">{quote.terms}</p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Validity */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Estado</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-neutral-500 text-sm">Valida hasta</p>
                  <p className={`font-medium ${quote.is_expired ? 'text-red-400' : 'text-white'}`}>
                    {formatDate(quote.valid_until)}
                    {quote.is_expired && ' (Expirada)'}
                  </p>
                </div>
                {quote.sent_at && (
                  <div>
                    <p className="text-neutral-500 text-sm">Enviada</p>
                    <p className="text-white">{formatDate(quote.sent_at)}</p>
                  </div>
                )}
                {quote.viewed_at && (
                  <div>
                    <p className="text-neutral-500 text-sm">Vista por cliente</p>
                    <p className="text-white">{formatDate(quote.viewed_at)}</p>
                  </div>
                )}
                {quote.accepted_at && (
                  <div>
                    <p className="text-neutral-500 text-sm">Aceptada</p>
                    <p className="text-green-400">{formatDate(quote.accepted_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-neutral-500 text-sm">Vistas</p>
                  <p className="text-white">{quote.view_count} veces</p>
                </div>
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Pago</h2>
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
                      {quote.deposit_percentage}% ({formatCurrency(quote.deposit_amount || 0)})
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

            {/* Delivery */}
            {(quote.delivery_time_text || quote.estimated_delivery_date) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Entrega</h2>
                <div className="space-y-4">
                  {quote.delivery_time_text && (
                    <div>
                      <p className="text-neutral-500 text-sm">Tiempo de entrega</p>
                      <p className="text-white">{quote.delivery_time_text}</p>
                    </div>
                  )}
                  {quote.estimated_delivery_date && (
                    <div>
                      <p className="text-neutral-500 text-sm">Fecha estimada</p>
                      <p className="text-white">{formatDate(quote.estimated_delivery_date)}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Internal Notes */}
            {quote.internal_notes && (
              <Card className="p-6 border-yellow-500/30">
                <h2 className="text-lg font-semibold text-yellow-400 mb-4">Notas Internas</h2>
                <p className="text-neutral-300 whitespace-pre-wrap">{quote.internal_notes}</p>
              </Card>
            )}

            {/* Related Request */}
            {quote.quote_request && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Solicitud Relacionada</h2>
                <Link
                  href={`/${locale}/dashboard/solicitudes/${quote.quote_request.id}`}
                  className="text-cmyk-cyan hover:underline"
                >
                  {quote.quote_request.request_number}
                </Link>
              </Card>
            )}
          </div>
        </div>
    </div>
  );
}
