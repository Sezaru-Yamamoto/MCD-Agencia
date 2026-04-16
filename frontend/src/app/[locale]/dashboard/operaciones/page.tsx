'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { Card, LoadingPage } from '@/components/ui';
import { getWorkflowOverview, type WorkflowItem } from '@/lib/api/admin';
import { getStaffOrders, type OrderListItem } from '@/lib/api/orders';
import { getAdminQuoteRequests, getAdminQuotes, type Quote, type QuoteRequest } from '@/lib/api/quotes';
import { getPaymentMethodLabel, requiresManualPayment } from '@/lib/workflow';

const blockConfig: Record<string, {
  title: string;
  subtitle: string;
  accent: string;
  empty: string;
  icon: ComponentType<{ className?: string }>;
}> = {
  assigned: {
    title: 'Asignadas',
    subtitle: 'Solicitudes y cotizaciones activas',
    accent: 'border-blue-500/30',
    empty: 'No hay solicitudes asignadas.',
    icon: UserGroupIcon,
  },
  to_pay: {
    title: 'Por validar',
    subtitle: 'Pedidos manuales pendientes',
    accent: 'border-amber-500/30',
    empty: 'No hay pagos manuales pendientes.',
    icon: ExclamationTriangleIcon,
  },
  in_production: {
    title: 'En proceso',
    subtitle: 'Trabajo activo en producción',
    accent: 'border-purple-500/30',
    empty: 'No hay pedidos en producción.',
    icon: ArrowPathIcon,
  },
  ready: {
    title: 'Listo',
    subtitle: 'Preparados para salida o entrega',
    accent: 'border-cmyk-cyan/30',
    empty: 'No hay pedidos listos.',
    icon: TruckIcon,
  },
  done: {
    title: 'Realizadas',
    subtitle: 'Pedidos finalizados',
    accent: 'border-green-500/30',
    empty: 'No hay pedidos finalizados.',
    icon: CheckCircleIcon,
  },
  quotes: {
    title: 'Por hacer',
    subtitle: 'Solicitudes sin priorizar',
    accent: 'border-neutral-700',
    empty: 'No hay solicitudes pendientes.',
    icon: DocumentTextIcon,
  },
};

const itemToneClasses: Record<string, string> = {
  quote_request_required: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  quote_request_assigned: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  quote_request_pending: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  order_pending_payment: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  order_in_production: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  order_ready: 'bg-cmyk-cyan/10 text-cmyk-cyan border-cmyk-cyan/20',
  order_completed: 'bg-green-500/10 text-green-300 border-green-500/20',
  quote_estimated_delivery: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  order_scheduled: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  production_job: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  logistics_job: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  field_operation_job: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  mobile_campaign: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
};

const statusToneClasses: Record<string, string> = {
  pending_payment: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  paid: 'bg-green-500/15 text-green-300 border-green-500/20',
  partially_paid: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  in_production: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  ready: 'bg-cmyk-cyan/15 text-cmyk-cyan border-cmyk-cyan/20',
  in_delivery: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  completed: 'bg-green-500/15 text-green-300 border-green-500/20',
  assigned: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  in_review: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  quoted: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  pending: 'bg-neutral-700/50 text-neutral-300 border-neutral-700',
  queued: 'bg-neutral-700/50 text-neutral-300 border-neutral-700',
  preparing: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  quality_check: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  released: 'bg-green-500/15 text-green-300 border-green-500/20',
  blocked: 'bg-red-500/15 text-red-300 border-red-500/20',
  pending_dispatch: 'bg-neutral-700/50 text-neutral-300 border-neutral-700',
  scheduled: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  in_transit: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  ready_for_pickup: 'bg-cmyk-cyan/15 text-cmyk-cyan border-cmyk-cyan/20',
  delivered: 'bg-green-500/15 text-green-300 border-green-500/20',
  delivery_failed: 'bg-red-500/15 text-red-300 border-red-500/20',
  crew_assigned: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  in_progress: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  paused: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  requires_revisit: 'bg-red-500/15 text-red-300 border-red-500/20',
};

