'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

import { Card, Button, LoadingPage, Badge } from '@/components/ui';
import { getAdminOrderById, updateOrderStatus, updateOrderTracking, AdminOrder } from '@/lib/api/admin';
import { formatPrice, formatDate, formatDateTime, cn } from '@/lib/utils';

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

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [statusNotes, setStatusNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => getAdminOrderById(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ newStatus, notes }: { newStatus: string; notes?: string }) =>
      updateOrderStatus(orderId, newStatus, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      setStatusNotes('');
      toast.success('Estado actualizado');
    },
    onError: (error: unknown) => {
      const errMsg = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Error al actualizar el estado';
      toast.error(errMsg);
    },
  });

  const trackingMutation = useMutation({
    mutationFn: () => updateOrderTracking(orderId, trackingNumber, trackingUrl || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      toast.success('Datos de seguimiento actualizados');
    },
    onError: () => {
      toast.error('Error al actualizar el seguimiento');
    },
  });

  const handleStatusChange = (newStatus: string) => {
    const label = statusLabels[newStatus] || newStatus;
    if (!confirm(`¿Cambiar estado a "${label}"?`)) return;
    statusMutation.mutate({ newStatus, notes: statusNotes || undefined });
  };

  if (isLoading) {
    return <LoadingPage message="Cargando pedido..." />;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-4">Pedido no encontrado</h2>
        <Link href="/admin/pedidos">
          <Button>Volver a pedidos</Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status] || ClockIcon;
  const availableTransitions = nextStatusOptions[order.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/pedidos"
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Pedido #{order.order_number}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status] || ''}`}>
                <StatusIcon className="h-4 w-4" />
                {statusLabels[order.status] || order.status_display}
              </span>
            </div>
            <p className="text-neutral-400 mt-1">
              Creado el {formatDate(order.created_at)}
              {order.customer && ` • Cliente: ${order.customer.full_name}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          {order.customer && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-neutral-500 text-sm">Nombre</p>
                  <p className="text-white font-medium">{order.customer.full_name}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-sm">Email</p>
                  <p className="text-white">{order.customer.email}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Line Items */}
          <Card>
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
                      <td className="py-3 pr-4 text-right text-white">{formatPrice(line.unit_price)}</td>
                      <td className="py-3 text-right text-white font-medium">{formatPrice(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-neutral-700 space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>IVA</span>
                <span>{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-neutral-700">
                <span>Total</span>
                <span className="text-cmyk-cyan">{formatPrice(order.total)}</span>
              </div>
              {!order.is_fully_paid && (
                <>
                  <div className="flex justify-between text-green-400 pt-2">
                    <span>Pagado</span>
                    <span>{formatPrice(order.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-cmyk-yellow font-medium">
                    <span>Saldo pendiente</span>
                    <span>{formatPrice(order.balance_due)}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Status History */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Historial de Estados</h2>
            {order.status_history && order.status_history.length > 0 ? (
              <div className="space-y-4">
                {order.status_history.map((history, index) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="relative">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full mt-1',
                          index === 0 ? 'bg-cmyk-cyan' : 'bg-neutral-700'
                        )}
                      />
                      {index < order.status_history.length - 1 && (
                        <div className="absolute top-4 left-1.5 w-px h-full -translate-x-1/2 bg-neutral-700" />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          history.to_status === 'completed' ? 'success'
                          : history.to_status === 'cancelled' ? 'error'
                          : 'info'
                        }>
                          {statusLabels[history.to_status] || history.to_status}
                        </Badge>
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
            <Card className="border-cmyk-cyan/30">
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
                      disabled={statusMutation.isPending}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        option.value === 'cancelled' || option.value === 'refunded'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                          : 'bg-cmyk-cyan/10 text-cmyk-cyan hover:bg-cmyk-cyan/20 border border-cmyk-cyan/30'
                      }`}
                    >
                      {statusMutation.isPending ? 'Actualizando...' : option.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
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

          {/* Tracking */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Seguimiento</h2>
            <div className="space-y-3">
              <div>
                <label className="text-neutral-500 text-sm block mb-1">Número de guía</label>
                <input
                  type="text"
                  value={trackingNumber || order.tracking_number || ''}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Ej: 1Z999AA10123456784"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 text-sm focus:border-cmyk-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="text-neutral-500 text-sm block mb-1">URL de rastreo</label>
                <input
                  type="text"
                  value={trackingUrl || order.tracking_url || ''}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 text-sm focus:border-cmyk-cyan focus:outline-none"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => trackingMutation.mutate()}
                disabled={trackingMutation.isPending || !trackingNumber}
              >
                {trackingMutation.isPending ? 'Guardando...' : 'Guardar seguimiento'}
              </Button>
            </div>
          </Card>

          {/* Shipping */}
          {order.shipping_address && (
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Dirección de Envío</h2>
              <p className="text-neutral-300 whitespace-pre-line">{order.shipping_address}</p>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card className="border-yellow-500/30">
              <h2 className="text-lg font-semibold text-yellow-400 mb-4">Notas</h2>
              <p className="text-neutral-300 whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
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
