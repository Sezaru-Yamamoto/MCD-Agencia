'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage } from '@/components/ui';
import { getStaffOrderById, updateOrderStatus, Order } from '@/lib/api/orders';

const statusColors: Record<string, string> = {
  draft: 'bg-neutral-500/20 text-neutral-400 border-neutral-500',
  pending_payment: 'bg-cmyk-yellow/20 text-cmyk-yellow border-cmyk-yellow',
  paid: 'bg-green-500/20 text-green-400 border-green-500',
  partially_paid: 'bg-orange-500/20 text-orange-400 border-orange-500',
  in_production: 'bg-purple-500/20 text-purple-400 border-purple-500',
  ready: 'bg-cmyk-cyan/20 text-cmyk-cyan border-cmyk-cyan',
  in_delivery: 'bg-indigo-500/20 text-indigo-400 border-indigo-500',
  completed: 'bg-green-600/20 text-green-400 border-green-600',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500',
  refunded: 'bg-red-600/20 text-red-300 border-red-600',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  pending_payment: 'Pendiente de Pago',
  paid: 'Pagado',
  partially_paid: 'Pago Parcial',
  in_production: 'En Producción',
  ready: 'Listo',
  in_delivery: 'En Camino',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: ClockIcon,
  pending_payment: CurrencyDollarIcon,
  paid: CheckCircleIcon,
  partially_paid: CurrencyDollarIcon,
  in_production: ArrowPathIcon,
  ready: CheckCircleIcon,
  in_delivery: TruckIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon,
  refunded: XCircleIcon,
};

// Which statuses can the staff move this order to?
const nextStatusOptions: Record<string, { value: string; label: string }[]> = {
  pending_payment: [
    { value: 'paid', label: 'Marcar como Pagado' },
    { value: 'partially_paid', label: 'Pago Parcial' },
    { value: 'cancelled', label: 'Cancelar Pedido' },
  ],
  paid: [
    { value: 'in_production', label: 'Enviar a Producción' },
  ],
  partially_paid: [
    { value: 'paid', label: 'Marcar como Pagado Total' },
    { value: 'in_production', label: 'Enviar a Producción' },
    { value: 'cancelled', label: 'Cancelar Pedido' },
  ],
  in_production: [
    { value: 'ready', label: 'Marcar como Listo' },
    { value: 'cancelled', label: 'Cancelar Pedido' },
  ],
  ready: [
    { value: 'in_delivery', label: 'Marcar En Camino' },
    { value: 'completed', label: 'Marcar Completado' },
  ],
  in_delivery: [
    { value: 'completed', label: 'Marcar Completado' },
  ],
  completed: [
    { value: 'refunded', label: 'Reembolsar' },
  ],
};

