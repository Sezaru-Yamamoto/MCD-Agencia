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
  PencilSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage, SuccessModal } from '@/components/ui';
import { SendConfirmationModal } from '@/components/quotes/SendConfirmationModal';
import {
  getAdminQuoteById,
  sendQuote,
  deleteQuote,
  duplicateQuote,
  downloadQuotePdf,
  getQuoteResponses,
  getAdminChangeRequests,
  Quote,
  QuoteStatus,
  QuoteResponse,
  QuoteChangeRequest,
  ChangeRequestStatus,
} from '@/lib/api/quotes';
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

const changeRequestStatusColors: Record<ChangeRequestStatus, string> = {
  pending: 'bg-orange-500/20 text-orange-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

const changeRequestStatusLabels: Record<ChangeRequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const responseActionLabels: Record<string, string> = {
  view: 'Vista',
  accept: 'Aceptada',
  reject: 'Rechazada',
  change_request: 'Solicitud de cambio',
  comment: 'Comentario',
};

const responseActionColors: Record<string, string> = {
  view: 'text-purple-400',
  accept: 'text-green-400',
  reject: 'text-red-400',
  change_request: 'text-orange-400',
  comment: 'text-blue-400',
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [responses, setResponses] = useState<QuoteResponse[]>([]);
  const [changeRequests, setChangeRequests] = useState<QuoteChangeRequest[]>([]);

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
        const [data, responsesData, crData] = await Promise.all([
          getAdminQuoteById(quoteId),
          getQuoteResponses(quoteId).catch(() => []),
          getAdminChangeRequests({ quote: quoteId }).catch(() => ({ results: [] })),
        ]);
        setQuote(data);
        setResponses(responsesData);
        setChangeRequests((crData as { results: QuoteChangeRequest[] }).results || []);
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

  // -- Modal state --
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error'; redirectTo?: string }>({ open: false, title: '', message: '', variant: 'success' });

  const handleSendQuote = async () => {
    if (!quote) return;

    setIsSending(true);
    try {
      const updated = await sendQuote(quote.id) as Quote & { email_sent?: boolean; email_error?: string };
      setQuote(updated);
      setModal({ open: true, title: 'Cotización enviada', message: `La cotización se envió al cliente (${quote.customer_email}).`, variant: 'success' });
    } catch (error) {
      console.error('Error sending quote:', error);
      setModal({ open: true, title: 'Error', message: 'No se pudo enviar la cotización.', variant: 'error' });
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
      setModal({ open: true, title: 'Cotización eliminada', message: 'La cotización fue eliminada.', variant: 'success', redirectTo: `/${locale}/dashboard/cotizaciones` });
    } catch (error) {
      console.error('Error deleting quote:', error);
      setModal({ open: true, title: 'Error', message: 'No se pudo eliminar la cotización.', variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateQuote = async () => {
    if (!quote) return;

    setIsDuplicating(true);
    try {
      const newQuote = await duplicateQuote(quote.id);
      setModal({ open: true, title: 'Cotización duplicada', message: 'Se creó una copia de la cotización.', variant: 'success', redirectTo: `/${locale}/dashboard/cotizaciones/${newQuote.id}` });
    } catch (error) {
      console.error('Error duplicating quote:', error);
      setModal({ open: true, title: 'Error', message: 'No se pudo duplicar la cotización.', variant: 'error' });
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
      const order = result.order;
      setModal({ open: true, title: 'Pedido creado', message: 'El pedido fue creado exitosamente a partir de la cotización.', variant: 'success', redirectTo: `/${locale}/dashboard/pedidos/${order.id}` });
    } catch (error: unknown) {
      console.error('Error converting quote:', error);
      const errMsg = error && typeof error === 'object' && 'message' in error 
        ? (error as { message: string }).message 
        : 'Error al convertir la cotización en pedido';
      setModal({ open: true, title: 'Error', message: errMsg, variant: 'error' });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await downloadQuotePdf(quote.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion_${quote.quote_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setModal({ open: true, title: 'Error al descargar PDF', message: msg, variant: 'error' });
    } finally {
      setIsDownloadingPdf(false);
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
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
                {quote.version > 1 && (
                  <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
                    v{quote.version}
                  </span>
                )}
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
                  onClick={() => setShowSendConfirm(true)}
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
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                leftIcon={<PrinterIcon className="h-4 w-4" />}
              >
                {isDownloadingPdf ? 'Descargando...' : 'Ver PDF'}
              </Button>
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

            {/* Change Requests Section */}
            {changeRequests.length > 0 && (
              <Card className="p-6 border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <PencilSquareIcon className="h-5 w-5 text-orange-400" />
                    Solicitudes de Cambio
                    {changeRequests.filter(cr => cr.status === 'pending').length > 0 && (
                      <span className="bg-orange-500/20 text-orange-400 text-xs font-medium px-2 py-0.5 rounded-full">
                        {changeRequests.filter(cr => cr.status === 'pending').length} pendiente{changeRequests.filter(cr => cr.status === 'pending').length > 1 ? 's' : ''}
                      </span>
                    )}
                  </h2>
                </div>
                <div className="space-y-3">
                  {changeRequests.map((cr) => (
                    <Link
                      key={cr.id}
                      href={`/${locale}/dashboard/cotizaciones/${quoteId}/cambios/${cr.id}`}
                      className={`block p-4 rounded-lg border transition-colors ${
                        cr.status === 'pending'
                          ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                          : cr.status === 'approved'
                          ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10'
                          : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${changeRequestStatusColors[cr.status]}`}>
                              {cr.status === 'pending' && <ClockIcon className="h-3 w-3" />}
                              {cr.status === 'approved' && <CheckCircleIcon className="h-3 w-3" />}
                              {cr.status === 'rejected' && <XCircleIcon className="h-3 w-3" />}
                              {changeRequestStatusLabels[cr.status]}
                            </span>
                            <span className="text-neutral-500 text-xs">
                              {new Date(cr.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {cr.customer_comments && (
                            <p className="text-neutral-300 text-sm mt-1">
                              &ldquo;{cr.customer_comments}&rdquo;
                            </p>
                          )}
                          {cr.changes_summary && (
                            <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                              {cr.changes_summary.modified > 0 && (
                                <span className="flex items-center gap-1">
                                  <ArrowPathIcon className="h-3 w-3 text-yellow-400" />
                                  {cr.changes_summary.modified} modificada{cr.changes_summary.modified > 1 ? 's' : ''}
                                </span>
                              )}
                              {cr.changes_summary.added > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckCircleIcon className="h-3 w-3 text-green-400" />
                                  {cr.changes_summary.added} nueva{cr.changes_summary.added > 1 ? 's' : ''}
                                </span>
                              )}
                              {cr.changes_summary.deleted > 0 && (
                                <span className="flex items-center gap-1">
                                  <XCircleIcon className="h-3 w-3 text-red-400" />
                                  {cr.changes_summary.deleted} eliminada{cr.changes_summary.deleted > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                          {cr.reviewed_by_name && (
                            <p className="text-neutral-500 text-xs mt-2">
                              Revisada por {cr.reviewed_by_name}
                              {cr.reviewed_at && ` el ${new Date(cr.reviewed_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                            </p>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          cr.status === 'pending' ? 'text-orange-400' : 'text-neutral-400'
                        }`}>
                          {cr.status === 'pending' ? 'Revisar →' : 'Ver →'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Activity History */}
            {responses.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-neutral-400" />
                  Historial de Actividad
                </h2>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-neutral-700"></div>

                  <div className="space-y-4">
                    {/* Version badge at top if version > 1 */}
                    {quote.version > 1 && (
                      <div className="relative flex items-start gap-4">
                        <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-purple-500/20 rounded-full border border-purple-500/40">
                          <span className="text-purple-400 text-xs font-bold">v{quote.version}</span>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-purple-400 text-sm font-medium">
                            Versión actual: v{quote.version}
                          </p>
                          <p className="text-neutral-500 text-xs">
                            La cotización ha sido modificada {quote.version - 1} {quote.version - 1 === 1 ? 'vez' : 'veces'}
                          </p>
                        </div>
                      </div>
                    )}

                    {responses.map((response) => (
                      <div key={response.id} className="relative flex items-start gap-4">
                        <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border ${
                          response.action === 'accept' ? 'bg-green-500/20 border-green-500/40' :
                          response.action === 'reject' ? 'bg-red-500/20 border-red-500/40' :
                          response.action === 'change_request' ? 'bg-orange-500/20 border-orange-500/40' :
                          response.action === 'view' ? 'bg-purple-500/20 border-purple-500/40' :
                          'bg-blue-500/20 border-blue-500/40'
                        }`}>
                          {response.action === 'accept' && <CheckCircleIcon className="h-3.5 w-3.5 text-green-400" />}
                          {response.action === 'reject' && <XCircleIcon className="h-3.5 w-3.5 text-red-400" />}
                          {response.action === 'change_request' && <PencilSquareIcon className="h-3.5 w-3.5 text-orange-400" />}
                          {response.action === 'view' && <EyeIcon className="h-3.5 w-3.5 text-purple-400" />}
                          {response.action === 'comment' && <PencilIcon className="h-3.5 w-3.5 text-blue-400" />}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className={`text-sm font-medium ${responseActionColors[response.action] || 'text-neutral-400'}`}>
                            {responseActionLabels[response.action] || response.action_display}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                            <span>
                              {response.responded_by_name || response.guest_name || 'Cliente'}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(response.created_at).toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {response.comment && (
                            <p className="text-neutral-300 text-sm mt-1 bg-neutral-800/50 rounded p-2">
                              &ldquo;{response.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Created event */}
                    <div className="relative flex items-start gap-4">
                      <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-cmyk-cyan/20 rounded-full border border-cmyk-cyan/40">
                        <PaperAirplaneIcon className="h-3.5 w-3.5 text-cmyk-cyan" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-cmyk-cyan text-sm font-medium">
                          Cotización creada
                        </p>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                          {quote.created_by_name && <span>{quote.created_by_name}</span>}
                          {quote.created_by_name && <span>•</span>}
                          <span>
                            {new Date(quote.created_at).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Validity */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Estado</h2>
              <div className="space-y-4">
                {quote.version > 1 && (
                  <div>
                    <p className="text-neutral-500 text-sm">Versión</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">v{quote.version}</p>
                      <span className="text-neutral-500 text-xs">
                        ({quote.version - 1} {quote.version - 1 === 1 ? 'revisión' : 'revisiones'})
                      </span>
                    </div>
                  </div>
                )}
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

    {/* Send Confirmation Modal */}
    {quote && (
      <SendConfirmationModal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={() => {
          setShowSendConfirm(false);
          handleSendQuote();
        }}
        isLoading={isSending}
        customerName={quote.customer_name}
        customerEmail={quote.customer_email}
        lines={quote.lines || []}
        subtotal={quote.subtotal}
        taxAmount={quote.tax_amount}
        total={quote.total}
      />
    )}

    {/* Success/Error Modal */}
    <SuccessModal
      isOpen={modal.open}
      onClose={() => {
        setModal((m) => ({ ...m, open: false }));
        if (modal.variant === 'success' && modal.redirectTo) {
          router.push(modal.redirectTo);
        }
      }}
      title={modal.title}
      message={modal.message}
      variant={modal.variant}
    />
    </div>
  );
}
