'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { trackCTA } from '@/lib/tracking';
import { getPortfolioVideos, type PortfolioVideo } from '@/lib/api/content';

/**
 * =============================================
 * FALLBACK VIDEOS (when API has no videos yet)
 * =============================================
 */
const FALLBACK_VIDEOS = [
  { id: 'sqOb-gSSQq8', labelKey: 'video1Label', orientation: 'vertical' as const },
  { id: 'b33fwbyZRQM', labelKey: 'video2Label', orientation: 'vertical' as const },
];

function VideoCard({
  videoId,
  label,
  playLabel,
  altText,
  orientation = 'vertical',
}: {
  videoId: string;
  label: string;
  playLabel: string;
  altText: string;
  orientation?: 'vertical' | 'horizontal';
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    trackCTA('video_play', 'portfolio');
  }, []);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hq720.jpg`;

  return (
    <div className={`relative ${orientation === 'horizontal' ? 'aspect-video' : 'aspect-[9/16]'} rounded-2xl overflow-hidden shadow-2xl border border-cmyk-cyan/20 bg-neutral-900 group/card`}>
      {!isPlaying ? (
        <button onClick={handlePlay}
          className="group relative w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cmyk-cyan" aria-label={playLabel}>
          <img src={thumbnailUrl} alt={altText} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 group-hover:from-black/50 group-hover:via-transparent group-hover:to-black/10 transition-all duration-300" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-cmyk-cyan/90 group-hover:bg-cmyk-cyan group-hover:scale-110 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-cmyk-cyan/30">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </button>
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&loop=1&playlist=${videoId}`}
          title={altText}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen loading="lazy" />
      )}
    </div>
  );
}

export function Portfolio() {
  const t = useTranslations('landing.portfolio');
  const [carouselIdx, setCarouselIdx] = useState(0);

  const { data: apiVideos, isLoading: videosLoading } = useQuery({
    queryKey: ['portfolio-videos'],
    queryFn: getPortfolioVideos,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Use API videos if available, fallback only after API responds empty
  const videos = useMemo(() => {
    if (apiVideos && apiVideos.length > 0) {
      return apiVideos.map((v) => ({
        id: v.youtube_id,
        labelKey: v.title || v.youtube_id,
        orientation: v.orientation,
      }));
    }
    if (videosLoading) return [];
    return FALLBACK_VIDEOS;
  }, [apiVideos, videosLoading]);

  const handleQuoteClick = () => { trackCTA('quote', 'portfolio'); };

  // Layout logic: both vertical → side by side, otherwise → manual carousel
  const allVertical = videos.length <= 2 && videos.every((v) => v.orientation === 'vertical');
  const useCarousel = !allVertical && videos.length > 1;

  return (
    <section id="portafolio" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-14 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">{t('subtitle')}</p>
        </div>

        {/* Loading skeleton */}
        {videosLoading && (
          <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-14 px-4 sm:px-0">
            {[0, 1].map((i) => (
              <div key={i} className="w-[45%] sm:w-[40%] md:w-[280px] lg:w-[320px] aspect-[9/16] rounded-2xl bg-neutral-800/60 animate-pulse flex items-center justify-center border border-cmyk-cyan/20">
                <svg className="w-10 h-10 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* ─── Side-by-side (both vertical) ─── */}
        {allVertical && (
          <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-14 px-4 sm:px-0">
            {videos.map((video) => (
              <div key={video.id} className="w-[45%] sm:w-[40%] md:w-[280px] lg:w-[320px]">
                <VideoCard videoId={video.id} label={video.labelKey} playLabel={t('playVideo')} altText={t('videoAlt')} orientation={video.orientation} />
              </div>
            ))}
          </div>
        )}

        {/* ─── Manual carousel (horizontal / mixed) ─── */}
        {useCarousel && (
          <div className="relative flex items-center justify-center mb-10 sm:mb-14 px-4 sm:px-0">
            {/* Prev arrow */}
            <button onClick={() => setCarouselIdx((p) => (p - 1 + videos.length) % videos.length)}
              className="absolute left-0 sm:-left-4 z-10 bg-white/10 hover:bg-white/25 text-white p-2 sm:p-3 rounded-full transition-colors backdrop-blur-sm" aria-label="Video anterior">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className={`${videos[carouselIdx]?.orientation === 'horizontal' ? 'w-full sm:w-[80%] md:w-[560px] lg:w-[640px]' : 'w-[55%] sm:w-[45%] md:w-[320px] lg:w-[360px]'} transition-all duration-300`}>
              <VideoCard
                videoId={videos[carouselIdx].id}
                label={videos[carouselIdx].labelKey}
                playLabel={t('playVideo')}
                altText={t('videoAlt')}
                orientation={videos[carouselIdx].orientation}
              />
            </div>

            {/* Next arrow */}
            <button onClick={() => setCarouselIdx((p) => (p + 1) % videos.length)}
              className="absolute right-0 sm:-right-4 z-10 bg-white/10 hover:bg-white/25 text-white p-2 sm:p-3 rounded-full transition-colors backdrop-blur-sm" aria-label="Siguiente video">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            {/* Counter dots */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {videos.map((_, idx) => (
                <button key={idx} onClick={() => setCarouselIdx(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${idx === carouselIdx ? 'bg-cmyk-cyan w-6' : 'bg-white/40 hover:bg-white/60'}`} aria-label={`Video ${idx + 1}`} />
              ))}
            </div>
          </div>
        )}

        {/* Single video (only 1) */}
        {!allVertical && !useCarousel && videos.length === 1 && (
          <div className="flex justify-center mb-10 sm:mb-14 px-4 sm:px-0">
            <div className={videos[0].orientation === 'horizontal' ? 'w-full sm:w-[80%] md:w-[560px] lg:w-[640px]' : 'w-[55%] sm:w-[45%] md:w-[320px] lg:w-[360px]'}>
              <VideoCard videoId={videos[0].id} label={videos[0].labelKey} playLabel={t('playVideo')} altText={t('videoAlt')} orientation={videos[0].orientation} />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-3 sm:space-y-4 px-4 sm:px-0 mt-8">
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">{t('likeThis')}</p>
          <a href="#cotizar" onClick={handleQuoteClick} className="btn-primary inline-flex items-center text-sm sm:text-base">{t('requestQuote')}</a>
        </div>
      </div>
    </section>
  );
}
