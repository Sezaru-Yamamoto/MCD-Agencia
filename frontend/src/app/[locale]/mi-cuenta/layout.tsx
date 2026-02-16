'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  UserIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowLeftOnRectangleIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  // Check user role
  const isStaff = user?.role?.name === 'sales' || user?.role?.name === 'admin';

  // Menu items based on role
  const MENU_ITEMS = useMemo(() => {
    if (isStaff) {
      // Staff users get dashboard links
      return [
        { href: `/${locale}/mi-cuenta`, label: 'Mi Perfil', icon: UserIcon, exact: true },
        { href: `/${locale}/dashboard`, label: 'Panel de Control', icon: CogIcon },
        { href: `/${locale}/dashboard/cotizaciones`, label: 'Cotizaciones', icon: ClipboardDocumentListIcon },
        { href: `/${locale}/dashboard/pedidos`, label: 'Pedidos', icon: ShoppingBagIcon },
        { href: `/${locale}/dashboard/clientes`, label: 'Clientes', icon: UsersIcon },
      ];
    }
    // Regular customers
    return [
      { href: `/${locale}/mi-cuenta`, label: 'Mi Perfil', icon: UserIcon, exact: true },
      { href: `/${locale}/mi-cuenta/pedidos`, label: 'Mis Pedidos', icon: ShoppingBagIcon },
      { href: `/${locale}/mi-cuenta/cotizaciones`, label: 'Mis Cotizaciones', icon: DocumentTextIcon },
      { href: `/${locale}/mi-cuenta/configuracion`, label: 'Configuración', icon: CogIcon },
    ];
  }, [locale, isStaff]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/login?redirect=/${locale}/mi-cuenta`);
    }
  }, [isLoading, isAuthenticated, router, locale]);

  if (isLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push(`/${locale}`);
  };

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0 lg:self-start lg:sticky lg:top-20">
            {/* Header inside sidebar */}
            <div className="mb-3">
              <h1 className="text-lg font-bold text-white mb-0.5">
                {isStaff ? 'Panel de Control' : 'Mi Cuenta'}
              </h1>
              <p className="text-neutral-400 text-xs">
                Bienvenido, {isStaff ? user?.first_name || 'Staff' : user?.first_name || user?.full_name || user?.email}
              </p>
            </div>
            <nav className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 space-y-1">
              {MENU_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href || pathname === `${item.href}/`
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-cmyk-cyan/20 text-cmyk-cyan'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                Cerrar Sesión
              </button>
            </nav>
            {/* Portal target for page-specific sidebar content (e.g. Historial) */}
            <div id="sidebar-extra" className="mt-4 space-y-4"></div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
