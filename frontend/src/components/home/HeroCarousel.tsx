'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export function HeroCarousel() {
  return (
    <div className="relative min-h-[600px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #00FFFF 1px, transparent 1px), radial-gradient(circle at 75% 75%, #FF00FF 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Soluciones en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">
              Impresión
            </span>{' '}
            y{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-magenta-400 to-magenta-600">
              Publicidad
            </span>
          </h1>

          <p className="text-xl text-neutral-300 mb-8">
            Lonas, vinilos, señalética, rotulación vehicular y más.
            Calidad premium con los mejores tiempos de entrega en Acapulco.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/catalogo">
              <Button size="lg">
                Ver Catálogo
              </Button>
            </Link>
            <Link href="/cotizar">
              <Button size="lg" variant="outline">
                Solicitar Cotización
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent" />
    </div>
  );
}
