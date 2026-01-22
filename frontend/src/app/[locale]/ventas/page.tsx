'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ShoppingBagIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { Card, LoadingPage } from '@/components/ui';

const salesMenuItems = [
  {
    title: 'Cotizaciones',
    description: 'Crear y gestionar cotizaciones',
    href: '/ventas/cotizaciones',
    icon: DocumentTextIcon,
    color: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    title: 'Pedidos',
    description: 'Ver y procesar pedidos',
    href: '/ventas/pedidos',
    icon: ShoppingBagIcon,
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    title: 'Clientes',
    description: 'Gestionar información de clientes',
    href: '/ventas/clientes',
    icon: UsersIcon,
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    title: 'Mis Estadísticas',
    description: 'Ver tu rendimiento de ventas',
    href: '/ventas/estadisticas',
    icon: ChartBarIcon,
    color: 'bg-green-500/20 text-green-400',
  },
];

export default function SalesDashboard() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isSalesOrAdmin = user?.role?.name && ['superadmin', 'admin', 'sales'].includes(user.role.name);

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

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Ventas</h1>
          <p className="text-neutral-400">
            Bienvenido, {user?.first_name || user?.email}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Cotizaciones Hoy</p>
            <p className="text-2xl font-bold text-white">5</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Pedidos Pendientes</p>
            <p className="text-2xl font-bold text-white">3</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Ventas del Mes</p>
            <p className="text-2xl font-bold text-white">$12,450</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Clientes Activos</p>
            <p className="text-2xl font-bold text-white">28</p>
          </Card>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {salesMenuItems.map((item) => (
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

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Acciones Rápidas</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/${locale}/ventas/cotizaciones/nueva`}
              className="px-6 py-3 bg-cyan-500 text-black font-medium rounded-lg hover:bg-cyan-400 transition-colors"
            >
              Nueva Cotización
            </Link>
            <Link
              href={`/${locale}/catalogo`}
              className="px-6 py-3 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors"
            >
              Ver Catálogo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
