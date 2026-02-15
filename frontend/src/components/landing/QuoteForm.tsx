'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { trackEvent, trackingEvents } from '@/lib/tracking';
import { useLegalModal } from '@/contexts/LegalModalContext';
import { CONTACT_INFO } from '@/lib/constants';
import {
  SERVICE_IDS,
  ESPECTACULARES_TIPOS,
  FABRICACION_ANUNCIOS_TIPOS,
  PUBLICIDAD_MOVIL_SUBTIPOS,
  GRAN_FORMATO_MATERIALES,
  ROTULACION_TIPOS,
  OFFSET_PRODUCTOS,
  IMPRESION_TIPOS,
  SENALIZACION_TIPOS,
  CNC_LASER_TIPOS,
  DISENO_GRAFICO_TIPOS,
  type ServiceId,
  DELIVERY_METHOD_LABELS,
  DELIVERY_METHOD_ICONS,
  type DeliveryMethod,
  getDeliveryMethodsForService,
} from '@/lib/service-ids';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled for Leaflet-based component
const RouteSelector = dynamic(
  () => import('./RouteSelector').then(mod => mod.RouteSelector),
  {
    ssr: false,
    loading: () => (
      <div className="w-full p-4 rounded-xl border-2 border-dashed border-cmyk-cyan/50 bg-cmyk-black/30">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cmyk-cyan"></div>
          <span className="text-gray-400">Cargando mapa...</span>
        </div>
      </div>
    )
  }
);
import { useRecaptcha } from '@/hooks';
import { usePostalCode } from '@/hooks/usePostalCode';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAddresses, type UserAddress } from '@/lib/api/auth';
import { SuccessModal } from '@/components/ui';
import { getBranches, type Branch } from '@/lib/api/content';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

// Service labels for display
const serviceLabels: Record<ServiceId, string> = {
  'espectaculares': 'Espectaculares',
  'fabricacion-anuncios': 'Fabricación de anuncios',
  'publicidad-movil': 'Publicidad móvil',
  'impresion-gran-formato': 'Impresión en gran formato',
  'senalizacion': 'Señalización',
  'rotulacion-vehicular': 'Rotulación vehicular',
  'corte-grabado-cnc-laser': 'Corte y grabado CNC/láser',
  'diseno-grafico': 'Diseño gráfico',
  'impresion-offset-serigrafia': 'Impresión offset/serigrafía',
  'otros': 'Otro servicio (especificar)',
};

interface RouteInfo {
  pointA: { name: string; lat: number; lon: number } | null;
  pointB: { name: string; lat: number; lon: number } | null;
  routeData: { coordinates: Array<[number, number]>; distance: number; duration: number } | null;
}

// Multi-route entry for vallas/perifoneo (configurable map route + schedule)
interface ConfigurableRouteEntry {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio: string;
  horarioFin: string;
  route: RouteInfo | null;
}

// Multi-route entry for publibuses (established route + schedule)
interface EstablishedRouteEntry {
  id: string;
  ruta: string;
  fechaInicio: string;
}

const createConfigurableRoute = (): ConfigurableRouteEntry => ({
  id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  fechaInicio: '',
  fechaFin: '',
  horarioInicio: '',
  horarioFin: '',
  route: null,
});

