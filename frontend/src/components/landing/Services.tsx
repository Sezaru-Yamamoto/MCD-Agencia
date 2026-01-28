'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LANDING_SERVICE_IDS,
  SERVICE_CAROUSEL_IMAGES,
  SERVICE_SUBCATEGORIES,
  type LandingServiceId
} from '@/lib/service-data';
import { CONTACT_INFO } from '@/lib/constants';
import { ServiceCardCarousel } from './ServiceCardCarousel';

export function Services() {
  const t = useTranslations('landing.services');
  const [selectedServiceId, setSelectedServiceId] = useState<LandingServiceId | null>(null);

  // Get translated service data with subcategories
  const getServiceData = (id: LandingServiceId) => {
    const subcategories = SERVICE_SUBCATEGORIES[id] || [];
    return {
      id,
      title: t(`items.${id}.title`),
      description: t(`items.${id}.description`),
      subcategories: subcategories.map(sub => ({
        ...sub,
        title: t(`subcategories.${sub.titleKey}`),
      })),
      carouselImages: SERVICE_CAROUSEL_IMAGES[id],
    };
  };

  const selectedService = selectedServiceId ? getServiceData(selectedServiceId) : null;

  return (
    <section id="servicios" className="section py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        {/* Grid de Servicios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-4 sm:px-0">
          {LANDING_SERVICE_IDS.map((serviceId, index) => {
            const service = getServiceData(serviceId);
            return (
              <div
                key={serviceId}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedServiceId(serviceId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedServiceId(serviceId);
                  }
                }}
                className="group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-cmyk-black/80 to-cmyk-black/60 border-2 border-cmyk-cyan/40 hover:border-cmyk-cyan/80 cursor-pointer text-left"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Carrusel de imágenes */}
                <div className="relative w-full h-56 overflow-hidden bg-gray-200">
                  <ServiceCardCarousel
                    images={service.carouselImages}
                    alt={service.title}
                  />
                </div>

                {/* Contenido */}
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 group-hover:text-cmyk-cyan transition-colors min-h-14">
                    {service.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-300 line-clamp-3 h-auto">
                    {service.description}
                  </p>

                  {/* Subcategorías clickeables */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {service.subcategories.slice(0, 3).map((subcategory) => (
                      <a
                        key={subcategory.id}
                        href={subcategory.href}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-cmyk-cyan/30 text-cmyk-cyan px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium hover:bg-cmyk-cyan hover:text-white transition-colors"
                      >
                        {subcategory.title}
                      </a>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="pt-3 flex items-center justify-between group/cta border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-200 group-hover/cta:text-cmyk-cyan transition-colors">
                      {t('viewDetails')}
                    </span>
                    <span className="text-cmyk-cyan font-bold group-hover/cta:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Mejorado */}
      {selectedService && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedServiceId(null)}
        >
          <div
            className="bg-gradient-to-br from-cmyk-black/80 to-cmyk-black/60 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in border-2 border-cmyk-cyan/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Carrusel Grande */}
              <div className="relative h-80 md:h-full min-h-96 overflow-hidden">
                <ServiceCardCarousel
                  images={selectedService.carouselImages}
                  alt={selectedService.title}
                  interval={4000}
                />
                {/* Overlay con cierre */}
                <button
                  onClick={() => setSelectedServiceId(null)}
                  className="absolute top-4 right-4 md:hidden bg-black/50 text-white hover:bg-black/70 p-2 rounded-full transition-colors"
                  aria-label={t('close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Contenido */}
              <div className="flex flex-col">
                <div className="sticky top-0 bg-gradient-to-r from-cmyk-black to-cmyk-magenta text-white p-6 flex items-start justify-between md:relative">
                  <div className="flex items-start gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedService.title}</h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedServiceId(null)}
                    className="hidden md:block text-white hover:bg-white/20 p-2 rounded-full transition-colors flex-shrink-0"
                    aria-label={t('close')}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div>
                    <p className="text-gray-400 leading-relaxed">{selectedService.description}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-100">{t('subcategoriesLabel')}</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedService.subcategories.map((subcategory) => (
                        <a
                          key={subcategory.id}
                          href={subcategory.href}
                          onClick={() => setSelectedServiceId(null)}
                          className="bg-cmyk-cyan/20 text-cmyk-cyan px-5 py-3 rounded-full font-medium text-sm hover:bg-cmyk-cyan hover:text-white transition-colors"
                        >
                          {subcategory.title}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="bg-cmyk-yellow/10 border border-cmyk-yellow rounded-lg p-5">
                    <p className="text-sm text-gray-200 leading-relaxed">
                      <span className="font-semibold text-cmyk-yellow">💡 Tip:</span> {t('tip')}
                    </p>
                  </div>

                  <div className="border-t border-cmyk-cyan/20 pt-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href={`#cotizar?servicio=${selectedService.id}`}
                        onClick={() => setSelectedServiceId(null)}
                        className="flex-1 btn-primary text-center py-4 rounded-lg font-semibold transition-all hover:shadow-lg"
                      >
                        {t('requestQuote')}
                      </a>
                      <a
                        href={`${CONTACT_INFO.whatsapp.url}?text=${encodeURIComponent(`Hi, I'm interested in ${selectedService.title}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-whatsapp text-center py-4 rounded-lg font-semibold transition-all hover:shadow-lg"
                      >
                        {t('whatsappConsult')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
