'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CONTACT_INFO } from '@/lib/constants';
import { trackCTA } from '@/lib/tracking';

/**
 * StickyActions — Fixed right-side action buttons
 * Quote (with clean spinning cyan border + "Cotiza ya" label) + WhatsApp + Chat toggle
 * Always visible, stacked vertically on the right edge
 */
export function StickyActions({ onChatToggle, isChatOpen }: {
  onChatToggle: () => void;
  isChatOpen: boolean;
}) {
  const [showLabel, setShowLabel] = useState(true);
  const handleQuoteClick = () => { trackCTA('quote', 'sticky-actions'); };
  const handleWhatsAppClick = () => { trackCTA('whatsapp', 'sticky-actions'); };

  // Hide "Cotiza ya" label after scrolling past the hero
  useEffect(() => {
    const onScroll = () => setShowLabel(window.scrollY < 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Spinner border animation */}
      <style jsx>{`
        @keyframes spin-border {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(-4px); }
        }
        .spinner-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-wrap .spinner-ring {
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          border: 2.5px solid transparent;
          border-top-color: #00e5ff;
          border-right-color: #00e5ff;
          animation: spin-border 1.4s linear infinite;
          filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.6));
        }
        .spinner-wrap .spinner-ring-blur {
          position: absolute;
          inset: -3px;
          border-radius: 9999px;
          border: 2.5px solid transparent;
          border-top-color: #00e5ff;
          border-right-color: #00b8d4;
          animation: spin-border 1.4s linear infinite;
          filter: blur(4px);
          opacity: 0.45;
        }
      `}</style>

      {/* Container — fixed right side */}
      <div className="fixed right-4 sm:right-6 bottom-6 z-[55] flex flex-col items-center gap-4 sm:gap-5">

        {/* ─── Quote button with spinner border ──────────────────────── */}
        <div className="relative flex items-center">
          {/* "Cotiza ya" label — LEFT of button, hides on scroll */}
          <div
            className={`absolute right-full mr-3 whitespace-nowrap pointer-events-none transition-all duration-500 ${
              showLabel ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
            }`}
            style={{ animation: showLabel ? 'float-gentle 2.5s ease-in-out infinite' : 'none' }}
          >
            <div className="bg-cmyk-cyan text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-cmyk-cyan/30 flex items-center gap-1">
              ¡Cotiza ya!
              {/* Arrow pointing right toward button */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-l-[6px] border-transparent border-l-cmyk-cyan" />
            </div>
          </div>

          {/* Spinner border wrapper */}
          <div className="spinner-wrap">
            <div className="spinner-ring" />
            <div className="spinner-ring-blur" />
            {/* Button */}
            <a
              href="#cotizar"
              onClick={handleQuoteClick}
              className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-cmyk-cyan text-white flex items-center justify-center shadow-2xl shadow-cmyk-cyan/50 hover:scale-110 transition-transform duration-300 relative z-10"
              aria-label="Cotizar"
              title="Cotizar ahora"
            >
              {/* Flaticon: solicitud de cotización */}
              <Image
                src="/images/quote-icon.png"
                alt="Cotizar"
                width={32}
                height={32}
                className="w-7 h-7 sm:w-8 sm:h-8 brightness-0 invert"
              />
            </a>
          </div>
        </div>

        {/* ─── WhatsApp button ───────────────────────────────────────── */}
        <a
          href={CONTACT_INFO.whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-500/40 hover:scale-110 hover:bg-green-400 transition-all duration-300 relative"
          aria-label="WhatsApp"
          title="WhatsApp"
        >
          <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          {/* Pulse */}
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20 pointer-events-none" />
        </a>

        {/* ─── Chat toggle button ────────────────────────────────────── */}
        {!isChatOpen && (
          <button
            onClick={onChatToggle}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-yellow-400 text-neutral-900 flex items-center justify-center shadow-2xl shadow-yellow-400/30 hover:scale-110 transition-all duration-300 relative"
            aria-label="Abrir chat"
            title="Chat en línea"
          >
            <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white" />
            </span>
          </button>
        )}
      </div>
    </>
  );
}
