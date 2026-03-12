'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { trackCTA } from '@/lib/tracking';
import { getPortfolioVideos, type PortfolioVideo } from '@/lib/api/content';

/**
 * =============================================
 * TYPES & FALLBACK DATA
 * =============================================
 */
interface PortfolioItem {
  id: string;
  type: 'video' | 'image';
  // Video fields
  videoId?: string;
  orientation?: 'vertical' | 'horizontal';
  // Image fields
  imageUrl?: string;
  // Shared
  label: string;
}

const FALLBACK_ITEMS: PortfolioItem[] = [
  { id: 'v1', type: 'video', videoId: 'sqOb-gSSQq8', label: 'Proyecto 1', orientation: 'vertical' },
  { id: 'v2', type: 'video', videoId: 'b33fwbyZRQM', label: 'Proyecto 2', orientation: 'vertical' },
];

/**
 * =============================================
 * VideoCard — YouTube embed with lazy thumbnail
 * =============================================
 */
function VideoCard({ videoId, label, playLabel, altText }: {
  videoId: string; label: string; playLabel: string; altText: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const handlePlay = useCallback(() => { setIsPlaying(true); trackCTA('video_play', 'portfolio'); }, []);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hq720.jpg`;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-cmyk-cyan/20 bg-neutral-900">
      {!isPlaying ? (
        <button onClick={handlePlay} className="group relative w-full h-full cursor-pointer focus:outline-none" aria-label={playLabel}>
          <img src={thumbnailUrl} alt={altText} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/40 transition-all" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-cmyk-cyan/90 group-hover:bg-cmyk-cyan group-hover:scale-110 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-cmyk-cyan/30">
              <svg className="w-7 h-7 sm:w-9 sm:h-9 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
          {/* Label at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white font-semibold text-sm sm:text-base drop-shadow-lg">{label}</p>
          </div>
        </button>
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&loop=1&playlist=${videoId}`}
          title={altText}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen loading="lazy"
        />
      )}
    </div>
  );
}

/**
 * =============================================
 * ImageCard — Portfolio image display
 * =============================================
 */
function ImageCard({ imageUrl, label, onClick }: {
  imageUrl: string; label: string; onClick?: () => void;
}) {
  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-cmyk-cyan/20 bg-neutral-900 cursor-pointer group"
      onClick={onClick}
    >
      <Image src={imageUrl} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 80vw, 50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-semibold text-sm sm:text-base drop-shadow-lg">{label}</p>
      </div>
    </div>
  );
}

/**
 * =============================================
 * CoverflowCarousel — Center-focused carousel
 * with dimmed prev/next items visible
 * =============================================
 */
function CoverflowCarousel({ items, currentIndex, onIndexChange, renderItem }: {
  items: PortfolioItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  renderItem: (item: PortfolioItem, isCenter: boolean) => React.ReactNode;
}) {
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current < -50) onIndexChange((currentIndex + 1) % items.length);
    else if (touchDeltaX.current > 50) onIndexChange((currentIndex - 1 + items.length) % items.length);
    touchDeltaX.current = 0;
  }, [currentIndex, items.length, onIndexChange]);

  if (items.length === 0) return null;

  // Show prev, current, next
  const prevIdx = (currentIndex - 1 + items.length) % items.length;
  const nextIdx = (currentIndex + 1) % items.length;

  return (
    <div
      className="relative flex items-center justify-center w-full overflow-hidden py-4"
      style={{ minHeight: '400px' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Previous item */}
      {items.length > 1 && (
        <div
          className="absolute left-0 sm:left-[2%] md:left-[5%] z-0 w-[30%] sm:w-[28%] md:w-[25%] aspect-[9/16] sm:aspect-[3/4] opacity-40 scale-[0.85] blur-[1px] transition-all duration-500 cursor-pointer hover:opacity-60"
          onClick={() => onIndexChange(prevIdx)}
        >
          {renderItem(items[prevIdx], false)}
        </div>
      )}

      {/* Center (active) item */}
      <div className="relative z-10 w-[65%] sm:w-[50%] md:w-[40%] lg:w-[35%] aspect-[9/16] sm:aspect-[3/4] transition-all duration-500 transform">
        {renderItem(items[currentIndex], true)}
      </div>

      {/* Next item */}
      {items.length > 1 && (
        <div
          className="absolute right-0 sm:right-[2%] md:right-[5%] z-0 w-[30%] sm:w-[28%] md:w-[25%] aspect-[9/16] sm:aspect-[3/4] opacity-40 scale-[0.85] blur-[1px] transition-all duration-500 cursor-pointer hover:opacity-60"
          onClick={() => onIndexChange(nextIdx)}
        >
          {renderItem(items[nextIdx], false)}
        </div>
      )}

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => onIndexChange(prevIdx)}
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/25 text-white p-2 sm:p-3 rounded-full transition-colors backdrop-blur-sm"
            aria-label="Anterior"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => onIndexChange(nextIdx)}
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/25 text-white p-2 sm:p-3 rounded-full transition-colors backdrop-blur-sm"
            aria-label="Siguiente"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * =============================================
 * Portfolio — Main section
 * =============================================
 */
