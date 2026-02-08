/**
 * Auth Layout - Minimal layout for authentication pages
 */

import Link from 'next/link';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="flex flex-1 items-stretch justify-center min-h-screen">
        {/* Left: Logo (no fondo, no botón, mucho más grande, mensaje debajo) */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-transparent">
          <div className="flex flex-col items-center justify-center h-full w-full">
            <Image
              src="/images/logo.png"
              alt="Agencia MCD"
              width={700}
              height={350}
              className="w-[520px] h-auto max-w-full drop-shadow-2xl mb-6"
              priority
            />
            <span className="mt-2 text-3xl lg:text-5xl font-bold text-white font-landing tracking-tight text-center select-none">
              Transforma tus ideas
            </span>
          </div>
        </div>
        {/* Right: Form */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 min-h-screen px-4">
          <main className="w-full flex flex-col items-center justify-center">
            {children}
          </main>
        </div>
      </div>
      {/* Simple footer */}
      <footer className="py-6 px-4 text-center text-sm text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Agencia MCD. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
