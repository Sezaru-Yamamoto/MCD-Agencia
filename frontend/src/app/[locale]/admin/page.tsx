'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ShoppingBagIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, getRoleDisplayName } from '@/hooks/usePermissions';
import { Card, LoadingPage } from '@/components/ui';

const adminMenuItems = [
  {
    title: 'Pedidos',
    description: 'Gestionar pedidos de clientes',
    href: '/admin/pedidos',
    icon: ShoppingBagIcon,
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    title: 'Catálogo',
    description: 'Administrar catálogo de productos',
    href: '/admin/catalogo',
    icon: CubeIcon,
    color: 'bg-green-500/20 text-green-400',
  },
  {
    title: 'Usuarios',
    description: 'Gestionar usuarios y roles',
    href: '/admin/usuarios',
    icon: UsersIcon,
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    title: 'Cotizaciones',
    description: 'Revisar y aprobar cotizaciones',
    href: '/admin/cotizaciones',
    icon: DocumentTextIcon,
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    title: 'Leads',
    description: 'Gestionar leads capturados',
    href: '/admin/leads',
    icon: UserPlusIcon,
    color: 'bg-orange-500/20 text-orange-400',
  },
  {
    title: 'Reportes',
    description: 'Ver estadísticas y reportes',
    href: '/admin/reportes',
    icon: ChartBarIcon,
    color: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    title: 'Configuración',
    description: 'Ajustes del sistema',
    href: '/admin/configuracion',
    icon: CogIcon,
    color: 'bg-neutral-500/20 text-neutral-400',
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading } = useAuth();
  const permissions = usePermissions();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/admin`);
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

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Administración</h1>
          <p className="text-neutral-400">
            Bienvenido, {user?.first_name || user?.email} ({getRoleDisplayName(permissions.role)})
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Pedidos Hoy</p>
            <p className="text-2xl font-bold text-white">12</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Ventas del Mes</p>
            <p className="text-2xl font-bold text-white">$45,230</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Cotizaciones Pendientes</p>
            <p className="text-2xl font-bold text-white">8</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Usuarios Activos</p>
            <p className="text-2xl font-bold text-white">156</p>
          </Card>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenuItems.map((item) => (
            <Link key={item.href} href={`/${locale}${item.href}`}>
              <Card className="p-6 hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
                <div className={`inline-flex p-3 rounded-lg ${item.color} mb-4`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-neutral-400 text-sm">{item.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
