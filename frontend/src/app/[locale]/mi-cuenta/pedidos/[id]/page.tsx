'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

import { getOrderById, setOrderPaymentMethod } from '@/lib/api/orders';
import { getQuoteById, getQuotes } from '@/lib/api/quotes';
import { initiateMercadoPagoPayment, initiatePayPalPayment } from '@/lib/api/payments';
import { Card, Badge, Button, LoadingPage, Breadcrumb } from '@/components/ui';
import { formatPrice, formatDate, formatDateTime, cn } from '@/lib/utils';
import { DELIVERY_METHOD_LABELS, DELIVERY_METHOD_ICONS, type DeliveryMethod } from '@/lib/service-ids';
import { ServiceDetailsDisplay } from '@/components/quotes/ServiceDetailsDisplay';
import toast from 'react-hot-toast';

const STATUS_ICONS: Record<string, typeof CheckCircleIcon> = {
  draft: ClockIcon,
  pending_payment: ClockIcon,
  paid: CheckCircleIcon,
  partially_paid: CheckCircleIcon,
  in_production: ClockIcon,
  ready: CheckCircleIcon,
  in_delivery: TruckIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon,
  refunded: XCircleIcon,
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  paypal: 'PayPal',
  bank_transfer: 'Transferencia',
  cash: 'Efectivo',
};

const QUOTE_NUMBER_REGEX = /(COT-\d{8}-\d+)/i;

