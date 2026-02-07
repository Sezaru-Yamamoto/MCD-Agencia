'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  HomeIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, getRoleDisplayName } from '@/hooks/usePermissions';
import { LoadingPage } from '@/components/ui';
import { cn, getInitials } from '@/lib/utils';

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const SALES_MENU_ITEMS: MenuItem[] = [
  { href: '/ventas', label: 'Dashboard', icon: HomeIcon, exact: true },
  { href: '/ventas/solicitudes', label: 'Solicitudes', icon: ClipboardDocumentListIcon },
  { href: '/ventas/cotizaciones', label: 'Cotizaciones', icon: DocumentTextIcon },
  { href: '/ventas/pedidos', label: 'Pedidos', icon: ShoppingBagIcon },
  { href: '/ventas/clientes', label: 'Clientes', icon: UsersIcon },
];

interface SalesLayoutProps {
  children: React.ReactNode;
}

export default function SalesLayout({ children }: SalesLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const permissions = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSalesOrAdmin = permissions.isSales || permissions.isAdmin;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [isLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  if (isLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push(`/${locale}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/80 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - starts below the main header */}
      <aside
        className={cn(
          'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar header */}
        <div className="h-24 flex items-center justify-center px-4 pt-2 border-b border-neutral-800">
          <Link href={`/${locale}/ventas`} className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-cmyk-cyan to-cmyk-magenta rounded-lg flex items-center justify-center font-bold text-white text-sm">
              MCD
            </div>
            <span className="font-semibold text-white">Panel de Ventas</span>
          </Link>
          <button
            className="lg:hidden text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem-7rem)]">
          {SALES_MENU_ITEMS.map((item) => {
            const fullHref = `/${locale}${item.href}`;
            const isActive = item.exact
              ? pathname === fullHref || pathname === `${fullHref}/`
              : pathname.startsWith(fullHref);

            return (
              <Link
                key={item.href}
                href={fullHref}
                onClick={() => setSidebarOpen(false)}
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

          {/* Separator + Admin link for admin users */}
          {permissions.isAdmin && (
            <>
              <div className="my-4 border-t border-neutral-800" />
              <Link
                href={`/${locale}/admin`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <Cog6ToothIcon className="h-5 w-5" />
                Panel Admin
              </Link>
            </>
          )}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cmyk-cyan to-cmyk-magenta flex items-center justify-center text-white font-bold">
              {getInitials(user?.full_name || user?.email || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-neutral-400">
                {getRoleDisplayName(permissions.role)}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              title="Cerrar sesión"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 pt-16">
        {/* Mobile sidebar toggle */}
        <div className="lg:hidden sticky top-16 z-20 bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-800 px-4 py-2">
          <button
            className="p-2 text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
