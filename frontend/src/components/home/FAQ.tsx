'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from '@/lib/constants';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="section bg-gradient-to-br from-cmyk-black to-cmyk-black py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">Preguntas frecuentes</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Encuentra respuestas a las dudas más comunes sobre nuestros servicios.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 px-4 sm:px-0">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="bg-cmyk-black rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-cmyk-cyan/20"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between hover:bg-cmyk-black/50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-100 pr-4 sm:pr-8">
                  {item.question}
                </h3>
                <svg
                  className={`w-5 sm:w-6 h-5 sm:h-6 text-cmyk-cyan flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 text-center p-4 sm:p-8 bg-gradient-to-br from-cmyk-cyan/10 to-cmyk-magenta/10 rounded-2xl border border-cmyk-cyan/20 mx-4 sm:mx-0">
          <p className="text-base sm:text-lg md:text-xl text-gray-100 mb-4">
            ¿No encontraste la respuesta que buscabas?
          </p>
          <a
            href="#contacto"
            className="btn-primary inline-flex items-center text-sm sm:text-base"
          >
            Contáctanos directamente →
          </a>
        </div>
      </div>
    </section>
  );
}
