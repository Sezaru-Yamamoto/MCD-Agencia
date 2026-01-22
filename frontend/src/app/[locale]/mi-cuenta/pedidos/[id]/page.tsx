'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { getOrderById } from '@/lib/api/orders';
import { Card, Badge, Button, LoadingPage, Breadcrumb } from '@/components/ui';
import { formatPrice, formatDate, formatDateTime, cn } from '@/lib/utils';

const STATUS_ICONS: Record<string, typeof CheckCircleIcon> = {
  draft: ClockIcon,
  pending_payment: ClockIcon,
  paid: CheckCircleIcon,
  partially_paid: CheckCircleIcon,
  in_production: ClockIcon,
  ready: CheckCircleIcon,
  in_delivery: TruckIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon,
  refunded: XCircleIcon,
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
  });

  if (isLoading) {
    return <LoadingPage message="Cargando pedido..." />;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-4">Pedido no encontrado</h2>
        <Link href="/mi-cuenta/pedidos">
          <Button>Volver a mis pedidos</Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status] || ClockIcon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mi Cuenta', href: '/mi-cuenta' },
          { label: 'Pedidos', href: '/mi-cuenta/pedidos' },
          { label: `#${order.order_number}` },
        ]}
        showHome={false}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Pedido #{order.order_number}</h2>
          <p className="text-neutral-400">Realizado el {formatDate(order.created_at)}</p>
        </div>
        <Badge
          variant={
            order.status === 'completed'
              ? 'success'
              : order.status === 'cancelled'
              ? 'error'
              : order.status === 'paid' || order.status === 'in_production'
              ? 'info'
              : 'warning'
          }
          size="md"
        >
          <StatusIcon className="h-4 w-4 mr-1" />
          {order.status_display}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Productos</h3>
            <div className="divide-y divide-neutral-800">
              {order.lines.map((line) => (
                <div key={line.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                      {line.sku}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{line.name}</p>
                    <p className="text-sm text-neutral-400">{line.variant_name}</p>
                    <p className="text-sm text-neutral-400">SKU: {line.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{formatPrice(line.unit_price)}</p>
                    <p className="text-sm text-neutral-400">× {line.quantity}</p>
                    <p className="text-cyan-400 font-medium">{formatPrice(line.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Historial</h3>
            <div className="space-y-4">
              {order.status_history.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="relative">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        index === 0 ? 'bg-cyan-500' : 'bg-neutral-700'
                      )}
                    />
                    {index < order.status_history.length - 1 && (
                      <div className="absolute top-3 left-1.5 w-px h-full -translate-x-1/2 bg-neutral-700" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-white font-medium">
                      {history.to_status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {formatDateTime(history.created_at)}
                      {history.changed_by_name && ` por ${history.changed_by_name}`}
                    </p>
                    {history.notes && (
                      <p className="text-sm text-neutral-500 mt-1">{history.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Resumen</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>IVA ({order.tax_rate}%)</span>
                <span>{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-neutral-800">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>

              {!order.is_fully_paid && (
                <>
                  <div className="flex justify-between text-green-500 pt-2">
                    <span>Pagado</span>
                    <span>{formatPrice(order.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-yellow-500">
                    <span>Saldo pendiente</span>
                    <span>{formatPrice(order.balance_due)}</span>
                  </div>
                </>
              )}
            </div>

            {order.payment_method && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <p className="text-sm text-neutral-400">Método de pago</p>
                <p className="text-white capitalize">{order.payment_method}</p>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Dirección de envío</h3>
            <p className="text-neutral-300 whitespace-pre-line">{order.shipping_address}</p>
          </Card>

          {order.tracking_number && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Seguimiento</h3>
              <p className="text-neutral-400 mb-2">Número de guía</p>
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

          {order.notes && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Notas</h3>
              <p className="text-neutral-400">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
