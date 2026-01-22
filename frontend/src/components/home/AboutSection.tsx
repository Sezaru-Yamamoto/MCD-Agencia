'use client';

export function AboutSection() {
  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 id="about-heading" className="text-3xl md:text-4xl font-bold text-white mb-6">
            Sobre{' '}
            <span className="text-cyan-400">MCD Agencia</span>
          </h2>
          <p className="text-neutral-300 mb-4">
            Con más de 15 años de experiencia en el mercado de Acapulco, somos líderes
            en soluciones de impresión y publicidad exterior.
          </p>
          <p className="text-neutral-400 mb-6">
            Contamos con la tecnología más avanzada y un equipo de profesionales
            comprometidos con la calidad y satisfacción de nuestros clientes.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">15+</div>
              <div className="text-sm text-neutral-400">Años</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">500+</div>
              <div className="text-sm text-neutral-400">Clientes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">1000+</div>
              <div className="text-sm text-neutral-400">Proyectos</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-video bg-neutral-800 rounded-xl overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-neutral-600">
              <span>Imagen de la empresa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