export function Portfolio() {
  const t = useTranslations('landing.portfolio');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const { data: apiVideos, isLoading: videosLoading } = useQuery({
    queryKey: ['portfolio-videos'],
    queryFn: getPortfolioVideos,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Build portfolio items from API (supports both videos and images)
  const items: PortfolioItem[] = useMemo(() => {
    if (apiVideos && apiVideos.length > 0) {
      return apiVideos.map((v, i) => ({
        id: v.youtube_id || `item-${i}`,
        type: 'video' as const,
        videoId: v.youtube_id,
        orientation: v.orientation,
        label: v.title || `Video ${i + 1}`,
      }));
    }
    if (videosLoading) return [];
    return FALLBACK_ITEMS;
  }, [apiVideos, videosLoading]);

  const handleQuoteClick = () => { trackCTA('quote', 'portfolio'); };

  const renderItem = useCallback((item: PortfolioItem, isCenter: boolean) => {
    if (item.type === 'video' && item.videoId) {
      return (
        <VideoCard
          videoId={item.videoId}
          label={item.label}
          playLabel={t('playVideo')}
          altText={t('videoAlt')}
        />
      );
    }
    if (item.type === 'image' && item.imageUrl) {
      return (
        <ImageCard
          imageUrl={item.imageUrl}
          label={item.label}
          onClick={isCenter ? () => setFullscreenImage(item.imageUrl!) : undefined}
        />
      );
    }
    return null;
  }, [t]);

  return (
    <section id="portafolio" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">{t('subtitle')}</p>
        </div>

        {/* Loading skeleton */}
        {videosLoading && (
          <div className="flex justify-center gap-4 sm:gap-6 mb-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${i === 1 ? 'w-[40%]' : 'w-[25%] opacity-40 scale-[0.85]'} aspect-[9/16] sm:aspect-[3/4] rounded-2xl bg-neutral-800/60 animate-pulse flex items-center justify-center border border-cmyk-cyan/20`}>
                <svg className="w-10 h-10 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* Coverflow carousel */}
        {!videosLoading && items.length > 0 && (
          <>
            <CoverflowCarousel
              items={items}
              currentIndex={currentIdx}
              onIndexChange={setCurrentIdx}
              renderItem={renderItem}
            />

            {/* Dots */}
            {items.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`rounded-full transition-all h-2.5 ${
                      idx === currentIdx ? 'bg-cmyk-cyan w-7' : 'bg-white/30 hover:bg-white/50 w-2.5'
                    }`}
                    aria-label={`Item ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="text-center space-y-3 sm:space-y-4 mt-8 sm:mt-12">
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">{t('likeThis')}</p>
          <a href="#cotizar" onClick={handleQuoteClick} className="btn-primary inline-flex items-center text-sm sm:text-base">{t('requestQuote')}</a>
        </div>
      </div>

      {/* Fullscreen image lightbox */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setFullscreenImage(null)}>
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 z-30 text-white hover:text-red-400 p-2 rounded-full bg-black/60" aria-label="Cerrar">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullscreenImage} alt="Portfolio" className="max-w-[90vw] max-h-[85vh] object-contain rounded" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
