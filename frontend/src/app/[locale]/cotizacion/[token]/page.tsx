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
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

import { Card, Button, LoadingPage } from '@/components/ui';
import QuoteChangeEditor from '@/components/quotes/QuoteChangeEditor';
import {
  viewQuoteByToken,
  acceptQuote,
  downloadQuotePdfByToken,
  rejectQuoteByToken,
  requestQuoteChanges,
  Quote,
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
      await acceptQuote(quote.id, responseComment);
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
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
              <h2 className="text-lg font-semibold text-white mb-4">Datos del Cliente</h2>
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
              </div>
            </Card>

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
            {(quote.delivery_time_text || quote.payment_conditions || quote.included_services) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Información Adicional</h2>
                <div className="space-y-4">
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Fecha de emisión</span>
                  <span className="text-white">{formatDate(quote.created_at)}</span>
                </div>
                {quote.valid_until && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Válida hasta</span>
                    <span className={quote.is_expired ? 'text-red-400' : 'text-white'}>
                      {formatDate(quote.valid_until)}
                    </span>
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

        {/* Authentication Required Modal (only for accept) */}
        {showAuthRequired && quote && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
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
