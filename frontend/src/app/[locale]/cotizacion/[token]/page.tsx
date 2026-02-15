'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

import { Card, Button, LoadingPage } from '@/components/ui';
import SignaturePad from '@/components/ui/SignaturePad';
import QuoteChangeEditor from '@/components/quotes/QuoteChangeEditor';
import { DELIVERY_METHOD_LABELS, DELIVERY_METHOD_ICONS, type DeliveryMethod, SERVICE_LABELS, type ServiceId } from '@/lib/service-ids';
import { ServiceDetailsDisplay } from '@/components/quotes/ServiceDetailsDisplay';
import {
  viewQuoteByToken,
  acceptQuote,
  downloadQuotePdfByToken,
  rejectQuoteByToken,
  requestQuoteChanges,
  getQuoteResponsesByToken,
  getQuoteChangeRequests,
  Quote,
  QuoteResponse as QuoteResponseType,
  QuoteChangeRequest,
  SubmitChangeRequestData,
} from '@/lib/api/quotes';

type ResponseAction = 'accept' | 'reject' | null;

export default function QuoteViewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const locale = useLocale();
  const { isAuthenticated, user } = useAuth();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseAction, setResponseAction] = useState<ResponseAction>(null);
  const [responseComment, setResponseComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const [pendingAction, setPendingAction] = useState<'accept' | 'reject' | null>(null);
  const [showChangeEditor, setShowChangeEditor] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [responses, setResponses] = useState<QuoteResponseType[]>([]);
  const [changeRequests, setChangeRequests] = useState<QuoteChangeRequest[]>([]);

  // Lock body scroll when change editor modal is open
  useEffect(() => {
    if (showChangeEditor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showChangeEditor]);

  // Check if user can perform authenticated actions (accept/reject)
  const canPerformAuthActions = isAuthenticated && user?.email === quote?.customer_email;

  useEffect(() => {
    const fetchQuote = async () => {
      if (!token) {
        setError('Token inválido');
        setIsLoading(false);
        return;
      }

      try {
        const data = await viewQuoteByToken(token);
        setQuote(data);
        // Fetch timeline data in parallel
        const [responsesData, crData] = await Promise.all([
          getQuoteResponsesByToken(token).catch(() => []),
          getQuoteChangeRequests(token).catch(() => ({ change_requests: [] })),
        ]);
        setResponses(responsesData);
        setChangeRequests(crData.change_requests || []);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError('No se pudo cargar la cotización. El enlace puede ser inválido o haber expirado.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuote();
  }, [token]);

  const handleDownloadPdf = async () => {
    if (!quote) return;

    setIsDownloading(true);
    try {
      await downloadQuotePdfByToken(token, quote.quote_number);
      toast.success('PDF descargado');
    } catch {
      toast.error('Error al descargar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handler for accept action that requires authentication
  const handleAcceptClick = () => {
    if (!canPerformAuthActions) {
      setPendingAction('accept');
      setShowAuthRequired(true);
      return;
    }
    setResponseAction('accept');
  };

  const handleAccept = async () => {
    if (!quote) return;

    setIsSubmitting(true);
    try {
      await acceptQuote(quote.id, responseComment, signatureData, signatureName);
      setResponseAction(null);
      toast.success('¡Cotización aceptada! Redirigiendo a tu cuenta...');
      // Redirect to account quotes page after 1 second
      setTimeout(() => {
        router.push(`/${locale}/mi-cuenta/cotizaciones`);
      }, 1000);
    } catch (error) {
      const err = error as { message?: string; response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error || err.message || 'Error al aceptar la cotización';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!responseComment.trim()) {
      toast.error('Por favor indica el motivo del rechazo');
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectQuoteByToken(token, responseComment);
      setResponseAction(null);
      toast.success('Cotización rechazada. Gracias por tu respuesta.');
      // Reload the page to show updated status
      window.location.reload();
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Error al rechazar la cotización');
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async (data: SubmitChangeRequestData) => {
    setIsSubmitting(true);
    try {
      await requestQuoteChanges(token, data);
      setShowChangeEditor(false);
      setResponseComment('');
      toast.success('Tu solicitud de cambios ha sido enviada. Te contactaremos pronto.');
      // Reload to show updated status
      window.location.reload();
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <LoadingPage message="Cargando cotización..." />;
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-cmyk-magenta mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Cotización no disponible</h1>
          <p className="text-neutral-400">{error || 'No se encontró la cotización.'}</p>
        </Card>
      </div>
    );
  }

  const canRespond = ['sent', 'viewed'].includes(quote.status) && !quote.is_expired;
  const isAccepted = quote.status === 'accepted';
  const isRejected = quote.status === 'rejected';
  const isChangesRequested = quote.status === 'changes_requested';

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-neutral-900 pt-24 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <Image
            src="/images/logo.png"
            alt="MCD Agencia"
            width={200}
            height={100}
            className="mx-auto mb-4 h-12 w-auto"
          />
          <h1 className="text-2xl font-bold text-white">Cotización</h1>
          <p className="text-neutral-400">{quote.quote_number}</p>
        </div>

        {/* Status Banner */}
        {isAccepted && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Cotización Aceptada</p>
              <p className="text-neutral-400 text-sm">
                Aceptada el {quote.accepted_at && formatDate(quote.accepted_at)}
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Cotización Rechazada</p>
              {quote.customer_notes && (
                <p className="text-neutral-400 text-sm mt-1">{quote.customer_notes}</p>
              )}
            </div>
          </div>
        )}

        {isChangesRequested && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Cambios Solicitados</p>
              <p className="text-neutral-400 text-sm mt-1">
                Tu solicitud de cambios está siendo revisada. Te enviaremos una cotización actualizada pronto.
              </p>
            </div>
          </div>
        )}

        {quote.is_expired && !isAccepted && !isRejected && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Cotización Expirada</p>
              <p className="text-neutral-400 text-sm">
                Esta cotización venció el {quote.valid_until && formatDate(quote.valid_until)}
              </p>
            </div>
          </div>
        )}

        {/* Account Registration Banner - Only show for pending quotes */}
        {canRespond && !isAuthenticated && (
          <div className="mb-6 p-4 bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <UserPlusIcon className="h-6 w-6 text-cmyk-cyan flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Crea tu cuenta para gestionar tus cotizaciones</p>
                  <p className="text-neutral-400 text-sm mt-1">
                    Registrate con <strong className="text-white">{quote.customer_email}</strong> para poder aceptar cotizaciones, ver tu historial y dar seguimiento a tus pedidos.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <Link href={`/${locale}/registro?email=${encodeURIComponent(quote.customer_email)}&redirect=/${locale}/cotizacion/${token}`}>
                  <Button leftIcon={<UserPlusIcon className="h-4 w-4" />}>
                    Crear cuenta
                  </Button>
                </Link>
                <Link href={`/${locale}/login?redirect=/${locale}/cotizacion/${token}`}>
                  <Button variant="outline">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {canRespond && isAuthenticated && user?.email === quote.customer_email && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <ShieldCheckIcon className="h-6 w-6 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Sesion iniciada como {user.email}</p>
              <p className="text-neutral-400 text-sm">
                Puedes gestionar esta cotizacion y ver tu historial en{' '}
                <Link href={`/${locale}/mi-cuenta`} className="text-cmyk-cyan hover:underline">
                  Mi Cuenta
                </Link>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Tus datos</h2>
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

            {/* Service Details (from quote lines or linked quote request) */}
            {(() => {
              const lineWithDetails = quote.lines?.find(
                (l) => l.service_details && Object.keys(l.service_details).length > 0
              );
              const effectiveServiceDetails = lineWithDetails?.service_details as Record<string, unknown> | undefined
                ?? (quote.quote_request?.service_details as Record<string, unknown> | undefined);
              const effectiveServiceType = (effectiveServiceDetails?.service_type as string)
                || quote.quote_request?.service_type
                || undefined;

              const hasDetails = effectiveServiceDetails && Object.keys(effectiveServiceDetails).length > 0;
              const hasRequest = !!quote.quote_request;
              const hasGenericFields = hasRequest && !hasDetails;

              if (!hasDetails && !hasRequest) return null;

              return (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Detalles del Servicio</h2>

                  {quote.quote_request?.catalog_item && (
                    <div className="mb-4 p-4 bg-neutral-800/50 rounded-lg flex items-center gap-4">
                      {quote.quote_request.catalog_item.image && (
                        <img
                          src={quote.quote_request.catalog_item.image}
                          alt={quote.quote_request.catalog_item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="text-neutral-500 text-xs">Producto/Servicio</p>
                        <p className="text-white font-medium">{quote.quote_request.catalog_item.name}</p>
                      </div>
                    </div>
                  )}

                  {effectiveServiceType && (
                    <div className="mb-4 p-3 bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg">
                      <p className="text-neutral-500 text-xs">Tipo de Servicio</p>
                      <p className="text-cmyk-cyan font-semibold text-lg">
                        {SERVICE_LABELS[effectiveServiceType as ServiceId] || effectiveServiceType}
                      </p>
                    </div>
                  )}

                  {hasDetails && (
                    <div className="mb-4">
                      <p className="text-neutral-400 text-sm mb-3 font-medium">Parámetros del servicio</p>
                      <ServiceDetailsDisplay
                        serviceType={effectiveServiceType}
                        serviceDetails={effectiveServiceDetails}
                      />
                    </div>
                  )}

                  {hasGenericFields && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {quote.quote_request!.quantity && (
                        <div className="p-3 bg-neutral-800/50 rounded-lg">
                          <p className="text-neutral-500 text-xs">Cantidad</p>
                          <p className="text-white font-medium">{quote.quote_request!.quantity}</p>
                        </div>
                      )}
                      {quote.quote_request!.dimensions && (
                        <div className="p-3 bg-neutral-800/50 rounded-lg">
                          <p className="text-neutral-500 text-xs">Dimensiones</p>
                          <p className="text-white">{quote.quote_request!.dimensions}</p>
                        </div>
                      )}
                      {quote.quote_request!.material && (
                        <div className="p-3 bg-neutral-800/50 rounded-lg">
                          <p className="text-neutral-500 text-xs">Material</p>
                          <p className="text-white">{quote.quote_request!.material}</p>
                        </div>
                      )}
                      <div className="p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-neutral-500 text-xs">Instalación</p>
                        <p className="text-white">{quote.quote_request!.includes_installation ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                  )}

                  {quote.quote_request?.description && (
                    <div className="p-4 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs mb-2">Comentarios de la solicitud</p>
                      <p className="text-white whitespace-pre-wrap">{quote.quote_request.description}</p>
                    </div>
                  )}

                  {(() => {
                    let displayDate = quote.quote_request?.required_date;
                    const details = effectiveServiceDetails;
                    if (details && Array.isArray(details.rutas)) {
                      const routeDates = (details.rutas as Array<Record<string, unknown>>)
                        .map(r => r.fecha_inicio as string)
                        .filter(d => !!d)
                        .sort();
                      if (routeDates.length > 0) {
                        const earliest = routeDates[0];
                        if (!displayDate || earliest < displayDate) {
                          displayDate = earliest;
                        }
                      }
                    }
                    if (!displayDate) return null;
                    return (
                      <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg flex items-center gap-3">
                        <CalendarDaysIcon className="h-5 w-5 text-neutral-400" />
                        <div>
                          <p className="text-neutral-500 text-xs">Fecha Requerida</p>
                          <p className="text-white">
                            {new Date(displayDate + 'T12:00:00').toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              );
            })()}

            {/* Request Attachments */}
            {quote.quote_request?.attachments && quote.quote_request.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PaperClipIcon className="h-5 w-5 text-cmyk-cyan" />
                  Archivos de la Solicitud ({quote.quote_request.attachments.length})
                </h2>
                <div className="space-y-2">
                  {quote.quote_request.attachments.map((attachment) => {
                    const isImage = attachment.file_type?.startsWith('image/');
                    return (
                      <div key={attachment.id} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                        {isImage ? (
                          <a href={attachment.file} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                            <img
                              src={attachment.file}
                              alt={attachment.filename}
                              className="w-16 h-16 object-cover rounded border border-neutral-600 hover:border-cmyk-cyan transition-colors"
                            />
                          </a>
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-neutral-700 rounded flex-shrink-0">
                            <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={attachment.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cmyk-cyan hover:underline truncate block"
                          >
                            {attachment.filename}
                          </a>
                          <p className="text-xs text-neutral-500">
                            {attachment.file_size > 0 && `${(attachment.file_size / 1024).toFixed(0)} KB`}
                            {attachment.file_type && ` · ${attachment.file_type}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Quote Attachments */}
            {quote.attachments && quote.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                  Archivos Adjuntos ({quote.attachments.length})
                </h2>
                <div className="space-y-2">
                  {quote.attachments.map((att) => {
                    const isImage = att.file_type?.startsWith('image/');
                    return (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                        {isImage ? (
                          <a href={att.file} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                            <img
                              src={att.file}
                              alt={att.filename}
                              className="w-16 h-16 object-cover rounded border border-neutral-600 hover:border-cmyk-cyan transition-colors"
                            />
                          </a>
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-neutral-700 rounded flex-shrink-0">
                            <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={att.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cmyk-cyan hover:underline truncate block"
                          >
                            {att.filename}
                          </a>
                          <p className="text-xs text-neutral-500">
                            {att.file_size > 0 && `${(att.file_size / 1024).toFixed(0)} KB`}
                            {att.file_type && ` · ${att.file_type}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Quote Lines */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Conceptos</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left text-neutral-400 text-sm py-2 font-medium">Concepto</th>
                      <th className="text-center text-neutral-400 text-sm py-2 font-medium">Cant.</th>
                      <th className="text-right text-neutral-400 text-sm py-2 font-medium">P. Unit.</th>
                      <th className="text-right text-neutral-400 text-sm py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lines.map((line) => (
                      <tr key={line.id} className="border-b border-neutral-800">
                        <td className="py-3">
                          <p className="text-white">{line.concept}</p>
                          {line.description && (
                            <p className="text-neutral-500 text-sm">{line.description}</p>
                          )}
                        </td>
                        <td className="py-3 text-center text-neutral-300">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="py-3 text-right text-neutral-300">
                          {formatCurrency(line.unit_price)}
                        </td>
                        <td className="py-3 text-right text-white font-medium">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-neutral-700 space-y-2">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>IVA ({parseFloat(quote.tax_rate) * 100}%)</span>
                  <span>{formatCurrency(quote.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-neutral-700">
                  <span>Total</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
                {quote.payment_mode === 'DEPOSIT_ALLOWED' && quote.deposit_amount && (
                  <div className="flex justify-between text-cmyk-cyan mt-2">
                    <span>Anticipo ({quote.deposit_percentage}%)</span>
                    <span>{formatCurrency(quote.deposit_amount)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Terms */}
            {quote.terms && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Términos y Condiciones</h2>
                <p className="text-neutral-300 whitespace-pre-wrap">{quote.terms}</p>
              </Card>
            )}

            {/* Additional Info */}
            {(quote.delivery_time_text || quote.payment_conditions || quote.included_services || quote.delivery_method) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Información Adicional</h2>
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
                      {quote.deposit_percentage}% ({formatCurrency(quote.deposit_amount || '0')})
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
              <div className="flex items-center gap-3 mb-4">
                <CurrencyDollarIcon className="h-5 w-5 text-cmyk-cyan" />
                <h3 className="font-semibold text-white">Acciones</h3>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  isLoading={isDownloading}
                  variant="outline"
                  className="w-full"
                  leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}
                >
                  Descargar PDF
                </Button>

                {canRespond && (
                  <>
                    <Button
                      onClick={handleAcceptClick}
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

                {/* Show new quote button when rejected */}
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

            {/* Timeline / Historial */}
            {(responses.length > 0 || changeRequests.length > 0 || quote.sent_at) && (() => {
              type TimelineEvent = 
                | { type: 'response'; date: string; data: QuoteResponseType }
                | { type: 'change_request'; date: string; data: QuoteChangeRequest }
                | { type: 'change_request_reviewed'; date: string; data: QuoteChangeRequest };

              const eventsList: TimelineEvent[] = [
                ...responses.map(r => ({ type: 'response' as const, date: r.created_at, data: r })),
                ...changeRequests.map(cr => ({ type: 'change_request' as const, date: cr.created_at, data: cr })),
                ...changeRequests
                  .filter(cr => cr.status !== 'pending' && cr.reviewed_at)
                  .map(cr => ({ type: 'change_request_reviewed' as const, date: cr.reviewed_at!, data: cr })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              const sendResponses = responses.filter(r => r.action === 'send').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const sendVersionMap = new Map<string, number>();
              sendResponses.forEach((r, i) => sendVersionMap.set(r.id, i + 1));
              const hasSendResponses = sendResponses.length > 0;

              const sortedCRs = [...changeRequests].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const crVersionMap = new Map<string, number>();
              sortedCRs.forEach((cr, i) => crVersionMap.set(cr.id, i + 2));

              const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

              return (
              <Card className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-cmyk-cyan" />
                  Historial
                </h3>
                <div className="relative">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-neutral-700 z-0"></div>
                  <div className="space-y-4">
                    {eventsList.map((event, idx) => {
                      // Icon circle base class — solid bg so line doesn't bleed through
                      const circleBase = 'relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900';

                      if (event.type === 'change_request') {
                        const cr = event.data;
                        const crVersion = crVersionMap.get(cr.id) || 2;
                        return (
                          <div key={`cr-${cr.id}`} className="relative flex items-start gap-3">
                            <div className={`${circleBase} border-orange-500/60`}>
                              <PencilIcon className="h-3 w-3 text-orange-400" />
                            </div>
                            <div className="flex-1 -mt-0.5">
                              <p className="text-orange-400 text-xs font-medium">
                                Solicitud de cambios v{crVersion}
                                {cr.changes_summary && (
                                  <span className="ml-1.5 text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full">
                                    {[
                                      cr.changes_summary.added > 0 && `+${cr.changes_summary.added}`,
                                      cr.changes_summary.modified > 0 && `~${cr.changes_summary.modified}`,
                                      cr.changes_summary.deleted > 0 && `-${cr.changes_summary.deleted}`,
                                    ].filter(Boolean).join(' ')}
                                  </span>
                                )}
                              </p>
                              <p className="text-neutral-500 text-xs">{fmtDate(cr.created_at)}</p>
                              {cr.customer_comments && (
                                <p className="text-neutral-500 text-xs mt-0.5 line-clamp-2">
                                  &ldquo;{cr.customer_comments}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (event.type === 'change_request_reviewed') {
                        const cr = event.data;
                        const isApproved = cr.status === 'approved';
                        return (
                          <div key={`cr-review-${cr.id}`} className="relative flex items-start gap-3">
                            <div className={`${circleBase} ${
                              isApproved ? 'border-green-500/60' : 'border-red-500/60'
                            }`}>
                              {isApproved ? <CheckCircleIcon className="h-3 w-3 text-green-400" /> : <XCircleIcon className="h-3 w-3 text-red-400" />}
                            </div>
                            <div className="flex-1 -mt-0.5">
                              <p className={`text-xs font-medium ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
                                Solicitud de cambios — {isApproved ? 'aprobada' : 'rechazada'}
                              </p>
                              <p className="text-neutral-500 text-xs">
                                {cr.reviewed_by_name || 'Vendedor'} · {fmtDate(cr.reviewed_at!)}
                              </p>
                              {cr.review_notes && (
                                <p className="text-neutral-400 text-xs mt-1 bg-neutral-800/50 rounded p-1.5 line-clamp-2">
                                  &ldquo;{cr.review_notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const response = event.data as QuoteResponseType;

                      if (response.action === 'send') {
                        const version = sendVersionMap.get(response.id) || 1;
                        const versionLabel = version > 1 ? ` v${version}` : '';
                        return (
                          <div key={`r-${response.id}`} className="relative flex items-start gap-3">
                            <div className={`${circleBase} border-cmyk-cyan/60`}>
                              <PaperAirplaneIcon className="h-3 w-3 text-cmyk-cyan" />
                            </div>
                            <div className="flex-1 -mt-0.5">
                              <p className="text-cmyk-cyan text-xs font-medium">
                                Cotización creada y enviada{versionLabel}
                                {version > 1 && (
                                  <span className="ml-1.5 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
                                    v{version}
                                  </span>
                                )}
                              </p>
                              <p className="text-neutral-500 text-xs">
                                {response.responded_by_name || 'Vendedor'} · {fmtDate(response.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      if (response.action === 'view') {
                        return (
                          <div key={`r-${response.id}`} className="relative flex items-start gap-3">
                            <div className={`${circleBase} border-purple-500/60`}>
                              <EyeIcon className="h-3 w-3 text-purple-400" />
                            </div>
                            <div className="flex-1 -mt-0.5">
                              <p className="text-purple-400 text-xs font-medium">Cotización vista</p>
                              <p className="text-neutral-500 text-xs">{fmtDate(response.created_at)}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`r-${response.id}-${idx}`} className="relative flex items-start gap-3">
                          <div className={`${circleBase} ${
                            response.action === 'approval' ? 'border-green-500/60' :
                            response.action === 'rejection' ? 'border-red-500/60' :
                            'border-blue-500/60'
                          }`}>
                            {response.action === 'approval' && <CheckCircleIcon className="h-3 w-3 text-green-400" />}
                            {response.action === 'rejection' && <XCircleIcon className="h-3 w-3 text-red-400" />}
                            {response.action === 'comment' && <PencilIcon className="h-3 w-3 text-blue-400" />}
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className={`text-xs font-medium ${
                              response.action === 'approval' ? 'text-green-400' :
                              response.action === 'rejection' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {response.action === 'approval' ? 'Cotización aceptada' :
                               response.action === 'rejection' ? 'Cotización rechazada' :
                               response.action_display || 'Comentario'}
                            </p>
                            <p className="text-neutral-500 text-xs">{fmtDate(response.created_at)}</p>
                            {response.comment && (
                              <p className="text-neutral-400 text-xs mt-1 bg-neutral-800/50 rounded p-1.5 line-clamp-2">
                                &ldquo;{response.comment}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {quote.sent_at && !hasSendResponses && (
                      <div className="relative flex items-start gap-3">
                        <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-cmyk-cyan/60">
                          <PaperAirplaneIcon className="h-3 w-3 text-cmyk-cyan" />
                        </div>
                        <div className="flex-1 -mt-0.5">
                          <p className="text-cmyk-cyan text-xs font-medium">
                            Cotización creada y enviada
                          </p>
                          <p className="text-neutral-500 text-xs">{formatDate(quote.sent_at)}</p>
                        </div>
                      </div>
                    )}

                    {/* Request created — the original customer request */}
                    {quote.quote_request && (
                      <>
                        <div className="relative flex items-center gap-3 py-1">
                          <div className="relative z-10 w-5 flex justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                          </div>
                          <div className="flex-1 border-t border-dashed border-neutral-700"></div>
                        </div>

                        {/* Request: In review — show if status progressed past pending */}
                        {quote.quote_request.status !== 'pending' && (
                          <div className="relative flex items-start gap-3">
                            <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-yellow-500/60">
                              <ClockIcon className="h-3 w-3 text-yellow-400" />
                            </div>
                            <div className="flex-1 -mt-0.5">
                              <p className="text-yellow-400 text-xs font-medium">Solicitud en revisión</p>
                              <p className="text-neutral-500 text-xs">{formatDate(quote.quote_request.updated_at)}</p>
                            </div>
                          </div>
                        )}

                        <div className="relative flex items-start gap-3">
                          <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-neutral-600">
                            <ChatBubbleLeftRightIcon className="h-3 w-3 text-neutral-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-neutral-400 text-xs font-medium">
                              Solicitud de cotización
                            </p>
                            <p className="text-neutral-500 text-xs">
                              {quote.quote_request.customer_name} · {formatDate(quote.quote_request.created_at)}
                            </p>
                            {quote.quote_request.request_number && (
                              <p className="text-cmyk-cyan text-xs mt-0.5">
                                #{quote.quote_request.request_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
              );
            })()}

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

        {/* Response Modal (Accept/Reject only) */}
        {responseAction && (responseAction === 'accept' || responseAction === 'reject') && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {responseAction === 'accept' ? 'Aceptar Cotización' : 'Rechazar Cotización'}
              </h3>

              {responseAction === 'accept' ? (
                <div className="mb-4">
                  <p className="text-neutral-300 mb-4">
                    ¿Estás seguro de que deseas aceptar esta cotización por{' '}
                    <strong className="text-white">{formatCurrency(quote.total)}</strong>?
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
        {showChangeEditor && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[70] p-4 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
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

        {/* Authentication Required Modal (only for accept) */}
        {showAuthRequired && quote && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
            <Card className="w-full max-w-md p-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-cmyk-cyan/10 flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="h-8 w-8 text-cmyk-cyan" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Verificación de identidad requerida
                </h3>
                <p className="text-neutral-400 text-sm">
                  Para aceptar esta cotización necesitas verificar tu identidad creando una cuenta o iniciando sesión.
                </p>
              </div>

              {isAuthenticated && user?.email !== quote.customer_email && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <strong>Nota:</strong> Estás conectado como <strong>{user?.email}</strong>, pero esta cotización está dirigida a <strong>{quote.customer_email}</strong>. Debes iniciar sesión con el correo correcto.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-neutral-300 text-sm text-center">
                  Registrate o inicia sesión con <strong className="text-white">{quote.customer_email}</strong>
                </p>

                <Link
                  href={`/${locale}/registro?email=${encodeURIComponent(quote.customer_email)}&redirect=/${locale}/cotizacion/${token}`}
                  className="block"
                >
                  <Button className="w-full" leftIcon={<UserPlusIcon className="h-4 w-4" />}>
                    Crear cuenta
                  </Button>
                </Link>

                <Link
                  href={`/${locale}/login?redirect=/${locale}/cotizacion/${token}`}
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    Ya tengo cuenta
                  </Button>
                </Link>

                <Button
                  onClick={() => {
                    setShowAuthRequired(false);
                    setPendingAction(null);
                  }}
                  variant="ghost"
                  className="w-full text-neutral-400 hover:text-white"
                >
                  Cancelar
                </Button>
              </div>

              <p className="text-neutral-500 text-xs text-center mt-4">
                Tu cuenta te permitirá ver el historial de cotizaciones, dar seguimiento a pedidos y más.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
