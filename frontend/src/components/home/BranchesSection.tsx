'use client';

import { MapPinIcon, PhoneIcon, ClockIcon } from '@heroicons/react/24/outline';

const branches = [
  {
    name: 'Sucursal Centro',
    address: 'Av. Costera Miguel Alemán 123, Centro, Acapulco',
    phone: '(744) 123-4567',
    hours: 'Lun-Vie: 9:00-18:00, Sáb: 9:00-14:00',
  },
  {
    name: 'Sucursal Diamante',
    address: 'Blvd. de las Naciones 456, Zona Diamante, Acapulco',
    phone: '(744) 987-6543',
    hours: 'Lun-Vie: 9:00-18:00, Sáb: 9:00-14:00',
  },
];

export function BranchesSection() {
  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 id="branches-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
          Nuestras Sucursales
        </h2>
        <p className="text-neutral-400">
          Visítanos en cualquiera de nuestras ubicaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {branches.map((branch, index) => (
          <div
            key={index}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">{branch.name}</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-cyan-400 mt-0.5" />
                <span className="text-neutral-300">{branch.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-cyan-400" />
                <span className="text-neutral-300">{branch.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-cyan-400 mt-0.5" />
                <span className="text-neutral-300">{branch.hours}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
