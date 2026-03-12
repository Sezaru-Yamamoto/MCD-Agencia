'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CONTACT_INFO } from '@/lib/constants';
import { trackCTA } from '@/lib/tracking';
import { getCarouselSlides } from '@/lib/api/content';
import {
  LANDING_SERVICE_IDS,
  SERVICE_CAROUSEL_IMAGES,
  type LandingServiceId,
} from '@/lib/service-ids';
import { getLandingPageData } from '@/lib/api/content';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HeroSlide {
  image: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  serviceKey?: string;
}

// ─── Fallback slides when API is empty ───────────────────────────────────────
const FALLBACK_IMAGES = [
  '/images/carousel/valla-movil.jpg',
  'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=1600&q=80',
  'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=1600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
];

export function Hero() {
  const t = useTranslations('landing.hero');
  const tServices = useTranslations('landing.services');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  // ─── Fetch carousel slides ─────────────────────────────────────────────────
  const { data: apiSlides, isLoading: slidesLoading } = useQuery({
    queryKey: ['carousel-slides'],
    queryFn: getCarouselSlides,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ─── Fetch service images for integrated service slides ────────────────────
  const { data: landingData } = useQuery({
    queryKey: ['landing-data'],
    queryFn: getLandingPageData,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // ─── Build slides: API carousel + service highlights ───────────────────────
  const slides: HeroSlide[] = useMemo(() => {
    const result: HeroSlide[] = [];

    // API carousel slides
    if (apiSlides && apiSlides.length > 0) {
      apiSlides
        .filter((s) => s.image)
        .forEach((s) => {
          result.push({
            image: s.image,
            title: s.title || 'Agencia MCD',
            subtitle: s.subtitle || '',
            cta: s.cta_url
              ? { label: s.cta_text || tServices(`items.${s.service_key}.title`), href: s.cta_url }
              : s.service_key
                ? { label: tServices(`items.${s.service_key}.title`), href: `#cotizar?servicio=${s.service_key}` }
                : undefined,
            serviceKey: s.service_key || undefined,
          });
        });
    }

    // Add service-based slides from API or fallback
    LANDING_SERVICE_IDS.forEach((serviceId: LandingServiceId) => {
      const serviceData = landingData?.services?.find((s) => s.service_key === serviceId);
      const images = serviceData?.carousel_images;
      const img = images && images.length > 0
        ? images[0].image
        : SERVICE_CAROUSEL_IMAGES[serviceId]?.[0];
      if (img) {
        result.push({
          image: img,
          title: tServices(`items.${serviceId}.title`),
          subtitle: tServices(`items.${serviceId}.description`),
          cta: { label: t('cta'), href: `#cotizar?servicio=${serviceId}` },
          serviceKey: serviceId,
        });
      }
    });

    // Fallback if nothing
    if (result.length === 0 && !slidesLoading) {
      FALLBACK_IMAGES.forEach((src, i) => {
        result.push({
          image: src,
          title: i === 0 ? t('title') : `Agencia MCD`,
          subtitle: t('subtitle'),
        });
      });
    }

    return result;
  }, [apiSlides, slidesLoading, landingData, tServices, t]);

  // ─── Auto-play ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((p) => (p + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, slides.length]);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback((i: number) => { setCurrentIndex(i); setIsAutoPlaying(false); }, []);
  const goNext = useCallback(() => { setCurrentIndex((p) => (p + 1) % slides.length); setIsAutoPlaying(false); }, [slides.length]);
  const goPrev = useCallback(() => { setCurrentIndex((p) => (p - 1 + slides.length) % slides.length); setIsAutoPlaying(false); }, [slides.length]);

  // ─── Touch/swipe ───────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => { touchDeltaX.current = e.touches[0].clientX - touchStartX.current; }, []);
  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current < -50) goNext();
    else if (touchDeltaX.current > 50) goPrev();
    touchDeltaX.current = 0;
  }, [goNext, goPrev]);

  const handleWhatsAppClick = () => { trackCTA('whatsapp', 'hero'); };
  const handleQuoteClick = () => { trackCTA('quote', 'hero'); };

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (slidesLoading && slides.length === 0) {
    return (
      <section className="relative w-full h-screen bg-cmyk-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-64 h-8 bg-neutral-800 rounded" />
          <div className="w-48 h-4 bg-neutral-800 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section
      id="servicios"
      className="relative w-full h-screen min-h-[600px] max-h-[1000px] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* ─── Background slides with transition effects ───────────────── */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={index}
            className="absolute inset-0"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : 'scale(1.08)',
              transition: 'opacity 1.2s cubic-bezier(0.4,0,0.2,1), transform 6s cubic-bezier(0.4,0,0.2,1)',
              zIndex: isActive ? 1 : 0,
            }}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />
            {/* Subtle vignette — lighter than before */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          </div>
        );
      })}

      {/* ─── Neon snake animation keyframes ─────────────────────────── */}
      <style jsx>{`
        @keyframes neonSnake {
          0%   { background-position: 0% 0%; }
          25%  { background-position: 100% 0%; }
          50%  { background-position: 100% 100%; }
          75%  { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }
        .neon-border {
          position: relative;
          z-index: 1;
        }
        .neon-border::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 9999px;
          background: conic-gradient(from var(--angle, 0deg), #00e5ff, #ff00aa, #ffe600, #00e5ff);
          animation: spinGlow 2.5s linear infinite;
          z-index: -1;
          opacity: 0.85;
          filter: blur(3px);
        }
        .neon-border::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 9999px;
          background: conic-gradient(from var(--angle, 0deg), #00e5ff, #ff00aa, #ffe600, #00e5ff);
          animation: spinGlow 2.5s linear infinite;
          z-index: -1;
          opacity: 1;
        }
        @keyframes spinGlow {
          0%   { --angle: 0deg; transform: rotate(0deg); }
          100% { --angle: 360deg; transform: rotate(360deg); }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>

      {/* ─── Content overlay ────────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Center area — service title + subtitle */}
        <div className="flex-1 flex items-center">
          <div className="container-custom px-4 sm:px-6 w-full">
            <div className="max-w-3xl space-y-3 sm:space-y-4">
              {/* Service title — large uppercase */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white uppercase leading-tight tracking-wide">
                {slides[currentIndex]?.title || t('title')}
              </h1>

              {/* Subtitle */}
              {slides[currentIndex]?.subtitle && (
                <p className="text-sm sm:text-base md:text-lg text-white/50 max-w-xl line-clamp-2">
                  {slides[currentIndex].subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section — logo left + trust badges */}
        <div className="px-4 sm:px-8 md:px-12 pb-28 sm:pb-32 md:pb-36">
          {/* Logo */}
          <img
            src="/logo-hero.png"
            alt="Agencia MCD"
            className="w-24 sm:w-32 md:w-40 h-auto drop-shadow-xl opacity-90 mb-3"
            style={{ maxWidth: '40vw' }}
          />

          {/* Trust badges — slightly bigger */}
          <div className="flex flex-wrap gap-4 sm:gap-5">
            <span className="text-white/60 text-xs sm:text-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cmyk-cyan" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t('trustBadges.fastDelivery')}
            </span>
            <span className="text-white/60 text-xs sm:text-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cmyk-magenta" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t('trustBadges.qualityGuaranteed')}
            </span>
            <span className="text-white/60 text-xs sm:text-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cmyk-yellow" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t('trustBadges.businessHours', { hours: CONTACT_INFO.businessHours })}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Floating icon-only CTA buttons — right side, stacked ──────── */}
      <div className="absolute right-4 sm:right-8 md:right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-5 sm:gap-6">
        {/* Quote button with neon snake border */}
        <a
          href={slides[currentIndex]?.cta?.href || '#cotizar'}
          onClick={handleQuoteClick}
          className="neon-border w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full bg-cmyk-cyan text-cmyk-black flex items-center justify-center shadow-2xl shadow-cmyk-cyan/40 hover:scale-110 transition-transform duration-300"
          aria-label="Cotizar"
          title="Cotizar ahora"
        >
          {/* Clipboard/quote icon */}
          <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        </a>

        {/* WhatsApp button */}
        <a
          href={CONTACT_INFO.whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-500/40 hover:scale-110 hover:bg-green-400 transition-all duration-300"
          aria-label="WhatsApp"
          title="WhatsApp"
        >
          <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      </div>

      {/* ─── Navigation arrows ──────────────────────────────────────────── */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Slide anterior"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white p-2.5 sm:p-3 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10"
          >
            <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Siguiente slide"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white p-2.5 sm:p-3 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/10"
          >
            <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}

      {/* ─── Slide indicators (center bottom) ──────────────────────────── */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              aria-label={`Ir a slide ${index + 1}`}
              className={`rounded-full transition-all duration-300 h-2.5 sm:h-3 ${
                index === currentIndex
                  ? 'bg-cmyk-cyan w-8 sm:w-10'
                  : 'bg-white/40 hover:bg-white/60 w-2.5 sm:w-3'
              }`}
            />
          ))}
        </div>
      )}

      {/* ─── Professional bottom transition ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        {/* Multi-layer gradient for depth */}
        <div className="h-40 sm:h-52 md:h-64 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      </div>
    </section>
  );
}
