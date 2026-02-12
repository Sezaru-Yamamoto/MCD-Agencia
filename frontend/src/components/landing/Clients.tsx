'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getClientLogos } from '@/lib/api/content';
import { CLIENTS } from '@/lib/constants';

interface ClientItem {
  name: string;
  logo: string;
}

function ClientCard({ client }: { client: ClientItem }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex-shrink-0 w-36 sm:w-40 md:w-44 flex flex-col items-center justify-center p-4 sm:p-5 bg-cmyk-black rounded-lg border border-cmyk-cyan/30 hover:border-cmyk-cyan/60 transition-all duration-300 group hover:shadow-lg hover:shadow-cmyk-cyan/20">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-3 group-hover:scale-105 transition-transform duration-300">
        {imageError ? (
          <div className="flex items-center justify-center h-full w-full text-2xl text-cmyk-cyan">🏢</div>
        ) : (
          <Image
            src={client.logo}
            alt={client.name}
            fill
            className="object-contain"
            title={client.name}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <p className="text-center text-xs sm:text-sm font-semibold text-gray-300 line-clamp-2">{client.name}</p>
    </div>
  );
}

export function Clients() {
  const t = useTranslations('landing.clients');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch client logos from API, fallback to constants
  const { data: apiClients } = useQuery({
    queryKey: ['landing-client-logos'],
    queryFn: getClientLogos,
    staleTime: 5 * 60 * 1000,
  });

  const clients: ClientItem[] = (apiClients && apiClients.length > 0)
    ? apiClients.map((c) => ({ name: c.name, logo: c.logo }))
    : CLIENTS;

  // Duplicate items for seamless infinite scroll
  const duplicated = [...clients, ...clients, ...clients];

  // Infinite scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || clients.length < 2) return;

    let animFrame: number;
    let scrollPos = 0;
    const speed = 0.5; // px per frame
    const singleSetWidth = el.scrollWidth / 3;

    const animate = () => {
      if (!isPaused) {
        scrollPos += speed;
        if (scrollPos >= singleSetWidth) {
          scrollPos -= singleSetWidth;
        }
        el.scrollLeft = scrollPos;
      }
      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [clients.length, isPaused]);

  return (
    <section id="clientes" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">{t('subtitle')}</p>
        </div>

        {/* Infinite carousel */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-5 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {duplicated.map((client, index) => (
              <ClientCard key={`${client.name}-${index}`} client={client} />
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-300 italic">{t('satisfied', { count: String(clients.length) })}</p>
        </div>
      </div>
    </section>
  );
}
