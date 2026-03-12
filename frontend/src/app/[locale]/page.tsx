/**
 * Home Page for MCD-Agencia
 *
 * Landing page with:
 * - Hero full-width carousel (services integrated)
 * - Portfolio
 * - Clients
 * - Quote form
 * - Locations
 *
 * @module app/[locale]/page
 */

'use client';

import { useEffect } from 'react';
import { trackEvent, trackingEvents } from '@/lib/tracking';

// Landing page components
import {
  Header,
  Hero,
  BackgroundGlow,
  Portfolio,
  Clients,
  QuoteForm,
  Locations,
  Footer,
  WhatsAppButton,
  ChatWidget,
} from '@/components/landing';

// =============================================================================
// Home Page Component
// =============================================================================

export default function HomePage() {
  useEffect(() => {
    // Track page view
    trackEvent(trackingEvents.LP_VIEW, {
      page: '/',
      title: 'Landing Page - Agencia MCD',
    });
  }, []);

  return (
    <div className="landing-page relative bg-cmyk-black min-h-screen">
      {/* Hide the default layout header/footer - landing has its own */}
      <style jsx global>{`
        .landing-page ~ header,
        .landing-page ~ footer,
        .layout-header,
        .layout-footer,
        #main-content > .layout-header,
        #main-content > .layout-footer {
          display: none !important;
        }
      `}</style>

      {/* Background glows distributed across the page */}
      <BackgroundGlow />

      <Header />
      <main className="relative z-10">
        <Hero />
        <Portfolio />
        <Clients />
        <QuoteForm />
        <Locations />
      </main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </div>
  );
}
