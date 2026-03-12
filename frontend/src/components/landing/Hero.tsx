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

      {/* ─── Content overlay ────────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Top-right area — CTA buttons (where users look first) */}
        <div className="flex justify-end pt-24 sm:pt-28 md:pt-32 px-4 sm:px-8 md:px-12">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <a
              href={slides[currentIndex]?.cta?.href || '#cotizar'}
              onClick={handleQuoteClick}
              className="btn-primary text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 inline-flex items-center justify-center rounded-full shadow-lg shadow-cmyk-cyan/20"
            >
              {slides[currentIndex]?.cta?.label || t('cta')}
            </a>
            <a
              href={CONTACT_INFO.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="btn-whatsapp text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 inline-flex items-center justify-center rounded-full shadow-lg"
            >
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {t('ctaWhatsapp')}
            </a>
          </div>
        </div>

        {/* Bottom section — logo left, text center/left, service badge */}
        <div className="px-4 sm:px-8 md:px-12 pb-24 sm:pb-28 md:pb-32">
          {/* Service name badge */}
          <div className="mb-3 sm:mb-4">
            <span className="inline-block bg-black/50 backdrop-blur-sm text-white text-sm sm:text-base md:text-lg font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/10">
              {slides[currentIndex]?.title || t('title')}
            </span>
          </div>

          {/* Subtitle — smaller and muted */}
          {slides[currentIndex]?.subtitle && (
            <p className="text-xs sm:text-sm md:text-base text-white/60 max-w-md line-clamp-2 mb-4 sm:mb-5">
              {slides[currentIndex].subtitle}
            </p>
          )}

          {/* Logo — bottom left */}
          <img
            src="/logo-hero.png"
            alt="Agencia MCD"
            className="w-20 sm:w-28 md:w-36 h-auto drop-shadow-xl opacity-90"
            style={{ maxWidth: '40vw' }}
          />

          {/* Trust badges — inline, subtle */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-3">
            <span className="text-white/40 text-[10px] sm:text-xs flex items-center gap-1">
              <svg className="w-3 h-3 text-cmyk-cyan" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t('trustBadges.fastDelivery')}
            </span>
            <span className="text-white/40 text-[10px] sm:text-xs flex items-center gap-1">
              <svg className="w-3 h-3 text-cmyk-magenta" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t('trustBadges.qualityGuaranteed')}
            </span>
            <span className="text-white/40 text-[10px] sm:text-xs flex items-center gap-1">
              <svg className="w-3 h-3 text-cmyk-yellow" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              {t('trustBadges.businessHours', { hours: CONTACT_INFO.businessHours })}
            </span>
          </div>
        </div>
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

      {/* ─── Vertical slide indicators (right side) ─────────────────────── */}
      {slides.length > 1 && (
        <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 translate-y-20 sm:translate-y-24">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              aria-label={`Ir a slide ${index + 1}`}
              className={`rounded-full transition-all duration-300 w-2 sm:w-2.5 ${
                index === currentIndex
                  ? 'bg-cmyk-cyan h-6 sm:h-8'
                  : 'bg-white/30 hover:bg-white/50 h-2 sm:h-2.5'
              }`}
            />
          ))}
        </div>
      )}

      {/* ─── Scroll-down indicator ──────────────────────────────────────── */}
      <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* ─── Creative bottom transition — angled slice + gradient ───────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="h-24 sm:h-32 md:h-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: '60px' }}>
          <path d="M0,60 L0,20 Q360,0 720,20 Q1080,40 1440,10 L1440,60 Z" fill="#0a0a0a" />
        </svg>
      </div>
    </section>
  );
}
