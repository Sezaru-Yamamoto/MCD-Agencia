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
  { id: 'sqOb-gSSQq8', labelKey: 'video1Label' },
  { id: 'b33fwbyZRQM', labelKey: 'video2Label' },
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

  // YouTube Shorts thumbnail (hq720 gives best vertical thumbnail)
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hq720.jpg`;

  return (
    <div className={`relative ${orientation === 'horizontal' ? 'aspect-video' : 'aspect-[9/16]'} rounded-2xl overflow-hidden shadow-2xl border border-cmyk-cyan/20 bg-neutral-900 group/card`}>
      {!isPlaying ? (
        <button
          onClick={handlePlay}
          className="group relative w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cmyk-cyan"
          aria-label={playLabel}
        >
          {/* Thumbnail */}
          <img
            src={thumbnailUrl}
            alt={altText}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 group-hover:from-black/50 group-hover:via-transparent group-hover:to-black/10 transition-all duration-300" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-cmyk-cyan/90 group-hover:bg-cmyk-cyan group-hover:scale-110 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-cmyk-cyan/30">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Label - hidden until content is decided */}
          {/* <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-5 sm:right-5">
            <p className="text-white font-semibold text-sm sm:text-base drop-shadow-lg">
              {label}
            </p>
          </div> */}
        </button>
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&loop=1&playlist=${videoId}`}
          title={altText}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}

export function Portfolio() {
  const t = useTranslations('landing.portfolio');

  // Fetch portfolio videos from API
  const { data: apiVideos } = useQuery({
    queryKey: ['portfolio-videos'],
    queryFn: getPortfolioVideos,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Use API videos if available, otherwise fallback
  const videos = useMemo(() => {
    if (apiVideos && apiVideos.length > 0) {
      return apiVideos.map((v) => ({
        id: v.youtube_id,
        labelKey: v.title || v.youtube_id,
        orientation: v.orientation,
      }));
    }
    return FALLBACK_VIDEOS.map((v) => ({ ...v, orientation: 'vertical' as const }));
  }, [apiVideos]);

  const handleQuoteClick = () => {
    trackCTA('quote', 'portfolio');
  };

  return (
    <section id="portafolio" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        {/* Título */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-14 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        {/* Videos lado a lado */}
        <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-14 px-4 sm:px-0 flex-wrap">
          {videos.map((video) => (
            <div
              key={video.id}
              className={video.orientation === 'horizontal'
                ? 'w-full sm:w-[80%] md:w-[560px] lg:w-[640px]'
                : 'w-[45%] sm:w-[40%] md:w-[280px] lg:w-[320px]'}
            >
              <VideoCard
                videoId={video.id}
                label={video.labelKey}
                playLabel={t('playVideo')}
                altText={t('videoAlt')}
                orientation={video.orientation}
              />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">{t('likeThis')}</p>
          <a
            href="#cotizar"
            onClick={handleQuoteClick}
            className="btn-primary inline-flex items-center text-sm sm:text-base"
          >
            {t('requestQuote')}
          </a>
        </div>
      </div>
    </section>
  );
}
