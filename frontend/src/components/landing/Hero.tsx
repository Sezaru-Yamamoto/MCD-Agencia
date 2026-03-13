'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CONTACT_INFO } from '@/lib/constants';
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
  '/images/carousel/vallas-moviles.jfif',
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
              unoptimized
              sizes="100vw"
            />
            {/* Subtle vignette — lighter than before */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          </div>
        );
      })}



      {/* ─── Content overlay ────────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Center area — service title + subtitle */}
        <div className="flex-1 flex items-center">
          <div className="container-custom px-4 sm:px-6 w-full">
            <div className="max-w-3xl rounded-2xl border border-white/10 bg-black/35 backdrop-blur-[1px] shadow-2xl px-5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7">
              {/* Service title — large uppercase */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white uppercase leading-tight tracking-wide">
                {slides[currentIndex]?.title || t('title')}
              </h1>

              {/* Subtitle */}
              {slides[currentIndex]?.subtitle && (
                <p className="mt-3 text-sm sm:text-base md:text-lg text-white/75 max-w-2xl line-clamp-3">
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
            className="w-36 sm:w-48 md:w-60 lg:w-72 h-auto drop-shadow-2xl opacity-95 mb-3"
            style={{ maxWidth: '50vw' }}
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

      {/* ─── Bottom fade to seamless black ────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-[15] pointer-events-none">
        <div className="h-28 sm:h-36 md:h-44 bg-gradient-to-t from-cmyk-black via-cmyk-black/70 to-transparent" />
      </div>

    </section>
  );
}
