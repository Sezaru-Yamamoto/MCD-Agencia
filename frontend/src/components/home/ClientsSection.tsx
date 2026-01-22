'use client';

export function ClientsSection() {
  const clients = [
    'Cliente 1', 'Cliente 2', 'Cliente 3', 'Cliente 4',
    'Cliente 5', 'Cliente 6', 'Cliente 7', 'Cliente 8',
  ];

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 id="clients-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
          Clientes que Confían en Nosotros
        </h2>
        <p className="text-neutral-400">
          Empresas líderes que han elegido nuestros servicios.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {clients.map((client, index) => (
          <div
            key={index}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex items-center justify-center h-24"
          >
            <span className="text-neutral-500">{client}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
