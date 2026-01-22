'use client';

import { HOW_IT_WORKS } from '@/lib/constants';
import { trackCTA } from '@/lib/tracking';

export function HowItWorks() {
  const handleQuoteClick = () => {
    trackCTA('quote', 'how-it-works');
  };

  return (
    <section className="section bg-gradient-to-br from-cmyk-black to-cmyk-black py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">Cotiza y recibe en 3 simples pasos</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Un proceso sencillo y transparente para obtener tus productos de impresión.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12 px-4 sm:px-0">
          {HOW_IT_WORKS.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector line (desktop only) */}
              {index < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-12 md:top-16 left-1/2 w-full h-0.5 bg-gray-200 -z-10">
                  <div className="h-full bg-cmyk-cyan w-0 animate-pulse"></div>
                </div>
              )}

              <div className="text-center">
                {/* Step number circle */}
                <div className="inline-flex items-center justify-center w-16 sm:w-20 md:w-32 h-16 sm:h-20 md:h-32 rounded-full bg-cmyk-cyan text-cmyk-black text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 shadow-lg">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-base sm:text-lg md:text-2xl mb-2 sm:mb-3 text-gray-100">{step.title}</h3>
                <p className="text-sm sm:text-base text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center px-4 sm:px-0">
          <a
            href="#cotizar"
            onClick={handleQuoteClick}
            className="btn-primary text-sm sm:text-base md:text-lg px-6 sm:px-8 py-2 sm:py-3 md:py-4 inline-flex items-center"
          >
            Iniciar cotización →
          </a>
        </div>
      </div>
    </section>
  );
}
