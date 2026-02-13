'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  DocumentPlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { SERVICE_LABELS, type ServiceId } from '@/lib/service-ids';
import { Card, Button, LoadingPage } from '@/components/ui';
import { MapPinIcon, TruckIcon, PrinterIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import {
  getAdminQuoteRequestById,
  markQuoteRequestInReview,
  unmarkQuoteRequestInReview,
  assignQuoteRequest,
  getSalesReps,
  QuoteRequest,
  QuoteRequestStatus,
  UrgencyLevel,
  SalesRep,
} from '@/lib/api/quotes';

const statusColors: Record<QuoteRequestStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  in_review: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  quoted: 'bg-cmyk-cyan/20 text-cmyk-cyan border-cmyk-cyan/50',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/50',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
  cancelled: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/50',
};

const statusLabels: Record<QuoteRequestStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  in_review: 'En Revisión',
  quoted: 'Cotizada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const urgencyColors: Record<UrgencyLevel, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  normal: 'bg-green-500/20 text-green-400 border-green-500/50',
};

const urgencyLabels: Record<UrgencyLevel, string> = {
  high: 'Urgente',
  medium: 'Media',
  normal: 'Normal',
};

// Labels for service-specific fields
const serviceDetailsLabels: Record<string, string> = {
  // General
  subtipo: 'Subtipo',
  tipo: 'Tipo',
  tipo_anuncio: 'Tipo de anuncio',
  tipo_vehiculo: 'Tipo de vehículo',
  tipo_rotulacion: 'Tipo de rotulación',
  tipo_diseno: 'Tipo de diseño',
  tipo_impresion: 'Tipo de impresión',
  tipo_servicio: 'Tipo de servicio',
  descripcion: 'Descripción',

  // Campos personalizados (indicadores)
  tipo_personalizado: 'Tipo personalizado',
  subtipo_personalizado: 'Subtipo personalizado',
  material_personalizado: 'Material personalizado',
  tipo_rotulacion_personalizado: 'Tipo personalizado',
  producto_personalizado: 'Producto personalizado',
  tipo_impresion_personalizado: 'Tipo de impresión personalizado',

  // Medidas y cantidades
  medidas: 'Medidas',
  cantidad: 'Cantidad',
  numero_piezas: 'Número de piezas',

  // Ubicación y zona
  ubicacion: 'Ubicación',
  zona: 'Zona de circulación',
  ciudad_zona: 'Ciudad / Zona',
  zona_cobertura: 'Zona de cobertura',

  // Tiempos
  tiempo_exhibicion: 'Tiempo de exhibición',
  tiempo_campana: 'Tiempo de campaña',
  duracion: 'Duración',

  // Inclusiones (booleanos)
  impresion_incluida: 'Impresión incluida',
  instalacion_incluida: 'Instalación incluida',
  iluminacion: 'Iluminación',
  diseno_incluido: 'Diseño incluido',
  archivo_listo: 'Archivo listo para imprimir',
  archivo_grabacion_proporcionado: 'Archivo de grabación proporcionado',
  requiere_grabacion: 'Requiere grabación',
  cambios_incluidos: 'Cambios incluidos',

  // Otros
  uso: 'Uso',
  uso_diseno: 'Uso del diseño',
  material: 'Material',
  producto: 'Producto',
  servicio: 'Servicio',

  // Ruta
  ruta: 'Ruta de circulación',
  delimitacion_zona: 'Delimitación de zona',
  punto_a: 'Punto de inicio',
  punto_b: 'Punto final',
  distancia_metros: 'Distancia',

  // Rutas (array)
  rutas: 'Rutas',
  meses_campana: 'Meses de campaña',
  ruta_preestablecida: 'Ruta preestablecida',
  fecha_inicio: 'Fecha inicio',
  fecha_fin: 'Fecha fin',
  horario_inicio: 'Horario inicio',
  horario_fin: 'Horario fin',
  numero: 'Número de ruta',
  duracion_segundos: 'Duración estimada',
};

