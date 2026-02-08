// Service IDs for QuoteForm (new structure)
export const SERVICE_IDS = [
  'espectaculares',
  'fabricacion-anuncios',
  'publicidad-movil',
  'impresion-gran-formato',
  'senalizacion',
  'rotulacion-vehicular',
  'corte-grabado-cnc-laser',
  'diseno-grafico',
  'impresion-offset-serigrafia',
  'otros',
] as const;

export type ServiceId = typeof SERVICE_IDS[number];

// Subtypes for Espectaculares
export const ESPECTACULARES_TIPOS = ['unipolar', 'azotea', 'mural', 'otro'] as const;

export type EspectacularesTipo = typeof ESPECTACULARES_TIPOS[number];

// Subtypes for Fabricación de anuncios
export const FABRICACION_ANUNCIOS_TIPOS = [
  'cajas-luz',
  'letras-3d',
  'anuncios-2d',
  'bastidores',
  'toldos',
  'neon',
  'otro',
] as const;

export type FabricacionAnunciosTipo = typeof FABRICACION_ANUNCIOS_TIPOS[number];

// Subtypes for Publicidad móvil
export const PUBLICIDAD_MOVIL_SUBTIPOS = ['vallas-moviles', 'publibuses', 'perifoneo', 'otro'] as const;

export type PublicidadMovilSubtipo = typeof PUBLICIDAD_MOVIL_SUBTIPOS[number];

// Materials for Gran formato
export const GRAN_FORMATO_MATERIALES = ['lona', 'vinil', 'tela', 'otro'] as const;

export type GranFormatoMaterial = typeof GRAN_FORMATO_MATERIALES[number];

// Types for Rotulación vehicular
export const ROTULACION_TIPOS = [
  'completa',
  'parcial',
  'vinil-recortado',
  'impresion-digital',
  'otro',
] as const;

export type RotulacionTipo = typeof ROTULACION_TIPOS[number];

// Products for Offset printing
export const OFFSET_PRODUCTOS = [
  'tarjetas-presentacion',
  'volantes',
  'otro',
] as const;

export type OffsetProducto = typeof OFFSET_PRODUCTOS[number];

// Printing types
export const IMPRESION_TIPOS = ['tarjetas-presentacion', 'volantes', 'otro'] as const;

export type ImpresionTipo = typeof IMPRESION_TIPOS[number];

// Signage types
export const SENALIZACION_TIPOS = ['interior', 'exterior', 'vial', 'otro'] as const;

export type SenalizacionTipo = typeof SENALIZACION_TIPOS[number];

// CNC/Laser types
export const CNC_LASER_TIPOS = ['router-cnc', 'corte-laser', 'grabado-laser', 'otro'] as const;

export type CncLaserTipo = typeof CNC_LASER_TIPOS[number];

// Graphic design types
export const DISENO_GRAFICO_TIPOS = ['logotipos', 'papeleria', 'redes-sociales', 'otro'] as const;

export type DisenoGraficoTipo = typeof DISENO_GRAFICO_TIPOS[number];

// Service labels for display
export const SERVICE_LABELS: Record<ServiceId, string> = {
  'espectaculares': 'Espectaculares',
  'fabricacion-anuncios': 'Fabricación de anuncios',
  'publicidad-movil': 'Publicidad móvil',
  'impresion-gran-formato': 'Impresión en gran formato y alta resolución',
  'senalizacion': 'Señalización',
  'rotulacion-vehicular': 'Rotulación vehicular',
  'corte-grabado-cnc-laser': 'Corte y grabado en CNC y láser',
  'diseno-grafico': 'Diseño gráfico',
  'impresion-offset-serigrafia': 'Tarjetas de Presentación, Volantes y Otro',
  'otros': 'Otro servicio',
};

// Services shown on landing page (all 9 real services)
export const LANDING_SERVICE_IDS = [
  'fabricacion-anuncios',
  'espectaculares',
  'publicidad-movil',
  'impresion-gran-formato',
  'senalizacion',
  'rotulacion-vehicular',
  'corte-grabado-cnc-laser',
  'diseno-grafico',
  'impresion-offset-serigrafia',
] as const;

export type LandingServiceId = typeof LANDING_SERVICE_IDS[number];

// All 9 real services (excluding 'otros')
export const REAL_SERVICE_IDS = SERVICE_IDS.filter((id) => id !== 'otros') as unknown as readonly ServiceId[];

// Subcategory type for services
export interface ServiceSubcategory {
  id: string;
  titleKey: string;
  label: string;   // human-readable Spanish label
  href: string;
}

