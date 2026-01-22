'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: '¿Cuál es el tiempo de entrega?',
    answer: 'El tiempo de entrega varía según el proyecto. Trabajos estándar se entregan en 2-3 días hábiles. Para proyectos urgentes, contamos con servicio express.',
  },
  {
    question: '¿Hacen envíos fuera de Acapulco?',
    answer: 'Sí, realizamos envíos a todo México. El costo y tiempo de envío depende de la ubicación y dimensiones del producto.',
  },
  {
    question: '¿Qué formatos de archivo aceptan?',
    answer: 'Aceptamos AI, PSD, PDF, EPS, y archivos en alta resolución (300 DPI mínimo). Nuestro equipo de diseño puede ayudarte si necesitas ajustes.',
  },
  {
    question: '¿Ofrecen servicio de instalación?',
    answer: 'Sí, contamos con equipo profesional de instalación para trabajos en altura, fachadas, y espacios comerciales.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
          Preguntas Frecuentes
        </h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-white font-medium">{faq.question}</span>
              <ChevronDownIcon
                className={cn(
                  'h-5 w-5 text-neutral-400 transition-transform',
                  openIndex === index && 'rotate-180'
                )}
              />
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4">
                <p className="text-neutral-400">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