// Labels for subtypes
const subtipoLabels: Record<string, string> = {
  'vallas-moviles': 'Vallas móviles',
  'publibuses': 'Publibuses',
  'perifoneo': 'Perifoneo',
  'unipolar': 'Unipolar',
  'azotea': 'Azotea',
  'mural': 'Mural publicitario',
  'cajas-luz': 'Cajas de luz',
  'letras-3d': 'Letras 3D',
  'anuncios-2d': 'Anuncios 2D',
  'bastidores': 'Bastidores',
  'toldos': 'Toldos',
  'neon': 'Neón',
  'completa': 'Rotulación completa',
  'parcial': 'Rotulación parcial',
  'vinil-recortado': 'Vinil recortado',
  'impresion-digital': 'Impresión digital',
  'lona': 'Lona',
  'vinil': 'Vinil',
  'tela': 'Tela',
  'corte': 'Corte',
  'grabado': 'Grabado',
  'offset': 'Offset',
  'serigrafia': 'Serigrafía',
  'sublimacion': 'Sublimación',
  'interior': 'Interior',
  'exterior': 'Exterior',
  'impresion': 'Impresión',
  'digital': 'Digital',
  'ambos': 'Ambos',
  'tarjetas-presentacion': 'Tarjetas de presentación',
  'volantes': 'Volantes',
  'otro': 'Otro',
  // Rutas preestablecidas publibuses
  'zocalo-base': 'Zócalo Base',
  'colosio-zocalo': 'Colosio Zócalo',
};

