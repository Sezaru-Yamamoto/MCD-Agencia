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

import { useEffect, useState, useRef, type ReactNode } from 'react';
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
  ChatWidget,
} from '@/components/landing';
import { StickyActions } from '@/components/landing/StickyActions';

// ─── Scroll-reveal wrapper ─────────────────────────────────────────────────
function ScrollRevealSection({
  children,
  delay = 0,
  translateY = 60,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  translateY?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = `translateY(${translateY}px)`;
    el.style.transition = `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; obs.unobserve(el); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, translateY]);

  return <div ref={ref} className={className}>{children}</div>;
}

// =============================================================================
// Home Page Component
// =============================================================================

export default function HomePage() {
  const [chatOpen, setChatOpen] = useState(false);

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
        {/* ─── Parallax reveal overlay: content scrolls over the sticky Hero ── */}
        <div className="relative z-10">
        {/* Gradient fade from hero into content */}
        <div className="h-32 sm:h-40 md:h-52 -mt-32 sm:-mt-40 md:-mt-52 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a] pointer-events-none" />
        <ScrollRevealSection translateY={80}>
          <Portfolio />
        </ScrollRevealSection>
        <ScrollRevealSection delay={100}>
          <Clients />
        </ScrollRevealSection>
        <ScrollRevealSection translateY={60}>
          <QuoteForm />
        </ScrollRevealSection>
        <ScrollRevealSection delay={50}>
          <Locations />
        </ScrollRevealSection>
        </div>{/* end parallax overlay */}
      </main>
      <ScrollRevealSection translateY={40}>
        <Footer />
      </ScrollRevealSection>
      <StickyActions
        onChatToggle={() => setChatOpen(true)}
        isChatOpen={chatOpen}
      />
      <ChatWidget
        externalOpen={chatOpen}
        onOpenChange={setChatOpen}
      />
    </div>
  );
}
