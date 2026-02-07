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
export const IMPRESION_TIPOS = ['offset', 'serigrafia', 'sublimacion', 'otro'] as const;

export type ImpresionTipo = typeof IMPRESION_TIPOS[number];

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
  'impresion-offset-serigrafia': 'Impresión offset, serigrafía, sublimación',
  'otros': 'Otro servicio',
};

// Services shown on landing page (5 main services)
export const LANDING_SERVICE_IDS = [
  'fabricacion-anuncios',
  'espectaculares',
  'publicidad-movil',
  'impresion-gran-formato',
  'rotulacion-vehicular',
] as const;

export type LandingServiceId = typeof LANDING_SERVICE_IDS[number];

// Subcategory type for services
export interface ServiceSubcategory {
  id: string;
  titleKey: string;
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
};

// Subcategories for each landing service
export const SERVICE_SUBCATEGORIES: Record<LandingServiceId, ServiceSubcategory[]> = {
  'fabricacion-anuncios': [
    { id: 'letras-3d', titleKey: 'letras3d', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=letras-3d' },
    { id: 'cajas-luz', titleKey: 'cajasLuz', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=cajas-luz' },
    { id: 'neon', titleKey: 'neonLed', href: '#cotizar?servicio=fabricacion-anuncios&subtipo=neon' },
  ],
  'espectaculares': [
    { id: 'unipolar', titleKey: 'unipolar', href: '#cotizar?servicio=espectaculares&subtipo=unipolar' },
    { id: 'azotea', titleKey: 'azotea', href: '#cotizar?servicio=espectaculares&subtipo=azotea' },
    { id: 'mural', titleKey: 'mural', href: '#cotizar?servicio=espectaculares&subtipo=mural' },
  ],
  'publicidad-movil': [
    { id: 'vallas-moviles', titleKey: 'vallasMoviles', href: '#cotizar?servicio=publicidad-movil&subtipo=vallas-moviles' },
    { id: 'publibuses', titleKey: 'publibuses', href: '#cotizar?servicio=publicidad-movil&subtipo=publibuses' },
    { id: 'perifoneo', titleKey: 'perifoneo', href: '#cotizar?servicio=publicidad-movil&subtipo=perifoneo' },
  ],
  'impresion-gran-formato': [
    { id: 'lona', titleKey: 'lona', href: '#cotizar?servicio=impresion-gran-formato&subtipo=lona' },
    { id: 'vinil', titleKey: 'vinil', href: '#cotizar?servicio=impresion-gran-formato&subtipo=vinil' },
    { id: 'tela', titleKey: 'tela', href: '#cotizar?servicio=impresion-gran-formato&subtipo=tela' },
  ],
  'rotulacion-vehicular': [
    { id: 'completa', titleKey: 'rotulacionCompleta', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=completa' },
    { id: 'parcial', titleKey: 'rotulacionParcial', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=parcial' },
    { id: 'vinil-recortado', titleKey: 'vinilRecortado', href: '#cotizar?servicio=rotulacion-vehicular&subtipo=vinil-recortado' },
  ],
};

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
}> = {
  'acapulco': {
    phone: '+52 222 805 5700',
    phoneDisplay: '222 805 5700',
    email: 'ventas@agenciamcd.mx',
    latitude: 16.8566,
    longitude: -99.8919,
    whatsappUrl: 'https://wa.me/522228055700',
  },
  'tecoanapa': {
    phone: '+52 745 114 7727',
    phoneDisplay: '745 114 7727',
    email: 'ventas2@agenciamcd.mx',
    latitude: 16.9833,
    longitude: -101.1667,
    whatsappUrl: 'https://wa.me/527451147727',
  },
};