// Component to render service details
function ServiceDetailsDisplay({ serviceType, serviceDetails }: { serviceType?: string; serviceDetails?: Record<string, unknown> }) {
  if (!serviceDetails || Object.keys(serviceDetails).length === 0) {
    return null;
  }

  const formatValue = (key: string, value: unknown): string | JSX.Element => {
    if (value === null || value === undefined) return '-';

    // Boolean values
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    // Subtypes
    if (key === 'subtipo' || key === 'tipo' || key === 'tipo_anuncio' || key === 'tipo_rotulacion' ||
        key === 'material' || key === 'uso' || key === 'uso_diseno' || key === 'tipo_impresion' ||
        key === 'servicio' || key === 'producto') {
      return subtipoLabels[value as string] || String(value);
    }

    // Distance in meters
    if (key === 'distancia_metros' && typeof value === 'number') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} km`;
      }
      return `${value.toFixed(0)} m`;
    }

    // Route object with coordinates
    if ((key === 'ruta' || key === 'delimitacion_zona') && typeof value === 'object' && value !== null) {
      const routeData = value as Record<string, unknown>;
      const pointA = routeData.punto_a as { name: string; lat: number; lon: number } | null;
      const pointB = routeData.punto_b as { name: string; lat: number; lon: number } | null;
      const distance = routeData.distancia_metros as number | undefined;

      return (
        <div className="space-y-2">
          {pointA && (
            <div className="flex items-start gap-2">
              <MapPinIcon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-neutral-400 text-xs">Inicio:</span>
                <p className="text-white text-sm">{pointA.name || `${pointA.lat.toFixed(5)}, ${pointA.lon.toFixed(5)}`}</p>
              </div>
            </div>
          )}
          {pointB && (
            <div className="flex items-start gap-2">
              <MapPinIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-neutral-400 text-xs">Fin:</span>
                <p className="text-white text-sm">{pointB.name || `${pointB.lat.toFixed(5)}, ${pointB.lon.toFixed(5)}`}</p>
              </div>
            </div>
          )}
          {distance && (
            <div className="flex items-center gap-2 mt-1">
              <TruckIcon className="h-4 w-4 text-cmyk-cyan flex-shrink-0" />
              <span className="text-cmyk-cyan font-medium">
                {distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance.toFixed(0)} m`}
              </span>
            </div>
          )}
        </div>
      );
    }

    return String(value);
  };

  const getIcon = (key: string) => {
    if (key === 'ruta' || key === 'delimitacion_zona' || key === 'ubicacion' || key === 'zona' || key === 'ciudad_zona' || key === 'zona_cobertura') {
      return <MapPinIcon className="h-4 w-4 text-cmyk-cyan" />;
    }
    if (key.includes('impresion') || key === 'archivo_listo') {
      return <PrinterIcon className="h-4 w-4 text-cmyk-magenta" />;
    }
    if (key.includes('instalacion') || key === 'iluminacion') {
      return <WrenchScrewdriverIcon className="h-4 w-4 text-cmyk-yellow" />;
    }
    return null;
  };

  // Order keys for better display
  const keyOrder = [
    'tipo_servicio', 'subtipo', 'tipo', 'tipo_anuncio', 'tipo_vehiculo', 'tipo_rotulacion', 'tipo_diseno',
    'descripcion', 'cantidad', 'numero_piezas', 'medidas', 'material', 'producto',
    'ubicacion', 'zona', 'ciudad_zona', 'zona_cobertura',
    'tiempo_exhibicion', 'tiempo_campana', 'duracion',
    'uso', 'uso_diseno', 'servicio', 'tipo_impresion',
    'impresion_incluida', 'instalacion_incluida', 'iluminacion', 'diseno_incluido',
    'archivo_listo', 'archivo_grabacion_proporcionado', 'requiere_grabacion', 'cambios_incluidos',
    'ruta', 'delimitacion_zona',
  ];

  const sortedKeys = Object.keys(serviceDetails).sort((a, b) => {
    const indexA = keyOrder.indexOf(a);
    const indexB = keyOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Fields to hide (internal indicators)
  const hiddenFields = ['ruta', 'delimitacion_zona', 'coordenadas', 'rutas', 'tipo_personalizado',
    'subtipo_personalizado', 'material_personalizado', 'tipo_rotulacion_personalizado',
    'producto_personalizado', 'tipo_impresion_personalizado'];

  // Separate route/complex fields from simple fields
  const simpleFields = sortedKeys.filter(key =>
    !hiddenFields.includes(key)
  );
  const complexFields = sortedKeys.filter(key =>
    key === 'ruta' || key === 'delimitacion_zona'
  );

  // Routes array (vallas, publibuses, perifoneo)
  const rutasArray = serviceDetails.rutas as Array<Record<string, unknown>> | undefined;
  const subtipo = serviceDetails.subtipo as string | undefined;

  return (
    <div className="space-y-4">
      {/* Simple fields in grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {simpleFields.map((key) => {
          const value = serviceDetails[key];
          if (value === null || value === undefined || key === 'coordenadas') return null;

          const formattedValue = formatValue(key, value);
          const icon = getIcon(key);

          return (
            <div key={key} className="p-3 bg-neutral-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {icon}
                <p className="text-neutral-500 text-xs">{serviceDetailsLabels[key] || key}</p>
              </div>
              <p className="text-white font-medium">
                {typeof formattedValue === 'string' ? formattedValue : formattedValue}
              </p>
            </div>
          );
        })}
      </div>

      {/* Complex fields (single route object) */}
      {complexFields.map((key) => {
        const value = serviceDetails[key];
        if (value === null || value === undefined) return null;

        return (
          <div key={key} className="p-4 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <MapPinIcon className="h-5 w-5 text-cmyk-cyan" />
              <p className="text-neutral-400 text-sm font-medium">{serviceDetailsLabels[key] || key}</p>
            </div>
            {formatValue(key, value)}
          </div>
        );
      })}

      {/* Routes array (vallas-moviles, publibuses, perifoneo) */}
      {rutasArray && rutasArray.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-cmyk-cyan" />
            <p className="text-neutral-400 text-sm font-medium">
              {subtipo === 'publibuses' ? 'Rutas preestablecidas' : 'Rutas de circulación'}
              <span className="ml-2 text-neutral-500">({rutasArray.length})</span>
            </p>
          </div>

          {rutasArray.map((ruta, idx) => {
            const routeObj = ruta.ruta as Record<string, unknown> | null;

            return (
              <div key={idx} className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-cmyk-cyan">Ruta {ruta.numero as number || idx + 1}</span>
                </div>

                {/* Publibuses: ruta preestablecida */}
                {subtipo === 'publibuses' && !!ruta.ruta_preestablecida && (
                  <div className="p-3 bg-neutral-800/50 rounded-lg">
                    <p className="text-neutral-500 text-xs">Ruta preestablecida</p>
                    <p className="text-white font-medium">
                      {subtipoLabels[ruta.ruta_preestablecida as string] || String(ruta.ruta_preestablecida)}
                    </p>
                  </div>
                )}

                {/* Dates and times grid */}
                <div className="grid grid-cols-2 gap-2">
                  {!!ruta.fecha_inicio && (
                    <div className="p-2.5 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Fecha inicio</p>
                      <p className="text-white text-sm font-medium">{String(ruta.fecha_inicio)}</p>
                    </div>
                  )}
                  {!!ruta.fecha_fin && (
                    <div className="p-2.5 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Fecha fin{subtipo === 'publibuses' ? ' (auto)' : ''}</p>
                      <p className="text-white text-sm font-medium">{String(ruta.fecha_fin)}</p>
                    </div>
                  )}
                  {!!ruta.horario_inicio && (
                    <div className="p-2.5 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Horario inicio</p>
                      <p className="text-white text-sm font-medium">{String(ruta.horario_inicio)}</p>
                    </div>
                  )}
                  {!!ruta.horario_fin && (
                    <div className="p-2.5 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Horario fin</p>
                      <p className="text-white text-sm font-medium">{String(ruta.horario_fin)}</p>
                    </div>
                  )}
                </div>

                {/* Route map data (vallas / perifoneo) */}
                {routeObj && (
                  <div className="p-3 bg-neutral-800/50 rounded-lg space-y-2">
                    {!!routeObj.punto_a && (() => {
                      const pa = routeObj.punto_a as { name?: string; lat?: number; lon?: number };
                      return (
                        <div className="flex items-start gap-2">
                          <MapPinIcon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-neutral-400 text-xs">Inicio:</span>
                            <p className="text-white text-sm break-words">{pa.name || `${pa.lat?.toFixed(5)}, ${pa.lon?.toFixed(5)}`}</p>
                          </div>
                        </div>
                      );
                    })()}
                    {!!routeObj.punto_b && (() => {
                      const pb = routeObj.punto_b as { name?: string; lat?: number; lon?: number };
                      return (
                        <div className="flex items-start gap-2">
                          <MapPinIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-neutral-400 text-xs">Fin:</span>
                            <p className="text-white text-sm break-words">{pb.name || `${pb.lat?.toFixed(5)}, ${pb.lon?.toFixed(5)}`}</p>
                          </div>
                        </div>
                      );
                    })()}
                    {!!routeObj.distancia_metros && (() => {
                      const d = routeObj.distancia_metros as number;
                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <TruckIcon className="h-4 w-4 text-cmyk-cyan flex-shrink-0" />
                          <span className="text-cmyk-cyan font-medium text-sm">
                            {d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${d.toFixed(0)} m`}
                          </span>
                        </div>
                      );
                    })()}
                    {!!routeObj.duracion_segundos && (() => {
                      const s = routeObj.duracion_segundos as number;
                      const mins = Math.round(s / 60);
                      return (
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                          <span className="text-neutral-300 text-sm">{mins} min aprox.</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuoteRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [request, setRequest] = useState<QuoteRequest | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const requestId = params.id as string;
  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);
  const isAdmin = user?.role?.name === 'admin';

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/dashboard/solicitudes/${requestId}`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale, requestId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !isSalesOrAdmin || !requestId) return;

      setIsLoading(true);
      try {
        const [requestData, repsData] = await Promise.all([
          getAdminQuoteRequestById(requestId),
          isAdmin ? getSalesReps().catch(() => []) : Promise.resolve([]),
        ]);
        setRequest(requestData);
        setSalesReps(repsData);
      } catch (error) {
        console.error('Error fetching request:', error);
        toast.error('Error al cargar la solicitud');
        router.push(`/${locale}/dashboard/solicitudes`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isSalesOrAdmin, isAdmin, requestId, router, locale]);

  const handleMarkInReview = async () => {
    if (!request) return;

    setIsUpdating(true);
    try {
      const updated = await markQuoteRequestInReview(request.id);
      setRequest(updated);
      toast.success('Solicitud marcada como en revisión');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error al actualizar la solicitud');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnmarkInReview = async () => {
    if (!request) return;

    setIsUpdating(true);
    try {
      const updated = await unmarkQuoteRequestInReview(request.id);
      setRequest(updated);
      toast.success('Solicitud devuelta a estado anterior');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error al actualizar la solicitud');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async (salesRepId: string) => {
    if (!request) return;

    setIsUpdating(true);
    try {
      const updated = await assignQuoteRequest(request.id, salesRepId);
      setRequest(updated);
      setShowAssignModal(false);
      toast.success('Solicitud asignada correctamente');
    } catch (error) {
      console.error('Error assigning request:', error);
      toast.error('Error al asignar la solicitud');
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin || !request) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canCreateQuote = ['pending', 'assigned', 'in_review'].includes(request.status);
  const isSales = user?.role?.name === 'sales';
  const isAssignedToMe = request.assigned_to === user?.id;
  const isUrgent = request.urgency === 'high';
  // Sales can only create quotes for their own assigned requests, or urgent ones
  const canCreateQuoteForRequest = canCreateQuote && (isAdmin || isAssignedToMe || isUrgent);

  return (
    <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{request.request_number}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[request.status]}`}>
                {statusLabels[request.status]}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${urgencyColors[request.urgency]}`}>
                {urgencyLabels[request.urgency]}
              </span>
            </div>
            <p className="text-neutral-400">
              Creada el {formatDate(request.created_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-cmyk-cyan" />
                Información del Cliente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                  <UserIcon className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">Nombre</p>
                    <p className="text-white">{request.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                  <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">Email</p>
                    <a href={`mailto:${request.customer_email}`} className="text-cmyk-cyan hover:underline">
                      {request.customer_email}
                    </a>
                  </div>
                </div>
                {request.customer_phone && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                    <PhoneIcon className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-neutral-500 text-xs">Teléfono</p>
                      <a href={`tel:${request.customer_phone}`} className="text-cmyk-cyan hover:underline">
                        {request.customer_phone}
                      </a>
                    </div>
                  </div>
                )}
                {request.customer_company && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                    <BuildingOfficeIcon className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-neutral-500 text-xs">Empresa</p>
                      <p className="text-white">{request.customer_company}</p>
                    </div>
                  </div>
                )}
              </div>
              {request.is_guest && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    Este cliente no está registrado (invitado)
                  </p>
                </div>
              )}
            </Card>

            {/* Service Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Detalles del Servicio</h2>

              {request.catalog_item && (
                <div className="mb-4 p-4 bg-neutral-800/50 rounded-lg flex items-center gap-4">
                  {request.catalog_item.image && (
                    <img
                      src={request.catalog_item.image}
                      alt={request.catalog_item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="text-neutral-500 text-xs">Producto/Servicio</p>
                    <p className="text-white font-medium">{request.catalog_item.name}</p>
                  </div>
                </div>
              )}

              {request.service_type && (
                <div className="mb-4 p-3 bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg">
                  <p className="text-neutral-500 text-xs">Tipo de Servicio</p>
                  <p className="text-cmyk-cyan font-semibold text-lg">
                    {SERVICE_LABELS[request.service_type as ServiceId] || request.service_type}
                  </p>
                </div>
              )}

              {/* Service-specific details from landing form */}
              {request.service_details && Object.keys(request.service_details).length > 0 && (
                <div className="mb-4">
                  <p className="text-neutral-400 text-sm mb-3 font-medium">Parámetros del servicio</p>
                  <ServiceDetailsDisplay
                    serviceType={request.service_type}
                    serviceDetails={request.service_details as Record<string, unknown>}
                  />
                </div>
              )}

              {/* Generic fields - only show if no service_details */}
              {(!request.service_details || Object.keys(request.service_details).length === 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {request.quantity && (
                    <div className="p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Cantidad</p>
                      <p className="text-white font-medium">{request.quantity}</p>
                    </div>
                  )}
                  {request.dimensions && (
                    <div className="p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Dimensiones</p>
                      <p className="text-white">{request.dimensions}</p>
                    </div>
                  )}
                  {request.material && (
                    <div className="p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-neutral-500 text-xs">Material</p>
                      <p className="text-white">{request.material}</p>
                    </div>
                  )}
                  <div className="p-3 bg-neutral-800/50 rounded-lg">
                    <p className="text-neutral-500 text-xs">Instalación</p>
                    <p className="text-white">{request.includes_installation ? 'Sí' : 'No'}</p>
                  </div>
                </div>
              )}

              {request.description && (
                <div className="p-4 bg-neutral-800/50 rounded-lg">
                  <p className="text-neutral-500 text-xs mb-2">Comentarios adicionales</p>
                  <p className="text-white whitespace-pre-wrap">{request.description}</p>
                </div>
              )}

              {request.required_date && (
                <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">Fecha Requerida</p>
                    <p className="text-white">
                      {new Date(request.required_date).toLocaleString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {request.days_until_required !== undefined && (
                        <span className={`ml-2 text-sm ${
                          request.days_until_required <= 0
                            ? 'text-red-400'
                            : request.days_until_required <= 7
                            ? 'text-yellow-400'
                            : 'text-neutral-400'
                        }`}>
                          ({request.days_until_required > 0
                            ? `en ${request.days_until_required} días`
                            : request.days_until_required === 0
                            ? 'Hoy'
                            : 'Vencido'})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PaperClipIcon className="h-5 w-5 text-cmyk-cyan" />
                  Archivos Adjuntos ({request.attachments.length})
                </h2>
                <div className="space-y-2">
                  {request.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{attachment.filename}</p>
                        <p className="text-neutral-500 text-xs">
                          {formatFileSize(attachment.file_size)}
                          {attachment.file_type && ` • ${attachment.file_type}`}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Acciones</h2>
              <div className="space-y-3">
                {canCreateQuote && canCreateQuoteForRequest && (
                  <Link
                    href={`/${locale}/dashboard/cotizaciones/nueva?solicitud=${request.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-cmyk-cyan text-black font-medium rounded-lg hover:bg-cmyk-cyan/90 transition-colors"
                  >
                    <DocumentPlusIcon className="h-5 w-5" />
                    Crear Cotización
                  </Link>
                )}

                {canCreateQuote && !canCreateQuoteForRequest && isSales && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm font-medium mb-1">
                      Solicitud asignada a otro vendedor
                    </p>
                    <p className="text-neutral-400 text-xs">
                      {request.assigned_to_name ? `Asignada a: ${request.assigned_to_name}` : 'No asignada a ti'}. 
                      Solo puedes crear cotizaciones para solicitudes asignadas a ti o marcadas como urgentes.
                    </p>
                  </div>
                )}

                {['pending', 'assigned'].includes(request.status) && (
                  <Button
                    onClick={handleMarkInReview}
                    disabled={isUpdating}
                    isLoading={isUpdating}
                    variant="outline"
                    className="w-full"
                    leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                  >
                    Marcar En Revisión
                  </Button>
                )}

                {request.status === 'in_review' && (
                  <Button
                    onClick={handleUnmarkInReview}
                    disabled={isUpdating}
                    isLoading={isUpdating}
                    variant="outline"
                    className="w-full"
                    leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                  >
                    Desmarcar Revisión
                  </Button>
                )}

                {isAdmin && ['pending', 'assigned', 'in_review'].includes(request.status) && (
                  <Button
                    onClick={() => setShowAssignModal(true)}
                    disabled={isUpdating}
                    variant="outline"
                    className="w-full"
                    leftIcon={<UserIcon className="h-5 w-5" />}
                  >
                    {request.assigned_to ? 'Reasignar' : 'Asignar Vendedor'}
                  </Button>
                )}
              </div>
            </Card>

            {/* Assignment Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Asignación</h2>
              {request.assigned_to_name ? (
                <div className="p-3 bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cmyk-cyan/20 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-cmyk-cyan" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{request.assigned_to_name}</p>
                      <p className="text-neutral-500 text-xs">
                        {request.assignment_method === 'auto_specialty'
                          ? 'Asignación automática (especialidad)'
                          : request.assignment_method === 'auto_load'
                          ? 'Asignación automática (carga)'
                          : request.assignment_method === 'fallback'
                          ? 'Asignación automática (respaldo)'
                          : 'Asignación manual'}
                      </p>
                    </div>
                  </div>
                  {request.assigned_at && (
                    <p className="text-neutral-500 text-xs mt-2">
                      Asignado el {formatDate(request.assigned_at)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Sin asignar
                  </p>
                </div>
              )}
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-cmyk-cyan" />
                Historial
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-cmyk-cyan"></div>
                  <div>
                    <p className="text-white text-sm">Solicitud creada</p>
                    <p className="text-neutral-500 text-xs">{formatDate(request.created_at)}</p>
                  </div>
                </div>
                {request.assigned_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-400"></div>
                    <div>
                      <p className="text-white text-sm">Asignada a {request.assigned_to_name}</p>
                      <p className="text-neutral-500 text-xs">{formatDate(request.assigned_at)}</p>
                    </div>
                  </div>
                )}
                {request.status === 'in_review' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-400"></div>
                    <div>
                      <p className="text-white text-sm">Marcada en revisión</p>
                      <p className="text-neutral-500 text-xs">{formatDate(request.updated_at)}</p>
                    </div>
                  </div>
                )}
                {request.status === 'quoted' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-cmyk-cyan"></div>
                    <div>
                      <p className="text-white text-sm">Cotización enviada</p>
                      <p className="text-neutral-500 text-xs">{formatDate(request.updated_at)}</p>
                    </div>
                  </div>
                )}
                {request.status === 'accepted' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-400"></div>
                    <div>
                      <p className="text-white text-sm">Cotización aceptada</p>
                      <p className="text-neutral-500 text-xs">{formatDate(request.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Asignar Vendedor</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {salesReps.length === 0 ? (
                  <p className="text-neutral-400 text-center py-4">No hay vendedores disponibles</p>
                ) : (
                  salesReps.map((rep) => (
                    <button
                      key={rep.id}
                      onClick={() => handleAssign(rep.id)}
                      disabled={isUpdating}
                      className="w-full flex items-center gap-3 p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-cmyk-cyan/20 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-cmyk-cyan" />
                      </div>
                      <div>
                        <p className="text-white">{rep.full_name}</p>
                        <p className="text-neutral-500 text-sm">{rep.email}</p>
                      </div>
                      {request.assigned_to === rep.id && (
                        <CheckCircleIcon className="h-5 w-5 text-green-400 ml-auto" />
                      )}
                    </button>
                  ))
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => setShowAssignModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        )}
    </div>
  );
}