export default function StaffOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');

  const orderId = params.id as string;
  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas/pedidos/${orderId}`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale, orderId]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !isAuthenticated || !isSalesOrAdmin) return;

      setIsLoading(true);
      try {
        const data = await getStaffOrderById(orderId);
        setOrder(data);
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Error al cargar el pedido');
        router.push(`/${locale}/ventas/pedidos`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, isAuthenticated, isSalesOrAdmin, router, locale]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    const statusLabel = statusLabels[newStatus] || newStatus;
    if (!confirm(`¿Cambiar estado a "${statusLabel}"?`)) return;

    setIsUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, newStatus, statusNotes || undefined);
      setOrder(updated);
      setStatusNotes('');
      toast.success(`Estado actualizado a "${statusLabel}"`);
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      const errMsg = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Error al actualizar el estado';
      toast.error(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(amount) || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando pedido..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin || !order) {
    return null;
  }

  const StatusIcon = statusIcons[order.status] || ClockIcon;
  const availableTransitions = nextStatusOptions[order.status] || [];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/ventas/pedidos`}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Pedido #{order.order_number}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500'}`}>
                <StatusIcon className="h-4 w-4" />
                {statusLabels[order.status] || order.status_display}
              </span>
            </div>
            <p className="text-neutral-400 mt-1">
              Creado el {formatDate(order.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Conceptos del Pedido</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-neutral-500 text-sm border-b border-neutral-700">
                    <th className="pb-3 pr-4">Producto</th>
                    <th className="pb-3 pr-4">SKU</th>
                    <th className="pb-3 pr-4 text-right">Cant.</th>
                    <th className="pb-3 pr-4 text-right">P. Unit.</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {order.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 pr-4">
                        <p className="text-white font-medium">{line.name}</p>
                        {line.variant_name && (
                          <p className="text-neutral-500 text-sm">{line.variant_name}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-neutral-400 text-sm font-mono">{line.sku}</td>
                      <td className="py-3 pr-4 text-right text-white">{line.quantity}</td>
                      <td className="py-3 pr-4 text-right text-white">{formatCurrency(line.unit_price)}</td>
                      <td className="py-3 text-right text-white font-medium">{formatCurrency(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-neutral-700 space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>IVA ({Number(order.tax_rate) * 100}%)</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-neutral-700">
                <span>Total</span>
                <span className="text-cmyk-cyan">{formatCurrency(order.total)}</span>
              </div>
              {!order.is_fully_paid && (
                <>
                  <div className="flex justify-between text-green-400 pt-2">
                    <span>Pagado</span>
                    <span>{formatCurrency(order.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-cmyk-yellow font-medium">
                    <span>Saldo pendiente</span>
                    <span>{formatCurrency(order.balance_due)}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Status History */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Historial de Estados</h2>
            {order.status_history && order.status_history.length > 0 ? (
              <div className="space-y-4">
                {order.status_history.map((history, index) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="relative">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 ${
                          index === 0 ? 'bg-cmyk-cyan' : 'bg-neutral-700'
                        }`}
                      />
                      {index < order.status_history.length - 1 && (
                        <div className="absolute top-4 left-1.5 w-px h-full -translate-x-1/2 bg-neutral-700" />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[history.to_status] || 'bg-neutral-500/20 text-neutral-400'}`}>
                          {statusLabels[history.to_status] || history.to_status}
                        </span>
                        {history.from_status && (
                          <span className="text-neutral-600 text-xs">
                            ← {statusLabels[history.from_status] || history.from_status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 mt-1">
                        {formatDateTime(history.created_at)}
                        {history.changed_by_name && ` • ${history.changed_by_name}`}
                      </p>
                      {history.notes && (
                        <p className="text-sm text-neutral-500 mt-1 italic">&ldquo;{history.notes}&rdquo;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500">No hay historial de estados aún.</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {availableTransitions.length > 0 && (
            <Card className="p-6 border-cmyk-cyan/30">
              <h2 className="text-lg font-semibold text-white mb-4">Cambiar Estado</h2>
              <div className="space-y-3">
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Notas del cambio (opcional)..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 text-sm focus:border-cmyk-cyan focus:outline-none resize-none"
                  rows={2}
                />
                <div className="space-y-2">
                  {availableTransitions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      disabled={isUpdating}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        option.value === 'cancelled' || option.value === 'refunded'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                          : 'bg-cmyk-cyan/10 text-cmyk-cyan hover:bg-cmyk-cyan/20 border border-cmyk-cyan/30'
                      }`}
                    >
                      {isUpdating ? 'Actualizando...' : option.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Payment Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pago</h2>
            <div className="space-y-3">
              <div>
                <p className="text-neutral-500 text-sm">Método de pago</p>
                <p className="text-white capitalize">{order.payment_method || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-sm">Estado de pago</p>
                <p className={`font-medium ${order.is_fully_paid ? 'text-green-400' : 'text-cmyk-yellow'}`}>
                  {order.is_fully_paid ? 'Pagado completamente' : 'Pendiente'}
                </p>
              </div>
              {order.paid_at && (
                <div>
                  <p className="text-neutral-500 text-sm">Fecha de pago</p>
                  <p className="text-white">{formatDate(order.paid_at)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Shipping */}
          {order.shipping_address && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Dirección de Envío</h2>
              <p className="text-neutral-300 whitespace-pre-line">{order.shipping_address}</p>
            </Card>
          )}

          {/* Tracking */}
          {order.tracking_number && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Seguimiento</h2>
              <p className="text-neutral-400 text-sm">Número de guía</p>
              <p className="text-white font-mono">{order.tracking_number}</p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3"
                >
                  <Button variant="outline" size="sm">
                    Rastrear envío
                  </Button>
                </a>
              )}
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card className="p-6 border-yellow-500/30">
              <h2 className="text-lg font-semibold text-yellow-400 mb-4">Notas</h2>
              <p className="text-neutral-300 whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}

          {/* Timestamps */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Fechas</h2>
            <div className="space-y-3">
              <div>
                <p className="text-neutral-500 text-sm">Creado</p>
                <p className="text-white">{formatDateTime(order.created_at)}</p>
              </div>
              {order.paid_at && (
                <div>
                  <p className="text-neutral-500 text-sm">Pagado</p>
                  <p className="text-green-400">{formatDateTime(order.paid_at)}</p>
                </div>
              )}
              {order.completed_at && (
                <div>
                  <p className="text-neutral-500 text-sm">Completado</p>
                  <p className="text-green-400">{formatDateTime(order.completed_at)}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
