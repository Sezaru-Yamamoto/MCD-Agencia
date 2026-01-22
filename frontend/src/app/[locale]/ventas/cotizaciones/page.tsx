'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage } from '@/components/ui';

// Types
interface Quote {
  id: string;
  quote_number: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  total: number;
  created_at: string;
  valid_until: string;
  items_count: number;
}

// Mock data - Replace with API call
const mockQuotes: Quote[] = [
  {
    id: '1',
    quote_number: 'COT-2024-001',
    client: { id: '1', name: 'Juan Pérez', email: 'juan@example.com' },
    status: 'sent',
    total: 15000,
    created_at: '2024-01-15T10:00:00Z',
    valid_until: '2024-02-15T10:00:00Z',
    items_count: 3,
  },
  {
    id: '2',
    quote_number: 'COT-2024-002',
    client: { id: '2', name: 'María García', email: 'maria@example.com' },
    status: 'accepted',
    total: 8500,
    created_at: '2024-01-14T14:30:00Z',
    valid_until: '2024-02-14T14:30:00Z',
    items_count: 2,
  },
  {
    id: '3',
    quote_number: 'COT-2024-003',
    client: { id: '3', name: 'Carlos López', email: 'carlos@example.com' },
    status: 'draft',
    total: 22000,
    created_at: '2024-01-16T09:15:00Z',
    valid_until: '2024-02-16T09:15:00Z',
    items_count: 5,
  },
  {
    id: '4',
    quote_number: 'COT-2024-004',
    client: { id: '4', name: 'Ana Martínez', email: 'ana@example.com' },
    status: 'rejected',
    total: 5200,
    created_at: '2024-01-10T16:45:00Z',
    valid_until: '2024-02-10T16:45:00Z',
    items_count: 1,
  },
];

const statusColors: Record<Quote['status'], string> = {
  draft: 'bg-neutral-500/20 text-neutral-400',
  sent: 'bg-blue-500/20 text-blue-400',
  viewed: 'bg-purple-500/20 text-purple-400',
  accepted: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  expired: 'bg-yellow-500/20 text-yellow-400',
};

const statusLabels: Record<Quote['status'], string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
};

export default function QuotesListPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isSalesOrAdmin = user?.role?.name && ['superadmin', 'admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas/cotizaciones`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  useEffect(() => {
    // Simulate API call
    const fetchQuotes = async () => {
      setIsLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setQuotes(mockQuotes);
      setIsLoading(false);
    };

    if (isAuthenticated && isSalesOrAdmin) {
      fetchQuotes();
    }
  }, [isAuthenticated, isSalesOrAdmin]);

  if (authLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch =
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

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

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cotizaciones</h1>
            <p className="text-neutral-400">
              Gestiona las cotizaciones de tus clientes
            </p>
          </div>
          <Link href={`/${locale}/ventas/cotizaciones/nueva`}>
            <Button className="mt-4 sm:mt-0" leftIcon={<PlusIcon className="h-5 w-5" />}>
              Nueva Cotización
            </Button>
          </Link>
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
                className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="sent">Enviada</option>
                <option value="viewed">Vista</option>
                <option value="accepted">Aceptada</option>
                <option value="rejected">Rechazada</option>
                <option value="expired">Expirada</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Quotes Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
              <p className="mt-4 text-neutral-400">Cargando cotizaciones...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-neutral-400">No se encontraron cotizaciones</p>
              {searchTerm || statusFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-cyan-400 hover:text-cyan-300"
                >
                  Limpiar filtros
                </button>
              ) : (
                <Link
                  href={`/${locale}/ventas/cotizaciones/nueva`}
                  className="mt-2 text-cyan-400 hover:text-cyan-300 inline-block"
                >
                  Crear primera cotización
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Cotización
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Válida hasta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-neutral-800/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-white font-medium">{quote.quote_number}</p>
                          <p className="text-neutral-500 text-sm">{quote.items_count} productos</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-white">{quote.client.name}</p>
                          <p className="text-neutral-500 text-sm">{quote.client.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[quote.status]}`}>
                          {statusLabels[quote.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white">
                        {formatCurrency(quote.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-400">
                        {formatDate(quote.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-400">
                        {formatDate(quote.valid_until)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Ver detalle"
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            title="Editar"
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            title="Duplicar"
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                          >
                            <DocumentDuplicateIcon className="h-5 w-5" />
                          </button>
                          <button
                            title="Eliminar"
                            className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Total Cotizaciones</p>
            <p className="text-2xl font-bold text-white">{quotes.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Aceptadas</p>
            <p className="text-2xl font-bold text-green-400">
              {quotes.filter(q => q.status === 'accepted').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Pendientes</p>
            <p className="text-2xl font-bold text-blue-400">
              {quotes.filter(q => ['sent', 'viewed'].includes(q.status)).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-neutral-400 text-sm">Valor Total</p>
            <p className="text-2xl font-bold text-cyan-400">
              {formatCurrency(quotes.reduce((sum, q) => sum + q.total, 0))}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