export default function OperationsPage() {
  const locale = useLocale();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getWorkflowOverview>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekCursor, setWeekCursor] = useState(() => new Date());

  const getErrorStatus = (error: unknown): number | null => {
    if (!error || typeof error !== 'object' || !('status' in error)) return null;
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  };

  const hasOverviewData = (data: Awaited<ReturnType<typeof getWorkflowOverview>> | null): boolean => {
    if (!data) return false;
    const blockItems = Object.values(data.blocks || {}).reduce((sum, items) => sum + (items?.length || 0), 0);
    return blockItems > 0 || (data.calendar_events?.length || 0) > 0;
  };

  const buildFallbackWorkflowOverview = (
    orders: OrderListItem[],
    quoteRequests: QuoteRequest[],
    quotes: Quote[],
  ): Awaited<ReturnType<typeof getWorkflowOverview>> => {
    const getOrderExtraDate = (order: OrderListItem, field: 'scheduled_date' | 'completed_at'): string | null => {
      const value = (order as unknown as Record<string, unknown>)[field];
      return typeof value === 'string' && value.length > 0 ? value : null;
    };

    const getOrderCustomerName = (order: OrderListItem) => {
      const customer = (order as unknown as { customer?: { full_name?: string; email?: string } }).customer;
      return customer?.full_name || customer?.email || 'Cliente';
    };

    const orderToItem = (order: OrderListItem, kind: string, date?: string | null, dateLabel?: string): WorkflowItem => ({
      id: order.id,
      kind,
      title: `Pedido ${order.order_number}`,
      subtitle: getOrderCustomerName(order),
      status: order.status,
      status_display: order.status_display || order.status,
      payment_method: order.payment_method,
      date: date || null,
      date_label: dateLabel,
      amount: order.total,
      href: `/dashboard/pedidos/${order.id}`,
    });

    const quoteRequestToItem = (request: QuoteRequest, kind: string): WorkflowItem => ({
      id: request.id,
      kind,
      title: request.request_number,
      subtitle: request.customer_name || request.customer_email,
      status: request.status,
      status_display: request.status_display || request.status,
      delivery_method: request.delivery_method,
      date: request.required_date || null,
      date_label: request.required_date ? 'Fecha requerida' : undefined,
      href: `/dashboard/cotizaciones/solicitudes/${request.id}`,
    });

    const quoteToItem = (quote: Quote): WorkflowItem => ({
      id: quote.id,
      kind: 'quote_estimated_delivery',
      title: quote.quote_number,
      subtitle: quote.customer_name || quote.customer_email,
      status: quote.status,
      status_display: quote.status_display || quote.status,
      date: quote.estimated_delivery_date || null,
      date_label: quote.estimated_delivery_date ? 'Entrega estimada' : undefined,
      amount: quote.total,
      href: `/dashboard/cotizaciones/${quote.id}`,
    });

    const manualPendingOrders = orders.filter((order) => order.status === 'pending_payment' && requiresManualPayment(order.payment_method));
    const inProductionOrders = orders.filter((order) => order.status === 'in_production');
    const readyOrders = orders.filter((order) => ['ready', 'in_delivery'].includes(order.status));
    const doneOrders = orders.filter((order) => order.status === 'completed');
    const assignedRequests = quoteRequests.filter((request) => ['assigned', 'in_review', 'quoted'].includes(request.status));
    const pendingRequests = quoteRequests.filter((request) => ['pending', 'info_requested'].includes(request.status));

    const calendarEvents: WorkflowItem[] = [
      ...quoteRequests
        .filter((request) => !!request.required_date)
        .map((request) => quoteRequestToItem(request, 'quote_request_required')),
      ...quotes
        .filter((quote) => !!quote.estimated_delivery_date)
        .map(quoteToItem),
      ...orders
        .map((order) => ({ order, scheduledDate: getOrderExtraDate(order, 'scheduled_date') }))
        .filter(({ scheduledDate }) => !!scheduledDate)
        .map(({ order, scheduledDate }) => orderToItem(order, 'order_scheduled', scheduledDate, 'Programado')),
      ...orders
        .map((order) => ({ order, completedAt: getOrderExtraDate(order, 'completed_at') }))
        .filter(({ completedAt }) => !!completedAt)
        .map(({ order, completedAt }) => orderToItem(order, 'order_completed', completedAt, 'Completado')),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    return {
      generated_at: now.toISOString(),
      window_start: windowStart,
      window_end: windowEnd,
      stats: {
        manual_payment_orders: manualPendingOrders.length,
        in_production_orders: inProductionOrders.length,
        ready_orders: readyOrders.length,
        completed_orders: doneOrders.length,
        assigned_requests: assignedRequests.length,
        pending_requests: pendingRequests.length,
        calendar_items: calendarEvents.length,
      },
      blocks: {
        assigned: assignedRequests.map((request) => quoteRequestToItem(request, 'quote_request_assigned')),
        to_pay: manualPendingOrders.map((order) => orderToItem(order, 'order_pending_payment', order.created_at, 'Alta')),
        in_production: inProductionOrders.map((order) => orderToItem(order, 'order_in_production', getOrderExtraDate(order, 'scheduled_date') || order.created_at, 'Producción')),
        ready: readyOrders.map((order) => orderToItem(order, 'order_ready', getOrderExtraDate(order, 'scheduled_date') || order.created_at, 'Entrega')),
        done: doneOrders.map((order) => orderToItem(order, 'order_completed', getOrderExtraDate(order, 'completed_at') || order.created_at, 'Completado')),
        quotes: pendingRequests.map((request) => quoteRequestToItem(request, 'quote_request_pending')),
      },
      calendar_events: calendarEvents,
      quotes,
      quote_requests: quoteRequests,
    };
  };

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);

      const fetchFallbackOverview = async () => {
        const [ordersResult, quoteRequestsResult, quotesResult] = await Promise.allSettled([
          getStaffOrders({ page: 1 }),
          getAdminQuoteRequests({ page: 1 }),
          getAdminQuotes({ page: 1 }),
        ]);

        const orders = ordersResult.status === 'fulfilled' ? (ordersResult.value.results || []) : [];
        const quoteRequests = quoteRequestsResult.status === 'fulfilled' ? (quoteRequestsResult.value.results || []) : [];
        const quotes = quotesResult.status === 'fulfilled' ? (quotesResult.value.results || []) : [];

        return buildFallbackWorkflowOverview(orders, quoteRequests, quotes);
      };

      try {
        const data = await getWorkflowOverview();
        if (hasOverviewData(data)) {
          setOverview(data);
        } else {
          const fallback = await fetchFallbackOverview();
          setOverview(fallback);
        }
      } catch (error: unknown) {
        const status = getErrorStatus(error);
        try {
          const fallback = await fetchFallbackOverview();
          setOverview(fallback);
        } catch (fallbackError) {
          if (status === 404) {
            console.error('Workflow endpoint unavailable and fallback failed:', fallbackError);
          } else {
            console.error('Error fetching workflow overview:', error);
            console.error('Error building workflow fallback overview:', fallbackError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const formatCurrency = (amount?: string | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(amount) || 0);
  };

  const parseDateSafe = (dateString?: string | null) => {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return new Date(`${dateString}T12:00:00`);
    }
    return new Date(dateString);
  };

  const formatDate = (dateString?: string | null) => {
    const parsed = parseDateSafe(dateString);
    if (!parsed) return '-';
    return parsed.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatCalendarDate = (dateString?: string | null) => {
    const parsed = parseDateSafe(dateString);
    if (!parsed) return '-';
    return parsed.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    const startDate = parseDateSafe(start);
    const endDate = parseDateSafe(end);
    if (!startDate && !endDate) return '-';
    if (startDate && !endDate) return formatCalendarDate(start);
    if (!startDate && endDate) return formatCalendarDate(end);
    if (!startDate || !endDate) return '-';
    return `${startDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
  };

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, WorkflowItem[]>();
    for (const item of overview?.calendar_events || []) {
      if (!item.date) continue;
      const key = item.date.slice(0, 10);
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    }
    return map;
  }, [overview]);

  const calendarDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = new Date(firstDay);
    startDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

    const days: Date[] = [];
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(startDay);
      day.setDate(startDay.getDate() + index);
      days.push(day);
    }
    return days;
  }, [monthCursor]);

  const weekDays = useMemo(() => {
    const start = new Date(weekCursor);
    start.setHours(0, 0, 0, 0);
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);

    const days: Date[] = [];
    for (let index = 0; index < 7; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      days.push(day);
    }
    return days;
  }, [weekCursor]);

  if (isLoading) {
    return <LoadingPage message="Cargando flujo operativo..." />;
  }

  const blockEntries = Object.entries(blockConfig) as Array<[keyof typeof blockConfig, (typeof blockConfig)[keyof typeof blockConfig]]>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Flujo operativo</h1>
          <p className="text-neutral-400 max-w-3xl">
            Vista unificada de solicitudes, validación de pago, producción y entregas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          href={`/${locale}/dashboard/solicitudes`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800/80 transition-colors p-4"
        >
          <p className="text-xs uppercase tracking-wide text-neutral-500">Rama</p>
          <p className="text-white font-semibold mt-1">Solicitudes</p>
          <p className="text-sm text-neutral-400 mt-1">Gestiona requerimientos de clientes y asignaciones.</p>
          <p className="text-cmyk-cyan text-sm mt-3">Ir al detalle</p>
        </Link>
        <Link
          href={`/${locale}/dashboard/cotizaciones`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800/80 transition-colors p-4"
        >
          <p className="text-xs uppercase tracking-wide text-neutral-500">Rama</p>
          <p className="text-white font-semibold mt-1">Cotizaciones</p>
          <p className="text-sm text-neutral-400 mt-1">Revisa propuestas, envíos y aprobaciones.</p>
          <p className="text-cmyk-cyan text-sm mt-3">Ir al detalle</p>
        </Link>
        <Link
          href={`/${locale}/dashboard/pedidos`}
          className="rounded-xl border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800/80 transition-colors p-4"
        >
          <p className="text-xs uppercase tracking-wide text-neutral-500">Rama</p>
          <p className="text-white font-semibold mt-1">Pedidos</p>
          <p className="text-sm text-neutral-400 mt-1">Da seguimiento a producción, entrega y cierre.</p>
          <p className="text-cmyk-cyan text-sm mt-3">Ir al detalle</p>
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">Asignadas</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.stats.assigned_requests ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">Pago manual</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.stats.manual_payment_orders ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">En producción</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.stats.in_production_orders ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">Listo</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.stats.ready_orders ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">Realizadas</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.stats.completed_orders ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">Calendario</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.stats.calendar_items ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {blockEntries.map(([key, config]) => {
          const Icon = config.icon;
          const items = overview?.blocks[key as keyof typeof overview.blocks] || [];
          return (
            <Card key={key} className={`p-4 border ${config.accent} min-h-[24rem] flex flex-col`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-cmyk-cyan" />
                    <h2 className="text-lg font-semibold text-white">{config.title}</h2>
                  </div>
                  <p className="text-neutral-500 text-sm mt-1">{config.subtitle}</p>
                </div>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm text-center px-4">
                  {config.empty}
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${locale}${item.href}`}
                      className="block rounded-xl border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800/80 transition-colors p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{item.title}</p>
                          <p className="text-neutral-400 text-sm truncate">{item.subtitle}</p>
                        </div>
                        {item.amount && (
                          <span className="text-green-400 text-sm font-medium whitespace-nowrap">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full border ${statusToneClasses[item.status] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                          {item.status_display}
                        </span>
                        {item.date && (
                          <span className="px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {item.date_label || 'Fecha'}: {formatDate(item.date)}
                          </span>
                        )}
                        {item.is_range && (
                          <span className="px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                            Rango: {formatDateRange(item.start, item.end)}
                          </span>
                        )}
                        {item.payment_method && requiresManualPayment(item.payment_method) && (
                          <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {getPaymentMethodLabel(item.payment_method)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-cmyk-cyan" />
              Calendario
            </h2>
            <p className="text-neutral-500 text-sm">
              Fechas requeridas, entregas estimadas y programación de pedidos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-neutral-700 overflow-hidden">
              <button
                onClick={() => setCalendarMode('month')}
                className={`px-3 py-1.5 text-xs transition-colors ${calendarMode === 'month' ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'text-neutral-300 hover:bg-neutral-800'}`}
              >
                Mes
              </button>
              <button
                onClick={() => setCalendarMode('week')}
                className={`px-3 py-1.5 text-xs transition-colors ${calendarMode === 'week' ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'text-neutral-300 hover:bg-neutral-800'}`}
              >
                Semana
              </button>
            </div>
            <button
              onClick={() => {
                if (calendarMode === 'month') {
                  setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                } else {
                  setWeekCursor((current) => {
                    const next = new Date(current);
                    next.setDate(next.getDate() - 7);
                    return next;
                  });
                }
              }}
              className="p-2 rounded-lg border border-neutral-700 text-neutral-400 hover:text-white hover:border-cmyk-cyan transition-colors"
              aria-label={calendarMode === 'month' ? 'Mes anterior' : 'Semana anterior'}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="min-w-[12rem] text-center text-white font-medium">
              {calendarMode === 'month'
                ? monthCursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
                : `${weekDays[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </div>
            <button
              onClick={() => {
                if (calendarMode === 'month') {
                  setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                } else {
                  setWeekCursor((current) => {
                    const next = new Date(current);
                    next.setDate(next.getDate() + 7);
                    return next;
                  });
                }
              }}
              className="p-2 rounded-lg border border-neutral-700 text-neutral-400 hover:text-white hover:border-cmyk-cyan transition-colors"
              aria-label={calendarMode === 'month' ? 'Mes siguiente' : 'Semana siguiente'}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs text-neutral-500 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="text-center py-2 uppercase tracking-wide">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {calendarMode === 'month' ? (
            <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(6.5rem,1fr)]">
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const events = calendarEventsByDate.get(key) || [];
                const inMonth = day.getMonth() === monthCursor.getMonth();

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-2 overflow-hidden ${inMonth ? 'border-neutral-800 bg-neutral-900/70' : 'border-neutral-800/40 bg-neutral-950/40 opacity-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${inMonth ? 'text-white' : 'text-neutral-500'}`}>{day.getDate()}</span>
                      {events.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cmyk-cyan/10 text-cmyk-cyan border border-cmyk-cyan/20">
                          {events.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 max-h-[4.6rem] overflow-hidden">
                      {events.slice(0, 3).map((event) => (
                        <Link
                          key={event.id + event.kind}
                          href={`/${locale}${event.href}`}
                          className={`block text-[11px] leading-tight rounded-md border px-2 py-1 truncate ${itemToneClasses[event.kind] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}
                          title={`${event.title} · ${event.subtitle}`}
                        >
                          {event.title}
                        </Link>
                      ))}
                      {events.length > 3 && (
                        <div className="text-[10px] text-neutral-500 px-1">+{events.length - 3} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(13rem,1fr)]">
              {weekDays.map((day) => {
                const key = toDateKey(day);
                const events = calendarEventsByDate.get(key) || [];

                return (
                  <div key={key} className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-2 overflow-hidden">
                    <div className="mb-2">
                      <p className="text-[11px] text-neutral-500 uppercase">
                        {day.toLocaleDateString('es-MX', { weekday: 'short' })}
                      </p>
                      <p className="text-sm text-white font-medium">
                        {day.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="space-y-1 max-h-[10rem] overflow-y-auto pr-1">
                      {events.length === 0 ? (
                        <p className="text-[11px] text-neutral-600">Sin eventos</p>
                      ) : (
                        events.map((event) => (
                          <Link
                            key={event.id + event.kind}
                            href={`/${locale}${event.href}`}
                            className={`block text-[11px] leading-tight rounded-md border px-2 py-1 ${itemToneClasses[event.kind] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}
                            title={`${event.title} · ${event.subtitle}`}
                          >
                            {event.title}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-cmyk-cyan" />
              Próximos eventos
            </h3>
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {(overview?.calendar_events || []).slice(0, 20).map((event) => (
                <Link
                  key={`${event.kind}-${event.id}-${event.date}`}
                  href={`/${locale}${event.href}`}
                  className="block p-3 rounded-lg border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{event.title}</p>
                      <p className="text-neutral-400 text-xs truncate">{event.subtitle}</p>
                    </div>
                    {event.date && (
                      <span className="text-xs text-neutral-400 whitespace-nowrap">{formatCalendarDate(event.date)}</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full border ${itemToneClasses[event.kind] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                      {event.date_label || 'Evento'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border ${statusToneClasses[event.status] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                      {event.status_display}
                    </span>
                    {event.is_range && (
                      <span className="px-2 py-0.5 rounded-full border bg-neutral-800 text-neutral-300 border-neutral-700">
                        {formatDateRange(event.start, event.end)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
