'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage } from '@/components/ui';

// Types
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  city?: string;
  total_orders: number;
  total_quotes: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
}

// Mock data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '+52 55 1234 5678',
    company: 'Empresa ABC',
    address: 'Av. Reforma 123',
    city: 'Ciudad de México',
    total_orders: 5,
    total_quotes: 8,
    total_spent: 45000,
    last_order_date: '2024-01-15T10:00:00Z',
    created_at: '2023-06-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@example.com',
    phone: '+52 55 8765 4321',
    company: 'Distribuidora XYZ',
    address: 'Calle Principal 456',
    city: 'Guadalajara',
    total_orders: 12,
    total_quotes: 15,
    total_spent: 120000,
    last_order_date: '2024-01-16T14:30:00Z',
    created_at: '2023-03-10T09:00:00Z',
  },
  {
    id: '3',
    name: 'Carlos López',
    email: 'carlos@example.com',
    phone: '+52 81 2345 6789',
    address: 'Av. Constitución 789',
    city: 'Monterrey',
    total_orders: 3,
    total_quotes: 5,
    total_spent: 28000,
    last_order_date: '2024-01-10T16:45:00Z',
    created_at: '2023-09-20T14:00:00Z',
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana@example.com',
    phone: '+52 33 9876 5432',
    company: 'Publicidad Creativa',
    address: 'Blvd. Independencia 321',
    city: 'Querétaro',
    total_orders: 8,
    total_quotes: 10,
    total_spent: 85000,
    last_order_date: '2024-01-14T11:20:00Z',
    created_at: '2023-04-05T08:30:00Z',
  },
  {
    id: '5',
    name: 'Roberto Sánchez',
    email: 'roberto@example.com',
    phone: '+52 55 5555 1234',
    company: 'Eventos del Valle',
    address: 'Calle Morelos 567',
    city: 'Puebla',
    total_orders: 2,
    total_quotes: 4,
    total_spent: 15000,
    created_at: '2023-11-12T10:45:00Z',
  },
];

export default function ClientsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isSalesOrAdmin = user?.role?.name && ['superadmin', 'admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas/clientes`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setClients(mockClients);
      setIsLoading(false);
    };

    if (isAuthenticated && isSalesOrAdmin) {
      fetchClients();
    }
  }, [isAuthenticated, isSalesOrAdmin]);

  if (authLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      (client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    return matchesSearch;
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

  // Stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.total_orders > 0).length;
  const totalRevenue = clients.reduce((sum, c) => sum + c.total_spent, 0);
  const avgOrderValue = totalRevenue / clients.reduce((sum, c) => sum + c.total_orders, 0) || 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Clientes</h1>
            <p className="text-neutral-400">
              Gestiona tus clientes y su información
            </p>
          </div>
          <Button className="mt-4 sm:mt-0" leftIcon={<PlusIcon className="h-5 w-5" />}>
            Nuevo Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Total Clientes</p>
            <p className="text-2xl font-bold text-white">{totalClients}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Clientes Activos</p>
            <p className="text-2xl font-bold text-green-400">{activeClients}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Ingresos Totales</p>
            <p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalRevenue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Ticket Promedio</p>
            <p className="text-2xl font-bold text-purple-400">{formatCurrency(avgOrderValue)}</p>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </Card>

        {/* Clients Grid */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-neutral-400">Cargando clientes...</p>
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-neutral-400">No se encontraron clientes</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-cyan-400 hover:text-cyan-300"
              >
                Limpiar búsqueda
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="p-6 hover:border-cyan-500/50 transition-colors">
                {/* Client Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{client.name}</h3>
                    {client.company && (
                      <p className="text-neutral-400 text-sm">{client.company}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      title="Ver detalle"
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      title="Editar"
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <EnvelopeIcon className="h-4 w-4 text-neutral-500" />
                    <span className="text-neutral-300">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <PhoneIcon className="h-4 w-4 text-neutral-500" />
                    <span className="text-neutral-300">{client.phone}</span>
                  </div>
                  {client.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPinIcon className="h-4 w-4 text-neutral-500" />
                      <span className="text-neutral-300">{client.city}</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-neutral-800 my-4"></div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold text-white">{client.total_orders}</p>
                    <p className="text-xs text-neutral-500">Pedidos</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{client.total_quotes}</p>
                    <p className="text-xs text-neutral-500">Cotizaciones</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-cyan-400">{formatCurrency(client.total_spent)}</p>
                    <p className="text-xs text-neutral-500">Total</p>
                  </div>
                </div>

                {/* Last Order */}
                {client.last_order_date && (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <p className="text-xs text-neutral-500">
                      Último pedido: {formatDate(client.last_order_date)}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/${locale}/ventas/cotizaciones/nueva?cliente=${client.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full text-sm">
                      Nueva Cotización
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
