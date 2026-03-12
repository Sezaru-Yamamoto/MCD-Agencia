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
      {/* ─── Background slides ──────────────────────────────────────────── */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={index === 0}
            sizes="100vw"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>
      ))}

      {/* ─── Content overlay ────────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container-custom px-4 sm:px-6 w-full">
          <div className="max-w-2xl space-y-4 sm:space-y-6">
            {/* Logo */}
            <img
              src="/logo-hero.png"
              alt="Logo principal"
              className="w-32 sm:w-44 md:w-56 lg:w-64 h-auto drop-shadow-xl"
              style={{ maxWidth: '70vw' }}
            />

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight">
              {slides[currentIndex]?.title || t('title')}
            </h1>

            {/* Subtitle */}
            {slides[currentIndex]?.subtitle && (
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 max-w-xl line-clamp-3">
                {slides[currentIndex].subtitle}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <a
                href={slides[currentIndex]?.cta?.href || '#cotizar'}
                onClick={handleQuoteClick}
                className="btn-primary text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 inline-flex items-center justify-center"
              >
                {slides[currentIndex]?.cta?.label || t('cta')}
              </a>
              <a
                href={CONTACT_INFO.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="btn-whatsapp text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 inline-flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {t('ctaWhatsapp')}
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2">
              <div className="flex items-center space-x-2 text-gray-200 text-xs sm:text-sm">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-cmyk-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{t('trustBadges.fastDelivery')}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-200 text-xs sm:text-sm">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-cmyk-magenta flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{t('trustBadges.qualityGuaranteed')}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-200 text-xs sm:text-sm">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-cmyk-yellow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{t('trustBadges.businessHours', { hours: CONTACT_INFO.businessHours })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation arrows ──────────────────────────────────────────── */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Slide anterior"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/25 text-white p-3 sm:p-4 rounded-full transition-all duration-200 backdrop-blur-sm"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Siguiente slide"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/25 text-white p-3 sm:p-4 rounded-full transition-all duration-200 backdrop-blur-sm"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}

      {/* ─── Slide indicators (bottom) ──────────────────────────────────── */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              aria-label={`Ir a slide ${index + 1}`}
              className={`rounded-full transition-all duration-300 h-2 sm:h-3 ${
                index === currentIndex
                  ? 'bg-cmyk-cyan w-8 sm:w-10'
                  : 'bg-white/40 hover:bg-white/60 w-2 sm:w-3'
              }`}
            />
          ))}
        </div>
      )}

      {/* ─── Slide counter ──────────────────────────────────────────────── */}
      {slides.length > 1 && (
        <div className="absolute top-24 sm:top-28 right-4 sm:right-6 z-20 bg-black/40 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
          {currentIndex + 1} / {slides.length}
        </div>
      )}

      {/* ─── Scroll-down indicator ──────────────────────────────────────── */}
      <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
