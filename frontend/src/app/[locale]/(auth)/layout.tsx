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
      {/* Simple header with logo */}
      <header className="py-6 px-4">
        <div className="container mx-auto">
          <Link href="/" className="inline-block">
            <Image
              src="/images/logo.png"
              alt="Agencia MCD"
              width={180}
              height={90}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="py-6 px-4 text-center text-sm text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Agencia MCD. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
