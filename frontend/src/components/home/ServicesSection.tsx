'use client';

import {
  PrinterIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

const services = [
  {
    icon: PrinterIcon,
    title: 'Impresión Gran Formato',
    description: 'Lonas, vinilos, backlight, mesh y más. Calidad fotográfica hasta 1440 DPI.',
  },
  {
    icon: BuildingStorefrontIcon,
    title: 'Señalética',
    description: 'Letreros, tótems, directorios y señalización para tu negocio.',
  },
  {
    icon: TruckIcon,
    title: 'Rotulación Vehicular',
    description: 'Branding completo para flotillas, desde autos hasta trailers.',
  },
  {
    icon: WrenchScrewdriverIcon,
    title: 'Instalación',
    description: 'Equipo profesional para instalación en altura y espacios complejos.',
  },
];

export function ServicesSection() {
  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
          Nuestros Servicios
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto">
          Soluciones integrales en impresión y publicidad exterior para impulsar tu marca.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((service) => (
          <div
            key={service.title}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
              <service.icon className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{service.title}</h3>
            <p className="text-neutral-400 text-sm">{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
