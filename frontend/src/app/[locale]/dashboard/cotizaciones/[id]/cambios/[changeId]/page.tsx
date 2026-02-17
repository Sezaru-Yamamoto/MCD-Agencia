'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  MinusIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  PhotoIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  CalendarIcon,
  TruckIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage } from '@/components/ui';
import { ServiceDetailsDisplay } from '@/components/quotes';
import { SERVICE_LABELS, DELIVERY_METHOD_LABELS, DELIVERY_METHOD_ICONS, type ServiceId, type DeliveryMethod } from '@/lib/service-ids';
import {
  getChangeRequestById,
  reviewChangeRequest,
  getAdminQuoteById,
  downloadChangeRequestPdf,
  QuoteChangeRequest,
  Quote,
} from '@/lib/api/quotes';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  approved: 'bg-green-500/20 text-green-400 border-green-500',
  rejected: 'bg-red-500/20 text-red-400 border-red-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente de revision',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export default function ChangeRequestReviewPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [changeRequest, setChangeRequest] = useState<QuoteChangeRequest | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState<'approve' | 'reject' | null>(null);

  const quoteId = params.id as string;
  const changeId = params.changeId as string;
  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/dashboard/cotizaciones/${quoteId}/cambios/${changeId}`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale, quoteId, changeId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!changeId || !quoteId || !isAuthenticated || !isSalesOrAdmin) return;

      setIsLoading(true);
      try {
        const [changeData, quoteData] = await Promise.all([
          getChangeRequestById(changeId),
          getAdminQuoteById(quoteId),
        ]);
        setChangeRequest(changeData);
        setQuote(quoteData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar la solicitud');
        router.push(`/${locale}/dashboard/cotizaciones/${quoteId}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [changeId, quoteId, isAuthenticated, isSalesOrAdmin, router, locale]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!changeRequest) return;

    setIsReviewing(true);
    try {
      const result = await reviewChangeRequest(changeRequest.id, action, reviewNotes);
      setChangeRequest(result.change_request);
      setShowReviewModal(null);
      setReviewNotes('');
      toast.success(action === 'approve' ? 'Solicitud aprobada' : 'Solicitud rechazada');

      if (action === 'approve') {
        // Redirect to edit the quote
        router.push(`/${locale}/dashboard/cotizaciones/${quoteId}/editar`);
      }
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsReviewing(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [expandedAddedServices, setExpandedAddedServices] = useState<Set<number>>(new Set());

  const toggleAddedService = (idx: number) => {
    setExpandedAddedServices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDownloadPdf = async () => {
    if (!changeRequest) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await downloadChangeRequestPdf(changeRequest.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion_${changeRequest.quote_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar el PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add':
        return <PlusIcon className="h-4 w-4 text-green-400" />;
      case 'delete':
        return <TrashIcon className="h-4 w-4 text-red-400" />;
      case 'modify':
        return <PencilIcon className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'add':
        return 'Agregar';
      case 'delete':
        return 'Eliminar';
      case 'modify':
        return 'Modificar';
      default:
        return action;
    }
  };

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando solicitud de cambios..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin || !changeRequest || !quote) {
    return null;
  }

  const originalLines = changeRequest.original_snapshot.lines || [];

  return (
    <div className="max-w-6xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/dashboard/cotizaciones/${quoteId}`}
              className="p-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Solicitud de Cambios</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[changeRequest.status]}`}>
                  {changeRequest.status === 'pending' && <ClockIcon className="h-4 w-4" />}
                  {changeRequest.status === 'approved' && <CheckCircleIcon className="h-4 w-4" />}
                  {changeRequest.status === 'rejected' && <XCircleIcon className="h-4 w-4" />}
                  {statusLabels[changeRequest.status]}
                </span>
              </div>
              <p className="text-neutral-400 mt-1">
                Para cotizacion {changeRequest.quote_number} - Recibida el {formatDate(changeRequest.created_at)}
              </p>
            </div>
          </div>

          {changeRequest.status === 'pending' && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowReviewModal('reject')}
                variant="outline"
                className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                leftIcon={<XCircleIcon className="h-4 w-4" />}
              >
                Rechazar
              </Button>
              <Button
                onClick={() => setShowReviewModal('approve')}
                className="bg-green-600 hover:bg-green-700"
                leftIcon={<CheckCircleIcon className="h-4 w-4" />}
              >
                Aprobar y Editar
              </Button>
            </div>
          )}
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
                  <p className="text-white font-medium">{changeRequest.customer_name}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Email</p>
                  <p className="text-white">{changeRequest.customer_email}</p>
                </div>
              </div>
            </Card>

            {/* Proposed Changes */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Cambios Solicitados</h2>

              {/* Summary */}
              <div className="flex flex-wrap gap-3 mb-6">
                {changeRequest.changes_summary.added > 0 && (
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                    +{changeRequest.changes_summary.added} agregado(s)
                  </span>
                )}
                {changeRequest.changes_summary.modified > 0 && (
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
                    {changeRequest.changes_summary.modified} modificado(s)
                  </span>
                )}
                {changeRequest.changes_summary.deleted > 0 && (
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                    -{changeRequest.changes_summary.deleted} eliminado(s)
                  </span>
                )}
              </div>

              {/* Changes List */}
              <div className="space-y-4">
                {changeRequest.proposed_lines.map((line, index) => {
                  const originalLine = line.id
                    ? originalLines.find((ol) => ol.id === line.id)
                    : null;

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        line.action === 'add'
                          ? 'bg-green-500/10 border-green-500/30'
                          : line.action === 'delete'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded bg-neutral-800">
                          {getActionIcon(line.action)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              line.action === 'add'
                                ? 'bg-green-500/30 text-green-400'
                                : line.action === 'delete'
                                ? 'bg-red-500/30 text-red-400'
                                : 'bg-yellow-500/30 text-yellow-400'
                            }`}>
                              {getActionLabel(line.action)}
                            </span>
                          </div>

                          {line.action === 'add' ? (() => {
                            const sd = line.service_details as Record<string, unknown> | undefined;
                            const serviceType = sd?.service_type as string | undefined;
                            const svcLabel = serviceType
                              ? (SERVICE_LABELS[serviceType as ServiceId] || serviceType)
                              : line.concept;
                            const isOpen = expandedAddedServices.has(index);
                            const deliveryMethod = sd?.delivery_method as string | undefined;
                            const requiredDate = sd?.required_date as string | undefined;
                            const deliveryAddress = sd?.delivery_address as Record<string, string> | undefined;
                            const pickupBranch = sd?.pickup_branch_detail as Record<string, string> | undefined;
                            const hasRouteDates = sd && Array.isArray(sd.rutas) &&
                              (sd.rutas as Array<Record<string, unknown>>).some(r => !!r.fecha_inicio);
                            const routeCount = sd && Array.isArray(sd.rutas) ? (sd.rutas as unknown[]).length : 0;

                            return (
                              <div className="w-full">
                                {/* Accordion-style service display */}
                                <div className="rounded-lg border border-neutral-700/50 overflow-hidden mt-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleAddedService(index)}
                                    className="w-full flex items-center gap-3 p-4 bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-left"
                                  >
                                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex-shrink-0">
                                      <PlusIcon className="h-4 w-4" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-white font-semibold text-sm truncate">
                                          {svcLabel}
                                          {routeCount > 1 && (
                                            <span className="ml-2 text-xs font-normal text-neutral-400">({routeCount} rutas)</span>
                                          )}
                                        </p>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                                          <UserIcon className="h-3 w-3" />
                                          Agregado por el cliente
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        <span className="text-neutral-400 text-xs">
                                          {line.quantity} {line.unit}
                                        </span>
                                        {deliveryMethod && (
                                          <span className="text-neutral-500 text-xs flex items-center gap-1">
                                            <span className="text-xs">{DELIVERY_METHOD_ICONS[deliveryMethod as DeliveryMethod]}</span>
                                            {DELIVERY_METHOD_LABELS[deliveryMethod as DeliveryMethod]?.es || deliveryMethod}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronDownIcon className={`h-5 w-5 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>

                                  {isOpen && (
                                    <div className="p-4 border-t border-neutral-700 space-y-3">
                                      {line.concept && serviceType && line.concept !== svcLabel && (
                                        <div>
                                          <p className="text-white font-medium">{line.concept}</p>
                                        </div>
                                      )}
                                      {line.description && (
                                        <p className="text-neutral-400 text-sm">{line.description}</p>
                                      )}

                                      {/* Service-specific parameters */}
                                      {sd && Object.keys(sd).length > 0 && serviceType && (
                                        <div>
                                          <ServiceDetailsDisplay
                                            serviceType={serviceType}
                                            serviceDetails={sd}
                                          />
                                        </div>
                                      )}

                                      {/* Delivery Method */}
                                      {deliveryMethod && (
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div className="p-3 bg-neutral-900/50 rounded-lg flex flex-col">
                                            <p className="text-neutral-500 text-xs mb-1">Método de entrega</p>
                                            <p className="text-white font-medium flex items-center gap-1 mt-auto">
                                              <span>{DELIVERY_METHOD_ICONS[deliveryMethod as DeliveryMethod]}</span>
                                              {DELIVERY_METHOD_LABELS[deliveryMethod as DeliveryMethod]?.es || deliveryMethod}
                                            </p>
                                          </div>
                                          {pickupBranch && (
                                            <div className="p-3 bg-neutral-900/50 rounded-lg flex flex-col">
                                              <p className="text-neutral-500 text-xs mb-1">Sucursal de recolección</p>
                                              <p className="text-white font-medium mt-auto">{pickupBranch.name}</p>
                                            </div>
                                          )}
                                          {deliveryAddress && Object.keys(deliveryAddress).length > 0 && (
                                            <div className="p-3 bg-neutral-900/50 rounded-lg col-span-2 flex flex-col">
                                              <p className="text-neutral-500 text-xs mb-1">
                                                {deliveryMethod === 'installation' ? 'Dirección de instalación' : 'Dirección de envío'}
                                              </p>
                                              <p className="text-white font-medium mt-auto">
                                                {[deliveryAddress.street || deliveryAddress.calle, deliveryAddress.exterior_number || deliveryAddress.numero_exterior, deliveryAddress.neighborhood || deliveryAddress.colonia, deliveryAddress.city || deliveryAddress.ciudad, deliveryAddress.state || deliveryAddress.estado, deliveryAddress.postal_code || deliveryAddress.codigo_postal].filter(Boolean).join(', ')}
                                              </p>
                                            </div>
                                          )}
                                          {requiredDate && !hasRouteDates && (
                                            <div className="p-3 bg-neutral-900/50 rounded-lg flex flex-col">
                                              <p className="text-neutral-500 text-xs mb-1">Fecha requerida</p>
                                              <p className="text-white font-medium mt-auto">
                                                {new Date(requiredDate + 'T12:00:00').toLocaleDateString('es-MX', {
                                                  year: 'numeric', month: 'short', day: 'numeric',
                                                })}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Required Date (when no delivery method) */}
                                      {!deliveryMethod && requiredDate && !hasRouteDates && (
                                        <div className="p-3 bg-neutral-900/50 rounded-lg flex items-center gap-3">
                                          <CalendarIcon className="h-5 w-5 text-neutral-400" />
                                          <div>
                                            <p className="text-neutral-500 text-xs">Fecha Requerida</p>
                                            <p className="text-white">
                                              {new Date(requiredDate + 'T12:00:00').toLocaleDateString('es-MX', {
                                                year: 'numeric', month: 'long', day: 'numeric',
                                              })}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })() : line.action === 'delete' ? (
                            <div>
                              <p className="text-white font-medium line-through">
                                {originalLine?.concept}
                              </p>
                              {originalLine?.description && (
                                <p className="text-neutral-400 text-sm line-through">
                                  {originalLine.description}
                                </p>
                              )}
                              <p className="text-neutral-500 text-sm mt-1">
                                {originalLine?.quantity} {originalLine?.unit} x{' '}
                                {formatCurrency(originalLine?.unit_price || 0)}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-white font-medium">{originalLine?.concept}</p>

                              {/* Show what changed */}
                              <div className="mt-2 space-y-1">
                                {line.quantity !== undefined &&
                                  String(line.quantity) !== originalLine?.quantity && (
                                    <div className="text-sm">
                                      <span className="text-neutral-500">Cantidad: </span>
                                      <span className="text-red-400 line-through">
                                        {originalLine?.quantity}
                                      </span>
                                      <span className="text-neutral-500 mx-1">→</span>
                                      <span className="text-green-400">{line.quantity}</span>
                                    </div>
                                  )}

                                {line.description !== undefined &&
                                  line.description !== originalLine?.description && (
                                    <div className="text-sm mt-1">
                                      <span className="text-yellow-500 font-medium">Cambios solicitados:</span>
                                      {line.description && (
                                        <p className="text-yellow-400 text-sm mt-0.5 whitespace-pre-line p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                                          {line.description}
                                        </p>
                                      )}
                                      {originalLine?.description && (
                                        <details className="mt-1">
                                          <summary className="text-neutral-500 text-xs cursor-pointer hover:text-neutral-400">
                                            Ver descripción original
                                          </summary>
                                          <p className="text-neutral-500 text-xs mt-1 whitespace-pre-line">
                                            {originalLine.description}
                                          </p>
                                        </details>
                                      )}
                                    </div>
                                  )}

                                {/* Service details modified by client */}
                                {line.service_details && Object.keys(line.service_details).length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-yellow-500/20">
                                    <p className="text-xs text-yellow-500 font-medium mb-2">Detalle del servicio (modificado por el cliente):</p>
                                    <ServiceDetailsDisplay
                                      serviceType={String(line.service_details.service_type || originalLine?.service_type || '')}
                                      serviceDetails={line.service_details}
                                    />
                                    {/* Show original service details for comparison */}
                                    {originalLine?.service_details && Object.keys(originalLine.service_details).length > 0 && (
                                      <details className="mt-2">
                                        <summary className="text-neutral-500 text-xs cursor-pointer hover:text-neutral-400">
                                          Ver detalle de servicio original
                                        </summary>
                                        <div className="mt-2 p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                                          <ServiceDetailsDisplay
                                            serviceType={originalLine.service_type || ''}
                                            serviceDetails={originalLine.service_details}
                                          />
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Customer Comments */}
            {changeRequest.customer_comments && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-cmyk-cyan" />
                  Comentarios del Cliente
                </h2>
                <p className="text-neutral-300 whitespace-pre-wrap">
                  {changeRequest.customer_comments}
                </p>
              </Card>
            )}

            {/* Attachments */}
            {changeRequest.attachments && changeRequest.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PaperClipIcon className="h-5 w-5 text-cmyk-cyan" />
                  Archivos Adjuntos ({changeRequest.attachments.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {changeRequest.attachments.map((attachment) => {
                    const isImage = attachment.file_type?.startsWith('image/');
                    const fileSize = attachment.file_size
                      ? attachment.file_size < 1024 * 1024
                        ? `${(attachment.file_size / 1024).toFixed(0)} KB`
                        : `${(attachment.file_size / (1024 * 1024)).toFixed(1)} MB`
                      : '';

                    return (
                      <a
                        key={attachment.id}
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block rounded-lg border border-neutral-700 bg-neutral-800 overflow-hidden hover:border-cmyk-cyan/50 transition-colors"
                      >
                        {isImage ? (
                          <div className="aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={attachment.file}
                              alt={attachment.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center p-3">
                            <PhotoIcon className="h-8 w-8 text-neutral-500 mb-1" />
                            <span className="text-[10px] text-neutral-500 text-center truncate w-full">
                              {attachment.filename}
                            </span>
                          </div>
                        )}
                        <div className="p-2 border-t border-neutral-700">
                          <p className="text-xs text-neutral-300 truncate" title={attachment.filename}>
                            {attachment.filename}
                          </p>
                          {fileSize && (
                            <p className="text-[10px] text-neutral-500">{fileSize}</p>
                          )}
                        </div>
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-white bg-black/50 rounded p-0.5" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Original Quote Snapshot */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Cotizacion Original (Antes de los cambios)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-neutral-500 text-sm border-b border-neutral-700">
                      <th className="pb-3 pr-4">Concepto</th>
                      <th className="pb-3 pr-4 text-right">Cant.</th>
                      <th className="pb-3 pr-4 text-right">P. Unit.</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {originalLines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-3 pr-4">
                          <p className="text-white font-medium">{line.concept}</p>
                          {line.description && (
                            <p className="text-neutral-500 text-sm">{line.description}</p>
                          )}
                          {line.service_details && Object.keys(line.service_details).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-neutral-500 text-xs cursor-pointer hover:text-neutral-400">
                                Ver detalle de servicio
                              </summary>
                              <div className="mt-2">
                                <ServiceDetailsDisplay
                                  serviceType={line.service_type || ''}
                                  serviceDetails={line.service_details}
                                />
                              </div>
                            </details>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right text-white">{line.quantity}</td>
                        <td className="py-3 pr-4 text-right text-white">
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
              <div className="mt-4 pt-4 border-t border-neutral-700 text-right">
                <span className="text-neutral-400">Total original: </span>
                <span className="text-white font-bold">
                  {formatCurrency(changeRequest.original_snapshot.total)}
                </span>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Info */}
            {changeRequest.reviewed_at && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Revision</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-neutral-500 text-sm">Revisada por</p>
                    <p className="text-white">{changeRequest.reviewed_by_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm">Fecha</p>
                    <p className="text-white">{formatDate(changeRequest.reviewed_at)}</p>
                  </div>
                  {changeRequest.review_notes && (
                    <div>
                      <p className="text-neutral-500 text-sm">Notas</p>
                      <p className="text-neutral-300">{changeRequest.review_notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h2>
              <div className="space-y-2">
                <Link
                  href={`/${locale}/dashboard/cotizaciones/${quoteId}`}
                  className="block"
                >
                  <Button variant="outline" className="w-full justify-start">
                    Ver cotización actual
                  </Button>
                </Link>
                <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    isLoading={isDownloadingPdf}
                    leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  >
                    Descargar PDF de esta versión
                  </Button>
              </div>
            </Card>

            {/* Help Card */}
            {changeRequest.status === 'pending' && (
              <Card className="p-6 bg-cmyk-cyan/5 border-cmyk-cyan/20">
                <h3 className="font-semibold text-white mb-2">Como revisar</h3>
                <ul className="text-sm text-neutral-400 space-y-2">
                  <li>
                    <strong className="text-green-400">Aprobar:</strong> La cotizacion
                    volvera a borrador para que apliques los cambios solicitados.
                  </li>
                  <li>
                    <strong className="text-red-400">Rechazar:</strong> La cotizacion
                    volvera a su estado anterior y el cliente sera notificado.
                  </li>
                </ul>
              </Card>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {showReviewModal === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
              </h3>

              <p className="text-neutral-300 mb-4">
                {showReviewModal === 'approve'
                  ? 'Al aprobar, la cotizacion volvera a borrador para que puedas aplicar los cambios solicitados.'
                  : 'El cliente sera notificado de que su solicitud no fue aprobada.'}
              </p>

              <label className="block text-neutral-400 text-sm mb-2">
                Notas {showReviewModal === 'reject' ? '(recomendado)' : '(opcional)'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  showReviewModal === 'approve'
                    ? 'Notas internas sobre la aprobacion...'
                    : 'Explica brevemente el motivo del rechazo...'
                }
                rows={3}
                className="w-full px-4 py-2 mb-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan resize-none"
              />

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowReviewModal(null);
                    setReviewNotes('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleReview(showReviewModal)}
                  disabled={isReviewing}
                  isLoading={isReviewing}
                  className={`flex-1 ${
                    showReviewModal === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {showReviewModal === 'approve' ? 'Aprobar' : 'Rechazar'}
                </Button>
              </div>
            </Card>
          </div>
        )}
    </div>
  );
}
