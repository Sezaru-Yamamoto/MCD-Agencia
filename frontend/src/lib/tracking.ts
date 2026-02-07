/**
 * Tracking utilities for analytics
 */

// Eventos de tracking según el PRD
export const trackingEvents = {
  LP_VIEW: 'lp_view',
  CTA_CLICK_QUOTE: 'cta_click_quote',
  CTA_CLICK_WHATSAPP: 'cta_click_whatsapp',
  FORM_START: 'form_start',
  FORM_SUBMIT_SUCCESS: 'form_submit_success',
  FORM_SUBMIT_ERROR: 'form_submit_error',
} as const;

export type TrackingEvent = typeof trackingEvents[keyof typeof trackingEvents];

// Extend window type for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: TrackingEvent | string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }

  // Log en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties);
  }
}

// Helper para tracking de CTAs
export function trackCTA(type: 'quote' | 'whatsapp' | 'video_play', location: string) {
  let eventName: string;
  if (type === 'quote') {
    eventName = trackingEvents.CTA_CLICK_QUOTE;
  } else if (type === 'whatsapp') {
    eventName = trackingEvents.CTA_CLICK_WHATSAPP;
  } else {
    eventName = 'video_play';
  }

  trackEvent(eventName, { location });
}
