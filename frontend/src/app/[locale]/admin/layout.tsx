'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  CubeIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UsersIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage, Button } from '@/components/ui';
import { cn, getInitials } from '@/lib/utils';

const MENU_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: HomeIcon, exact: true },
  { href: '/admin/catalogo', label: 'Catálogo', icon: CubeIcon },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBagIcon },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: DocumentTextIcon },
  { href: '/admin/inventario', label: 'Inventario', icon: ArchiveBoxIcon },
  { href: '/admin/usuarios', label: 'Usuarios', icon: UsersIcon },
  { href: '/admin/contenido', label: 'Contenido', icon: PhotoIcon },
  { href: '/admin/leads', label: 'Leads', icon: ChatBubbleLeftRightIcon },
  { href: '/admin/auditoria', label: 'Auditoría', icon: ClipboardDocumentListIcon },
  { href: '/admin/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role?.name && ['superadmin', 'admin', 'sales', 'operations'].includes(user.role.name);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-magenta-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
              MCD
            </div>
            <span className="font-semibold text-white">Admin</span>
          </Link>
          <button
            className="lg:hidden text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {MENU_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href || pathname === `${item.href}/`
              : pathname.startsWith(item.href);

            // Check role permissions
            const allowedRoles: Record<string, string[]> = {
              '/admin/usuarios': ['superadmin', 'admin'],
              '/admin/auditoria': ['superadmin', 'admin'],
              '/admin/configuracion': ['superadmin', 'admin'],
            };

            const requiredRoles = allowedRoles[item.href];
            if (requiredRoles && user?.role?.name && !requiredRoles.includes(user.role.name)) {
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center text-white font-bold">
              {getInitials(user?.full_name || user?.email || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-neutral-400 capitalize">
                {user?.role?.display_name || user?.role?.name}
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
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            className="lg:hidden p-2 text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <Link href="/" target="_blank">
              <Button variant="ghost" size="sm">
                Ver sitio
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
