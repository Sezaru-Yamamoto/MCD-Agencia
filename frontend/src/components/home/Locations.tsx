'use client';

import { useState } from 'react';
import { LOCATIONS } from '@/lib/constants';

type Location = typeof LOCATIONS[number];

export function Locations() {
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);

  return (
    <section id="ubicaciones" className="section bg-cmyk-black py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">
            Nuestras Ubicaciones
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Visítanos en cualquiera de nuestras oficinas o contáctanos directamente
          </p>
        </div>

        {/* Locations Grid and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Location Cards */}
          <div className="lg:col-span-1 space-y-4">
            {LOCATIONS.map((location) => (
              <div
                key={location.id}
                className={`w-full text-left p-5 sm:p-6 rounded-xl transition-all duration-300 border-2 ${
                  selectedLocation.id === location.id
                    ? 'border-cmyk-magenta bg-cmyk-magenta/10 shadow-lg shadow-cmyk-magenta/20'
                    : 'border-cmyk-cyan/30 bg-cmyk-black/50 hover:border-cmyk-cyan/60 hover:bg-cmyk-black/70'
                }`}
              >
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  {location.name}
                </h3>
                <p className="text-sm text-gray-300 mb-3">{location.city}</p>
                
                {/* Address */}
                <div className="mb-3 flex items-start gap-2">
                  <svg className="w-4 h-4 text-cmyk-cyan flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-400">{location.address}</p>
                </div>

                {/* Phone */}
                <div className="mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cmyk-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773c.058.3.102.605.102.913 0 2.29.846 4.381 2.254 6 1.427 1.664 3.41 2.853 5.802 3.495.501.106 1.011.208 1.52.292a1 1 0 01.956.029l.962.481a1 1 0 01.321 1.497l-2.179 2.179a1 1 0 01-.5.168h-.016a48.55 48.55 0 01-7.752-3.102 48.565 48.565 0 01-11.358-9.487 48.657 48.657 0 013.8-12.162zm12.604 6.08a6 6 0 01-2.12 11.08 6 6 0 003.802-5.3 6 6 0 00-1.682-5.78z" />
                  </svg>
                  <a
                    href={`tel:${location.phone}`}
                    className="text-xs sm:text-sm text-cmyk-cyan hover:text-cmyk-magenta transition-colors"
                  >
                    {location.phoneDisplay}
                  </a>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-4 h-4 text-cmyk-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <a
                    href={`mailto:${location.email}`}
                    className="text-xs sm:text-sm text-cmyk-cyan hover:text-cmyk-magenta transition-colors break-all"
                  >
                    {location.email}
                  </a>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    onClick={() => setSelectedLocation(location)}
                    className="w-full px-4 py-2 bg-cmyk-cyan/20 hover:bg-cmyk-cyan/30 text-cmyk-cyan font-semibold rounded-lg transition-colors text-xs sm:text-sm"
                  >
                    Ver en Mapa
                  </button>
                  <a
                    href={`https://wa.me/52${location.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.38 0 0 5.38 0 12c0 2.14.52 4.16 1.44 5.94L0 24l6.3-1.42C8.78 23.48 10.32 24 12 24c6.62 0 12-5.38 12-12S18.62 0 12 0zm0 22c-1.4 0-2.78-.28-4.08-.82l-.29-.14-3.08.68.7-3.02-.2-.3A10.03 10.03 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.32-7.48c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.92 1.16-.16.2-.32.22-.62.07-1.72-.85-2.85-1.48-3.98-3.38-.28-.48.28-1.44.55-1.77.1-.13.2-.33.1-.52-.1-.2-.66-1.56-.9-2.14-.24-.56-.48-.48-.66-.48-.17 0-.36-.02-.55-.02-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.1 4.48.72.3 1.28.48 1.72.62.72.22 1.37.19 1.89.11.58-.08 1.74-.71 1.98-1.4.24-.69.24-1.28.17-1.4-.08-.13-.27-.2-.56-.35z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-cmyk-black/50 rounded-xl overflow-hidden border-2 border-cmyk-cyan/30 hover:border-cmyk-cyan/60 transition-colors shadow-lg h-full flex flex-col">
              {/* Map Container */}
              <div className="flex-1 w-full min-h-96 lg:h-[500px] bg-gray-800 rounded-t-xl relative overflow-hidden">
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(
                      `${selectedLocation.address}, ${selectedLocation.city}`
                    )}&zoom=15`}
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-cmyk-black/50">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-cmyk-cyan/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-cmyk-cyan text-sm">Google Maps API key no configurada</p>
                      <p className="text-gray-400 text-xs mt-2">Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY a .env.local</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Info Below Map */}
              <div className="bg-gradient-to-r from-cmyk-black to-cmyk-magenta/10 p-5 sm:p-6 border-t border-cmyk-cyan/20">
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3">
                  {selectedLocation.name}
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    <strong className="text-cmyk-cyan">Dirección:</strong> {selectedLocation.address}
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong className="text-cmyk-cyan">Teléfono:</strong>{' '}
                    <a
                      href={`tel:${selectedLocation.phone}`}
                      className="text-cmyk-magenta hover:underline"
                    >
                      {selectedLocation.phoneDisplay}
                    </a>
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong className="text-cmyk-cyan">Email:</strong>{' '}
                    <a
                      href={`mailto:${selectedLocation.email}`}
                      className="text-cmyk-magenta hover:underline break-all"
                    >
                      {selectedLocation.email}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
