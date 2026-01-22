'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { CLIENTS } from '@/lib/constants';

export function Clients() {
  const t = useTranslations('landing.clients');
  
  return (
    <section id="clientes" className="section bg-gradient-to-br from-cmyk-black to-cmyk-black py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        <div className="relative mx-auto px-4 sm:px-0">
          {/* Professional Grid Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
            {CLIENTS.map((client, index) => (
              <div
                key={`${client.name}-${index}`}
                className="flex flex-col items-center justify-center p-4 sm:p-5 md:p-6 bg-cmyk-black rounded-lg border border-cmyk-cyan/30 hover:border-cmyk-cyan/60 transition-all duration-300 group hover:shadow-lg hover:shadow-cmyk-cyan/20"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 mb-3 group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={client.logo}
                    alt={client.name}
                    fill
                    className="object-contain"
                    title={client.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML =
                        '<div style="font-size: 2rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; color: #00d9ff;">🏢</div>';
                    }}
                  />
                </div>
                <p className="text-center text-xs sm:text-sm font-semibold text-gray-300 line-clamp-2">
                  {client.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-300 italic">
            {t('satisfied', { count: 'xx' })}
          </p>
        </div>
      </div>
    </section>
  );
}
