'use client';

import { useTranslations } from 'next-intl';
import { trackCTA } from '@/lib/tracking';

const PORTFOLIO_ITEMS = [
  { id: 'lona', categoryKey: 'banners' },
  { id: 'rotulacion', categoryKey: 'vinyl' },
  { id: 'vinilo', categoryKey: 'vinyl' },
  { id: 'senaletica', categoryKey: 'signage' },
  { id: 'stand', categoryKey: 'largeFormat' },
  { id: 'espectacular', categoryKey: 'banners' },
];

const CATEGORY_ICONS: Record<string, string> = {
  banners: '🎨',
  largeFormat: '🖼️',
  vinyl: '🚗',
  signage: '🚦',
};

export function Portfolio() {
  const t = useTranslations('landing.portfolio');
  
  const handlePortfolioClick = () => {
    trackCTA('quote', 'portfolio');
  };

  const portfolioItems = PORTFOLIO_ITEMS.map((item) => ({
    id: item.id,
    title: t(`items.${item.id}.title`),
    category: t(`categories.${item.categoryKey}`),
    icon: CATEGORY_ICONS[item.categoryKey],
  }));

  return (
    <section id="portafolio" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 px-4 sm:px-0">
          {portfolioItems.map((item, index) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-cmyk-black to-cmyk-black border border-cmyk-cyan/20"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Placeholder - reemplazar con Image component */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4 sm:p-6">
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">
                    {item.icon}
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-100">{item.title}</p>
                </div>
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                  <p className="text-xs sm:text-sm font-semibold mb-1">{item.category}</p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold">{item.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">{t('likeThis')}</p>
          <a
            href="#cotizar"
            onClick={handlePortfolioClick}
            className="btn-primary inline-flex items-center text-sm sm:text-base"
          >
            {t('requestQuote')}
          </a>
        </div>
      </div>
    </section>
  );
}