const createEstablishedRoute = (): EstablishedRouteEntry => ({
  id: `er-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  ruta: '',
  fechaInicio: '',
});

// Helper: add N months to a date string (YYYY-MM-DD) and return YYYY-MM-DD
const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

// Form data structure
interface QuoteFormData {
  // Global fields
  nombre: string;
  empresa?: string;
  telefono: string;
  email: string;
  fechaRequerida: string;
  servicio: ServiceId | '';
  comentarios?: string;
  privacidad: boolean;

  // Espectaculares
  esp_tipo?: 'unipolar' | 'azotea' | 'mural' | 'otro';
  esp_tipoOtro?: string;
  esp_ubicacion?: string;
  esp_medidas?: string;
  esp_tiempoExhibicion?: string;
  esp_impresionIncluida?: 'si' | 'no';
  esp_instalacionIncluida?: 'si' | 'no';

  // Fabricación de anuncios
  fab_tipoAnuncio?: string;
  fab_tipoOtro?: string;
  fab_medidas?: string;
  fab_uso?: 'interior' | 'exterior';
  fab_iluminacion?: 'si' | 'no';
  fab_instalacionIncluida?: 'si' | 'no';

  // Publicidad móvil
  pub_subtipo?: 'vallas-moviles' | 'publibuses' | 'perifoneo' | 'otro';
  pub_subtipoOtro?: string;
  pub_otroDescripcion?: string;
  // Vallas móviles
  vallas_cantidad?: number;
  vallas_zona?: string;
  vallas_tiempoCampana?: string;
  vallas_impresionIncluida?: 'si' | 'no';
  // Publibuses
  pub_ciudadZona?: string;
  pub_mesesCampana?: number;
  pub_impresionIncluida?: 'si' | 'no';
  // Perifoneo
  pub_zonaCobertura?: string;
  pub_duracion?: string;
  pub_archivoGrabacion?: 'si' | 'no';
  pub_requiereGrabacion?: 'si' | 'no';
  pub_descripcionZona?: string;

  // Impresión gran formato
  igf_material?: string;
  igf_materialOtro?: string;
  igf_medidas?: string;
  igf_cantidad?: number;
  igf_archivoListo?: 'si' | 'no';

  // Señalización
  sen_tipo?: 'interior' | 'exterior' | 'vial' | 'otro';
  sen_tipoOtro?: string;
  sen_medidas?: string;
  sen_cantidad?: number;
  sen_instalacionIncluida?: 'si' | 'no';

  // Rotulación vehicular
  rot_tipoVehiculo?: string;
  rot_tipoRotulacion?: string;
  rot_tipoRotulacionOtro?: string;
  rot_disenoIncluido?: 'si' | 'no';

  // Corte y grabado CNC/Láser
  cnc_tipo?: 'router-cnc' | 'corte-laser' | 'grabado-laser' | 'otro';
  cnc_tipoOtro?: string;
  cnc_medidas?: string;
  cnc_cantidad?: number;
  cnc_archivoListo?: 'si' | 'no';

  // Diseño gráfico
  dis_tipo?: 'logotipos' | 'papeleria' | 'redes-sociales' | 'otro';
  dis_tipoOtro?: string;
  dis_numeroPiezas?: number;
  dis_usoDiseno?: 'impresion' | 'digital' | 'ambos';
  dis_cambiosIncluidos?: 'si' | 'no';

  // Tarjetas de Presentación, Volantes y Otro
  off_producto?: string;
  off_productoOtro?: string;
  off_cantidad?: number;
  off_tipoImpresion?: string;
  off_tipoImpresionOtro?: string;
  off_archivoListo?: 'si' | 'no';

  // Servicio "Otros"
  otros_tipoServicio?: string;
  otros_descripcion?: string;
  otros_medidas?: string;
  otros_cantidad?: number;

  // Honeypot
  website?: string;
}

export function QuoteForm() {
  const t = useTranslations('landing.quoteForm');
  const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha();
  const { openPrivacy } = useLegalModal();
  const { user } = useAuth();
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [vallasRoutes, setVallasRoutes] = useState<ConfigurableRouteEntry[]>([createConfigurableRoute()]);
  const [perifoneoRoutes, setPerifoneoRoutes] = useState<ConfigurableRouteEntry[]>([createConfigurableRoute()]);
  const [pubRoutes, setPubRoutes] = useState<EstablishedRouteEntry[]>([createEstablishedRoute()]);
  const [selectionFeedback, setSelectionFeedback] = useState<{ service: string; subtype: string } | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | ''>('');
  const [deliveryError, setDeliveryError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState({
    calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigo_postal: '', referencia: '',
  });
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState(false);
  const postalCode = usePostalCode();
  const [coloniaManual, setColoniaManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved addresses for logged-in users
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  // Fetch branches for pickup option
  const fetchBranches = async () => {
    setBranchesLoading(true);
    setBranchesError(false);
    try {
      const data = await getBranches();
      setBranches(data);
    } catch {
      setBranchesError(true);
    } finally {
      setBranchesLoading(false);
    }
  };
  useEffect(() => { fetchBranches(); }, []);

  // Fetch saved addresses if user is logged in
  useEffect(() => {
    if (user) {
      getUserAddresses()
        .then((addrs) => {
          setSavedAddresses(addrs);
          const def = addrs.find((a) => a.is_default);
          if (addrs.length > 0) {
            setSelectedAddressId(def?.id || addrs[0].id);
            setUseNewAddress(false);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<QuoteFormData>({
    defaultValues: {
      servicio: '',
      privacidad: false,
    },
  });

  const servicioValue = watch('servicio');
  const pubSubtipo = watch('pub_subtipo');
  const espTipo = watch('esp_tipo');
  const fabTipoAnuncio = watch('fab_tipoAnuncio');
  const igfMaterial = watch('igf_material');
  const rotTipoRotulacion = watch('rot_tipoRotulacion');
  const offProducto = watch('off_producto');
  const offTipoImpresion = watch('off_tipoImpresion');
  const senTipo = watch('sen_tipo');
  const cncTipo = watch('cnc_tipo');
  const disTipo = watch('dis_tipo');
  const pubMesesCampana = watch('pub_mesesCampana');

  // Pre-fill form fields from logged-in user profile
  useEffect(() => {
    if (user) {
      setValue('nombre', user.full_name || `${user.first_name} ${user.last_name}`.trim());
      setValue('email', user.email);
      if (user.phone) setValue('telefono', user.phone);
      if (user.company) setValue('empresa', user.company);
      if (user.default_delivery_address && Object.values(user.default_delivery_address).some(v => v)) {
        setDeliveryAddress(prev => ({
          ...prev,
          ...user.default_delivery_address,
        }));
      }
    }
  }, [user, setValue]);

  // Read URL hash parameters to pre-select service and subtype
  useEffect(() => {
    const parseHashParams = () => {
      const hash = window.location.hash;
      if (!hash.includes('?')) return;

      const queryString = hash.split('?')[1];
      const params = new URLSearchParams(queryString);
      const servicio = params.get('servicio') as ServiceId | null;
      const subtipo = params.get('subtipo');

      if (servicio && SERVICE_IDS.includes(servicio)) {
        setValue('servicio', servicio);

        let subtipoLabel = '';

        // Set subtipo based on service
        if (subtipo) {
          if (servicio === 'espectaculares' && ESPECTACULARES_TIPOS.includes(subtipo as typeof ESPECTACULARES_TIPOS[number])) {
            setValue('esp_tipo', subtipo as 'unipolar' | 'azotea' | 'mural' | 'otro');
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'unipolar' ? 'Unipolar' : subtipo === 'azotea' ? 'Azotea' : 'Mural publicitario';
          } else if (servicio === 'publicidad-movil' && PUBLICIDAD_MOVIL_SUBTIPOS.includes(subtipo as typeof PUBLICIDAD_MOVIL_SUBTIPOS[number])) {
            setValue('pub_subtipo', subtipo as 'vallas-moviles' | 'publibuses' | 'perifoneo' | 'otro');
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'vallas-moviles' ? 'Vallas móviles' : subtipo === 'publibuses' ? 'Publibuses' : 'Perifoneo';
          } else if (servicio === 'fabricacion-anuncios' && FABRICACION_ANUNCIOS_TIPOS.includes(subtipo as typeof FABRICACION_ANUNCIOS_TIPOS[number])) {
            setValue('fab_tipoAnuncio', subtipo);
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'cajas-luz' ? 'Cajas de luz' : subtipo === 'letras-3d' ? 'Letras 3D' : subtipo === 'neon' ? 'Neón' : subtipo;
          } else if (servicio === 'impresion-gran-formato' && GRAN_FORMATO_MATERIALES.includes(subtipo as typeof GRAN_FORMATO_MATERIALES[number])) {
            setValue('igf_material', subtipo);
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo.charAt(0).toUpperCase() + subtipo.slice(1);
          } else if (servicio === 'rotulacion-vehicular' && ROTULACION_TIPOS.includes(subtipo as typeof ROTULACION_TIPOS[number])) {
            setValue('rot_tipoRotulacion', subtipo);
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'completa' ? 'Rotulación completa' : subtipo === 'parcial' ? 'Rotulación parcial' : subtipo === 'vinil-recortado' ? 'Vinil recortado' : 'Impresión digital';
          } else if (servicio === 'senalizacion' && SENALIZACION_TIPOS.includes(subtipo as typeof SENALIZACION_TIPOS[number])) {
            setValue('sen_tipo', subtipo as 'interior' | 'exterior' | 'vial' | 'otro');
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'interior' ? 'Interior' : subtipo === 'exterior' ? 'Exterior' : 'Vial';
          } else if (servicio === 'corte-grabado-cnc-laser' && CNC_LASER_TIPOS.includes(subtipo as typeof CNC_LASER_TIPOS[number])) {
            setValue('cnc_tipo', subtipo as 'router-cnc' | 'corte-laser' | 'grabado-laser' | 'otro');
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'router-cnc' ? 'Router CNC' : subtipo === 'corte-laser' ? 'Corte Láser' : 'Grabado Láser';
          } else if (servicio === 'diseno-grafico' && DISENO_GRAFICO_TIPOS.includes(subtipo as typeof DISENO_GRAFICO_TIPOS[number])) {
            setValue('dis_tipo', subtipo as 'logotipos' | 'papeleria' | 'redes-sociales' | 'otro');
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'logotipos' ? 'Logotipos' : subtipo === 'papeleria' ? 'Papelería' : 'Redes Sociales';
          } else if (servicio === 'impresion-offset-serigrafia' && OFFSET_PRODUCTOS.includes(subtipo as typeof OFFSET_PRODUCTOS[number])) {
            setValue('off_producto', subtipo);
            subtipoLabel = subtipo === 'otro' ? 'Otro (especificar)' : subtipo === 'tarjetas-presentacion' ? 'Tarjetas de presentación' : 'Volantes';
          }
        }

        // Show selection feedback
        setSelectionFeedback({
          service: serviceLabels[servicio],
          subtype: subtipoLabel,
        });

        // Clear feedback after 1.5 seconds
        setTimeout(() => {
          setSelectionFeedback(null);
        }, 1500);

        // Scroll to form
        setTimeout(() => {
          document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    parseHashParams();
    window.addEventListener('hashchange', parseHashParams);
    return () => window.removeEventListener('hashchange', parseHashParams);
  }, [setValue]);

  // Get today's date for min date validation
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Reset service-specific fields when service changes
  useEffect(() => {
    setVallasRoutes([createConfigurableRoute()]);
    setPerifoneoRoutes([createConfigurableRoute()]);
    setPubRoutes([createEstablishedRoute()]);
    setDeliveryMethod('');
    setDeliveryError('');
    setDeliveryAddress({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigo_postal: '', referencia: '' });
    setSelectedBranch('');
    postalCode.reset();
    setColoniaManual(false);
    // Reset to saved address picker if user has saved addresses
    if (savedAddresses.length > 0) {
      setUseNewAddress(false);
      const def = savedAddresses.find((a) => a.is_default);
      setSelectedAddressId(def?.id || savedAddresses[0].id);
    }
  }, [servicioValue]);

  const onSubmit = async (data: QuoteFormData) => {
    try {
      setFormStatus('submitting');
      trackEvent(trackingEvents.FORM_START);

      // Validate date is not in the past
      if (data.fechaRequerida && new Date(data.fechaRequerida) < new Date(today)) {
        setFormStatus('error');
        setErrorMessage('La fecha debe ser igual o posterior a hoy');
        return;
      }

      // Validate delivery method
      const availMethods = data.servicio ? getDeliveryMethodsForService(data.servicio) : [];
      const onlyNA = availMethods.length === 1 && availMethods[0] === 'not_applicable';
      if (!onlyNA && !deliveryMethod) {
        setDeliveryError('Selecciona un método de entrega');
        setFormStatus('error');
        setErrorMessage('Selecciona un método de entrega');
        return;
      }
      if ((deliveryMethod === 'installation' || deliveryMethod === 'shipping') && !useNewAddress && selectedAddressId && savedAddresses.length > 0) {
        // Using a saved address — no further validation needed
      } else if ((deliveryMethod === 'installation' || deliveryMethod === 'shipping') && !deliveryAddress.calle) {
        setDeliveryError('Ingresa la dirección de entrega');
        setFormStatus('error');
        setErrorMessage('Ingresa la dirección de entrega');
        return;
      }
      if (deliveryMethod === 'pickup' && !selectedBranch) {
        setDeliveryError('Selecciona una sucursal');
        setFormStatus('error');
        setErrorMessage('Selecciona una sucursal para recoger');
        return;
      }
      setDeliveryError('');

      // Execute reCAPTCHA verification
      let recaptchaToken: string | null = null;
      if (recaptchaEnabled) {
        recaptchaToken = await executeRecaptcha('quote_request');
        if (!recaptchaToken) {
          setFormStatus('error');
          setErrorMessage('Error de verificación. Por favor, intenta de nuevo.');
          return;
        }
      }

      // Build structured payload
      const payload = buildPayload(data, recaptchaToken);

      // Prepare request
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));

      // Add files
      selectedFiles.forEach((file, index) => {
        formData.append(`archivo_${index}`, file);
      });

      const response = await fetch('/api/leads', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }

      setFormStatus('success');
      trackEvent(trackingEvents.FORM_SUBMIT_SUCCESS, {
        servicio: data.servicio,
      });
      reset();
      setSelectedFiles([]);
      setDeliveryMethod('');
      setDeliveryError('');
      setDeliveryAddress({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigo_postal: '', referencia: '' });
      setSelectedBranch('');
      postalCode.reset();
      setColoniaManual(false);
      if (savedAddresses.length > 0) {
        setUseNewAddress(false);
        const def = savedAddresses.find((a) => a.is_default);
        setSelectedAddressId(def?.id || savedAddresses[0].id);
      }
      setVallasRoutes([createConfigurableRoute()]);
      setPerifoneoRoutes([createConfigurableRoute()]);
      setPubRoutes([createEstablishedRoute()]);

      setTimeout(() => {
        document.getElementById('form-status')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('error'));
      trackEvent(trackingEvents.FORM_SUBMIT_ERROR);
    }
  };

  // Build structured JSON payload
  const buildPayload = (data: QuoteFormData, recaptchaToken: string | null) => {
    const timestamp = new Date().toISOString();
    const quoteId = `COT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const basePayload = {
      id: quoteId,
      timestamp,
      contacto: {
        nombre: data.nombre,
        empresa: data.empresa || null,
        telefono: data.telefono,
        email: data.email,
      },
      fecha_requerida: data.fechaRequerida || (() => {
        // For publicidad-movil subtypes: auto-calculate from earliest route fecha_inicio
        if (data.servicio === 'publicidad-movil') {
          let allDates: string[] = [];
          if (data.pub_subtipo === 'publibuses' && pubRoutes.length > 0) {
            allDates = pubRoutes.map(r => r.fechaInicio).filter(d => !!d);
          } else if (data.pub_subtipo === 'vallas-moviles' && vallasRoutes.length > 0) {
            allDates = vallasRoutes.map(r => r.fechaInicio).filter(d => !!d);
          } else if (data.pub_subtipo === 'perifoneo' && perifoneoRoutes.length > 0) {
            allDates = perifoneoRoutes.map(r => r.fechaInicio).filter(d => !!d);
          }
          if (allDates.length > 0) {
            allDates.sort();
            return allDates[0]; // earliest date
          }
        }
        return null;
      })(),
      servicio: data.servicio,
      metodo_entrega: deliveryMethod || null,
      entrega: deliveryMethod === 'installation' || deliveryMethod === 'shipping' ? (() => {
        let addr = deliveryAddress;
        if (!useNewAddress && selectedAddressId && savedAddresses.length > 0) {
          const sa = savedAddresses.find((a) => a.id === selectedAddressId);
          if (sa) {
            addr = {
              calle: sa.calle,
              numero_exterior: sa.numero_exterior,
              numero_interior: sa.numero_interior || '',
              colonia: sa.colonia,
              ciudad: sa.ciudad,
              estado: sa.estado,
              codigo_postal: sa.codigo_postal,
              referencia: sa.referencia || '',
            };
          }
        }
        return { metodo: deliveryMethod, direccion: addr };
      })() : deliveryMethod === 'pickup' ? {
        metodo: 'pickup',
        sucursal: selectedBranch,
        sucursal_nombre: branches.find(b => b.id === selectedBranch)?.name || '',
      } : deliveryMethod === 'digital' ? {
        metodo: 'digital',
        email: data.email,
      } : null,
      detalles: {} as Record<string, unknown>,
      archivos: selectedFiles.map(f => ({ nombre: f.name, tamano: f.size })),
      comentarios: data.comentarios || null,
      metadata: {
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
      },
      recaptcha_token: recaptchaToken,
    };

    // Add service-specific details
    switch (data.servicio) {
      case 'espectaculares':
        basePayload.detalles = {
          tipo: data.esp_tipo === 'otro' ? data.esp_tipoOtro : data.esp_tipo,
          tipo_personalizado: data.esp_tipo === 'otro',
          ubicacion: data.esp_ubicacion,
          medidas: data.esp_medidas,
          tiempo_exhibicion: data.esp_tiempoExhibicion,
          impresion_incluida: data.esp_impresionIncluida === 'si',
          instalacion_incluida: data.esp_instalacionIncluida === 'si',
        };
        break;

      case 'fabricacion-anuncios':
        basePayload.detalles = {
          tipo_anuncio: data.fab_tipoAnuncio === 'otro' ? data.fab_tipoOtro : data.fab_tipoAnuncio,
          tipo_personalizado: data.fab_tipoAnuncio === 'otro',
          medidas: data.fab_medidas,
          uso: data.fab_uso,
          iluminacion: data.fab_iluminacion === 'si',
          instalacion_incluida: data.fab_instalacionIncluida === 'si',
        };
        break;

      case 'publicidad-movil':
        if (data.pub_subtipo === 'vallas-moviles') {
          basePayload.detalles = {
            subtipo: 'vallas-moviles',
            cantidad: data.vallas_cantidad,
            zona: data.vallas_zona,
            tiempo_campana: data.vallas_tiempoCampana,
            impresion_incluida: data.vallas_impresionIncluida === 'si',
            rutas: vallasRoutes.map((r, i) => ({
              numero: i + 1,
              fecha_inicio: r.fechaInicio || null,
              fecha_fin: r.fechaFin || null,
              horario_inicio: r.horarioInicio || null,
              horario_fin: r.horarioFin || null,
              ruta: r.route ? {
                punto_a: r.route.pointA,
                punto_b: r.route.pointB,
                distancia_metros: r.route.routeData?.distance,
                duracion_segundos: r.route.routeData?.duration,
                coordenadas: r.route.routeData?.coordinates,
              } : null,
            })),
          };
        } else if (data.pub_subtipo === 'publibuses') {
          basePayload.detalles = {
            subtipo: 'publibuses',
            ciudad_zona: data.pub_ciudadZona,
            meses_campana: data.pub_mesesCampana,
            impresion_incluida: data.pub_impresionIncluida === 'si',
            rutas: pubRoutes.map((r, i) => ({
              numero: i + 1,
              ruta_preestablecida: r.ruta || null,
              fecha_inicio: r.fechaInicio || null,
              fecha_fin: r.fechaInicio && data.pub_mesesCampana ? addMonths(r.fechaInicio, Number(data.pub_mesesCampana)) : null,
            })),
          };
        } else if (data.pub_subtipo === 'perifoneo') {
          basePayload.detalles = {
            subtipo: 'perifoneo',
            zona_cobertura: data.pub_zonaCobertura,
            duracion: data.pub_duracion,
            archivo_grabacion_proporcionado: data.pub_archivoGrabacion === 'si',
            requiere_grabacion: data.pub_requiereGrabacion === 'si',
            delimitacion_zona: data.pub_descripcionZona || null,
            rutas: perifoneoRoutes.map((r, i) => ({
              numero: i + 1,
              fecha_inicio: r.fechaInicio || null,
              fecha_fin: r.fechaFin || null,
              horario_inicio: r.horarioInicio || null,
              horario_fin: r.horarioFin || null,
              ruta: r.route ? {
                punto_a: r.route.pointA,
                punto_b: r.route.pointB,
                distancia_metros: r.route.routeData?.distance,
                duracion_segundos: r.route.routeData?.duration,
                coordenadas: r.route.routeData?.coordinates,
              } : null,
            })),
          };
        } else if (data.pub_subtipo === 'otro') {
          basePayload.detalles = {
            subtipo: data.pub_subtipoOtro,
            subtipo_personalizado: true,
            descripcion: data.pub_otroDescripcion,
          };
        }
        break;

      case 'impresion-gran-formato':
        basePayload.detalles = {
          material: data.igf_material === 'otro' ? data.igf_materialOtro : data.igf_material,
          material_personalizado: data.igf_material === 'otro',
          medidas: data.igf_medidas,
          cantidad: data.igf_cantidad,
          archivo_listo: data.igf_archivoListo === 'si',
        };
        break;

      case 'senalizacion':
        basePayload.detalles = {
          tipo: data.sen_tipo === 'otro' ? data.sen_tipoOtro : data.sen_tipo,
          tipo_personalizado: data.sen_tipo === 'otro',
          medidas: data.sen_medidas,
          cantidad: data.sen_cantidad,
          instalacion_incluida: data.sen_instalacionIncluida === 'si',
        };
        break;

      case 'rotulacion-vehicular':
        basePayload.detalles = {
          tipo_vehiculo: data.rot_tipoVehiculo,
          tipo_rotulacion: data.rot_tipoRotulacion === 'otro' ? data.rot_tipoRotulacionOtro : data.rot_tipoRotulacion,
          tipo_rotulacion_personalizado: data.rot_tipoRotulacion === 'otro',
          diseno_incluido: data.rot_disenoIncluido === 'si',
        };
        break;

      case 'corte-grabado-cnc-laser':
        basePayload.detalles = {
          tipo: data.cnc_tipo === 'otro' ? data.cnc_tipoOtro : data.cnc_tipo,
          tipo_personalizado: data.cnc_tipo === 'otro',
          medidas: data.cnc_medidas,
          cantidad: data.cnc_cantidad,
          archivo_listo: data.cnc_archivoListo === 'si',
        };
        break;

      case 'diseno-grafico':
        basePayload.detalles = {
          tipo: data.dis_tipo === 'otro' ? data.dis_tipoOtro : data.dis_tipo,
          tipo_personalizado: data.dis_tipo === 'otro',
          numero_piezas: data.dis_numeroPiezas,
          uso: data.dis_usoDiseno,
          cambios_incluidos: data.dis_cambiosIncluidos === 'si',
        };
        break;

      case 'impresion-offset-serigrafia':
        basePayload.detalles = {
          producto: data.off_producto === 'otro' ? data.off_productoOtro : data.off_producto,
          producto_personalizado: data.off_producto === 'otro',
          cantidad: data.off_cantidad,
          tipo_impresion: data.off_tipoImpresion === 'otro' ? data.off_tipoImpresionOtro : data.off_tipoImpresion,
          tipo_impresion_personalizado: data.off_tipoImpresion === 'otro',
          archivo_listo: data.off_archivoListo === 'si',
        };
        break;

      case 'otros':
        basePayload.detalles = {
          tipo_servicio: data.otros_tipoServicio,
          descripcion: data.otros_descripcion,
          medidas: data.otros_medidas || null,
          cantidad: data.otros_cantidad || null,
        };
        break;
    }

    return basePayload;
  };

  // File handling
  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.ai', '.cdr', '.dxf', '.svg'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: ${t('fileTooLarge')}`);
        continue;
      }

      if (!allowedExtensions.includes(ext)) {
        alert(`${file.name}: ${t('fileTypeNotAllowed')}`);
        continue;
      }

      newFiles.push(file);
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <section id="cotizar" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="mb-4">{t('title')}</h2>
          <p className="text-xl text-gray-300">{t('subtitle')}</p>
        </div>


        {/* Success / Error Modal */}
        <SuccessModal
          isOpen={formStatus === 'success'}
          onClose={() => setFormStatus('idle')}
          title={t('success')}
          message={t('successMessage')}
          variant="success"
        />
        <SuccessModal
          isOpen={formStatus === 'error'}
          onClose={() => setFormStatus('idle')}
          title={t('error')}
          message={errorMessage}
          variant="error"
          buttonLabel="Reintentar"
        />

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto bg-cmyk-black rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 lg:p-12 border border-cmyk-cyan/20">

          {/* SECTION: Contact Data */}
          <div className="mb-10">
            <h3 className="text-2xl font-bold text-white mb-6">{t('contactData')}</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombre" className="label-field">
                  {t('name')} <span className="text-cmyk-magenta">*</span>
                </label>
                <input
                  {...register('nombre', { required: 'El nombre es requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
                  type="text"
                  id="nombre"
                  className="input-field"
                  placeholder="Tu nombre completo"
                  disabled={formStatus === 'submitting'}
                />
                {errors.nombre && <p className="error-message">{errors.nombre.message}</p>}
              </div>

              <div>
                <label htmlFor="empresa" className="label-field">Empresa</label>
                <input
                  {...register('empresa')}
                  type="text"
                  id="empresa"
                  className="input-field"
                  placeholder="Nombre de tu empresa (opcional)"
                  disabled={formStatus === 'submitting'}
                />
              </div>

              <div>
                <label htmlFor="telefono" className="label-field">
                  {t('phone')} <span className="text-cmyk-magenta">*</span>
                </label>
                <input
                  {...register('telefono', {
                    required: 'El teléfono es requerido',
                    pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Formato de teléfono inválido' }
                  })}
                  type="tel"
                  id="telefono"
                  className="input-field"
                  placeholder={t('phonePlaceholder')}
                  disabled={formStatus === 'submitting'}
                />
                {errors.telefono && <p className="error-message">{errors.telefono.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className="label-field">
                  {t('email')} <span className="text-cmyk-magenta">*</span>
                </label>
                <input
                  {...register('email', {
                    required: 'El email es requerido',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' }
                  })}
                  type="email"
                  id="email"
                  className="input-field"
                  placeholder={t('emailPlaceholder')}
                  disabled={formStatus === 'submitting'}
                />
                {errors.email && <p className="error-message">{errors.email.message}</p>}
              </div>

              {/* Hide fecha requerida for publicidad-movil subtypes with routes — they use per-route fecha inicio */}
              {!(servicioValue === 'publicidad-movil' && ['publibuses', 'vallas-moviles', 'perifoneo'].includes(pubSubtipo || '')) && (
                <div>
                  <label htmlFor="fechaRequerida" className="label-field">
                    Fecha estimada requerida <span className="text-cmyk-magenta">*</span>
                  </label>
                  <input
                    {...register('fechaRequerida', { required: servicioValue === 'publicidad-movil' && ['publibuses', 'vallas-moviles', 'perifoneo'].includes(pubSubtipo || '') ? false : 'La fecha es requerida' })}
                    type="date"
                    id="fechaRequerida"
                    className="input-field"
                    min={today}
                    disabled={formStatus === 'submitting'}
                  />
                  {errors.fechaRequerida && <p className="error-message">{errors.fechaRequerida.message}</p>}
                </div>
              )}

              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="servicio" className="label-field">
                    Servicio a cotizar <span className="text-cmyk-magenta">*</span>
                  </label>
                  {selectionFeedback && (
                    <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                      Seleccionado
                    </span>
                  )}
                </div>
                <select
                  {...register('servicio', { required: 'Selecciona un servicio' })}
                  id="servicio"
                  className={`input-field transition-all duration-300 ${
                    selectionFeedback
                      ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                      : ''
                  }`}
                  disabled={formStatus === 'submitting'}
                >
                  <option value="">{t('selectService')}</option>
                  {SERVICE_IDS.map((serviceId) => (
                    <option key={serviceId} value={serviceId}>
                      {serviceLabels[serviceId]}
                    </option>
                  ))}
                </select>
                {errors.servicio && <p className="error-message">{errors.servicio.message}</p>}
              </div>
            </div>
          </div>

          {/* SECTION: Service-Specific Details */}
          {servicioValue && (
            <div className="mb-10 p-6 bg-neutral-900/50 rounded-xl border border-neutral-700">
              <h3 className="text-xl font-bold text-white mb-6">Detalles del servicio</h3>

              {/* ESPECTACULARES */}
              {servicioValue === 'espectaculares' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Tipo de espectacular <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('esp_tipo', { required: 'Selecciona un tipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona tipo</option>
                      {ESPECTACULARES_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo === 'unipolar' ? 'Unipolar' : tipo === 'azotea' ? 'Azotea' : tipo === 'mural' ? 'Mural publicitario' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.esp_tipo && <p className="error-message">{errors.esp_tipo.message}</p>}
                    {espTipo === 'otro' && (
                      <div className="mt-2">
                        <input {...register('esp_tipoOtro', { required: espTipo === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de espectacular" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Ubicación <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('esp_ubicacion', { required: 'La ubicación es requerida' })} type="text" className="input-field" placeholder="Dirección o zona del espectacular" disabled={formStatus === 'submitting'} />
                    {errors.esp_ubicacion && <p className="error-message">{errors.esp_ubicacion.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Medidas (ancho × alto) <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('esp_medidas', { required: 'Las medidas son requeridas' })} type="text" className="input-field" placeholder="ej. 12m × 6m" disabled={formStatus === 'submitting'} />
                    {errors.esp_medidas && <p className="error-message">{errors.esp_medidas.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Tiempo de exhibición <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('esp_tiempoExhibicion', { required: 'El tiempo es requerido' })} type="text" className="input-field" placeholder="ej. 3 meses" disabled={formStatus === 'submitting'} />
                    {errors.esp_tiempoExhibicion && <p className="error-message">{errors.esp_tiempoExhibicion.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Impresión incluida? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('esp_impresionIncluida', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('esp_impresionIncluida')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.esp_impresionIncluida && <p className="error-message">{errors.esp_impresionIncluida.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Instalación incluida? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('esp_instalacionIncluida', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('esp_instalacionIncluida')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.esp_instalacionIncluida && <p className="error-message">{errors.esp_instalacionIncluida.message}</p>}
                  </div>
                </div>
              )}

              {/* FABRICACIÓN DE ANUNCIOS */}
              {servicioValue === 'fabricacion-anuncios' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Tipo de anuncio <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('fab_tipoAnuncio', { required: 'Selecciona un tipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona tipo</option>
                      {FABRICACION_ANUNCIOS_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo === 'cajas-luz' ? 'Cajas de luz' : tipo === 'letras-3d' ? 'Letras 3D' : tipo === 'anuncios-2d' ? 'Anuncios 2D' : tipo === 'bastidores' ? 'Bastidores' : tipo === 'toldos' ? 'Toldos' : tipo === 'neon' ? 'Neón' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.fab_tipoAnuncio && <p className="error-message">{errors.fab_tipoAnuncio.message}</p>}
                    {fabTipoAnuncio === 'otro' && (
                      <div className="mt-2">
                        <input {...register('fab_tipoOtro', { required: fabTipoAnuncio === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de anuncio" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Medidas <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('fab_medidas', { required: 'Las medidas son requeridas' })} type="text" className="input-field" placeholder="ancho × alto × profundidad" disabled={formStatus === 'submitting'} />
                    {errors.fab_medidas && <p className="error-message">{errors.fab_medidas.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Uso <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('fab_uso', { required: 'Selecciona una opción' })} type="radio" value="interior" className="text-cmyk-cyan" /> Interior
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('fab_uso')} type="radio" value="exterior" className="text-cmyk-cyan" /> Exterior
                      </label>
                    </div>
                    {errors.fab_uso && <p className="error-message">{errors.fab_uso.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Iluminación? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('fab_iluminacion', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('fab_iluminacion')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.fab_iluminacion && <p className="error-message">{errors.fab_iluminacion.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Instalación incluida? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('fab_instalacionIncluida', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('fab_instalacionIncluida')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.fab_instalacionIncluida && <p className="error-message">{errors.fab_instalacionIncluida.message}</p>}
                  </div>
                </div>
              )}

              {/* PUBLICIDAD MÓVIL */}
              {servicioValue === 'publicidad-movil' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Subtipo <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('pub_subtipo', { required: 'Selecciona un subtipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona subtipo</option>
                      <option value="vallas-moviles">Vallas móviles</option>
                      <option value="publibuses">Publibuses</option>
                      <option value="perifoneo">Perifoneo</option>
                      <option value="otro">Otro (especificar)</option>
                    </select>
                    {errors.pub_subtipo && <p className="error-message">{errors.pub_subtipo.message}</p>}
                  </div>

                  {/* Otro subtipo fields */}
                  {pubSubtipo === 'otro' && (
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-neutral-700">
                      <div className="md:col-span-2">
                        <label className="label-field">Tipo de publicidad móvil <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('pub_subtipoOtro', { required: pubSubtipo === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de publicidad móvil" disabled={formStatus === 'submitting'} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label-field">Descripción del servicio <span className="text-cmyk-magenta">*</span></label>
                        <textarea {...register('pub_otroDescripcion', { required: pubSubtipo === 'otro' ? 'La descripción es requerida' : false })} className="input-field" rows={3} placeholder="Describe detalladamente el servicio que necesitas" disabled={formStatus === 'submitting'} />
                      </div>
                    </div>
                  )}

                  {/* Vallas móviles fields */}
                  {pubSubtipo === 'vallas-moviles' && (
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-neutral-700 overflow-hidden">
                      <div>
                        <label className="label-field">Cantidad de vallas <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('vallas_cantidad', { required: pubSubtipo === 'vallas-moviles' ? 'La cantidad es requerida' : false, min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="1" disabled={formStatus === 'submitting'} />
                      </div>
                      <div>
                        <label className="label-field">Zona / ciudades de circulación <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('vallas_zona', { required: pubSubtipo === 'vallas-moviles' ? 'La zona es requerida' : false })} type="text" className="input-field" placeholder="Zona o ciudades donde circularán" disabled={formStatus === 'submitting'} />
                      </div>
                      <div>
                        <label className="label-field">Duración general de campaña <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('vallas_tiempoCampana', { required: pubSubtipo === 'vallas-moviles' ? 'El tiempo es requerido' : false })} type="text" className="input-field" placeholder="ej. 1 mes, 2 semanas" disabled={formStatus === 'submitting'} />
                      </div>
                      <div>
                        <label className="label-field">¿Impresión incluida? <span className="text-cmyk-magenta">*</span></label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('vallas_impresionIncluida')} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                          </label>
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('vallas_impresionIncluida')} type="radio" value="no" className="text-cmyk-cyan" /> No
                          </label>
                        </div>
                      </div>

                      {/* Multi-route section */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-cmyk-cyan flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                            Rutas de circulación
                          </h4>
                          <span className="text-xs text-gray-500">{vallasRoutes.length} ruta{vallasRoutes.length > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-xs text-gray-400 -mt-2">Agrega una o más rutas con sus fechas y horarios. Cada ruta puede tener su propio calendario.</p>

                        {vallasRoutes.map((entry, idx) => (
                          <div key={entry.id} className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-cmyk-cyan">Ruta {idx + 1}</span>
                              {vallasRoutes.length > 1 && (
                                <button type="button" onClick={() => setVallasRoutes(prev => prev.filter(r => r.id !== entry.id))} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  Eliminar
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="label-field text-xs">Fecha inicio</label>
                                <input type="date" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.fechaInicio}
                                  onChange={(e) => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaInicio: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Fecha fin</label>
                                <input type="date" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.fechaFin}
                                  onChange={(e) => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaFin: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Horario inicio</label>
                                <input type="time" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.horarioInicio}
                                  onChange={(e) => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioInicio: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Horario fin</label>
                                <input type="time" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.horarioFin}
                                  onChange={(e) => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioFin: e.target.value } : r))} />
                              </div>
                            </div>
                            <div>
                              <label className="label-field text-xs mb-1.5 block">Trazar ruta en mapa (opcional)</label>
                              <RouteSelector onChange={(route) => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, route } : r))} />
                            </div>
                          </div>
                        ))}

                        <button type="button"
                          onClick={() => setVallasRoutes(prev => [...prev, createConfigurableRoute()])}
                          className="w-full py-2.5 rounded-xl border-2 border-dashed border-cmyk-cyan/40 text-cmyk-cyan text-sm font-medium hover:bg-cmyk-cyan/10 hover:border-cmyk-cyan transition-all flex items-center justify-center gap-2"
                          disabled={formStatus === 'submitting'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Agregar otra ruta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Publibuses fields */}
                  {pubSubtipo === 'publibuses' && (
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-neutral-700">
                      <div>
                        <label className="label-field">Ciudad / zona <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('pub_ciudadZona', { required: pubSubtipo === 'publibuses' ? 'La zona es requerida' : false })} type="text" className="input-field" placeholder="Ciudad o zona de campaña" disabled={formStatus === 'submitting'} />
                      </div>
                      <div>
                        <label className="label-field">Tiempo de campaña (meses) <span className="text-cmyk-magenta">*</span></label>
                        <select {...register('pub_mesesCampana', { required: pubSubtipo === 'publibuses' ? 'Selecciona los meses' : false, valueAsNumber: true })} className="input-field" disabled={formStatus === 'submitting'}>
                          <option value="">Selecciona duración</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                            <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">¿Impresión incluida? <span className="text-cmyk-magenta">*</span></label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('pub_impresionIncluida')} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                          </label>
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('pub_impresionIncluida')} type="radio" value="no" className="text-cmyk-cyan" /> No
                          </label>
                        </div>
                      </div>

                      {/* Multi-route for publibuses */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-cmyk-cyan flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                            Rutas preestablecidas
                          </h4>
                          <span className="text-xs text-gray-500">{pubRoutes.length} ruta{pubRoutes.length > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-xs text-gray-400 -mt-2">Selecciona una o más rutas. La fecha fin se calcula automáticamente según los meses de campaña.</p>

                        {!pubMesesCampana && (
                          <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">⚠️ Primero selecciona los meses de campaña arriba para habilitar las fechas.</p>
                        )}

                        {pubRoutes.map((entry, idx) => (
                          <div key={entry.id} className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-cmyk-cyan">Ruta {idx + 1}</span>
                              {pubRoutes.length > 1 && (
                                <button type="button" onClick={() => setPubRoutes(prev => prev.filter(r => r.id !== entry.id))} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  Eliminar
                                </button>
                              )}
                            </div>
                            <div>
                              <label className="label-field text-xs">Ruta preestablecida</label>
                              <select className="input-field text-sm" disabled={formStatus === 'submitting'}
                                value={entry.ruta}
                                onChange={(e) => setPubRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, ruta: e.target.value } : r))}>
                                <option value="">Selecciona una ruta</option>
                                <option value="zocalo-base">Zócalo Base</option>
                                <option value="colosio-zocalo">Colosio Zócalo</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="label-field text-xs">Fecha inicio</label>
                                <input type="date" className="input-field text-sm"
                                  disabled={formStatus === 'submitting' || !pubMesesCampana}
                                  min={today}
                                  value={entry.fechaInicio}
                                  onChange={(e) => setPubRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaInicio: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Fecha fin <span className="text-gray-500">(auto)</span></label>
                                <input type="date" className="input-field text-sm bg-neutral-800 cursor-not-allowed" readOnly
                                  value={entry.fechaInicio && pubMesesCampana ? addMonths(entry.fechaInicio, Number(pubMesesCampana)) : ''} />
                              </div>
                            </div>

                            {/* Show map only when a route is selected */}
                            {entry.ruta && (
                              <div className="rounded-xl overflow-hidden border border-cmyk-cyan/30 bg-neutral-900">
                                <div className="p-2.5 bg-neutral-800/50 border-b border-neutral-700">
                                  <p className="text-xs text-cmyk-cyan font-medium flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                    {entry.ruta === 'zocalo-base' ? 'Zócalo Base' : 'Colosio Zócalo'}
                                  </p>
                                </div>
                                <iframe
                                  src={entry.ruta === 'zocalo-base'
                                    ? 'https://www.google.com/maps/d/embed?mid=1VXvDDqbLCqv54dbwkmtfNs8XKjUxzvo&ll=16.835724183151132%2C-99.87844209999999&z=13'
                                    : 'https://www.google.com/maps/d/embed?mid=1NrsT2SEvgGKOh7NusgOHD6-NJd4h1GE&ll=16.82830914325928%2C-99.85695&z=13'}
                                  width="100%"
                                  height="280"
                                  style={{ border: 0, minHeight: '230px' }}
                                  allowFullScreen
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                  className="w-full"
                                  title={entry.ruta === 'zocalo-base' ? 'Ruta Zócalo Base' : 'Ruta Colosio Zócalo'}
                                />
                              </div>
                            )}
                          </div>
                        ))}

                        <button type="button"
                          onClick={() => setPubRoutes(prev => [...prev, createEstablishedRoute()])}
                          className="w-full py-2.5 rounded-xl border-2 border-dashed border-cmyk-cyan/40 text-cmyk-cyan text-sm font-medium hover:bg-cmyk-cyan/10 hover:border-cmyk-cyan transition-all flex items-center justify-center gap-2"
                          disabled={formStatus === 'submitting'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Agregar otra ruta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Perifoneo fields */}
                  {pubSubtipo === 'perifoneo' && (
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-neutral-700 overflow-hidden">
                      <div>
                        <label className="label-field">Zona de cobertura <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('pub_zonaCobertura', { required: pubSubtipo === 'perifoneo' ? 'La zona es requerida' : false })} type="text" className="input-field" placeholder="Colonia, municipio o área" disabled={formStatus === 'submitting'} />
                      </div>
                      <div>
                        <label className="label-field">Duración total <span className="text-cmyk-magenta">*</span></label>
                        <input {...register('pub_duracion', { required: pubSubtipo === 'perifoneo' ? 'La duración es requerida' : false })} type="text" className="input-field" placeholder="ej. 4 horas / 2 días" disabled={formStatus === 'submitting'} />
                      </div>
                      <div>
                        <label className="label-field">¿Archivo de grabación proporcionado? <span className="text-cmyk-magenta">*</span></label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('pub_archivoGrabacion')} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                          </label>
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('pub_archivoGrabacion')} type="radio" value="no" className="text-cmyk-cyan" /> No
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="label-field">¿Requiere grabación por parte del proveedor? <span className="text-cmyk-magenta">*</span></label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('pub_requiereGrabacion')} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                          </label>
                          <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input {...register('pub_requiereGrabacion')} type="radio" value="no" className="text-cmyk-cyan" /> No
                          </label>
                        </div>
                      </div>

                      {/* Multi-route section for perifoneo */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-cmyk-cyan flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                            Rutas de perifoneo
                          </h4>
                          <span className="text-xs text-gray-500">{perifoneoRoutes.length} ruta{perifoneoRoutes.length > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-xs text-gray-400 -mt-2">Agrega una o más rutas con sus fechas y horarios de perifoneo.</p>

                        {perifoneoRoutes.map((entry, idx) => (
                          <div key={entry.id} className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-3 sm:p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-cmyk-cyan">Ruta {idx + 1}</span>
                              {perifoneoRoutes.length > 1 && (
                                <button type="button" onClick={() => setPerifoneoRoutes(prev => prev.filter(r => r.id !== entry.id))} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  Eliminar
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="label-field text-xs">Fecha inicio</label>
                                <input type="date" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.fechaInicio}
                                  onChange={(e) => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaInicio: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Fecha fin</label>
                                <input type="date" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.fechaFin}
                                  onChange={(e) => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaFin: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Horario inicio</label>
                                <input type="time" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.horarioInicio}
                                  onChange={(e) => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioInicio: e.target.value } : r))} />
                              </div>
                              <div>
                                <label className="label-field text-xs">Horario fin</label>
                                <input type="time" className="input-field text-sm" disabled={formStatus === 'submitting'}
                                  value={entry.horarioFin}
                                  onChange={(e) => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioFin: e.target.value } : r))} />
                              </div>
                            </div>
                            <div>
                              <label className="label-field text-xs mb-1.5 block">Trazar ruta en mapa (opcional)</label>
                              <RouteSelector onChange={(route) => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, route } : r))} />
                            </div>
                          </div>
                        ))}

                        <button type="button"
                          onClick={() => setPerifoneoRoutes(prev => [...prev, createConfigurableRoute()])}
                          className="w-full py-2.5 rounded-xl border-2 border-dashed border-cmyk-cyan/40 text-cmyk-cyan text-sm font-medium hover:bg-cmyk-cyan/10 hover:border-cmyk-cyan transition-all flex items-center justify-center gap-2"
                          disabled={formStatus === 'submitting'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Agregar otra ruta
                        </button>
                      </div>

                      <div className="md:col-span-2">
                        <label className="label-field mb-2 block">Descripción de zona</label>
                        <textarea {...register('pub_descripcionZona')} className="input-field" rows={3} placeholder="Describe las calles, colonias o puntos de referencia que delimitan la zona de perifoneo" disabled={formStatus === 'submitting'} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IMPRESIÓN GRAN FORMATO */}
              {servicioValue === 'impresion-gran-formato' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Material <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('igf_material', { required: 'Selecciona un material' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona material</option>
                      {GRAN_FORMATO_MATERIALES.map(mat => (
                        <option key={mat} value={mat}>{mat === 'otro' ? 'Otro (especificar)' : mat.charAt(0).toUpperCase() + mat.slice(1)}</option>
                      ))}
                    </select>
                    {errors.igf_material && <p className="error-message">{errors.igf_material.message}</p>}
                    {igfMaterial === 'otro' && (
                      <div className="mt-2">
                        <input {...register('igf_materialOtro', { required: igfMaterial === 'otro' ? 'Especifica el material' : false })} type="text" className="input-field" placeholder="Especifica el material" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Medidas <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('igf_medidas', { required: 'Las medidas son requeridas' })} type="text" className="input-field" placeholder="ancho × alto" disabled={formStatus === 'submitting'} />
                    {errors.igf_medidas && <p className="error-message">{errors.igf_medidas.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Cantidad <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('igf_cantidad', { required: 'La cantidad es requerida', min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="1" disabled={formStatus === 'submitting'} />
                    {errors.igf_cantidad && <p className="error-message">{errors.igf_cantidad.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Archivo listo para imprimir? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('igf_archivoListo', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('igf_archivoListo')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.igf_archivoListo && <p className="error-message">{errors.igf_archivoListo.message}</p>}
                  </div>
                </div>
              )}

              {/* SEÑALIZACIÓN */}
              {servicioValue === 'senalizacion' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Tipo de señalización <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('sen_tipo', { required: 'Selecciona un tipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona tipo</option>
                      {SENALIZACION_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo === 'interior' ? 'Interior' : tipo === 'exterior' ? 'Exterior' : tipo === 'vial' ? 'Vial' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.sen_tipo && <p className="error-message">{errors.sen_tipo.message}</p>}
                    {senTipo === 'otro' && (
                      <div className="mt-2">
                        <input {...register('sen_tipoOtro', { required: senTipo === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de señalización" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Medidas <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('sen_medidas', { required: 'Las medidas son requeridas' })} type="text" className="input-field" placeholder="ancho × alto" disabled={formStatus === 'submitting'} />
                    {errors.sen_medidas && <p className="error-message">{errors.sen_medidas.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Cantidad <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('sen_cantidad', { required: 'La cantidad es requerida', min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="1" disabled={formStatus === 'submitting'} />
                    {errors.sen_cantidad && <p className="error-message">{errors.sen_cantidad.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Instalación incluida? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('sen_instalacionIncluida', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('sen_instalacionIncluida')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.sen_instalacionIncluida && <p className="error-message">{errors.sen_instalacionIncluida.message}</p>}
                  </div>
                </div>
              )}

              {/* ROTULACIÓN VEHICULAR */}
              {servicioValue === 'rotulacion-vehicular' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-field">Tipo de vehículo <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('rot_tipoVehiculo', { required: 'El tipo de vehículo es requerido' })} type="text" className="input-field" placeholder="ej. Camioneta, Sedán, Autobús" disabled={formStatus === 'submitting'} />
                    {errors.rot_tipoVehiculo && <p className="error-message">{errors.rot_tipoVehiculo.message}</p>}
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Tipo de rotulación <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('rot_tipoRotulacion', { required: 'Selecciona un tipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona tipo</option>
                      {ROTULACION_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo === 'completa' ? 'Rotulación completa' : tipo === 'parcial' ? 'Rotulación parcial' : tipo === 'vinil-recortado' ? 'Vinil recortado' : tipo === 'impresion-digital' ? 'Impresión digital' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.rot_tipoRotulacion && <p className="error-message">{errors.rot_tipoRotulacion.message}</p>}
                    {rotTipoRotulacion === 'otro' && (
                      <div className="mt-2">
                        <input {...register('rot_tipoRotulacionOtro', { required: rotTipoRotulacion === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de rotulación" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">¿Diseño incluido? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('rot_disenoIncluido', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('rot_disenoIncluido')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.rot_disenoIncluido && <p className="error-message">{errors.rot_disenoIncluido.message}</p>}
                  </div>
                </div>
              )}

              {/* CORTE Y GRABADO CNC/LÁSER */}
              {servicioValue === 'corte-grabado-cnc-laser' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Tipo de servicio <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('cnc_tipo', { required: 'Selecciona un tipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona tipo</option>
                      {CNC_LASER_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo === 'router-cnc' ? 'Router CNC' : tipo === 'corte-laser' ? 'Corte Láser' : tipo === 'grabado-laser' ? 'Grabado Láser' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.cnc_tipo && <p className="error-message">{errors.cnc_tipo.message}</p>}
                    {cncTipo === 'otro' && (
                      <div className="mt-2">
                        <input {...register('cnc_tipoOtro', { required: cncTipo === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de servicio" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Medidas <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('cnc_medidas', { required: 'Las medidas son requeridas' })} type="text" className="input-field" placeholder="ancho × alto × espesor" disabled={formStatus === 'submitting'} />
                    {errors.cnc_medidas && <p className="error-message">{errors.cnc_medidas.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Cantidad <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('cnc_cantidad', { required: 'La cantidad es requerida', min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="1" disabled={formStatus === 'submitting'} />
                    {errors.cnc_cantidad && <p className="error-message">{errors.cnc_cantidad.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Archivo listo? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('cnc_archivoListo', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('cnc_archivoListo')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.cnc_archivoListo && <p className="error-message">{errors.cnc_archivoListo.message}</p>}
                  </div>
                </div>
              )}

              {/* DISEÑO GRÁFICO */}
              {servicioValue === 'diseno-grafico' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="label-field">Tipo de diseño <span className="text-cmyk-magenta">*</span></label>
                      {selectionFeedback?.subtype && (
                        <span className="text-xs text-cmyk-cyan font-semibold animate-pulse">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <select
                      {...register('dis_tipo', { required: 'Selecciona un tipo' })}
                      className={`input-field transition-all duration-300 ${
                        selectionFeedback?.subtype
                          ? 'border-cmyk-cyan border-b-4 animate-pulse shadow-[0_0_10px_rgba(0,183,235,0.5)]'
                          : ''
                      }`}
                      disabled={formStatus === 'submitting'}
                    >
                      <option value="">Selecciona tipo</option>
                      {DISENO_GRAFICO_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo === 'logotipos' ? 'Logotipos' : tipo === 'papeleria' ? 'Papelería' : tipo === 'redes-sociales' ? 'Redes Sociales' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.dis_tipo && <p className="error-message">{errors.dis_tipo.message}</p>}
                    {disTipo === 'otro' && (
                      <div className="mt-2">
                        <input {...register('dis_tipoOtro', { required: disTipo === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de diseño" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Número de piezas <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('dis_numeroPiezas', { required: 'El número es requerido', min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="1" disabled={formStatus === 'submitting'} />
                    {errors.dis_numeroPiezas && <p className="error-message">{errors.dis_numeroPiezas.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Uso del diseño <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('dis_usoDiseno', { required: 'Selecciona una opción' })} type="radio" value="impresion" className="text-cmyk-cyan" /> Impresión
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('dis_usoDiseno')} type="radio" value="digital" className="text-cmyk-cyan" /> Digital
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('dis_usoDiseno')} type="radio" value="ambos" className="text-cmyk-cyan" /> Ambos
                      </label>
                    </div>
                    {errors.dis_usoDiseno && <p className="error-message">{errors.dis_usoDiseno.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">¿Cambios incluidos? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('dis_cambiosIncluidos', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('dis_cambiosIncluidos')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.dis_cambiosIncluidos && <p className="error-message">{errors.dis_cambiosIncluidos.message}</p>}
                  </div>
                </div>
              )}

              {/* TARJETAS DE PRESENTACIÓN, VOLANTES Y OTRO */}
              {servicioValue === 'impresion-offset-serigrafia' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-field">Producto <span className="text-cmyk-magenta">*</span></label>
                    <select {...register('off_producto', { required: 'Selecciona un producto' })} className="input-field" disabled={formStatus === 'submitting'}>
                      <option value="">Selecciona producto</option>
                      {OFFSET_PRODUCTOS.map(prod => (
                        <option key={prod} value={prod}>
                          {prod === 'tarjetas-presentacion' ? 'Tarjetas de presentación' : prod === 'volantes' ? 'Volantes' : 'Otro (especificar)'}
                        </option>
                      ))}
                    </select>
                    {errors.off_producto && <p className="error-message">{errors.off_producto.message}</p>}
                    {offProducto === 'otro' && (
                      <div className="mt-2">
                        <input {...register('off_productoOtro', { required: offProducto === 'otro' ? 'Especifica el producto' : false })} type="text" className="input-field" placeholder="Especifica el producto" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Cantidad <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('off_cantidad', { required: 'La cantidad es requerida', min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="100" disabled={formStatus === 'submitting'} />
                    {errors.off_cantidad && <p className="error-message">{errors.off_cantidad.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Tipo <span className="text-cmyk-magenta">*</span></label>
                    <select {...register('off_tipoImpresion', { required: 'Selecciona un tipo' })} className="input-field" disabled={formStatus === 'submitting'}>
                      <option value="">Selecciona tipo</option>
                      {IMPRESION_TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo === 'tarjetas-presentacion' ? 'Tarjetas de Presentación' : tipo === 'volantes' ? 'Volantes' : 'Otro (especificar)'}</option>
                      ))}
                    </select>
                    {errors.off_tipoImpresion && <p className="error-message">{errors.off_tipoImpresion.message}</p>}
                    {offTipoImpresion === 'otro' && (
                      <div className="mt-2">
                        <input {...register('off_tipoImpresionOtro', { required: offTipoImpresion === 'otro' ? 'Especifica el tipo' : false })} type="text" className="input-field" placeholder="Especifica el tipo de impresión" disabled={formStatus === 'submitting'} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label-field">¿Archivo listo para imprimir? <span className="text-cmyk-magenta">*</span></label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('off_archivoListo', { required: 'Selecciona una opción' })} type="radio" value="si" className="text-cmyk-cyan" /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input {...register('off_archivoListo')} type="radio" value="no" className="text-cmyk-cyan" /> No
                      </label>
                    </div>
                    {errors.off_archivoListo && <p className="error-message">{errors.off_archivoListo.message}</p>}
                  </div>
                </div>
              )}

              {/* OTRO SERVICIO */}
              {servicioValue === 'otros' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="label-field">Tipo de servicio <span className="text-cmyk-magenta">*</span></label>
                    <input {...register('otros_tipoServicio', { required: servicioValue === 'otros' ? 'Especifica el tipo de servicio' : false })} type="text" className="input-field" placeholder="Describe brevemente el tipo de servicio que necesitas" disabled={formStatus === 'submitting'} />
                    {errors.otros_tipoServicio && <p className="error-message">{(errors.otros_tipoServicio as { message?: string })?.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="label-field">Descripción detallada <span className="text-cmyk-magenta">*</span></label>
                    <textarea {...register('otros_descripcion', { required: servicioValue === 'otros' ? 'La descripción es requerida' : false })} className="input-field" rows={4} placeholder="Describe detalladamente el servicio que necesitas, incluyendo especificaciones, materiales, acabados, etc." disabled={formStatus === 'submitting'} />
                    {errors.otros_descripcion && <p className="error-message">{(errors.otros_descripcion as { message?: string })?.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Medidas (si aplica)</label>
                    <input {...register('otros_medidas')} type="text" className="input-field" placeholder="ej. 2m × 1m" disabled={formStatus === 'submitting'} />
                  </div>
                  <div>
                    <label className="label-field">Cantidad</label>
                    <input {...register('otros_cantidad', { min: { value: 1, message: 'Mínimo 1' }, valueAsNumber: true })} type="number" min="1" className="input-field" placeholder="1" disabled={formStatus === 'submitting'} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION: Delivery Method */}
          {servicioValue && (() => {
            let currentSubtype: string | undefined;
            if (servicioValue === 'espectaculares') currentSubtype = espTipo || undefined;
            else if (servicioValue === 'publicidad-movil') currentSubtype = pubSubtipo || undefined;
            else if (servicioValue === 'fabricacion-anuncios') currentSubtype = fabTipoAnuncio || undefined;
            else if (servicioValue === 'senalizacion') currentSubtype = senTipo || undefined;
            else if (servicioValue === 'corte-grabado-cnc-laser') currentSubtype = cncTipo || undefined;
            else if (servicioValue === 'rotulacion-vehicular') currentSubtype = rotTipoRotulacion || undefined;
            else if (servicioValue === 'diseno-grafico') currentSubtype = disTipo || undefined;
            else if (servicioValue === 'impresion-offset-serigrafia') currentSubtype = offProducto || undefined;

            const methods = getDeliveryMethodsForService(servicioValue, currentSubtype);
            if (methods.length === 1 && methods[0] === 'not_applicable') return null;

            return (
              <div className="space-y-4 border border-cmyk-cyan/20 rounded-xl p-4 sm:p-6 bg-neutral-900/50">
                <label className="label-field flex items-center gap-2 !mb-0">
                  <svg className="w-5 h-5 text-cmyk-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Método de entrega <span className="text-cmyk-magenta">*</span>
                </label>
                <p className="text-xs text-gray-400 -mt-2">Selecciona cómo deseas recibir tu producto o servicio</p>

                {/* Method buttons */}
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
                  {methods.filter(m => m !== 'not_applicable').map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setDeliveryMethod(prev => prev === method ? '' : method);
                        setDeliveryError('');
                        if (method !== deliveryMethod) {
                          setDeliveryAddress({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigo_postal: '', referencia: '' });
                          setSelectedBranch('');
                          postalCode.reset();
                          setColoniaManual(false);
                          if (savedAddresses.length > 0) {
                            setUseNewAddress(false);
                            const def = savedAddresses.find((a) => a.is_default);
                            setSelectedAddressId(def?.id || savedAddresses[0].id);
                          }
                        }
                      }}
                      disabled={formStatus === 'submitting'}
                      className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                        deliveryMethod === method
                          ? 'border-cmyk-magenta bg-cmyk-magenta/15 text-white ring-2 ring-cmyk-magenta/50'
                          : 'border-gray-600 bg-neutral-800 text-gray-300 hover:border-gray-400 hover:bg-neutral-700'
                      }`}
                    >
                      <span className="text-lg">{DELIVERY_METHOD_ICONS[method]}</span>
                      <span>{DELIVERY_METHOD_LABELS[method].es}</span>
                    </button>
                  ))}
                </div>
                {deliveryError && <p className="error-message">{deliveryError}</p>}

                {/* SUB-FORM: Installation / Shipping address */}
                {(deliveryMethod === 'installation' || deliveryMethod === 'shipping') && (
                  <div className="space-y-3 pt-2 border-t border-gray-700">
                    <p className="text-sm text-cmyk-cyan font-medium">
                      {deliveryMethod === 'installation'
                        ? '📍 Dirección donde se realizará la instalación'
                        : '📦 Dirección de envío'}
                    </p>

                    {/* Saved addresses picker (logged-in users with addresses) */}
                    {savedAddresses.length > 0 && !useNewAddress ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => { setSelectedAddressId(addr.id); setDeliveryError(''); }}
                              disabled={formStatus === 'submitting'}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                selectedAddressId === addr.id
                                  ? 'border-cmyk-magenta bg-cmyk-magenta/10 ring-2 ring-cmyk-magenta/50'
                                  : 'border-gray-600 bg-neutral-800 hover:border-gray-400'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`text-sm mt-0.5 ${selectedAddressId === addr.id ? 'text-cmyk-cyan' : 'text-gray-500'}`}>📍</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white">{addr.label || 'Dirección'}</span>
                                    {addr.is_default && <span className="text-xs text-cmyk-cyan">(Predeterminada)</span>}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {addr.calle} {addr.numero_exterior}{addr.numero_interior ? ` Int. ${addr.numero_interior}` : ''}, {addr.colonia}, {addr.ciudad}, {addr.estado} C.P. {addr.codigo_postal}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUseNewAddress(true);
                            setDeliveryAddress({ calle: '', numero_exterior: '', numero_interior: '', colonia: '', ciudad: '', estado: '', codigo_postal: '', referencia: '' });
                            postalCode.reset();
                            setColoniaManual(false);
                          }}
                          disabled={formStatus === 'submitting'}
                          className="text-sm text-cmyk-cyan hover:underline font-medium"
                        >
                          + Usar otra dirección
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Back to saved addresses link */}
                        {savedAddresses.length > 0 && useNewAddress && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseNewAddress(false);
                              const def = savedAddresses.find((a) => a.is_default);
                              setSelectedAddressId(def?.id || savedAddresses[0].id);
                            }}
                            disabled={formStatus === 'submitting'}
                            className="text-sm text-cmyk-cyan hover:underline font-medium mb-1"
                          >
                            ← Usar una dirección guardada
                          </button>
                        )}

                    {/* Row 1: Código Postal (triggers autofill) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label-field">Código Postal <span className="text-cmyk-magenta">*</span></label>
                        <div className="relative">
                          <input
                            type="text" className="input-field" placeholder="39300" maxLength={5}
                            value={deliveryAddress.codigo_postal}
                            onChange={async e => {
                              const cp = e.target.value.replace(/\D/g, '');
                              setDeliveryAddress(p => ({ ...p, codigo_postal: cp }));
                              if (cp.length === 5) {
                                const result = await postalCode.lookup(cp);
                                if (result) {
                                  setDeliveryAddress(p => ({
                                    ...p,
                                    estado: result.estado,
                                    ciudad: result.municipio,
                                    colonia: result.colonias.length > 0 ? result.colonias[0] : '',
                                  }));
                                  setColoniaManual(false);
                                }
                              } else {
                                postalCode.reset();
                              }
                            }}
                            disabled={formStatus === 'submitting'}
                          />
                          {postalCode.loading && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <svg className="animate-spin h-4 w-4 text-cmyk-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {postalCode.error && (
                          <p className="text-xs text-red-400 mt-1">{postalCode.error}</p>
                        )}
                        {postalCode.data && (
                          <p className="text-xs text-green-400 mt-1">✓ CP encontrado — {postalCode.data.colonias.length} colonia{postalCode.data.colonias.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <div>
                        <label className="label-field">Estado <span className="text-cmyk-magenta">*</span></label>
                        <input
                          type="text" className={`input-field ${postalCode.data ? 'bg-neutral-700/50 text-gray-300' : ''}`} placeholder="Guerrero"
                          value={deliveryAddress.estado}
                          onChange={e => setDeliveryAddress(p => ({ ...p, estado: e.target.value }))}
                          readOnly={!!postalCode.data}
                          disabled={formStatus === 'submitting'}
                        />
                      </div>
                      <div>
                        <label className="label-field">Municipio / Ciudad <span className="text-cmyk-magenta">*</span></label>
                        <input
                          type="text" className={`input-field ${postalCode.data?.municipio ? 'bg-neutral-700/50 text-gray-300' : ''}`} placeholder="Acapulco de Juárez"
                          value={deliveryAddress.ciudad}
                          onChange={e => setDeliveryAddress(p => ({ ...p, ciudad: e.target.value }))}
                          readOnly={!!postalCode.data?.municipio}
                          disabled={formStatus === 'submitting'}
                        />
                      </div>
                    </div>

                    {/* Row 2: Colonia (dropdown from CP or manual) */}
                    <div>
                      <label className="label-field">Colonia <span className="text-cmyk-magenta">*</span></label>
                      {postalCode.data && postalCode.data.colonias.length > 0 && !coloniaManual ? (
                        <div className="space-y-1">
                          <select
                            className="input-field"
                            value={deliveryAddress.colonia}
                            onChange={e => {
                              if (e.target.value === '__otra__') {
                                setColoniaManual(true);
                                setDeliveryAddress(p => ({ ...p, colonia: '' }));
                              } else {
                                setDeliveryAddress(p => ({ ...p, colonia: e.target.value }));
                              }
                            }}
                            disabled={formStatus === 'submitting'}
                          >
                            {postalCode.data.colonias.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="__otra__">— Otra (escribir manualmente) —</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text" className="input-field" placeholder="Centro"
                            value={deliveryAddress.colonia}
                            onChange={e => setDeliveryAddress(p => ({ ...p, colonia: e.target.value }))}
                            disabled={formStatus === 'submitting'}
                          />
                          {coloniaManual && postalCode.data && (
                            <button
                              type="button"
                              className="text-xs text-cmyk-cyan hover:underline"
                              onClick={() => {
                                setColoniaManual(false);
                                setDeliveryAddress(p => ({ ...p, colonia: postalCode.data!.colonias[0] || '' }));
                              }}
                            >
                              ← Volver a seleccionar de la lista
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Row 3: Calle + Números */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label-field">Calle <span className="text-cmyk-magenta">*</span></label>
                        <input
                          type="text" className="input-field" placeholder="Av. Costera Miguel Alemán"
                          value={deliveryAddress.calle}
                          onChange={e => setDeliveryAddress(p => ({ ...p, calle: e.target.value }))}
                          disabled={formStatus === 'submitting'}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label-field">No. Exterior <span className="text-cmyk-magenta">*</span></label>
                          <input
                            type="text" className="input-field" placeholder="123"
                            value={deliveryAddress.numero_exterior}
                            onChange={e => setDeliveryAddress(p => ({ ...p, numero_exterior: e.target.value }))}
                            disabled={formStatus === 'submitting'}
                          />
                        </div>
                        <div>
                          <label className="label-field">No. Interior</label>
                          <input
                            type="text" className="input-field" placeholder="4B"
                            value={deliveryAddress.numero_interior}
                            onChange={e => setDeliveryAddress(p => ({ ...p, numero_interior: e.target.value }))}
                            disabled={formStatus === 'submitting'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Referencia */}
                    <div>
                      <label className="label-field">Referencia</label>
                      <input
                        type="text" className="input-field" placeholder="Entre calles, color de fachada, etc."
                        value={deliveryAddress.referencia}
                        onChange={e => setDeliveryAddress(p => ({ ...p, referencia: e.target.value }))}
                        disabled={formStatus === 'submitting'}
                      />
                    </div>
                      </>
                    )}
                  </div>
                )}

                {/* SUB-FORM: Pickup — branch selection */}
                {deliveryMethod === 'pickup' && (
                  <div className="space-y-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-cmyk-cyan font-medium">🏬 Selecciona la sucursal donde recogerás tu pedido</p>
                    {branchesLoading ? (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-neutral-800/60">
                        <svg className="animate-spin h-5 w-5 text-cmyk-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm text-gray-400">Cargando sucursales...</span>
                      </div>
                    ) : branchesError ? (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                        <p className="text-sm text-red-400 mb-2">No se pudieron cargar las sucursales</p>
                        <button
                          type="button"
                          onClick={fetchBranches}
                          className="text-xs text-cmyk-cyan hover:underline font-medium"
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : branches.length === 0 ? (
                      <p className="text-sm text-gray-400 p-4 text-center">No hay sucursales disponibles actualmente.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {branches.map((branch) => (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => { setSelectedBranch(branch.id); setDeliveryError(''); }}
                            disabled={formStatus === 'submitting'}
                            className={`text-left p-3 sm:p-4 rounded-lg border transition-all ${
                              selectedBranch === branch.id
                                ? 'border-cmyk-magenta bg-cmyk-magenta/10 ring-2 ring-cmyk-magenta/50'
                                : 'border-gray-600 bg-neutral-800 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl mt-0.5 hidden sm:block">{selectedBranch === branch.id ? '✅' : '🏬'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm sm:text-base">{branch.name}</p>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1 break-words">{branch.full_address}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                  <p className="text-xs text-gray-400">📞 {branch.phone}</p>
                                  <p className="text-xs text-gray-400">🕐 {branch.hours}</p>
                                </div>
                                {branch.google_maps_url && (
                                  <a
                                    href={branch.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs text-cmyk-cyan hover:underline mt-2 inline-flex items-center gap-1"
                                  >
                                    📍 Ver en Google Maps →
                                  </a>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-FORM: Digital — confirmation */}
                {deliveryMethod === 'digital' && (
                  <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-lg sm:text-xl">💻</span>
                    <div>
                      <p className="text-sm text-emerald-400 font-medium">Entrega digital</p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        Los archivos finales se enviarán al correo electrónico que proporcionaste en los datos de contacto.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SECTION: Files and Comments */}
          <div className="space-y-6">
            {/* File upload */}
            <div>
              <label className="label-field">Agregar archivos</label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-cmyk-magenta bg-cmyk-magenta/10' : 'border-gray-300 hover:border-cmyk-magenta hover:bg-cmyk-magenta/5'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                  disabled={formStatus === 'submitting'}
                  accept=".pdf,.jpg,.jpeg,.png,.ai,.cdr,.dxf,.svg"
                />
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-white font-medium text-sm">{t('dragOrClick')}</p>
                <p className="text-gray-300 text-xs mt-1">PDF, JPG, PNG, AI, CDR, DXF, SVG (max 10MB por archivo)</p>
              </div>

              {/* File list */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-neutral-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-cmyk-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                        <span className="text-sm text-white truncate">{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
                      </div>
                      <button type="button" onClick={() => removeFile(index)} className="text-red-400 hover:text-red-300 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <label htmlFor="comentarios" className="label-field">{t('comments')}</label>
              <textarea
                {...register('comentarios', { maxLength: { value: 2000, message: 'Máximo 2000 caracteres' } })}
                id="comentarios"
                rows={4}
                className="input-field resize-none"
                placeholder={t('commentsPlaceholder')}
                disabled={formStatus === 'submitting'}
              />
              {errors.comentarios && <p className="error-message">{errors.comentarios.message}</p>}
            </div>

            {/* Honeypot */}
            <input {...register('website')} type="text" className="hidden" tabIndex={-1} autoComplete="off" />

            {/* Privacy checkbox */}
            <div className="flex items-start">
              <input
                {...register('privacidad', { required: 'Debes aceptar el aviso de privacidad' })}
                type="checkbox"
                id="privacidad"
                className="mt-1 w-4 h-4 text-cmyk-magenta border-cmyk-cyan/30 rounded focus:ring-cmyk-magenta"
                disabled={formStatus === 'submitting'}
              />
              <label htmlFor="privacidad" className="ml-3 text-sm text-gray-300">
                {t('privacy')}{' '}
                <button type="button" onClick={openPrivacy} className="text-cmyk-magenta hover:underline">{t('privacyLink')}</button>
                . <span className="text-cmyk-magenta">*</span>
              </label>
            </div>
            {errors.privacidad && <p className="error-message">{errors.privacidad.message}</p>}

            {/* Submit button */}
            <button type="submit" disabled={formStatus === 'submitting'} className="btn-primary w-full text-lg py-4">
              {formStatus === 'submitting' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('sending')}
                </span>
              ) : (
                t('submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
