'use client';

import { useState, useEffect } from 'react';
import { CONTACT_INFO } from '@/lib/constants';
import { trackCTA } from '@/lib/tracking';
import { ImageCarousel } from './ImageCarousel';

export function Hero() {
  const [carouselHeight, setCarouselHeight] = useState(300);

  useEffect(() => {
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) {
          setCarouselHeight(280);
        } else if (window.innerWidth < 1024) {
          setCarouselHeight(350);
        } else {
          setCarouselHeight(420);
        }
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  const handleWhatsAppClick = () => {
    trackCTA('whatsapp', 'hero');
  };

  const handleQuoteClick = () => {
    trackCTA('quote', 'hero');
  };

  return (
    <section className="relative min-h-screen lg:min-h-screen flex items-center bg-gradient-to-br from-cmyk-black to-cmyk-black pt-20 sm:pt-20 md:pt-20 pb-6 sm:pb-8 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 right-5 sm:right-10 w-48 sm:w-72 h-48 sm:h-72 bg-cmyk-cyan/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 sm:bottom-20 left-5 sm:left-10 w-64 sm:w-96 h-64 sm:h-96 bg-cmyk-magenta/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container-custom relative z-10 px-4 sm:px-6 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 items-center">
          {/* Content */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex flex-col items-center mb-2 sm:mb-3 md:mb-4">
              <img
                src="/logo-hero.png"
                alt="Logo principal"
                className="w-32 sm:w-40 md:w-64 lg:w-[448px] h-auto drop-shadow-xl mb-2 sm:mb-3 md:mb-4"
                style={{ maxWidth: '90vw' }}
              />
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Transforma tus{' '}
                <span className="text-cmyk-magenta">ideas.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-xl">
                Lonas, vinilos y publicidad exterior con calidad profesional.
                Envío o recolección en Acapulco.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
              <a
                href="#cotizar"
                onClick={handleQuoteClick}
                className="btn-primary text-xs sm:text-sm md:text-base lg:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4"
              >
                Cotizar ahora →
              </a>
              <a
                href={CONTACT_INFO.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="btn-whatsapp text-xs sm:text-sm md:text-base lg:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Hablar por WhatsApp
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
              <div className="flex items-center space-x-1 sm:space-x-2 text-gray-300 text-xs sm:text-sm">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-cmyk-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">Entrega rápida</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 text-gray-300 text-xs sm:text-sm">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-cmyk-magenta flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">Calidad garantizada</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 text-gray-300 text-xs sm:text-sm">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-cmyk-yellow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">Atención {CONTACT_INFO.businessHours} hrs</span>
              </div>
            </div>
          </div>

          {/* Image/Visual - Responsive Carousel */}
          <div className="relative mt-8 lg:mt-0">
            <ImageCarousel
              images={[
                {
                  src: '/images/carousel/lonas-publicitarias.jpg',
                  alt: 'Lonas publicitarias',
                  title: 'Lonas Publicitarias',
                },
                {
                  src: '/images/carousel/gran-formato.jpg',
                  alt: 'Impresión de gran formato',
                  title: 'Gran Formato',
                },
                {
                  src: '/images/carousel/vinilos.jpg',
                  alt: 'Vinilos y adhesivos',
                  title: 'Vinilos & Adhesivos',
                },
                {
                  src: '/images/carousel/valla-movil.jpg',
                  alt: 'Vallas móviles',
                  title: 'Vallas Móviles',
                },
              ]}
              autoPlay
              interval={5000}
              height={carouselHeight}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
