'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage, Pagination } from '@/components/ui';
import { SERVICE_LABELS, type ServiceId } from '@/lib/service-ids';
import {
  getAdminQuoteRequests,
  getAdminChangeRequests,
  QuoteRequest,
  QuoteRequestStatus,
  QuoteChangeRequest,
  ChangeRequestStatus,
  UrgencyLevel,
} from '@/lib/api/quotes';
import { PaginatedResponse } from '@/lib/api/catalog';

// Tab types
type TabType = 'quote-requests' | 'change-requests';

const statusColors: Record<QuoteRequestStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  in_review: 'bg-purple-500/20 text-purple-400',
  quoted: 'bg-cmyk-cyan/20 text-cmyk-cyan',
  accepted: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-neutral-500/20 text-neutral-400',
};

const statusLabels: Record<QuoteRequestStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  in_review: 'En Revisión',
  quoted: 'Cotizada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const statusIcons: Record<QuoteRequestStatus, React.ComponentType<{ className?: string }>> = {
  pending: ClockIcon,
  assigned: EyeIcon,
  in_review: ArrowPathIcon,
  quoted: DocumentPlusIcon,
  accepted: CheckCircleIcon,
  rejected: XCircleIcon,
  cancelled: XCircleIcon,
};

const changeRequestStatusColors: Record<ChangeRequestStatus, string> = {
  pending: 'bg-orange-500/20 text-orange-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

const changeRequestStatusLabels: Record<ChangeRequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const urgencyColors: Record<UrgencyLevel, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  normal: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const urgencyLabels: Record<UrgencyLevel, string> = {
  high: 'Urgente',
  medium: 'Media',
  normal: 'Normal',
};

export default function QuoteRequestsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('quote-requests');

  // Quote requests state
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [requestsPagination, setRequestsPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
  });

  // Change requests state
  const [changeRequests, setChangeRequests] = useState<QuoteChangeRequest[]>([]);
  const [changeRequestsPagination, setChangeRequestsPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [changeSearchTerm, setChangeSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [changeStatusFilter, setChangeStatusFilter] = useState<string>('all');

  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);
  const isAdmin = user?.role?.name === 'admin';
  const isSales = user?.role?.name === 'sales';

  // Fetch quote requests
  const fetchRequests = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const filters: Record<string, unknown> = { page };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (urgencyFilter !== 'all') {
        filters.urgency = urgencyFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }

      const response: PaginatedResponse<QuoteRequest> = await getAdminQuoteRequests(filters as {
        status?: QuoteRequestStatus;
        urgency?: UrgencyLevel;
        search?: string;
        page?: number;
      });

      setRequests(response.results || []);
      setRequestsPagination({
        page,
        totalPages: response.total_pages || Math.ceil((response.count || 0) / 10),
        totalCount: response.count || 0,
      });
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, urgencyFilter, searchTerm]);

  // Fetch change requests
  const fetchChangeRequests = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const filters: Record<string, unknown> = { page };

      if (changeStatusFilter !== 'all') {
        filters.status = changeStatusFilter;
      }
      if (changeSearchTerm) {
        filters.search = changeSearchTerm;
      }

      const response = await getAdminChangeRequests(filters as {
        status?: ChangeRequestStatus;
        search?: string;
        page?: number;
      });

      setChangeRequests(response.results || []);
      setChangeRequestsPagination({
        page,
        totalPages: response.total_pages || Math.ceil((response.count || 0) / 10),
        totalCount: response.count || 0,
      });
    } catch (error) {
      console.error('Error fetching change requests:', error);
      setChangeRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [changeStatusFilter, changeSearchTerm]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas/solicitudes`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  // Fetch data when tab changes
  useEffect(() => {
    if (isAuthenticated && isSalesOrAdmin) {
      if (activeTab === 'quote-requests') {
        fetchRequests(1);
      } else {
        fetchChangeRequests(1);
      }
    }
  }, [isAuthenticated, isSalesOrAdmin, activeTab, fetchRequests, fetchChangeRequests]);

  if (authLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'quote-requests') {
      fetchRequests(1);
    } else {
      fetchChangeRequests(1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Count pending change requests for badge
  const pendingChangeRequestsCount = changeRequests.filter(cr => cr.status === 'pending').length;

  return (
    <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Solicitudes</h1>
            <p className="text-neutral-400">
              Gestiona solicitudes de cotización y cambios
            </p>
          </div>
          <Link href={`/${locale}/ventas/cotizaciones/nueva`}>
            <Button className="mt-4 sm:mt-0" leftIcon={<DocumentPlusIcon className="h-5 w-5" />}>
              Nueva Cotización
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-700 mb-6">
          <button
            onClick={() => setActiveTab('quote-requests')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'quote-requests'
                ? 'text-cmyk-cyan'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5" />
            Solicitudes de Cotización
            {activeTab === 'quote-requests' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cmyk-cyan"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('change-requests')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'change-requests'
                ? 'text-orange-400'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <PencilSquareIcon className="h-5 w-5" />
            Solicitudes de Cambio
            {pendingChangeRequestsCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingChangeRequestsCount}
              </span>
            )}
            {activeTab === 'change-requests' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
            )}
          </button>
        </div>

        {/* Quote Requests Tab */}
        {activeTab === 'quote-requests' && (
          <>
            {/* Filters */}
            <Card className="p-4 mb-6">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar por número, nombre, email o empresa..."
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
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                    }}
                    className="pl-10 pr-8 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan appearance-none cursor-pointer min-w-[160px]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="assigned">Asignada</option>
                    <option value="in_review">En Revisión</option>
                    <option value="quoted">Cotizada</option>
                    <option value="accepted">Aceptada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>

                {/* Urgency Filter */}
                <div className="relative">
                  <ExclamationTriangleIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <select
                    value={urgencyFilter}
                    onChange={(e) => {
                      setUrgencyFilter(e.target.value);
                    }}
                    className="pl-10 pr-8 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan appearance-none cursor-pointer min-w-[140px]"
                  >
                    <option value="all">Toda urgencia</option>
                    <option value="high">Urgente</option>
                    <option value="medium">Media</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                <Button type="submit" variant="outline">
                  Buscar
                </Button>
              </form>
            </Card>

            {/* Requests Table */}
            <Card className="overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cmyk-cyan mx-auto"></div>
                  <p className="mt-4 text-neutral-400">Cargando solicitudes...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-neutral-400">No se encontraron solicitudes</p>
                  {(searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setUrgencyFilter('all');
                      }}
                      className="mt-2 text-cmyk-cyan hover:text-cmyk-cyan/80"
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
                          Solicitud
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Servicio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Urgencia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {requests.map((request) => {
                        const StatusIcon = statusIcons[request.status];
                        return (
                          <tr key={request.id} className="hover:bg-neutral-800/30">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-white font-medium">{request.request_number}</p>
                                {request.is_guest && (
                                  <span className="text-xs text-neutral-500">Invitado</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-white">{request.customer_name}</p>
                                <p className="text-neutral-500 text-sm">{request.customer_email}</p>
                                {request.customer_company && (
                                  <p className="text-neutral-600 text-xs">{request.customer_company}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="max-w-xs">
                                <p className="text-white truncate">
                                  {request.catalog_item_name ||
                                   (request.service_type && SERVICE_LABELS[request.service_type as ServiceId]) ||
                                   request.service_type ||
                                   'No especificado'}
                                </p>
                                {request.quantity && (
                                  <p className="text-neutral-500 text-sm">
                                    Cantidad: {request.quantity}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {statusLabels[request.status]}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${urgencyColors[request.urgency]}`}>
                                {urgencyLabels[request.urgency]}
                              </span>
                              {request.days_until_required !== undefined && request.days_until_required !== null && (
                                <p className="text-neutral-500 text-xs mt-1">
                                  {request.days_until_required > 0
                                    ? `${request.days_until_required} días`
                                    : request.days_until_required === 0
                                    ? 'Hoy'
                                    : 'Vencido'}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-neutral-400 text-sm">
                              {formatDate(request.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/${locale}/ventas/solicitudes/${request.id}`}
                                  className="p-2 text-neutral-400 hover:text-white transition-colors"
                                  title="Ver detalle"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </Link>
                                {['pending', 'assigned', 'in_review'].includes(request.status) && (
                                  isAdmin || request.assigned_to === user?.id || request.urgency === 'high'
                                ) && (
                                  <Link
                                    href={`/${locale}/ventas/cotizaciones/nueva?solicitud=${request.id}`}
                                    className="p-2 text-cmyk-cyan hover:text-cmyk-cyan/80 transition-colors"
                                    title="Crear cotización"
                                  >
                                    <DocumentPlusIcon className="h-5 w-5" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Pagination */}
            {!isLoading && requests.length > 0 && requestsPagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={requestsPagination.page}
                  totalPages={requestsPagination.totalPages}
                  onPageChange={(page) => fetchRequests(page)}
                />
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Total Solicitudes</p>
                <p className="text-2xl font-bold text-white">{requestsPagination.totalCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Urgentes</p>
                <p className="text-2xl font-bold text-red-400">
                  {requests.filter(r => r.urgency === 'high').length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Cotizadas</p>
                <p className="text-2xl font-bold text-cmyk-cyan">
                  {requests.filter(r => r.status === 'quoted').length}
                </p>
              </Card>
            </div>
          </>
        )}

        {/* Change Requests Tab */}
        {activeTab === 'change-requests' && (
          <>
            {/* Filters */}
            <Card className="p-4 mb-6">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar por número de cotización, nombre o email..."
                    value={changeSearchTerm}
                    onChange={(e) => setChangeSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-orange-400"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <select
                    value={changeStatusFilter}
                    onChange={(e) => {
                      setChangeStatusFilter(e.target.value);
                    }}
                    className="pl-10 pr-8 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-orange-400 appearance-none cursor-pointer min-w-[160px]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>

                <Button type="submit" variant="outline">
                  Buscar
                </Button>
              </form>
            </Card>

            {/* Change Requests Table */}
            <Card className="overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-400 mx-auto"></div>
                  <p className="mt-4 text-neutral-400">Cargando solicitudes de cambio...</p>
                </div>
              ) : changeRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <PencilSquareIcon className="h-12 w-12 mx-auto mb-4 text-neutral-600" />
                  <p className="text-neutral-400">No hay solicitudes de cambio</p>
                  {(changeStatusFilter !== 'all' || changeSearchTerm) && (
                    <button
                      onClick={() => {
                        setChangeStatusFilter('all');
                        setChangeSearchTerm('');
                      }}
                      className="mt-2 text-orange-400 hover:text-orange-300"
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
                          Cotización
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Comentarios
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {changeRequests.map((changeRequest) => (
                        <tr key={changeRequest.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-white font-medium">{changeRequest.quote_number}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-white">{changeRequest.customer_name}</p>
                              <p className="text-neutral-500 text-sm">{changeRequest.customer_email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-neutral-300 text-sm max-w-xs truncate">
                              {changeRequest.customer_comments || 'Sin comentarios'}
                            </p>
                            {changeRequest.changes_summary && (
                              <div className="text-neutral-500 text-xs mt-1">
                                {changeRequest.changes_summary.modified > 0 && (
                                  <span className="mr-2">{changeRequest.changes_summary.modified} modificadas</span>
                                )}
                                {changeRequest.changes_summary.deleted > 0 && (
                                  <span className="mr-2">{changeRequest.changes_summary.deleted} eliminadas</span>
                                )}
                                {changeRequest.changes_summary.added > 0 && (
                                  <span>{changeRequest.changes_summary.added} nuevas</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${changeRequestStatusColors[changeRequest.status]}`}>
                              {changeRequest.status === 'pending' && <ClockIcon className="h-3.5 w-3.5" />}
                              {changeRequest.status === 'approved' && <CheckCircleIcon className="h-3.5 w-3.5" />}
                              {changeRequest.status === 'rejected' && <XCircleIcon className="h-3.5 w-3.5" />}
                              {changeRequestStatusLabels[changeRequest.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-neutral-400 text-sm">
                            {formatDate(changeRequest.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/${locale}/ventas/cotizaciones/${changeRequest.quote}/cambios/${changeRequest.id}`}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  changeRequest.status === 'pending'
                                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                                }`}
                              >
                                {changeRequest.status === 'pending' ? 'Revisar' : 'Ver'}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Pagination */}
            {!isLoading && changeRequests.length > 0 && changeRequestsPagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={changeRequestsPagination.page}
                  totalPages={changeRequestsPagination.totalPages}
                  onPageChange={(page) => fetchChangeRequests(page)}
                />
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Total Solicitudes</p>
                <p className="text-2xl font-bold text-white">{changeRequestsPagination.totalCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-orange-400">
                  {changeRequests.filter(cr => cr.status === 'pending').length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-neutral-400 text-sm">Aprobadas</p>
                <p className="text-2xl font-bold text-green-400">
                  {changeRequests.filter(cr => cr.status === 'approved').length}
                </p>
              </Card>
            </div>
          </>
        )}
    </div>
  );
}
