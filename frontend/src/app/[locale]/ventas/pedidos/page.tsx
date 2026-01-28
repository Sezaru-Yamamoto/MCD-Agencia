'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TruckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { Card, LoadingPage } from '@/components/ui';

// Types
interface Order {
  id: string;
  order_number: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
  total: number;
  created_at: string;
  estimated_delivery?: string;
  items_count: number;
}

// Mock data
const mockOrders: Order[] = [
  {
    id: '1',
    order_number: 'ORD-2024-001',
    client: { id: '1', name: 'Juan Pérez', email: 'juan@example.com' },
    status: 'in_production',
    payment_status: 'paid',
    total: 15000,
    created_at: '2024-01-15T10:00:00Z',
    estimated_delivery: '2024-01-22T10:00:00Z',
    items_count: 3,
  },
  {
    id: '2',
    order_number: 'ORD-2024-002',
    client: { id: '2', name: 'María García', email: 'maria@example.com' },
    status: 'pending',
    payment_status: 'pending',
    total: 8500,
    created_at: '2024-01-16T14:30:00Z',
    items_count: 2,
  },
  {
    id: '3',
    order_number: 'ORD-2024-003',
    client: { id: '3', name: 'Carlos López', email: 'carlos@example.com' },
    status: 'ready',
    payment_status: 'paid',
    total: 22000,
    created_at: '2024-01-14T09:15:00Z',
    estimated_delivery: '2024-01-18T09:15:00Z',
    items_count: 5,
  },
  {
    id: '4',
    order_number: 'ORD-2024-004',
    client: { id: '4', name: 'Ana Martínez', email: 'ana@example.com' },
    status: 'delivered',
    payment_status: 'paid',
    total: 5200,
    created_at: '2024-01-10T16:45:00Z',
    items_count: 1,
  },
  {
    id: '5',
    order_number: 'ORD-2024-005',
    client: { id: '2', name: 'María García', email: 'maria@example.com' },
    status: 'shipped',
    payment_status: 'paid',
    total: 12300,
    created_at: '2024-01-12T11:20:00Z',
    estimated_delivery: '2024-01-17T11:20:00Z',
    items_count: 4,
  },
];

const statusColors: Record<Order['status'], string> = {
  pending: 'bg-cmyk-yellow/20 text-cmyk-yellow',
  confirmed: 'bg-cmyk-cyan/20 text-cmyk-cyan',
  in_production: 'bg-purple-500/20 text-purple-400',
  ready: 'bg-cmyk-cyan/20 text-cmyk-cyan',
  shipped: 'bg-indigo-500/20 text-indigo-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const statusLabels: Record<Order['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_production: 'En Producción',
  ready: 'Listo',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const paymentStatusColors: Record<Order['payment_status'], string> = {
  pending: 'text-yellow-400',
  partial: 'text-orange-400',
  paid: 'text-green-400',
  refunded: 'text-red-400',
};

const paymentStatusLabels: Record<Order['payment_status'], string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  refunded: 'Reembolsado',
};

export default function OrdersListPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas/pedidos`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrders(mockOrders);
      setIsLoading(false);
    };

    if (isAuthenticated && isSalesOrAdmin) {
      fetchOrders();
    }
  }, [isAuthenticated, isSalesOrAdmin]);

  if (authLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Order stats
  const pendingOrders = orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length;
  const inProductionOrders = orders.filter(o => o.status === 'in_production').length;
  const readyOrders = orders.filter(o => o.status === 'ready').length;
  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pedidos</h1>
          <p className="text-neutral-400">
            Gestiona los pedidos de tus clientes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-400">{pendingOrders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">En Producción</p>
            <p className="text-2xl font-bold text-purple-400">{inProductionOrders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Listos para Envío</p>
            <p className="text-2xl font-bold text-cyan-400">{readyOrders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Ingresos (Pagados)</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por número, cliente o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan appearance-none cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_production">En Producción</option>
                <option value="ready">Listo</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cmyk-cyan mx-auto"></div>
              <p className="mt-4 text-neutral-400">Cargando pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-neutral-400">No se encontraron pedidos</p>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-cyan-400 hover:text-cyan-300"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Entrega Est.
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-800/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-white font-medium">{order.order_number}</p>
                          <p className="text-neutral-500 text-sm">{order.items_count} productos</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-white">{order.client.name}</p>
                          <p className="text-neutral-500 text-sm">{order.client.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${paymentStatusColors[order.payment_status]}`}>
                          {paymentStatusLabels[order.payment_status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-400">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-400">
                        {order.estimated_delivery ? formatDate(order.estimated_delivery) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Ver detalle"
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {order.status === 'ready' && (
                            <button
                              title="Marcar como enviado"
                              className="p-1 text-neutral-400 hover:text-indigo-400 transition-colors"
                            >
                              <TruckIcon className="h-5 w-5" />
                            </button>
                          )}
                          {order.status === 'shipped' && (
                            <button
                              title="Marcar como entregado"
                              className="p-1 text-neutral-400 hover:text-green-400 transition-colors"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