const extractQuoteNumber = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const match = value.match(QUOTE_NUMBER_REGEX);
  return match?.[1]?.toUpperCase() || '';
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const isMountedRef = useRef(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mercadopago' | 'paypal' | 'bank_transfer' | 'cash'>('mercadopago');
  const [isPaying, setIsPaying] = useState(false);
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
  const [activeAttachments, setActiveAttachments] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
  });

  const inferredQuoteNumber = (() => {
    if (!order) return '';

    const historyQuoteNumber = (Array.isArray(order.status_history) ? order.status_history : [])
      .map((entry) => extractQuoteNumber(entry?.notes))
      .find(Boolean);

    const skuQuoteNumber = (Array.isArray(order.lines) ? order.lines : [])
      .map((line) => extractQuoteNumber(line?.sku))
      .find(Boolean);

    return historyQuoteNumber || skuQuoteNumber || '';
  })();

  const { data: sourceQuoteById } = useQuery({
    queryKey: ['order-source-quote', order?.quote],
    queryFn: () => getQuoteById(order!.quote as string),
    enabled: Boolean(order?.quote),
  });

  const { data: sourceQuoteByNumber } = useQuery({
    queryKey: ['order-source-quote-by-number', inferredQuoteNumber],
    enabled: Boolean(!order?.quote && inferredQuoteNumber),
    queryFn: async () => {
      const response = await getQuotes({ search: inferredQuoteNumber, page: 1 });
      const exactMatch = response.results?.find(
        (quote) => quote.quote_number?.toUpperCase() === inferredQuoteNumber
      );
      return exactMatch || response.results?.[0] || null;
    },
  });

  const sourceQuote = sourceQuoteById || sourceQuoteByNumber || undefined;

  const toSafeText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  };

  const formatAddress = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value !== 'object' || Array.isArray(value)) return '';

    const address = value as Record<string, unknown>;
    const parts = [
      toSafeText(address.street) || toSafeText(address.calle),
      toSafeText(address.exterior_number) || toSafeText(address.numero_exterior),
      toSafeText(address.interior_number) || toSafeText(address.numero_interior),
      toSafeText(address.neighborhood) || toSafeText(address.colonia),
      toSafeText(address.city) || toSafeText(address.ciudad),
      toSafeText(address.state) || toSafeText(address.estado),
      toSafeText(address.postal_code) || toSafeText(address.codigo_postal),
      toSafeText(address.reference) || toSafeText(address.referencia),
    ].filter(Boolean);

    return parts.join(', ');
  };

  const parseJsonIfString = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };

  const isImageFile = (attachment: Record<string, unknown>): boolean => {
    const fileUrl = toSafeText(attachment.file_url) || toSafeText(attachment.file);
    const fileName = (toSafeText(attachment.file_name) || toSafeText(attachment.filename) || fileUrl).toLowerCase();
    return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/.test(fileName);
  };

  const openAttachmentsModal = (attachments: Array<Record<string, unknown>>) => {
    if (!attachments.length) return;
    setActiveAttachments(attachments);
    setIsAttachmentsModalOpen(true);
  };

  const flattenTechnicalDetails = (value: unknown, prefix = ''): Array<{ label: string; value: string }> => {
    const normalizedValue = parseJsonIfString(value);
    if (normalizedValue === null || normalizedValue === undefined || normalizedValue === '') return [];

    if (typeof normalizedValue === 'string' || typeof normalizedValue === 'number' || typeof normalizedValue === 'boolean') {
      return prefix ? [{ label: prefix, value: String(normalizedValue) }] : [];
    }

    if (Array.isArray(normalizedValue)) {
      const arrayEntries: Array<{ label: string; value: string }> = [];
      normalizedValue.forEach((item, index) => {
        const itemLabel = prefix ? `${prefix} [${index + 1}]` : `item_${index + 1}`;
        arrayEntries.push(...flattenTechnicalDetails(item, itemLabel));
      });
      return arrayEntries;
    }

    if (typeof normalizedValue !== 'object') return [];

    const entries: Array<{ label: string; value: string }> = [];
    for (const [key, rawValueInput] of Object.entries(normalizedValue as Record<string, unknown>)) {
      const rawValue = parseJsonIfString(rawValueInput);
      const label = prefix ? `${prefix} · ${key}` : key;
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;

      if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        entries.push({ label, value: String(rawValue) });
      } else if (Array.isArray(rawValue) || typeof rawValue === 'object') {
        entries.push(...flattenTechnicalDetails(rawValue, label));
      }
    }

    return entries;
  };

  if (isLoading) {
    return <LoadingPage message="Cargando pedido..." />;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-4">Pedido no encontrado</h2>
        <Link href="/mi-cuenta/pedidos">
          <Button>Volver a mis pedidos</Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[toSafeText(order.status)] || ClockIcon;
  const orderLines = Array.isArray(order.lines) ? order.lines : [];
  const statusHistory = Array.isArray(order.status_history) ? order.status_history : [];
  const quoteLinesById = new Map(
    (sourceQuote?.lines || []).map((quoteLine) => [String(quoteLine.id), quoteLine])
  );
  const shippingAddressText = formatAddress(order.shipping_address);
  const deliveryAddressText = formatAddress(order.delivery_address);
  const quoteDeliveryAddressText = formatAddress(sourceQuote?.delivery_address);
  const quoteRequestDeliveryAddressText = formatAddress(sourceQuote?.quote_request?.delivery_address);
  const deliveryMethod = toSafeText(order.delivery_method);
  const pickupBranchText = [
    toSafeText(order.pickup_branch_detail?.name),
    toSafeText(order.pickup_branch_detail?.full_address) || [
      toSafeText(order.pickup_branch_detail?.city),
      toSafeText(order.pickup_branch_detail?.state),
    ].filter(Boolean).join(', '),
  ].filter(Boolean).join(' — ');
  const paymentMethodText = toSafeText(order.payment_method);
  const paymentMethodLabel = PAYMENT_METHOD_LABELS[paymentMethodText] || paymentMethodText;
  const canPay = ['pending_payment', 'partially_paid'].includes(order.status) && Number(order.balance_due) > 0;
  const shouldShowSelectedPaymentMethod = Boolean(paymentMethodText) && !canPay;

  let deliveryAddressLabel = 'Dirección de envío';
  let resolvedDeliveryAddress = shippingAddressText;

  const fallbackFromLineMetadata = orderLines
    .map((line) => {
      const metadata = line.metadata && typeof line.metadata === 'object' && !Array.isArray(line.metadata)
        ? (line.metadata as Record<string, unknown>)
        : null;
      return formatAddress(metadata?.delivery_address);
    })
    .find(Boolean) || '';

  const metadataRecords = orderLines
    .map((line) => (line.metadata && typeof line.metadata === 'object' && !Array.isArray(line.metadata)
      ? (line.metadata as Record<string, unknown>)
      : null))
    .filter((record): record is Record<string, unknown> => Boolean(record));

  const fallbackRequestDescription = metadataRecords
    .map((record) => toSafeText(record.quote_request_description) || toSafeText(record.description))
    .find(Boolean) || '';

  const fallbackRequiredDate = metadataRecords
    .map((record) => toSafeText(record.quote_request_required_date) || toSafeText(record.required_date))
    .find(Boolean) || '';

  const fallbackAttachments = metadataRecords
    .flatMap((record) => {
      const attachments = parseJsonIfString(record.quote_request_attachments || record.attachments);
      return Array.isArray(attachments) ? attachments : [];
    })
    .filter((attachment) => attachment && typeof attachment === 'object') as Array<Record<string, unknown>>;

  const shouldShowRequestSection = Boolean(
    sourceQuote?.quote_request || fallbackRequestDescription || fallbackRequiredDate || fallbackAttachments.length
  );

  const globalDeliveryFallback =
    deliveryAddressText ||
    quoteDeliveryAddressText ||
    quoteRequestDeliveryAddressText ||
    fallbackFromLineMetadata ||
    shippingAddressText;

  if (deliveryMethod === 'installation') {
    deliveryAddressLabel = 'Dirección de instalación';
    resolvedDeliveryAddress = globalDeliveryFallback;
  } else if (deliveryMethod === 'shipping') {
    deliveryAddressLabel = 'Dirección de envío';
    resolvedDeliveryAddress = globalDeliveryFallback;
  } else if (deliveryMethod === 'pickup') {
    deliveryAddressLabel = 'Sucursal de recolección';
    resolvedDeliveryAddress = pickupBranchText || shippingAddressText;
  }

  const handlePayment = async () => {
    if (!canPay || isPaying) return;

    setIsPaying(true);
    try {
      await setOrderPaymentMethod(order.id, selectedPaymentMethod);

      if (!isMountedRef.current) return;

      if (selectedPaymentMethod === 'mercadopago') {
        const preference = await initiateMercadoPagoPayment(order.id);
        const redirectUrl = process.env.NODE_ENV === 'production'
          ? preference.init_point
          : preference.sandbox_init_point || preference.init_point;
        window.location.href = redirectUrl;
        return;
      }

      if (selectedPaymentMethod === 'paypal') {
        const paypalOrder = await initiatePayPalPayment(order.id);
        window.location.href = paypalOrder.approval_url;
        return;
      }

      if (!isMountedRef.current) return;

      if (selectedPaymentMethod === 'bank_transfer') {
        toast.success('Método seleccionado: transferencia. Un administrador confirmará el pago.');
      } else {
        toast.success('Método seleccionado: efectivo. Un administrador confirmará el pago.');
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      const err = error as { message?: string };
      toast.error(err.message || 'Error al procesar el pago');
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mi Cuenta', href: '/mi-cuenta' },
          { label: 'Pedidos', href: '/mi-cuenta/pedidos' },
          { label: `#${order.order_number}` },
        ]}
        showHome={false}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Pedido #{order.order_number}</h2>
          <p className="text-neutral-400">Realizado el {formatDate(order.created_at)}</p>
        </div>
        <Badge
          variant={
            order.status === 'completed'
              ? 'success'
              : order.status === 'cancelled'
              ? 'error'
              : order.status === 'paid' || order.status === 'in_production'
              ? 'info'
              : 'warning'
          }
          size="md"
        >
          <StatusIcon className="h-4 w-4 mr-1" />
          {toSafeText(order.status_display) || toSafeText(order.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Productos</h3>
            
            {/* DEBUG: Show if quote is loaded */}
            {order.quote && !sourceQuote && (
              <div className="mb-4 p-2 bg-blue-900/30 border border-blue-700 rounded text-xs text-blue-300">
                Cargando información de la solicitud original...
              </div>
            )}
            
            {/* Solicitud original y archivos adjuntos */}
            {shouldShowRequestSection && (
              <div className="mb-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-3">Información de la Solicitud Original</h4>
                
                {(sourceQuote?.quote_request?.description || fallbackRequestDescription) && (
                  <p className="text-sm text-neutral-300">
                    <span className="text-neutral-400">Comentarios del cliente:</span>{' '}
                    {sourceQuote?.quote_request?.description || fallbackRequestDescription}
                  </p>
                )}
              </div>
            )}

            {/* DEBUG: If quote exists but quote_request doesn't */}
            {sourceQuote && !sourceQuote.quote_request && (
              <div className="mb-4 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
                ⚠️ Cotización sin información de solicitud original
              </div>
            )}

            <div className="divide-y divide-neutral-800">
              {orderLines.map((line) => (
                <div key={line.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                      {toSafeText(line.sku)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{toSafeText(line.name)}</p>
                    {(() => {
                      const metadata = line.metadata && typeof line.metadata === 'object' && !Array.isArray(line.metadata)
                        ? (line.metadata as Record<string, unknown>)
                        : null;
                      const quoteLineId = toSafeText(metadata?.quote_line_id);
                      const quoteLine = quoteLineId ? quoteLinesById.get(quoteLineId) : undefined;
                      const fullDescription =
                        toSafeText(metadata?.quote_line_description) ||
                        toSafeText(quoteLine?.description) ||
                        toSafeText(metadata?.description) ||
                        toSafeText(line.variant_name);

                      const metadataServiceDetails = parseJsonIfString(metadata?.service_details);
                      const quoteLineServiceDetails = parseJsonIfString(quoteLine?.service_details);
                      const metadataQuoteRequestDetails = parseJsonIfString(metadata?.quote_request_service_details);
                      const sourceRequestDetails = parseJsonIfString(sourceQuote?.quote_request?.service_details);
                      const sourceRequestServices = Array.isArray(sourceQuote?.quote_request?.services)
                        ? sourceQuote?.quote_request?.services
                        : [];

                      const inferredServiceType = toSafeText(
                        (metadataServiceDetails as Record<string, unknown> | undefined)?.service_type ||
                        (quoteLineServiceDetails as Record<string, unknown> | undefined)?.service_type ||
                        metadata?.quote_request_service_type
                      );

                      const matchedRequestService = inferredServiceType
                        ? sourceRequestServices.find((service) => service.service_type === inferredServiceType)
                        : (sourceRequestServices.length === 1 ? sourceRequestServices[0] : undefined);

                      const matchedRequestServiceDetails = parseJsonIfString(matchedRequestService?.service_details);
                      const metadataForFallback = metadata
                        ? Object.fromEntries(
                            Object.entries(metadata).filter(([key]) => ![
                              'quote_line_id',
                              'quote_line_description',
                              'quote_line_description_en',
                              'delivery_method',
                              'delivery_address',
                              'pickup_branch_id',
                              'unit',
                              'original_quantity',
                              'description',
                              'quote_request_service_type',
                              'quote_request_service_details',
                              'quote_request_description',
                              'quote_request_quantity',
                              'quote_request_dimensions',
                              'quote_request_material',
                              'quote_request_includes_installation',
                            ].includes(key))
                          )
                        : undefined;

                      const technicalSource =
                        (metadataServiceDetails && typeof metadataServiceDetails === 'object' ? metadataServiceDetails : undefined) ||
                        (quoteLineServiceDetails && typeof quoteLineServiceDetails === 'object' ? quoteLineServiceDetails : undefined) ||
                        (metadataQuoteRequestDetails && typeof metadataQuoteRequestDetails === 'object' ? metadataQuoteRequestDetails : undefined) ||
                        (matchedRequestServiceDetails && typeof matchedRequestServiceDetails === 'object' ? matchedRequestServiceDetails : undefined) ||
                        (sourceRequestDetails && typeof sourceRequestDetails === 'object' ? sourceRequestDetails : undefined) ||
                        metadataForFallback;

                      const requestLevelDescription =
                        toSafeText(matchedRequestService?.description) ||
                        toSafeText(sourceQuote?.quote_request?.description);

                      const resolvedDescription = fullDescription || requestLevelDescription;

                      const technicalItems = flattenTechnicalDetails(technicalSource)
                        .filter((item) => item.label !== 'service_type' && item.label !== 'service_details')
                        .slice(0, 20);

                      const hasServiceDetails = inferredServiceType && technicalSource && typeof technicalSource === 'object';

                      const rawLineAttachments = [
                        ...(Array.isArray(matchedRequestService?.attachments) ? matchedRequestService.attachments : []),
                        ...(Array.isArray(sourceQuote?.quote_request?.attachments) ? sourceQuote.quote_request.attachments : []),
                        ...fallbackAttachments,
                      ].filter((attachment) => attachment && typeof attachment === 'object') as Array<Record<string, unknown>>;

                      const uniqueLineAttachments = rawLineAttachments.filter((attachment, index, self) => {
                        const currentKey = toSafeText(attachment.id) || toSafeText(attachment.file_url) || toSafeText(attachment.file);
                        return self.findIndex((item) => {
                          const itemKey = toSafeText(item.id) || toSafeText(item.file_url) || toSafeText(item.file);
                          return itemKey === currentKey;
                        }) === index;
                      });

                      const lineDeliveryMethod =
                        toSafeText(quoteLine?.delivery_method) ||
                        toSafeText(metadata?.delivery_method) ||
                        toSafeText(matchedRequestService?.delivery_method) ||
                        toSafeText(sourceQuote?.quote_request?.delivery_method) ||
                        toSafeText(order.delivery_method);

                      const lineDeliveryMethodLabel =
                        DELIVERY_METHOD_LABELS[lineDeliveryMethod as DeliveryMethod]?.es || lineDeliveryMethod;

                      const lineDeliveryAddress =
                        formatAddress(quoteLine?.delivery_address) ||
                        formatAddress(metadata?.delivery_address) ||
                        formatAddress(matchedRequestService?.delivery_address) ||
                        formatAddress(sourceQuote?.quote_request?.delivery_address);

                      const resolvedRequiredDate =
                        toSafeText(matchedRequestService?.required_date) ||
                        toSafeText(sourceQuote?.quote_request?.required_date) ||
                        fallbackRequiredDate;
                      
                      // Find matching quote line for additional details like estimated_delivery_date
                      const matchingQuoteLine = sourceQuote?.lines?.find(
                        (ql) => ql.concept === line.name || ql.description === line.variant_name
                      );

                      return (
                        <>
                          {resolvedDescription && <p className="text-sm text-neutral-400">{resolvedDescription}</p>}
                          
                          {hasServiceDetails && inferredServiceType && (
                            <div className="mt-2 rounded-md bg-neutral-900/60 border border-neutral-800 p-3">
                              <p className="text-sm font-medium text-neutral-300 mb-3">Parámetros del servicio</p>
                              <ServiceDetailsDisplay
                                serviceType={inferredServiceType}
                                serviceDetails={technicalSource as Record<string, unknown>}
                              />

                              {uniqueLineAttachments.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-neutral-800">
                                  <p className="text-xs text-neutral-500 mb-1">Archivos adjuntos</p>
                                  <button
                                    type="button"
                                    onClick={() => openAttachmentsModal(uniqueLineAttachments)}
                                    className="inline-flex items-center gap-2 text-sm text-cmyk-cyan hover:text-cmyk-cyan/80"
                                  >
                                    <PaperClipIcon className="h-4 w-4" />
                                    Ver archivos
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {!hasServiceDetails && technicalItems.length > 0 && (
                            <div className="mt-2 rounded-md bg-neutral-900/60 border border-neutral-800 p-2">
                              <p className="text-[11px] font-medium text-neutral-300 mb-1">Detalles técnicos</p>
                              <ul className="space-y-1">
                                {technicalItems.map((item, index) => (
                                  <li key={`${line.id}-tech-${index}`} className="text-[11px] text-neutral-400">
                                    <span className="text-neutral-500">{item.label}:</span> {item.value}
                                  </li>
                                ))}
                              </ul>

                              {uniqueLineAttachments.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-neutral-800/80">
                                  <p className="text-[11px] text-neutral-500 mb-1">Archivos adjuntos</p>
                                  <button
                                    type="button"
                                    onClick={() => openAttachmentsModal(uniqueLineAttachments)}
                                    className="inline-flex items-center gap-2 text-xs text-cmyk-cyan hover:text-cmyk-cyan/80"
                                  >
                                    <PaperClipIcon className="h-3.5 w-3.5" />
                                    Ver archivos
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-2 space-y-1 text-sm text-neutral-400">
                            {(matchingQuoteLine?.estimated_delivery_date || order.scheduled_date || resolvedRequiredDate) && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <span className="inline-flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4 text-cmyk-cyan" />
                                  <span>
                                    Entrega estimada:{' '}
                                    <span className="text-white font-medium">
                                      {matchingQuoteLine?.estimated_delivery_date
                                        ? new Date(matchingQuoteLine.estimated_delivery_date + 'T12:00:00').toLocaleDateString('es-MX', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                          })
                                        : order.scheduled_date ? formatDate(order.scheduled_date) : 'No especificada'}
                                    </span>
                                  </span>
                                </span>

                                {resolvedRequiredDate && (
                                  <span>
                                    Fecha requerida:{' '}
                                    <span className="text-white font-medium">
                                      {new Date(resolvedRequiredDate + 'T12:00:00').toLocaleDateString('es-MX', {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                      })}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}

                            {lineDeliveryMethodLabel && (
                              <p>
                                Método de entrega:{' '}
                                <span className="text-white font-medium">{lineDeliveryMethodLabel}</span>
                              </p>
                            )}

                            {lineDeliveryAddress && (
                              <p>
                                Dirección de entrega:{' '}
                                <span className="text-white">{lineDeliveryAddress}</span>
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    <p className="text-sm text-neutral-400">SKU: {toSafeText(line.sku)}</p>
                  </div>
                  <div className="text-right min-w-[140px]">
                    <p className="text-sm text-neutral-400">{formatPrice(line.unit_price)} × {line.quantity}</p>
                    <p className="text-cyan-400 font-semibold text-lg leading-tight">{formatPrice(line.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Historial</h3>
            <div className="space-y-4">
              {statusHistory.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="relative">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        index === 0 ? 'bg-cmyk-cyan' : 'bg-neutral-700'
                      )}
                    />
                    {index < order.status_history.length - 1 && (
                      <div className="absolute top-3 left-1.5 w-px h-full -translate-x-1/2 bg-neutral-700" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-white font-medium">
                      {toSafeText(history.to_status).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {formatDateTime(history.created_at)}
                      {toSafeText(history.changed_by_name) && ` por ${toSafeText(history.changed_by_name)}`}
                    </p>
                    {toSafeText(history.notes) && (
                      <p className="text-sm text-neutral-500 mt-1">{toSafeText(history.notes)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Resumen</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>IVA ({order.tax_rate}%)</span>
                <span>{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-neutral-800">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>

              {!order.is_fully_paid && (
                <>
                  <div className="flex justify-between text-green-500 pt-2">
                    <span>Pagado</span>
                    <span>{formatPrice(order.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-cmyk-yellow">
                    <span>Saldo pendiente</span>
                    <span>{formatPrice(order.balance_due)}</span>
                  </div>
                </>
              )}
            </div>

            {shouldShowSelectedPaymentMethod && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <p className="text-sm text-neutral-400">Método de pago</p>
                <p className="text-white">{paymentMethodLabel}</p>
              </div>
            )}
          </Card>

          {canPay && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Realizar pago</h3>
              <div className="space-y-3">
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'mercadopago' | 'paypal' | 'bank_transfer' | 'cash')}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-cmyk-cyan focus:outline-none"
                >
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                </select>

                {(selectedPaymentMethod === 'bank_transfer' || selectedPaymentMethod === 'cash') && (
                  <p className="text-xs text-neutral-400">
                    Este método requiere validación manual por administrador.
                  </p>
                )}

                <Button
                  onClick={handlePayment}
                  isLoading={isPaying}
                  className="w-full"
                >
                  {selectedPaymentMethod === 'mercadopago' || selectedPaymentMethod === 'paypal'
                    ? 'Continuar al pago'
                    : 'Solicitar confirmación de pago'}
                </Button>
              </div>
            </Card>
          )}

          {/* Delivery Method */}
          {order.delivery_method && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Método de Entrega</h3>
              <p className="text-white flex items-center gap-2">
                <span>{DELIVERY_METHOD_ICONS[order.delivery_method as DeliveryMethod]}</span>
                {DELIVERY_METHOD_LABELS[order.delivery_method as DeliveryMethod]?.es || order.delivery_method}
              </p>
              {order.pickup_branch_detail && (
                <div className="mt-3">
                  <p className="text-sm text-neutral-400">Sucursal de recolección</p>
                  <p className="text-white">{order.pickup_branch_detail.name} — {order.pickup_branch_detail.city}, {order.pickup_branch_detail.state}</p>
                </div>
              )}
              {order.delivery_address && Object.keys(order.delivery_address).length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-neutral-400">
                    {order.delivery_method === 'installation' ? 'Dirección de instalación' : 'Dirección de envío'}
                  </p>
                  <p className="text-white text-sm">
                    {[order.delivery_address.street || order.delivery_address.calle, order.delivery_address.exterior_number || order.delivery_address.numero_exterior, order.delivery_address.neighborhood || order.delivery_address.colonia, order.delivery_address.city || order.delivery_address.ciudad, order.delivery_address.state || order.delivery_address.estado, order.delivery_address.postal_code || order.delivery_address.codigo_postal].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {order.scheduled_date && (
                <div className="mt-3">
                  <p className="text-sm text-neutral-400">Fecha programada</p>
                  <p className="text-white">{formatDate(order.scheduled_date)}</p>
                </div>
              )}
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">{deliveryAddressLabel}</h3>
            <p className="text-neutral-300 whitespace-pre-line">{resolvedDeliveryAddress || 'Sin dirección registrada'}</p>
          </Card>

          {order.tracking_number && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Seguimiento</h3>
              <p className="text-neutral-400 mb-2">Número de guía</p>
              <p className="text-white font-mono">{toSafeText(order.tracking_number)}</p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3"
                >
                  <Button variant="outline" size="sm">
                    Rastrear envío
                  </Button>
                </a>
              )}
            </Card>
          )}

          {order.notes && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Notas</h3>
              <p className="text-neutral-400">{toSafeText(order.notes)}</p>
            </Card>
          )}
        </div>
      </div>

      {isAttachmentsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <h4 className="text-white font-semibold">Archivos adjuntos</h4>
              <button
                type="button"
                onClick={() => setIsAttachmentsModalOpen(false)}
                className="text-sm text-neutral-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(85vh-64px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeAttachments.map((attachment, index) => {
                  const fileUrl = toSafeText(attachment.file_url) || toSafeText(attachment.file);
                  const fileName = toSafeText(attachment.file_name) || toSafeText(attachment.filename) || `Archivo ${index + 1}`;

                  if (!fileUrl) {
                    return (
                      <div key={`${fileName}-${index}`} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                        <p className="text-sm text-neutral-300">{fileName}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={`${fileUrl}-${index}`} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 space-y-2">
                      {isImageFile(attachment) ? (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <div className="relative w-full h-48 rounded-md overflow-hidden border border-neutral-800">
                            <Image
                              src={fileUrl}
                              alt={fileName}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        </a>
                      ) : (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cmyk-cyan hover:text-cmyk-cyan/80"
                        >
                          Abrir archivo
                        </a>
                      )}
                      <p className="text-xs text-neutral-400 break-all">{fileName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
