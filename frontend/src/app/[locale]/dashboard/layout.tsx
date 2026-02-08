'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  HomeIcon,
  CubeIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PhotoIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  LockClosedIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, getRoleDisplayName, type Permissions } from '@/hooks/usePermissions';
import { LoadingPage } from '@/components/ui';
import { cn, getInitials } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Sidebar menu definition – items are shown/hidden based on permissions
// ---------------------------------------------------------------------------

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Permission key – if the user lacks it the item is shown locked */
  permission: keyof Permissions;
  /** Optional group separator before this item */
  separator?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  // ── Common (admin + sales) ──────────────────────────────────────────────
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon, exact: true, permission: 'canAccessAdmin' },
  { href: '/dashboard/solicitudes', label: 'Solicitudes', icon: ClipboardDocumentListIcon, permission: 'canViewAllQuotes' },
  { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: DocumentTextIcon, permission: 'canViewAllQuotes' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: ShoppingBagIcon, permission: 'canViewAllOrders' },
  { href: '/dashboard/clientes', label: 'Clientes', icon: UsersIcon, permission: 'canViewAllOrders' },

  // ── Admin-only ──────────────────────────────────────────────────────────
  { href: '/dashboard/catalogo', label: 'Catálogo', icon: CubeIcon, permission: 'canEditCatalog', separator: true },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: UsersIcon, permission: 'canEditUsers' },
  { href: '/dashboard/contenido', label: 'Contenido', icon: PhotoIcon, permission: 'canEditContent' },
  { href: '/dashboard/analytics', label: 'Analítica', icon: ChartBarIcon, permission: 'canViewLeads' },
  { href: '/dashboard/auditoria', label: 'Auditoría', icon: ClipboardDocumentListIcon, permission: 'canViewAudit' },
];

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const permissions = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Only staff (admin + sales) can access the dashboard
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/dashboard`);
      } else if (!permissions.canAccessAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [isLoading, isAuthenticated, permissions.canAccessAdmin, router, locale]);

  if (isLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !permissions.canAccessAdmin) {
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
          className="fixed inset-0 top-16 bg-black/80 z-20 lg:hidden overscroll-contain"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 right-0 z-30 h-[calc(100dvh-4rem)] w-64 bg-neutral-900 border-l border-neutral-800 transform transition-transform duration-300 lg:translate-x-0 overscroll-contain',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Sidebar uses flex-col so the nav scrolls and user card stays pinned */}
        <div className="flex flex-col h-full">
        {/* Sidebar header */}
        <div className="h-24 flex items-center justify-center px-4 pt-2 border-b border-neutral-800 flex-shrink-0">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-cmyk-cyan to-cmyk-magenta rounded-lg flex items-center justify-center font-bold text-white text-sm">
              MCD
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white text-sm">Panel MCD</span>
              <span className="text-[10px] text-neutral-400">
                {getRoleDisplayName(permissions.role)}
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1 min-h-0">
          {MENU_ITEMS.map((item) => {
            const fullHref = `/${locale}${item.href}`;
            const isActive = item.exact
              ? pathname === fullHref || pathname === `${fullHref}/`
              : pathname.startsWith(fullHref);

            const hasPermission = permissions[item.permission] as boolean;

            return (
              <div key={item.href}>
                {/* Group separator */}
                {item.separator && (
                  <div className="my-3 border-t border-neutral-800" />
                )}

                {hasPermission ? (
                  <Link
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
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-600 cursor-not-allowed">
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    <LockClosedIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="flex-shrink-0 p-4 border-t border-neutral-800 bg-neutral-900">
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
        </div>{/* end flex-col wrapper */}
      </aside>

      {/* Main content */}
      <div className="lg:pr-64 pt-16">
        {/* Mobile sidebar toggle — aligned right to match header hamburger */}
        <div className="lg:hidden sticky top-16 z-20 bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-800 px-4 py-2 flex justify-end">
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
