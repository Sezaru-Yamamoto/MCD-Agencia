'use client';

import Link from 'next/link';
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';

export function ContactSection() {
  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 id="contact-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
          ¿Listo para Iniciar tu Proyecto?
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto">
          Contáctanos hoy y recibe una cotización personalizada sin compromiso.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <a
            href="tel:+527441234567"
            className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <PhoneIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-neutral-400">Llámanos</div>
              <div className="text-lg text-white font-semibold">(744) 123-4567</div>
            </div>
          </a>

          <a
            href="mailto:ventas@agenciamcd.mx"
            className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-neutral-400">Escríbenos</div>
              <div className="text-lg text-white font-semibold">ventas@agenciamcd.mx</div>
            </div>
          </a>
        </div>

        <div className="text-center">
          <Link href="/cotizar">
            <Button size="lg">
              Solicitar Cotización Gratis
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
