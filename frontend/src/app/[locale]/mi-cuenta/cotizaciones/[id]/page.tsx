'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  EyeIcon,
  PencilIcon,
  UserIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

import {
  getQuoteById,
  downloadQuotePdfByToken,
  acceptQuote,
  rejectQuote,
  requestQuoteChanges,
  getQuoteResponses,
  getQuoteChangeRequests,
  Quote,
  QuoteResponse as QuoteResponseType,
  QuoteLine,
  QuoteChangeRequest,
  SubmitChangeRequestData,
} from '@/lib/api/quotes';
import { Card, Badge, Button, LoadingPage, Breadcrumb } from '@/components/ui';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { DELIVERY_METHOD_LABELS, DELIVERY_METHOD_ICONS, type DeliveryMethod, SERVICE_LABELS, type ServiceId } from '@/lib/service-ids';
import SignaturePad from '@/components/ui/SignaturePad';
import QuoteChangeEditor from '@/components/quotes/QuoteChangeEditor';
import { ServiceDetailsDisplay } from '@/components/quotes/ServiceDetailsDisplay';

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

  // Portal target for rendering Historial in the layout sidebar
  const [sidebarPortal, setSidebarPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.getElementById('sidebar-extra');
    if (el) setSidebarPortal(el);
    return () => { if (el) el.innerHTML = ''; };
  }, []);

  // Lock body scroll when change editor modal is open
  useEffect(() => {
    if (showChangeEditor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showChangeEditor]);

  // Fetch quote + timeline data together so everything is cached by React Query
  const { data: quoteData, isLoading, error, refetch } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      const data = await getQuoteById(quoteId);
      // Fetch timeline data in parallel
      const [responsesData, crData] = await Promise.all([
        getQuoteResponses(quoteId).catch(() => []),
        data.token ? getQuoteChangeRequests(data.token).catch(() => ({ change_requests: [] })) : Promise.resolve({ change_requests: [] }),
      ]);
      return {
        quote: data,
        responses: responsesData,
        changeRequests: crData.change_requests || [],
      };
    },
  });

  const quote = quoteData?.quote ?? null;
  const responses = quoteData?.responses ?? [];
  const changeRequests = quoteData?.changeRequests ?? [];

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

  // ── Group quote lines by service (same logic as dashboard) ──
  interface LineGroup { serviceType?: string; lines: QuoteLine[] }
  const lineGroups = useMemo<LineGroup[]>(() => {
    if (!quote?.lines) return [];
    const groups: LineGroup[] = [];
    for (const line of quote.lines) {
      const sd = line.service_details as Record<string, unknown> | undefined;
      const lineServiceType = sd?.service_type as string | undefined;
      if (lineServiceType) {
        groups.push({ serviceType: lineServiceType, lines: [line] });
      } else if (groups.length > 0 && groups[groups.length - 1].serviceType) {
        const prevGroup = groups[groups.length - 1];
        const prevConcept = prevGroup.lines[0].concept;
        const baseConcept = prevConcept.split(' — Ruta ')[0];
        if (line.concept.startsWith(baseConcept + ' — Ruta')) {
          prevGroup.lines.push(line);
        } else {
          groups.push({ serviceType: undefined, lines: [line] });
        }
      } else {
        groups.push({ serviceType: undefined, lines: [line] });
      }
    }
    return groups;
  }, [quote]);

  // ── Map each request service (by index) → matched quote line group ──
  const serviceToLinesMap = useMemo<Map<number, QuoteLine[]>>(() => {
    const map = new Map<number, QuoteLine[]>();
    if (!quote?.quote_request) return map;

    const requestServices = quote.quote_request.services;
    if (requestServices && requestServices.length > 0) {
      const assignedGroups = new Set<number>();
      for (let svcIdx = 0; svcIdx < requestServices.length; svcIdx++) {
        const svc = requestServices[svcIdx];
        for (let gIdx = 0; gIdx < lineGroups.length; gIdx++) {
          if (!assignedGroups.has(gIdx) && lineGroups[gIdx].serviceType === svc.service_type) {
            assignedGroups.add(gIdx);
            map.set(svcIdx, lineGroups[gIdx].lines);
            break;
          }
        }
      }
    } else if (quote.quote_request.service_type) {
      for (const group of lineGroups) {
        if (group.serviceType === quote.quote_request.service_type) {
          map.set(0, group.lines);
          break;
        }
      }
    }
    return map;
  }, [quote, lineGroups]);

  // ── Identify vendor-added lines (not from the original request) ──
  const vendorAddedLines = useMemo<QuoteLine[]>(() => {
    if (!quote || !quote.quote_request || !quote.lines) return [];

    const requestServices = quote.quote_request.services;
    const hasCatalogItem = !!quote.quote_request.catalog_item;
    const requestServiceType = quote.quote_request.service_type;

    if (requestServices && requestServices.length > 0) {
      const requestTypeCounts = new Map<string, number>();
      for (const svc of requestServices) {
        requestTypeCounts.set(svc.service_type, (requestTypeCounts.get(svc.service_type) || 0) + 1);
      }
      const remainingCounts = new Map(requestTypeCounts);
      const vLines: QuoteLine[] = [];
      for (const group of lineGroups) {
        if (group.serviceType && remainingCounts.has(group.serviceType) && (remainingCounts.get(group.serviceType)! > 0)) {
          remainingCounts.set(group.serviceType, remainingCounts.get(group.serviceType)! - 1);
        } else {
          vLines.push(...group.lines);
        }
      }
      return vLines;
    }

    if (requestServiceType) {
      let matched = false;
      const vLines: QuoteLine[] = [];
      for (const group of lineGroups) {
        if (!matched && group.serviceType === requestServiceType) {
          matched = true;
        } else {
          vLines.push(...group.lines);
        }
      }
      return vLines;
    }

    if (hasCatalogItem) {
      return quote.lines.slice(1);
    }

    return [];
  }, [quote, lineGroups]);

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
    <div className="space-y-3">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
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
              {(() => {
                const shippingTotal = quote.lines?.reduce(
                  (sum, l) => sum + (parseFloat(l.shipping_cost || '0') || 0), 0
                ) || 0;
                return shippingTotal > 0 ? (
                  <div className="flex justify-between text-neutral-400">
                    <span>Envío</span>
                    <span>{formatPrice(shippingTotal)}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-neutral-700">
                <span>Total</span>
                <span className="text-cyan-400">{formatPrice(quote.total)}</span>
              </div>
            </div>
          </Card>

          {/* Service Details — Solicitud Original */}
          {quote.quote_request && (
            <Card className="p-6 border-cmyk-cyan/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-cmyk-cyan" />
                Detalles de la Solicitud
              </h3>

              {quote.quote_request.catalog_item && (
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

              {/* ── Single-service rendering (when NO multi-service array) ── */}
              {(!quote.quote_request.services || quote.quote_request.services.length === 0) && (
                <>
                  {/* Service Type */}
                  {quote.quote_request.service_type && (
                    <div className="mb-4 p-3 bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg">
                      <p className="text-neutral-500 text-xs">Tipo de Servicio</p>
                      <p className="text-cmyk-cyan font-semibold text-lg">
                        {SERVICE_LABELS[quote.quote_request.service_type as ServiceId] || quote.quote_request.service_type}
                      </p>
                    </div>
                  )}

                  {/* Service Details */}
                  {(() => {
                    const lineWithDetails = quote.lines?.find(
                      (l) => l.service_details && Object.keys(l.service_details).length > 0
                    );
                    const effectiveSD = lineWithDetails?.service_details as Record<string, unknown> | undefined
                      ?? (quote.quote_request?.service_details as Record<string, unknown> | undefined);
                    const hasDetails = effectiveSD && Object.keys(effectiveSD).length > 0;
                    if (!hasDetails) return null;
                    return (
                      <div className="mb-4">
                        <p className="text-neutral-400 text-sm mb-3 font-medium">Parámetros del servicio</p>
                        <ServiceDetailsDisplay
                          serviceType={quote.quote_request!.service_type}
                          serviceDetails={effectiveSD}
                        />
                      </div>
                    );
                  })()}

                  {/* Generic fields fallback */}
                  {(!quote.quote_request.service_details || Object.keys(quote.quote_request.service_details).length === 0) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {quote.quote_request.quantity && (
                        <div className="p-3 bg-neutral-800/50 rounded-lg">
                          <p className="text-neutral-500 text-xs">Cantidad</p>
                          <p className="text-white font-medium">{quote.quote_request.quantity}</p>
                        </div>
                      )}
                      {quote.quote_request.dimensions && (
                        <div className="p-3 bg-neutral-800/50 rounded-lg">
                          <p className="text-neutral-500 text-xs">Dimensiones</p>
                          <p className="text-white">{quote.quote_request.dimensions}</p>
                        </div>
                      )}
                      {quote.quote_request.material && (
                        <div className="p-3 bg-neutral-800/50 rounded-lg">
                          <p className="text-neutral-500 text-xs">Material</p>
                          <p className="text-white">{quote.quote_request.material}</p>
                        </div>
                      )}
                      <div className="p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-neutral-500 text-xs">Instalación</p>
                        <p className="text-white">{quote.quote_request.includes_installation ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                  )}

                  {/* Delivery Method from Request */}
                  {quote.quote_request.delivery_method && (
                    <div className="mb-4 p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs mb-2">Método de entrega solicitado</p>
                      <p className="text-white flex items-center gap-2">
                        <span>{DELIVERY_METHOD_ICONS[quote.quote_request.delivery_method as DeliveryMethod]}</span>
                        {DELIVERY_METHOD_LABELS[quote.quote_request.delivery_method as DeliveryMethod]?.es || quote.quote_request.delivery_method}
                      </p>
                      {quote.quote_request.pickup_branch_detail && (
                        <p className="text-neutral-300 text-sm mt-1">
                          Sucursal: {quote.quote_request.pickup_branch_detail.name} — {quote.quote_request.pickup_branch_detail.city}, {quote.quote_request.pickup_branch_detail.state}
                        </p>
                      )}
                      {quote.quote_request.delivery_address && typeof quote.quote_request.delivery_address === 'object' && Object.keys(quote.quote_request.delivery_address).length > 0 && (
                        <p className="text-neutral-300 text-sm mt-1">
                          {quote.quote_request.delivery_method === 'installation' ? 'Dirección de instalación' : 'Dirección de envío'}:{' '}
                          {[quote.quote_request.delivery_address.street || quote.quote_request.delivery_address.calle, quote.quote_request.delivery_address.exterior_number || quote.quote_request.delivery_address.numero_exterior, quote.quote_request.delivery_address.neighborhood || quote.quote_request.delivery_address.colonia, quote.quote_request.delivery_address.city || quote.quote_request.delivery_address.ciudad, quote.quote_request.delivery_address.state || quote.quote_request.delivery_address.estado, quote.quote_request.delivery_address.postal_code || quote.quote_request.delivery_address.codigo_postal].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Required Date — hide when routes carry their own dates */}
                  {(() => {
                    const details = quote.quote_request?.service_details as Record<string, unknown> | undefined;
                    const hasRouteDates = details && Array.isArray(details.rutas) &&
                      (details.rutas as Array<Record<string, unknown>>).some(r => !!r.fecha_inicio);
                    if (hasRouteDates) return null;
                    const displayDate = quote.quote_request?.required_date;
                    if (!displayDate) return null;
                    return (
                      <div className="mb-4 p-3 bg-neutral-800/50 rounded-lg flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-neutral-400" />
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

                  {/* Vendor's estimated delivery dates (single-service) */}
                  {(() => {
                    const matchedLines = serviceToLinesMap.get(0);
                    if (!matchedLines) return null;
                    const datesInfo = matchedLines
                      .filter(l => l.estimated_delivery_date)
                      .map(l => ({ concept: l.concept, date: l.estimated_delivery_date! }));
                    if (datesInfo.length === 0) return null;
                    return (
                      <div className="mb-4 p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-neutral-500 text-xs mb-2 flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Fecha{datesInfo.length > 1 ? 's' : ''} estimada{datesInfo.length > 1 ? 's' : ''} de entrega
                        </p>
                        <div className="space-y-1">
                          {datesInfo.map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              {datesInfo.length > 1 && (
                                <span className="text-neutral-400 truncate mr-2">{d.concept}</span>
                              )}
                              <span className="text-green-400 font-medium whitespace-nowrap">
                                {new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* ── Multi-service rendering ── */}
              {quote.quote_request.services && quote.quote_request.services.length > 0 && (
                <div className="space-y-4">
                  <p className="text-neutral-400 text-sm font-medium">
                    {quote.quote_request.services.length} servicio{quote.quote_request.services.length > 1 ? 's' : ''} solicitado{quote.quote_request.services.length > 1 ? 's' : ''}
                  </p>
                  {quote.quote_request.services.map((svc, idx) => {
                    const svcDetails = svc.service_details as Record<string, unknown> | undefined;
                    const hasRouteDates = svcDetails && Array.isArray(svcDetails.rutas) &&
                      (svcDetails.rutas as Array<Record<string, unknown>>).some(r => !!r.fecha_inicio);
                    return (
                      <div key={svc.id} className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cmyk-cyan/20 text-cmyk-cyan text-sm font-bold">
                            {idx + 1}
                          </span>
                          <h4 className="text-white font-semibold text-lg">
                            {SERVICE_LABELS[svc.service_type as ServiceId] || svc.service_type}
                          </h4>
                        </div>

                        {/* Service-specific parameters */}
                        {svc.service_details && Object.keys(svc.service_details).length > 0 && (
                          <div className="mb-3">
                            <ServiceDetailsDisplay
                              serviceType={svc.service_type}
                              serviceDetails={svc.service_details as Record<string, unknown>}
                            />
                          </div>
                        )}

                        {svc.description && (
                          <p className="text-neutral-300 text-sm mb-3 whitespace-pre-wrap">{svc.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {svc.delivery_method && (
                            <div className="p-3 bg-neutral-900/50 rounded-lg flex flex-col">
                              <p className="text-neutral-500 text-xs mb-1">Método de entrega</p>
                              <p className="text-white font-medium flex items-center gap-1 mt-auto">
                                <span>{DELIVERY_METHOD_ICONS[svc.delivery_method as DeliveryMethod]}</span>
                                {DELIVERY_METHOD_LABELS[svc.delivery_method as DeliveryMethod]?.es || svc.delivery_method}
                              </p>
                            </div>
                          )}
                          {svc.pickup_branch_detail && (
                            <div className="p-3 bg-neutral-900/50 rounded-lg flex flex-col">
                              <p className="text-neutral-500 text-xs mb-1">Sucursal de recolección</p>
                              <p className="text-white font-medium mt-auto">{svc.pickup_branch_detail.name}</p>
                            </div>
                          )}
                          {svc.delivery_address && Object.keys(svc.delivery_address).length > 0 && (
                            <div className="p-3 bg-neutral-900/50 rounded-lg col-span-2 flex flex-col">
                              <p className="text-neutral-500 text-xs mb-1">
                                {svc.delivery_method === 'installation' ? 'Dirección de instalación' : 'Dirección de envío'}
                              </p>
                              <p className="text-white font-medium mt-auto">
                                {[svc.delivery_address.street || svc.delivery_address.calle,
                                  svc.delivery_address.exterior_number || svc.delivery_address.numero_exterior,
                                  svc.delivery_address.neighborhood || svc.delivery_address.colonia,
                                  svc.delivery_address.city || svc.delivery_address.ciudad,
                                  svc.delivery_address.state || svc.delivery_address.estado,
                                  svc.delivery_address.postal_code || svc.delivery_address.codigo_postal,
                                ].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          )}
                          {svc.required_date && !hasRouteDates && (
                            <div className="p-3 bg-neutral-900/50 rounded-lg flex flex-col">
                              <p className="text-neutral-500 text-xs mb-1">Fecha requerida</p>
                              <p className="text-white font-medium mt-auto">
                                {new Date(svc.required_date + 'T12:00:00').toLocaleDateString('es-MX', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                })}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Vendor's estimated delivery dates from quote lines */}
                        {(() => {
                          const matchedLines = serviceToLinesMap.get(idx);
                          if (!matchedLines) return null;
                          const datesInfo = matchedLines
                            .filter(l => l.estimated_delivery_date)
                            .map(l => ({ concept: l.concept, date: l.estimated_delivery_date! }));
                          if (datesInfo.length === 0) return null;
                          return (
                            <div className="mt-3 pt-3 border-t border-neutral-700/50">
                              <p className="text-neutral-500 text-xs mb-2 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                Fecha{datesInfo.length > 1 ? 's' : ''} estimada{datesInfo.length > 1 ? 's' : ''} de entrega
                              </p>
                              <div className="space-y-1">
                                {datesInfo.map((d, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    {datesInfo.length > 1 && (
                                      <span className="text-neutral-400 truncate mr-2">{d.concept}</span>
                                    )}
                                    <span className="text-green-400 font-medium whitespace-nowrap">
                                      {new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Per-service attachments */}
                        {svc.attachments && svc.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-700">
                            <p className="text-neutral-500 text-xs mb-2 flex items-center gap-1">
                              <PaperClipIcon className="h-3 w-3" />
                              Archivos adjuntos ({svc.attachments.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {svc.attachments.map((att) => {
                                const isImage = att.file_type?.startsWith('image/');
                                return (
                                  <a
                                    key={att.id}
                                    href={att.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-2 bg-neutral-900/50 rounded hover:bg-neutral-700 transition-colors group"
                                  >
                                    {isImage && (
                                      <img
                                        src={att.file}
                                        alt={att.filename || 'Archivo'}
                                        className="w-full h-20 object-cover rounded mb-1"
                                      />
                                    )}
                                    <p className="text-xs text-cmyk-cyan truncate group-hover:underline flex items-center gap-1">
                                      {!isImage && <PaperClipIcon className="h-3 w-3 flex-shrink-0" />}
                                      {att.filename || 'Archivo'}
                                    </p>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Description / Comments */}
              {quote.quote_request.description && (
                <div className="mt-4 p-4 bg-neutral-800/50 rounded-lg">
                  <p className="text-neutral-500 text-xs mb-2">Comentarios de la solicitud</p>
                  <p className="text-white whitespace-pre-wrap">{quote.quote_request.description}</p>
                </div>
              )}
            </Card>
          )}

          {/* Vendor-Added Items Section */}
          {vendorAddedLines.length > 0 && (
            <Card className="p-6 border-green-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-green-400" />
                  Conceptos Agregados por el Vendedor
                </h3>
                <span className="bg-green-500/10 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full border border-green-500/30">
                  {vendorAddedLines.length} concepto{vendorAddedLines.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-4">
                {vendorAddedLines.map((line, idx) => {
                  const sd = line.service_details as Record<string, unknown> | undefined;
                  const serviceType = sd?.service_type as string | undefined;

                  return (
                    <div
                      key={line.id || idx}
                      className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50"
                    >
                      {/* Service badge or concept header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          {serviceType && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30 mb-2">
                              {SERVICE_LABELS[serviceType as ServiceId] || serviceType}
                            </span>
                          )}
                          <p className="text-white font-medium">{line.concept}</p>
                          {line.description && (
                            <p className="text-neutral-400 text-sm mt-1">{line.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-semibold">{formatPrice(line.line_total)}</p>
                          <p className="text-neutral-500 text-xs">
                            {line.quantity} {line.unit} × {formatPrice(line.unit_price)}
                          </p>
                        </div>
                      </div>

                      {/* Service Details */}
                      {sd && Object.keys(sd).length > 0 && serviceType && (
                        <div className="mb-3">
                          <ServiceDetailsDisplay
                            serviceType={serviceType}
                            serviceDetails={sd}
                          />
                        </div>
                      )}

                      {/* Delivery info */}
                      {line.delivery_method && (
                        <div className="flex items-center gap-2 text-sm text-neutral-300 mt-2">
                          {line.delivery_method === 'shipping' && <TruckIcon className="h-4 w-4 text-neutral-400" />}
                          {line.delivery_method === 'pickup' && <MapPinIcon className="h-4 w-4 text-neutral-400" />}
                          {line.delivery_method === 'installation' && <WrenchScrewdriverIcon className="h-4 w-4 text-neutral-400" />}
                          <span>{DELIVERY_METHOD_LABELS[line.delivery_method as DeliveryMethod]?.es || line.delivery_method}</span>
                          {line.pickup_branch_detail && (
                            <span className="text-neutral-500">
                              — {line.pickup_branch_detail.name}, {line.pickup_branch_detail.city}
                            </span>
                          )}
                        </div>
                      )}
                      {line.delivery_address && typeof line.delivery_address === 'object' && Object.keys(line.delivery_address).length > 0 && (
                        <p className="text-neutral-400 text-xs mt-1">
                          {[line.delivery_address.street || line.delivery_address.calle, line.delivery_address.exterior_number || line.delivery_address.numero_exterior, line.delivery_address.neighborhood || line.delivery_address.colonia, line.delivery_address.city || line.delivery_address.ciudad, line.delivery_address.state || line.delivery_address.estado, line.delivery_address.postal_code || line.delivery_address.codigo_postal].filter(Boolean).join(', ')}
                        </p>
                      )}

                      {/* Estimated delivery date */}
                      {line.estimated_delivery_date && (
                        <div className="flex items-center gap-2 text-sm text-neutral-300 mt-2">
                          <CalendarIcon className="h-4 w-4 text-neutral-400" />
                          <span>
                            Entrega estimada:{' '}
                            {new Date(line.estimated_delivery_date + 'T12:00:00').toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Shipping cost */}
                      {parseFloat(line.shipping_cost || '0') > 0 && (
                        <div className="flex items-center gap-2 text-sm text-neutral-300 mt-2">
                          <TruckIcon className="h-4 w-4 text-neutral-400" />
                          <span>Envío: {formatPrice(line.shipping_cost || '0')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Request Attachments */}
          {quote.quote_request?.attachments && quote.quote_request.attachments.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PaperClipIcon className="h-5 w-5 text-cmyk-cyan" />
                Archivos de la Solicitud ({quote.quote_request.attachments.length})
              </h3>
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
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                Archivos Adjuntos ({quote.attachments.length})
              </h3>
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
        </div>

        {/* Sidebar */}
        <div>
          <div className="space-y-4">
          {/* Validity */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDaysIcon className="h-4 w-4 text-cmyk-cyan" />
              <h3 className="font-medium text-white text-xs">Vigencia</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-neutral-500 text-xs">Versión</p>
                <p className="text-white text-sm">v{quote.version}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Fecha de emisión</p>
                <p className="text-white text-sm">{formatDate(quote.created_at)}</p>
              </div>
              {quote.valid_until && (
                <div>
                  <p className="text-neutral-500 text-xs">Válida hasta</p>
                  <p className={`font-medium text-sm ${quote.is_expired ? 'text-red-400' : 'text-white'}`}>
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
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollarIcon className="h-4 w-4 text-cmyk-cyan" />
              <h3 className="font-medium text-white text-xs">Pago</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-neutral-500 text-xs">Modo de pago</p>
                <p className="text-white text-sm">Pago completo</p>
              </div>
              {quote.payment_conditions && (
                <div>
                  <p className="text-neutral-500 text-xs">Condiciones</p>
                  <p className="text-neutral-300 text-xs">{quote.payment_conditions}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Terms */}
          {quote.terms && (
            <Card className="p-4">
              <h3 className="font-medium text-white text-xs mb-2">Términos y Condiciones</h3>
              <p className="text-neutral-300 text-xs whitespace-pre-wrap">{quote.terms}</p>
            </Card>
          )}

          {/* Additional Info */}
          {(quote.delivery_method || quote.estimated_delivery_date || quote.included_services || quote.delivery_time_text || quote.payment_conditions || quote.lines?.some((l: QuoteLine) => l.delivery_method || l.estimated_delivery_date)) && (
            <Card className="p-4">
              <h3 className="font-medium text-white text-xs mb-2">Información Adicional</h3>
              <div className="space-y-2">
                {quote.delivery_method && (
                  <div>
                    <p className="text-neutral-500 text-xs">Método de Entrega</p>
                    <p className="text-white text-xs flex items-center gap-2">
                      <span>{DELIVERY_METHOD_ICONS[quote.delivery_method as DeliveryMethod]}</span>
                      {DELIVERY_METHOD_LABELS[quote.delivery_method as DeliveryMethod]?.es || quote.delivery_method}
                    </p>
                  </div>
                )}
                {quote.pickup_branch_detail && (
                  <div>
                    <p className="text-neutral-500 text-xs">Sucursal de recolección</p>
                    <p className="text-white text-xs">{quote.pickup_branch_detail.name} — {quote.pickup_branch_detail.city}, {quote.pickup_branch_detail.state}</p>
                  </div>
                )}
                {quote.delivery_address && Object.keys(quote.delivery_address).length > 0 && (
                  <div>
                    <p className="text-neutral-500 text-xs">
                      {quote.delivery_method === 'installation' ? 'Dirección de Instalación' : 'Dirección de Envío'}
                    </p>
                    <p className="text-white text-xs">
                      {[quote.delivery_address.street || quote.delivery_address.calle, quote.delivery_address.exterior_number || quote.delivery_address.numero_exterior, quote.delivery_address.neighborhood || quote.delivery_address.colonia, quote.delivery_address.city || quote.delivery_address.ciudad, quote.delivery_address.state || quote.delivery_address.estado, quote.delivery_address.postal_code || quote.delivery_address.codigo_postal].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {quote.estimated_delivery_date && (
                  <div>
                    <p className="text-neutral-500 text-xs">Fecha Estimada de Entrega</p>
                    <p className="text-white text-xs">{new Date(quote.estimated_delivery_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                {quote.delivery_time_text && (
                  <div>
                    <p className="text-neutral-500 text-xs">Tiempo de Entrega</p>
                    <p className="text-white text-xs">{quote.delivery_time_text}</p>
                  </div>
                )}
                {quote.payment_conditions && (
                  <div>
                    <p className="text-neutral-500 text-xs">Condiciones de Pago</p>
                    <p className="text-white text-xs">{quote.payment_conditions}</p>
                  </div>
                )}
                {quote.included_services && quote.included_services.length > 0 && (
                  <div>
                    <p className="text-neutral-500 text-xs">Servicios Incluidos</p>
                    <ul className="text-white text-xs list-disc list-inside">
                      {quote.included_services.map((service, index) => (
                        <li key={index}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Line-level delivery info when no quote-level delivery is set */}
                {!quote.delivery_method && quote.lines?.filter((l: QuoteLine) => l.delivery_method).length > 0 && (
                  <div>
                    <p className="text-neutral-500 text-xs">Entrega por concepto</p>
                    <div className="space-y-1 mt-1">
                      {quote.lines.filter((l: QuoteLine) => l.delivery_method).map((l: QuoteLine, i: number) => (
                        <p key={i} className="text-white text-xs flex items-center gap-1">
                          <span>{DELIVERY_METHOD_ICONS[l.delivery_method as DeliveryMethod]}</span>
                          <span className="text-neutral-400">{l.concept}:</span>{' '}
                          {DELIVERY_METHOD_LABELS[l.delivery_method as DeliveryMethod]?.es || l.delivery_method}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          </div>
          <div className="lg:sticky lg:top-20 mt-4 z-10">
          <Card className="p-4">
            <h3 className="font-medium text-white text-xs mb-2">Acciones</h3>
            <div className="space-y-2">
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
          </div>
        </div>
      </div>

      {/* Accept/Reject Modal */}
      {responseAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
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

      {/* Portal: Render Historial + Contact into the layout's left sidebar */}
      {sidebarPortal && createPortal(
        <>
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

            const sortedChangeRequests = [...changeRequests].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const changeRequestVersionMap = new Map<string, number>();
            sortedChangeRequests.forEach((cr, i) => changeRequestVersionMap.set(cr.id, i + 2));

            const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            return (
            <Card className="p-4">
              <h3 className="font-medium text-white text-xs mb-2 flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-cmyk-cyan" />
                Historial
              </h3>
              <div className="relative">
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-neutral-700 z-0"></div>
                <div className="space-y-3">

                  {eventsList.map((event, idx) => {
                    const circleBase = 'relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900';

                    if (event.type === 'change_request') {
                      const cr = event.data;
                      const crVersion = changeRequestVersionMap.get(cr.id) || 2;
                      return (
                        <Link
                          key={`cr-${cr.id}`}
                          href={`/${locale}/mi-cuenta/cotizaciones/${quoteId}/cambios/${cr.id}`}
                          className="relative flex items-start gap-2 group"
                        >
                          <div className={`${circleBase} border-orange-500/60`}>
                            <PencilIcon className="h-3 w-3 text-orange-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-orange-400 text-xs font-medium group-hover:underline">
                              Cambios v{crVersion}
                              {cr.changes_summary && (
                                <span className="ml-1 text-[10px] bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded-full">
                                  {[
                                    cr.changes_summary.added > 0 && `+${cr.changes_summary.added}`,
                                    cr.changes_summary.modified > 0 && `~${cr.changes_summary.modified}`,
                                    cr.changes_summary.deleted > 0 && `-${cr.changes_summary.deleted}`,
                                  ].filter(Boolean).join(' ')}
                                </span>
                              )}
                            </p>
                            <p className="text-neutral-500 text-[11px]">{fmtDate(cr.created_at)}</p>
                          </div>
                        </Link>
                      );
                    }

                    if (event.type === 'change_request_reviewed') {
                      const cr = event.data;
                      const isApproved = cr.status === 'approved';
                      return (
                        <div key={`cr-review-${cr.id}`} className="relative flex items-start gap-2">
                          <div className={`${circleBase} ${isApproved ? 'border-green-500/60' : 'border-red-500/60'}`}>
                            {isApproved ? <CheckCircleIcon className="h-3 w-3 text-green-400" /> : <XCircleIcon className="h-3 w-3 text-red-400" />}
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className={`text-xs font-medium ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
                              Cambios — {isApproved ? 'aprobada' : 'rechazada'}
                            </p>
                            <p className="text-neutral-500 text-[11px]">{fmtDate(cr.reviewed_at!)}</p>
                          </div>
                        </div>
                      );
                    }

                    const response = event.data as QuoteResponseType;

                    if (response.action === 'send') {
                      const version = sendVersionMap.get(response.id) || 1;
                      const versionLabel = version > 1 ? ` v${version}` : '';
                      return (
                        <div key={`r-${response.id}`} className="relative flex items-start gap-2">
                          <div className={`${circleBase} border-cmyk-cyan/60`}>
                            <PaperAirplaneIcon className="h-3 w-3 text-cmyk-cyan" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-cmyk-cyan text-xs font-medium">
                              Enviada{versionLabel}
                            </p>
                            <p className="text-neutral-500 text-[11px]">{fmtDate(response.created_at)}</p>
                          </div>
                        </div>
                      );
                    }

                    if (response.action === 'view') {
                      return (
                        <div key={`r-${response.id}`} className="relative flex items-start gap-2">
                          <div className={`${circleBase} border-purple-500/60`}>
                            <EyeIcon className="h-3 w-3 text-purple-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-purple-400 text-xs font-medium">Vista</p>
                            <p className="text-neutral-500 text-[11px]">{fmtDate(response.created_at)}</p>
                          </div>
                        </div>
                      );
                    }

                    if (response.action === 'approval') {
                      return (
                        <div key={`r-${response.id}`} className="relative flex items-start gap-2">
                          <div className={`${circleBase} border-green-500/60`}>
                            <CheckCircleIcon className="h-3 w-3 text-green-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-green-400 text-xs font-medium">Aceptada</p>
                            <p className="text-neutral-500 text-[11px]">{fmtDate(response.created_at)}</p>
                          </div>
                        </div>
                      );
                    }

                    if (response.action === 'rejection') {
                      return (
                        <div key={`r-${response.id}`} className="relative flex items-start gap-2">
                          <div className={`${circleBase} border-red-500/60`}>
                            <XCircleIcon className="h-3 w-3 text-red-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-red-400 text-xs font-medium">Rechazada</p>
                            <p className="text-neutral-500 text-[11px]">{fmtDate(response.created_at)}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={`r-${response.id}-${idx}`} className="relative flex items-start gap-2">
                        <div className={`${circleBase} border-blue-500/60`}>
                          <PencilIcon className="h-3 w-3 text-blue-400" />
                        </div>
                        <div className="flex-1 -mt-0.5">
                          <p className="text-blue-400 text-xs font-medium">{response.action_display || 'Comentario'}</p>
                          <p className="text-neutral-500 text-[11px]">{fmtDate(response.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}

                  {quote.sent_at && !hasSendResponses && (
                    <div className="relative flex items-start gap-2">
                      <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-cmyk-cyan/60">
                        <PaperAirplaneIcon className="h-3 w-3 text-cmyk-cyan" />
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <p className="text-cmyk-cyan text-xs font-medium">Enviada</p>
                        <p className="text-neutral-500 text-[11px]">{formatDate(quote.sent_at)}</p>
                      </div>
                    </div>
                  )}

                  {quote.quote_request && (
                    <>
                      <div className="relative flex items-center gap-2 py-0.5">
                        <div className="relative z-10 w-5 flex justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                        </div>
                        <div className="flex-1 border-t border-dashed border-neutral-700"></div>
                      </div>

                      {quote.quote_request.status !== 'pending' && (
                        <div className="relative flex items-start gap-2">
                          <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-yellow-500/60">
                            <ClockIcon className="h-3 w-3 text-yellow-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-yellow-400 text-xs font-medium">En revisión</p>
                            <p className="text-neutral-500 text-[11px]">{formatDate(quote.quote_request.updated_at)}</p>
                          </div>
                        </div>
                      )}

                      {quote.quote_request.assigned_at && (
                        <div className="relative flex items-start gap-2">
                          <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-blue-500/60">
                            <UserIcon className="h-3 w-3 text-blue-400" />
                          </div>
                          <div className="flex-1 -mt-0.5">
                            <p className="text-blue-400 text-xs font-medium">Asignada a {quote.quote_request.assigned_to_name || 'vendedor'}</p>
                            <p className="text-neutral-500 text-[11px]">{formatDate(quote.quote_request.assigned_at)}</p>
                          </div>
                        </div>
                      )}

                      <Link
                        href={`/${locale}/mi-cuenta/cotizaciones/${quoteId}/solicitud`}
                        className="relative flex items-start gap-2 group cursor-pointer"
                      >
                        <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full border bg-neutral-900 border-neutral-600">
                          <ChatBubbleLeftRightIcon className="h-3 w-3 text-neutral-400" />
                        </div>
                        <div className="flex-1 -mt-0.5">
                          <p className="text-neutral-400 text-xs font-medium group-hover:underline">Solicitud</p>
                          <p className="text-neutral-500 text-[11px]">
                            {quote.quote_request.customer_name} · {formatDate(quote.quote_request.created_at)}
                          </p>
                        </div>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </Card>
            );
          })()}

          {/* Contact */}
          <Card className="p-4 bg-cmyk-cyan/5 border-cmyk-cyan/20">
            <h3 className="font-medium text-white text-xs mb-1">¿Tienes preguntas?</h3>
            <p className="text-neutral-400 text-xs mb-2">
              Contáctanos sobre esta cotización.
            </p>
            <a
              href="mailto:ventas@mcd-agencia.com"
              className="text-cmyk-cyan hover:underline text-xs"
            >
              ventas@mcd-agencia.com
            </a>
          </Card>
        </>,
        sidebarPortal
      )}
    </div>
  );
}
