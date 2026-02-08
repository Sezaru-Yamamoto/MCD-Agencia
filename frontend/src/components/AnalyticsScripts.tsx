'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

/**
 * Conditionally loads third-party analytics scripts based on user consent.
 *
 * - Google Analytics 4 (GA4)   → requires `analytics` consent
 * - Microsoft Clarity           → requires `analytics` consent
 * - Facebook / Meta Pixel       → requires `marketing` consent
 *
 * Set the IDs in your .env.local:
 *   NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
 *   NEXT_PUBLIC_FB_PIXEL_ID=xxxxxxxxxxxxxxx
 */

// Extend Window for analytics globals
declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function AnalyticsScripts() {
  const { consent } = useCookieConsent();

  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  const fbPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  const analyticsAllowed = consent?.analytics === true;
  const marketingAllowed = consent?.marketing === true;

  // ═══════════ Microsoft Clarity (useEffect for reliable injection) ═══════════
  useEffect(() => {
    if (!analyticsAllowed || !clarityId || window.clarity) return;

    // Official Clarity tracking code — injected via JS for reliable consent-based loading
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${clarityId}`;
    document.head.appendChild(script);

    // Initialize Clarity queue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).clarity =
      (window as any).clarity ||
      function (...args: unknown[]) {
        ((window as any).clarity.q = (window as any).clarity.q || []).push(args);
      };
  }, [analyticsAllowed, clarityId]);

  return (
    <>
      {/* ═══════════ Google Analytics 4 ═══════════ */}
      {analyticsAllowed && ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}', {
                page_path: window.location.pathname,
                anonymize_ip: true,
                cookie_flags: 'SameSite=None;Secure'
              });
            `}
          </Script>
        </>
      )}

      {/* ═══════════ Facebook / Meta Pixel ═══════════ */}
      {marketingAllowed && fbPixelId && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
