'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    <div className="flex-shrink-0 w-28 sm:w-32 md:w-36 lg:w-40 flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="relative w-20 h-16 sm:w-24 sm:h-20 md:w-28 md:h-24 mb-2 grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-500">
        {imageError ? (
          <div className="flex items-center justify-center h-full w-full text-2xl text-cmyk-cyan">🏢</div>
        ) : (
          <Image
            src={client.logo}
            alt={client.name}
            fill
            className="object-contain drop-shadow-sm"
            title={client.name}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <p className="text-center text-[11px] sm:text-xs text-gray-400 line-clamp-1">{client.name}</p>
    </div>
  );
}

export function Clients() {
  const t = useTranslations('landing.clients');
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const scrollPosRef = useRef(0);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  // Fetch client logos from API, fallback to constants
  const { data: apiClients } = useQuery({
    queryKey: ['landing-client-logos'],
    queryFn: getClientLogos,
    staleTime: 5 * 60 * 1000,
  });

  const clients: ClientItem[] = (apiClients && apiClients.length > 0)
    ? apiClients.map((c) => ({ name: c.name, logo: c.logo }))
    : [...CLIENTS];

  // Only duplicate if more than 1 client
  const shouldAnimate = clients.length > 1;
  const items = shouldAnimate ? [...clients, ...clients, ...clients] : clients;

  // Auto-scroll animation (only when > 1 client)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldAnimate) return;

    const singleSetWidth = el.scrollWidth / 3;
    scrollPosRef.current = singleSetWidth; // start in the middle copy
    el.scrollLeft = singleSetWidth;

    const animate = () => {
      if (!isPausedRef.current && !isDraggingRef.current) {
        scrollPosRef.current += 0.5;
        if (scrollPosRef.current >= singleSetWidth * 2) {
          scrollPosRef.current -= singleSetWidth;
        }
        el.scrollLeft = scrollPosRef.current;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [shouldAnimate, clients.length]);

  // Drag / swipe handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !shouldAnimate) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
  }, [shouldAnimate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartXRef.current;
    const newPos = dragScrollLeftRef.current - dx;
    el.scrollLeft = newPos;
    scrollPosRef.current = newPos;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const el = scrollRef.current;
    if (!el || !shouldAnimate) return;
    el.releasePointerCapture(e.pointerId);
    // Reset position if out of bounds
    const singleSetWidth = el.scrollWidth / 3;
    if (scrollPosRef.current >= singleSetWidth * 2) {
      scrollPosRef.current -= singleSetWidth;
    } else if (scrollPosRef.current < 0) {
      scrollPosRef.current += singleSetWidth;
    }
  }, [shouldAnimate]);

  return (
    <section id="clientes" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">{t('title')}</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">{t('subtitle')}</p>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Fade edges (only when animating) */}
          {shouldAnimate && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[var(--background,#0a0a0a)] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[var(--background,#0a0a0a)] to-transparent z-10 pointer-events-none" />
            </>
          )}

          <div
            ref={scrollRef}
            className={`flex gap-2 sm:gap-3 select-none ${
              shouldAnimate
                ? 'overflow-hidden cursor-grab active:cursor-grabbing'
                : 'overflow-x-auto justify-center'
            }`}
            style={{ touchAction: shouldAnimate ? 'none' : 'auto' }}
            onMouseEnter={() => { isPausedRef.current = true; }}
            onMouseLeave={() => { isPausedRef.current = false; }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {items.map((client, index) => (
              <ClientCard key={`${client.name}-${index}`} client={client} />
            ))}
          </div>
        </div>

        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-gray-400 italic text-sm">{t('satisfied', { count: String(clients.length) })}</p>
        </div>
      </div>
    </section>
  );
}
