'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

import {
  getQuoteById,
  downloadQuotePdfByToken,
  acceptQuote,
  rejectQuote,
  requestQuoteChanges,
  Quote,
  SubmitChangeRequestData,
} from '@/lib/api/quotes';
import { Card, Badge, Button, LoadingPage, Breadcrumb } from '@/components/ui';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { DELIVERY_METHOD_LABELS, DELIVERY_METHOD_ICONS, type DeliveryMethod } from '@/lib/service-ids';
import SignaturePad from '@/components/ui/SignaturePad';
import QuoteChangeEditor from '@/components/quotes/QuoteChangeEditor';

export default function CustomerQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const quoteId = params.id as string;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [responseAction, setResponseAction] = useState<'accept' | 'reject' | null>(null);
  const [responseComment, setResponseComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChangeEditor, setShowChangeEditor] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');

  const { data: quote, isLoading, error, refetch } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuoteById(quoteId),
  });

  const handleDownloadPdf = async () => {
    if (!quote?.token || !quote?.quote_number) return;
    setIsDownloadingPdf(true);
    try {
      await downloadQuotePdfByToken(quote.token, quote.quote_number);
      toast.success('PDF descargado');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error('Error al descargar el PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleAccept = async () => {
    if (!quote) return;
    setIsSubmitting(true);
    try {
      await acceptQuote(quote.id, responseComment, signatureData, signatureName);
      setResponseAction(null);
      setResponseComment('');
      toast.success('¡Cotización aceptada exitosamente!');
      refetch();
    } catch (error) {
      const err = error as { message?: string; response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error || err.message || 'Error al aceptar la cotización';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!quote) return;
    if (!responseComment.trim()) {
      toast.error('Por favor indica el motivo del rechazo');
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectQuote(quote.id, responseComment);
      setResponseAction(null);
      setResponseComment('');
      toast.success('Cotización rechazada. Gracias por tu respuesta.');
      refetch();
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Error al rechazar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async (data: SubmitChangeRequestData) => {
    if (!quote?.token) return;
    setIsSubmitting(true);
    try {
      await requestQuoteChanges(quote.token, data);
      setShowChangeEditor(false);
      toast.success('Tu solicitud de cambios ha sido enviada. Te contactaremos pronto.');
      refetch();
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (status === 'changes_requested') return 'warning';
    return 'warning';
  };

  const canRespond = ['sent', 'viewed'].includes(quote.status) && !quote.is_expired;
  const isAccepted = quote.status === 'accepted';
  const isRejected = quote.status === 'rejected';
  const isChangesRequested = quote.status === 'changes_requested';

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

      {/* Status Banners */}
      {isAccepted && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
          <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-medium">Cotización Aceptada</p>
            {quote.accepted_at && (
              <p className="text-neutral-400 text-sm">Aceptada el {formatDate(quote.accepted_at)}</p>
            )}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Cotización Rechazada</p>
            {quote.customer_notes && (
              <p className="text-neutral-400 text-sm mt-1">{quote.customer_notes}</p>
            )}
          </div>
        </div>
      )}

      {isChangesRequested && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-medium">Cambios Solicitados</p>
            <p className="text-neutral-400 text-sm mt-1">
              Tu solicitud de cambios está siendo revisada. Te enviaremos una cotización actualizada pronto.
            </p>
          </div>
        </div>
      )}

      {quote.is_expired && !isAccepted && !isRejected && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
          <ClockIcon className="h-6 w-6 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-medium">Cotización Expirada</p>
            {quote.valid_until && (
              <p className="text-neutral-400 text-sm">
                Esta cotización venció el {formatDate(quote.valid_until)}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tus datos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cmyk-cyan/10">
                  <BuildingOfficeIcon className="h-5 w-5 text-cmyk-cyan" />
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Cliente</p>
                  <p className="text-white">{quote.customer_name}</p>
                  {quote.customer_company && (
                    <p className="text-neutral-400 text-sm">{quote.customer_company}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cmyk-cyan/10">
                  <EnvelopeIcon className="h-5 w-5 text-cmyk-cyan" />
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Email</p>
                  <p className="text-white">{quote.customer_email}</p>
                </div>
              </div>
              {quote.customer_phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cmyk-cyan/10">
                    <PhoneIcon className="h-5 w-5 text-cmyk-cyan" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-xs">Teléfono</p>
                    <p className="text-white">{quote.customer_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-6">
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
              {quote.payment_mode === 'DEPOSIT_ALLOWED' && quote.deposit_amount && (
                <div className="flex justify-between text-cmyk-cyan mt-2">
                  <span>Anticipo ({quote.deposit_percentage}%)</span>
                  <span>{formatPrice(quote.deposit_amount)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Terms */}
          {quote.terms && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Términos y Condiciones</h3>
              <p className="text-neutral-300 whitespace-pre-wrap">{quote.terms}</p>
            </Card>
          )}

          {/* Additional Info */}
          {(quote.delivery_time_text || quote.payment_conditions || quote.included_services || quote.delivery_method) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Información Adicional</h3>
              <div className="space-y-4">
                {quote.delivery_method && (
                  <div>
                    <p className="text-neutral-500 text-sm">Método de Entrega</p>
                    <p className="text-white flex items-center gap-2">
                      <span>{DELIVERY_METHOD_ICONS[quote.delivery_method as DeliveryMethod]}</span>
                      {DELIVERY_METHOD_LABELS[quote.delivery_method as DeliveryMethod]?.es || quote.delivery_method}
                    </p>
                  </div>
                )}
                {quote.pickup_branch && typeof quote.pickup_branch === 'object' && (
                  <div>
                    <p className="text-neutral-500 text-sm">Sucursal de recolección</p>
                    <p className="text-white">{(quote.pickup_branch as Record<string, string>).name}</p>
                  </div>
                )}
                {quote.delivery_address && Object.keys(quote.delivery_address).length > 0 && (
                  <div>
                    <p className="text-neutral-500 text-sm">
                      {quote.delivery_method === 'installation' ? 'Dirección de Instalación' : 'Dirección de Envío'}
                    </p>
                    <p className="text-white text-sm">
                      {[quote.delivery_address.street, quote.delivery_address.neighborhood, quote.delivery_address.city, quote.delivery_address.state, quote.delivery_address.postal_code].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {quote.delivery_time_text && (
                  <div>
                    <p className="text-neutral-500 text-sm">Tiempo de Entrega</p>
                    <p className="text-white">{quote.delivery_time_text}</p>
                  </div>
                )}
                {quote.payment_conditions && (
                  <div>
                    <p className="text-neutral-500 text-sm">Condiciones de Pago</p>
                    <p className="text-white">{quote.payment_conditions}</p>
                  </div>
                )}
                {quote.included_services && quote.included_services.length > 0 && (
                  <div>
                    <p className="text-neutral-500 text-sm">Servicios Incluidos</p>
                    <ul className="text-white list-disc list-inside">
                      {quote.included_services.map((service, index) => (
                        <li key={index}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Validity */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CalendarDaysIcon className="h-5 w-5 text-cmyk-cyan" />
              <h3 className="font-semibold text-white">Vigencia</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-neutral-500 text-sm">Versión</p>
                <p className="text-white">v{quote.version}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-sm">Fecha de emisión</p>
                <p className="text-white">{formatDate(quote.created_at)}</p>
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
              {quote.estimated_delivery_date && (
                <div>
                  <p className="text-neutral-500 text-sm">Fecha estimada de entrega</p>
                  <p className="text-white">{formatDate(quote.estimated_delivery_date)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CurrencyDollarIcon className="h-5 w-5 text-cmyk-cyan" />
              <h3 className="font-semibold text-white">Pago</h3>
            </div>
            <div className="space-y-3">
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
                  <p className="text-neutral-300 text-sm">{quote.payment_conditions}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-white mb-4">Acciones</h3>
            <div className="space-y-3">
              {/* Download PDF */}
              {(quote.pdf_file || quote.token) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  isLoading={isDownloadingPdf}
                  leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                >
                  {isDownloadingPdf ? 'Descargando...' : 'Descargar PDF'}
                </Button>
              )}

              {/* View full quote via token */}
              {quote.token && (
                <Link href={`/${locale}/cotizacion/${quote.token}`} className="block">
                  <Button variant="outline" className="w-full" leftIcon={<EyeIcon className="h-4 w-4" />}>
                    Ver cotización completa
                  </Button>
                </Link>
              )}

              {/* Accept / Reject / Request Changes */}
              {canRespond && (
                <>
                  <Button
                    onClick={() => setResponseAction('accept')}
                    className="w-full bg-green-600 hover:bg-green-700"
                    leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    Aceptar Cotización
                  </Button>
                  <Button
                    onClick={() => setResponseAction('reject')}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                    leftIcon={<XCircleIcon className="h-5 w-5" />}
                  >
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => setShowChangeEditor(true)}
                    variant="outline"
                    className="w-full"
                    leftIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                  >
                    Solicitar Cambios
                  </Button>
                </>
              )}

              {/* Request new quote if rejected */}
              {isRejected && (
                <Link href={`/${locale}/#cotizar`} className="block">
                  <Button
                    variant="outline"
                    className="w-full"
                    leftIcon={<PlusCircleIcon className="h-5 w-5" />}
                  >
                    Solicitar Nueva Cotización
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-6 bg-cmyk-cyan/5 border-cmyk-cyan/20">
            <h3 className="font-semibold text-white mb-2">¿Tienes preguntas?</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Contáctanos para cualquier duda sobre esta cotización.
            </p>
            <a
              href="mailto:ventas@mcd-agencia.com"
              className="text-cmyk-cyan hover:underline text-sm"
            >
              ventas@mcd-agencia.com
            </a>
          </Card>
        </div>
      </div>

      {/* Accept/Reject Modal */}
      {responseAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {responseAction === 'accept' ? 'Aceptar Cotización' : 'Rechazar Cotización'}
            </h3>

            {responseAction === 'accept' ? (
              <div className="mb-4">
                <p className="text-neutral-300 mb-4">
                  ¿Estás seguro de que deseas aceptar esta cotización por{' '}
                  <strong className="text-white">{formatPrice(quote.total)}</strong>?
                </p>

                {/* Signature */}
                <label className="block text-neutral-400 text-sm mb-2">
                  Firma electrónica (opcional)
                </label>
                <SignaturePad onChange={setSignatureData} width={380} height={160} />

                <label className="block text-neutral-400 text-sm mb-2 mt-4">
                  Nombre del firmante
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan mb-4"
                />

                <label className="block text-neutral-400 text-sm mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder="Comentarios o instrucciones especiales..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan resize-none"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-neutral-400 text-sm mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder="Por favor, indícanos el motivo..."
                  rows={4}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setResponseAction(null);
                  setResponseComment('');
                  setSignatureData(null);
                  setSignatureName('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={responseAction === 'accept' ? handleAccept : handleReject}
                disabled={isSubmitting || (responseAction === 'reject' && !responseComment.trim())}
                isLoading={isSubmitting}
                className={`flex-1 ${
                  responseAction === 'accept'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Change Request Editor Modal */}
      {showChangeEditor && quote.token && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Solicitar cambios en la cotización
                </h2>
                <button
                  onClick={() => setShowChangeEditor(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <QuoteChangeEditor
                lines={quote.lines}
                onSubmit={handleRequestChanges}
                onCancel={() => setShowChangeEditor(false)}
                isSubmitting={isSubmitting}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
