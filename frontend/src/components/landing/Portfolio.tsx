'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { trackCTA } from '@/lib/tracking';

/**
 * =============================================
 * CONFIGURACIÓN DEL VIDEO
 * =============================================
 * Cambia YOUTUBE_VIDEO_ID por el ID de tu video de YouTube.
 * El ID es la parte después de "v=" en la URL:
 *   https://www.youtube.com/watch?v=XXXXXXXXXXX
 *                                    ^^^^^^^^^^^
 * Ejemplo: si tu URL es https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *          entonces YOUTUBE_VIDEO_ID = 'dQw4w9WgXcQ'
 */
const YOUTUBE_VIDEO_ID = 'XXXXXXXXXXX'; // <-- REEMPLAZA con tu ID de video

export function Portfolio() {
  const t = useTranslations('landing.portfolio');
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    trackCTA('video_play', 'portfolio');
  }, []);

  const handleQuoteClick = () => {
    trackCTA('quote', 'portfolio');
  };

  // Thumbnail de YouTube (maxresdefault = máxima resolución disponible)
  const thumbnailUrl = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

  return (
    <section id="portafolio" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        {/* Título */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        {/* Video con patrón Facade: thumbnail estático hasta que el usuario haga clic */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12 px-4 sm:px-0">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-cmyk-cyan/20 bg-neutral-900">
            {!isPlaying ? (
              /* Facade: solo muestra una imagen + botón de play (0 KB de JS de YouTube) */
              <button
                onClick={handlePlay}
                className="group relative w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cmyk-cyan"
                aria-label={t('playVideo')}
              >
                {/* Thumbnail del video */}
                <img
                  src={thumbnailUrl}
                  alt={t('videoAlt')}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay oscuro con gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40 group-hover:from-black/40 group-hover:via-black/10 group-hover:to-black/20 transition-all duration-300" />

                {/* Botón de play central */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-cmyk-cyan/90 group-hover:bg-cmyk-cyan group-hover:scale-110 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-cmyk-cyan/30">
                    <svg
                      className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Texto sobre el video */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                  <p className="text-white/80 text-xs sm:text-sm font-medium">
                    {t('clickToPlay')}
                  </p>
                </div>
              </button>
            ) : (
              /* Video real: solo se carga al hacer clic */
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                title={t('videoAlt')}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            )}
          </div>
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
