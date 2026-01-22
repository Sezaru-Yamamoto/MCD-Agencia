'use client';

import { trackCTA } from '@/lib/tracking';

export function Portfolio() {
  const handlePortfolioClick = () => {
    trackCTA('quote', 'portfolio');
  };

  // Placeholder portfolio items - reemplazar con imágenes reales
  const portfolioItems = [
    { id: 1, title: 'Lona exterior gran formato', category: 'Gran Formato' },
    { id: 2, title: 'Rotulación vehicular', category: 'Vinilos' },
    { id: 3, title: 'Vinilo en vidriera', category: 'Vinilos' },
    { id: 4, title: 'Señalética corporativa', category: 'Señalética' },
    { id: 5, title: 'Stand para feria', category: 'Gran Formato' },
    { id: 6, title: 'Espectacular publicitario', category: 'Lonas' },
  ];

  return (
    <section id="portafolio" className="section bg-gradient-to-br from-cmyk-black to-cmyk-black py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12 px-4 sm:px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-bold text-white">Trabajos que hablan por nosotros</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Proyectos exitosos que hemos realizado para nuestros clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 px-4 sm:px-0">
          {portfolioItems.map((item, index) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-cmyk-black to-cmyk-black border border-cmyk-cyan/20"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Placeholder - reemplazar con Image component */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4 sm:p-6">
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-4">
                    {item.category === 'Lonas' && '🎨'}
                    {item.category === 'Gran Formato' && '🖼️'}
                    {item.category === 'Vinilos' && '🚗'}
                    {item.category === 'Señalética' && '🚦'}
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-100">{item.title}</p>
                </div>
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                  <p className="text-xs sm:text-sm font-semibold mb-1">{item.category}</p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold">{item.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">¿Te gustaría un proyecto similar?</p>
          <a
            href="#cotizar"
            onClick={handlePortfolioClick}
            className="btn-primary inline-flex items-center text-sm sm:text-base"
          >
            Solicitar cotización →
          </a>
        </div>
      </div>
    </section>
  );
}
