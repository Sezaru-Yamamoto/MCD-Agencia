'use client';

import { StarIcon } from '@heroicons/react/24/solid';

const testimonials = [
  {
    name: 'María García',
    company: 'Restaurant El Puerto',
    text: 'Excelente calidad en los letreros de mi negocio. El equipo fue muy profesional.',
    rating: 5,
  },
  {
    name: 'Carlos Rodríguez',
    company: 'Transportes del Sur',
    text: 'Rotulamos toda nuestra flotilla con ellos. Precio justo y trabajo impecable.',
    rating: 5,
  },
  {
    name: 'Ana Martínez',
    company: 'Boutique Costa',
    text: 'Los vinilos decorativos quedaron increíbles. Superaron mis expectativas.',
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
          Lo que Dicen Nuestros Clientes
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="bg-neutral-800 border border-neutral-700 rounded-xl p-6"
          >
            <div className="flex mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
              ))}
            </div>
            <p className="text-neutral-300 mb-4">&quot;{testimonial.text}&quot;</p>
            <div>
              <div className="text-white font-semibold">{testimonial.name}</div>
              <div className="text-sm text-neutral-400">{testimonial.company}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
