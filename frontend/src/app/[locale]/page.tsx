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

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
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

// ─── Scroll-reveal (fueled.com / oncorps.ai style) ─────────────────────────
function ScrollReveal({
  children,
  delay = 0,
  translateY = 60,
  scale = false,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  translateY?: number;
  scale?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const initScale = scale ? 0.97 : 1;
    el.style.opacity = '0';
    el.style.transform = `translateY(${translateY}px) scale(${initScale})`;
    el.style.willChange = 'transform, opacity';
    el.style.transition = `opacity 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) scale(1)';
          obs.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, translateY, scale]);

  return <div ref={ref} className={className}>{children}</div>;
}

// ─── Parallax speed layer (bearideas.fr style) ─────────────────────────────
function ParallaxShift({
  children,
  speed = 0.12,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const offset = (center - viewCenter) * speed;
      el.style.transform = `translateY(${offset}px)`;
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [speed]);

  return <div ref={ref} className={`will-change-transform ${className}`}>{children}</div>;
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

        {/* Smooth transition zone: Hero → Portfolio */}
        <div className="relative z-10 -mt-1">
          {/* Soft gradient bridge (no hard line) */}
          <div className="h-24 sm:h-32 md:h-40 bg-gradient-to-b from-transparent to-cmyk-black pointer-events-none" />
        </div>

        {/* Portfolio — scale-up reveal + subtle parallax shift */}
        <ParallaxShift speed={0.06}>
          <ScrollReveal translateY={80} scale>
            <Portfolio />
          </ScrollReveal>
        </ParallaxShift>

        {/* Clients — slide up */}
        <ScrollReveal translateY={50} delay={80}>
          <Clients />
        </ScrollReveal>

        {/* QuoteForm — scale reveal + parallax */}
        <ParallaxShift speed={0.04}>
          <ScrollReveal translateY={60} scale>
            <QuoteForm />
          </ScrollReveal>
        </ParallaxShift>

        {/* Locations — slide up */}
        <ScrollReveal translateY={50} delay={60}>
          <Locations />
        </ScrollReveal>
      </main>

      <ScrollReveal translateY={30}>
        <Footer />
      </ScrollReveal>
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
