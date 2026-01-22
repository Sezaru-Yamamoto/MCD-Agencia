/**
 * Home Page for MCD-Agencia
 *
 * Landing page with:
 * - Hero carousel
 * - Services section
 * - How it works
 * - Portfolio
 * - Clients
 * - FAQ
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
  Services,
  HowItWorks,
  Portfolio,
  Clients,
  FAQ,
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
    <div className="landing-page">
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
      
      <Header />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Portfolio />
        <Clients />
        <FAQ />
        <QuoteForm />
        <Locations />
      </main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </div>
  );
}