// Carousel images for each landing service
export const SERVICE_CAROUSEL_IMAGES: Record<LandingServiceId, string[]> = {
  'fabricacion-anuncios': [
    'https://images.unsplash.com/photo-1557825835-70d97c4aa567?w=600&q=80',
    'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=600&q=80',
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&q=80',
  ],
  'espectaculares': [
    'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=600&q=80',
    'https://images.unsplash.com/photo-1557825835-70d97c4aa567?w=600&q=80',
    'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
  ],
  'publicidad-movil': [
    'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  ],
  'impresion-gran-formato': [
    'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&q=80',
    'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
  ],
  'rotulacion-vehicular': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
    'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
  ],
  'senalizacion': [
    'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=600&q=80',
    'https://images.unsplash.com/photo-1557825835-70d97c4aa567?w=600&q=80',
    'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
  ],
  'corte-grabado-cnc-laser': [
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&q=80',
    'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
  ],
  'diseno-grafico': [
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&q=80',
  ],
  'impresion-offset-serigrafia': [
    'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
    'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&q=80',
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
  ],
};

// Subcategories for each landing service
export const SERVICE_SUBCATEGORIES: Record<LandingServiceId, ServiceSubcategory[]> = {
  'fabricacion-anuncios': [
    { id: 'letras-3d', titleKey: 'letras3d', label: 'Letras 3D', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=letras-3d' },
    { id: 'cajas-luz', titleKey: 'cajasLuz', label: 'Cajas de Luz', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=cajas-luz' },
    { id: 'neon', titleKey: 'neonLed', label: 'Neón / LED', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=neon' },
    { id: 'anuncios-2d', titleKey: 'anuncios2d', label: 'Anuncios 2D', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=anuncios-2d' },
    { id: 'bastidores', titleKey: 'bastidores', label: 'Bastidores', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=bastidores' },
    { id: 'toldos', titleKey: 'toldos', label: 'Toldos', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=toldos' },
  ],
  'espectaculares': [
    { id: 'unipolar', titleKey: 'unipolar', label: 'Unipolar', href: '#cotizar?servicio=espectaculares&subtipo=unipolar' },
    { id: 'azotea', titleKey: 'azotea', label: 'Azotea', href: '#cotizar?servicio=espectaculares&subtipo=azotea' },
    { id: 'mural', titleKey: 'mural', label: 'Mural', href: '#cotizar?servicio=espectaculares&subtipo=mural' },
  ],
  'publicidad-movil': [
    { id: 'vallas-moviles', titleKey: 'vallasMoviles', label: 'Vallas Móviles', href: '#cotizar?servicio=publicidad-movil&subtipo=vallas-moviles' },
    { id: 'publibuses', titleKey: 'publibuses', label: 'Publibuses', href: '#cotizar?servicio=publicidad-movil&subtipo=publibuses' },
    { id: 'perifoneo', titleKey: 'perifoneo', label: 'Perifoneo', href: '#cotizar?servicio=publicidad-movil&subtipo=perifoneo' },
  ],
  'impresion-gran-formato': [
    { id: 'lona', titleKey: 'lona', label: 'Lona', href: '#cotizar?servicio=impresion-gran-formato&subtipo=lona' },
    { id: 'vinil', titleKey: 'vinil', label: 'Vinil', href: '#cotizar?servicio=impresion-gran-formato&subtipo=vinil' },
    { id: 'tela', titleKey: 'tela', label: 'Tela', href: '#cotizar?servicio=impresion-gran-formato&subtipo=tela' },
  ],
  'rotulacion-vehicular': [
    { id: 'completa', titleKey: 'rotulacionCompleta', label: 'Rotulación Completa', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=completa' },
    { id: 'parcial', titleKey: 'rotulacionParcial', label: 'Rotulación Parcial', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=parcial' },
    { id: 'vinil-recortado', titleKey: 'vinilRecortado', label: 'Vinil Recortado', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=vinil-recortado' },
    { id: 'impresion-digital', titleKey: 'impresionDigital', label: 'Impresión Digital', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=impresion-digital' },
  ],
  'senalizacion': [
    { id: 'interior', titleKey: 'interior', label: 'Interior', href: '#cotizar?servicio=senalizacion&subtipo=interior' },
    { id: 'exterior', titleKey: 'exterior', label: 'Exterior', href: '#cotizar?servicio=senalizacion&subtipo=exterior' },
    { id: 'vial', titleKey: 'vial', label: 'Vial', href: '#cotizar?servicio=senalizacion&subtipo=vial' },
  ],
  'corte-grabado-cnc-laser': [
    { id: 'router-cnc', titleKey: 'routerCnc', label: 'Router CNC', href: '#cotizar?servicio=corte-grabado-cnc-laser&subtipo=router-cnc' },
    { id: 'corte-laser', titleKey: 'corteLaser', label: 'Corte Láser', href: '#cotizar?servicio=corte-grabado-cnc-laser&subtipo=corte-laser' },
    { id: 'grabado-laser', titleKey: 'grabadoLaser', label: 'Grabado Láser', href: '#cotizar?servicio=corte-grabado-cnc-laser&subtipo=grabado-laser' },
  ],
  'diseno-grafico': [
    { id: 'logotipos', titleKey: 'logotipos', label: 'Logotipos', href: '#cotizar?servicio=diseno-grafico&subtipo=logotipos' },
    { id: 'papeleria', titleKey: 'papeleria', label: 'Papelería', href: '#cotizar?servicio=diseno-grafico&subtipo=papeleria' },
    { id: 'redes-sociales', titleKey: 'redesSociales', label: 'Redes Sociales', href: '#cotizar?servicio=diseno-grafico&subtipo=redes-sociales' },
  ],
  'impresion-offset-serigrafia': [
    { id: 'tarjetas-presentacion', titleKey: 'tarjetasPresentacion', label: 'Tarjetas de Presentación', href: '#cotizar?servicio=impresion-offset-serigrafia&subtipo=tarjetas-presentacion' },
    { id: 'volantes', titleKey: 'volantes', label: 'Volantes', href: '#cotizar?servicio=impresion-offset-serigrafia&subtipo=volantes' },
    { id: 'otro', titleKey: 'otro', label: 'Otro', href: '#cotizar?servicio=impresion-offset-serigrafia&subtipo=otro' },
  ],
};

// Full subcategories for ALL 9 services (used in CMS admin)
export const ALL_SERVICE_SUBCATEGORIES: Record<string, ServiceSubcategory[]> = SERVICE_SUBCATEGORIES;

// Definitions used to auto-sync services into the backend
export const SERVICE_SYNC_DEFINITIONS: Array<{
  service_key: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  position: number;
}> = [
  { service_key: 'espectaculares', name: 'Espectaculares', name_en: 'Billboards', description: 'Anuncios de gran formato en ubicaciones estratégicas.', icon: '🏢', position: 0 },
  { service_key: 'fabricacion-anuncios', name: 'Fabricación de anuncios', name_en: 'Sign Manufacturing', description: 'Fabricación de anuncios luminosos, letras 3D y más.', icon: '💡', position: 1 },
  { service_key: 'publicidad-movil', name: 'Publicidad móvil', name_en: 'Mobile Advertising', description: 'Vallas móviles, publibuses y perifoneo.', icon: '🚚', position: 2 },
  { service_key: 'impresion-gran-formato', name: 'Impresión en gran formato', name_en: 'Large Format Printing', description: 'Impresiones de alta resolución en lona, vinil y tela.', icon: '🖨️', position: 3 },
  { service_key: 'senalizacion', name: 'Señalización', name_en: 'Signage', description: 'Señalización interior, exterior y vial.', icon: '🚧', position: 4 },
  { service_key: 'rotulacion-vehicular', name: 'Rotulación vehicular', name_en: 'Vehicle Wrapping', description: 'Rotulación completa o parcial para vehículos.', icon: '🚗', position: 5 },
  { service_key: 'corte-grabado-cnc-laser', name: 'Corte y grabado CNC / Láser', name_en: 'CNC & Laser Cutting', description: 'Corte y grabado de precisión en diversos materiales.', icon: '⚙️', position: 6 },
  { service_key: 'diseno-grafico', name: 'Diseño gráfico', name_en: 'Graphic Design', description: 'Diseño de logotipos, papelería y material digital.', icon: '🎨', position: 7 },
  { service_key: 'impresion-offset-serigrafia', name: 'Tarjetas de Presentación, Volantes y Otro', name_en: 'Business Cards, Flyers & Other', description: 'Tarjetas de presentación, volantes y otros productos impresos.', icon: '📄', position: 8 },
];

// Service icons for display
export const SERVICE_ICONS: Record<ServiceId, string> = {
  'espectaculares': '🏢',
  'fabricacion-anuncios': '💡',
  'publicidad-movil': '🚚',
  'impresion-gran-formato': '🖨️',
  'senalizacion': '🚧',
  'rotulacion-vehicular': '🚗',
  'corte-grabado-cnc-laser': '⚙️',
  'diseno-grafico': '🎨',
  'impresion-offset-serigrafia': '📄',
  'otros': '📋',
};

// FAQ item keys
export const FAQ_KEYS = [
  'delivery',
  'shipping',
  'formats',
  'samples',
  'design',
  'payment',
  'warranty',
  'hours',
] as const;

export type FAQKey = typeof FAQ_KEYS[number];

// Location IDs
export const LOCATION_IDS = ['acapulco', 'tecoanapa'] as const;
export type LocationId = typeof LOCATION_IDS[number];

export const LOCATION_DATA: Record<LocationId, {
  phone: string;
  phoneDisplay: string;
  email: string;
  latitude: number;
  longitude: number;
  whatsappUrl: string;
  mapsUrl: string;
}> = {
  'acapulco': {
    phone: '+52 222 805 5700',
    phoneDisplay: '222 805 5700',
    email: 'ventas@agenciamcd.mx',
    latitude: 16.8001189,
    longitude: -99.8063231,
    whatsappUrl: 'https://wa.me/522228055700',
    mapsUrl: 'https://maps.app.goo.gl/T3pDHZrqm4bVKAJV6',
  },
  'tecoanapa': {
    phone: '+52 745 114 7727',
    phoneDisplay: '745 114 7727',
    email: 'ventas2@agenciamcd.mx',
    latitude: 16.8512082,
    longitude: -99.84964,
    whatsappUrl: 'https://wa.me/527451147727',
    mapsUrl: 'https://maps.app.goo.gl/6zj1WJvJ57jb64Ph6',
  },
};
