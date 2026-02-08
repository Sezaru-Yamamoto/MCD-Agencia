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
        {/* Left: Logo */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-neutral-900">
          <Link href="/" className="flex flex-col items-center justify-center h-full w-full">
            <Image
              src="/images/logo.png"
              alt="Agencia MCD"
              width={420}
              height={210}
              className="w-[320px] h-auto max-w-full drop-shadow-xl"
              priority
            />
          </Link>
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
