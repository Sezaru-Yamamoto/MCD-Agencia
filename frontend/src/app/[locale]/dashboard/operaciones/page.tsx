'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
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
  ListBulletIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

import { Card, LoadingPage, Modal } from '@/components/ui';
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
  quotes: {
    title: 'Solicitudes por asignar',
    subtitle: 'Solicitudes sin priorizar',
    accent: 'border-neutral-700',
    empty: 'No hay solicitudes pendientes.',
    icon: DocumentTextIcon,
  },
  assigned: {
    title: 'Solicitudes por cotizar',
    subtitle: 'Solicitudes y cotizaciones activas',
    accent: 'border-blue-500/30',
    empty: 'No hay solicitudes asignadas.',
    icon: UserGroupIcon,
  },
  to_pay: {
    title: 'Validar pagos',
    subtitle: 'Pedidos manuales pendientes',
    accent: 'border-amber-500/30',
    empty: 'No hay pagos manuales pendientes.',
    icon: ExclamationTriangleIcon,
  },
  in_production: {
    title: 'En producción',
    subtitle: 'Trabajo activo en producción',
    accent: 'border-purple-500/30',
    empty: 'No hay pedidos en producción.',
    icon: ArrowPathIcon,
  },
  ready: {
    title: 'Para enviar',
    subtitle: 'Preparados para salida o entrega',
    accent: 'border-cmyk-cyan/30',
    empty: 'No hay pedidos listos.',
    icon: TruckIcon,
  },
  done: {
    title: 'Entregados',
    subtitle: 'Pedidos finalizados',
    accent: 'border-green-500/30',
    empty: 'No hay pedidos finalizados.',
    icon: CheckCircleIcon,
  },
};

const blockRouteMap: Record<keyof typeof blockConfig, string> = {
  quotes: '/dashboard/solicitudes',
  assigned: '/dashboard/cotizaciones',
  to_pay: '/dashboard/pedidos',
  in_production: '/dashboard/pedidos',
  ready: '/dashboard/pedidos',
  done: '/dashboard/pedidos',
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
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [previewBlockKey, setPreviewBlockKey] = useState<keyof typeof blockConfig | null>(null);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [isCalendarNavigatorOpen, setIsCalendarNavigatorOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekCursor, setWeekCursor] = useState(() => new Date());
  const [calendarPickerYear, setCalendarPickerYear] = useState(() => new Date().getFullYear());
  const [calendarPickerMonth, setCalendarPickerMonth] = useState(() => new Date().getMonth());
  const mobileBoardRef = useRef<HTMLDivElement | null>(null);
  const mobileBoardCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mobileBoardTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  const getWeekStart = (sourceDate: Date) => {
    const start = new Date(sourceDate);
    start.setHours(0, 0, 0, 0);
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
    return start;
  };

  const getWeekRangesForMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const cursor = getWeekStart(firstDay);
    const weeks: Date[] = [];

    while (cursor <= lastDay || weeks.length < 4) {
      weeks.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
      if (weeks.length > 6) break;
    }

    return weeks;
  };

  const effectiveCalendarEvents = useMemo(() => {
    const directEvents = overview?.calendar_events || [];
    if (directEvents.length > 0) {
      return directEvents;
    }

    const blockEvents = Object.values(overview?.blocks || {})
      .flat()
      .filter((item) => !!item.date)
      .slice(0, 150);

    return blockEvents;
  }, [overview]);

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, WorkflowItem[]>();
    for (const item of effectiveCalendarEvents) {
      if (!item.date) continue;
      const key = item.date.slice(0, 10);
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    }
    return map;
  }, [effectiveCalendarEvents]);

  const calendarItemsCount = Math.max(overview?.stats.calendar_items ?? 0, effectiveCalendarEvents.length);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDateKey) return [] as WorkflowItem[];
    return calendarEventsByDate.get(selectedDateKey) || [];
  }, [selectedDateKey, calendarEventsByDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return '';
    return parseDateSafe(selectedDateKey)?.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) || selectedDateKey;
  }, [selectedDateKey]);

  const previewBlockItems: WorkflowItem[] = useMemo(() => {
    if (!previewBlockKey || !overview) return [];
    return (overview.blocks[previewBlockKey as keyof typeof overview.blocks] || []) as WorkflowItem[];
  }, [previewBlockKey, overview]);

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
    const start = getWeekStart(weekCursor);

    const days: Date[] = [];
    for (let index = 0; index < 7; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      days.push(day);
    }
    return days;
  }, [weekCursor]);

  const monthLabel = monthCursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const weekLabel = `${weekDays[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const navigatorWeeks = useMemo(
    () => getWeekRangesForMonth(calendarPickerYear, calendarPickerMonth),
    [calendarPickerYear, calendarPickerMonth],
  );

  const openCalendarNavigator = () => {
    if (calendarMode === 'month') {
      setCalendarPickerYear(monthCursor.getFullYear());
      setCalendarPickerMonth(monthCursor.getMonth());
    } else {
      setCalendarPickerYear(weekCursor.getFullYear());
      setCalendarPickerMonth(weekCursor.getMonth());
    }
    setIsCalendarNavigatorOpen(true);
  };

  if (isLoading) {
    return <LoadingPage message="Cargando flujo operativo..." />;
  }

  const blockEntries = Object.entries(blockConfig) as Array<[keyof typeof blockConfig, (typeof blockConfig)[keyof typeof blockConfig]]>;

  const goToBoardIndex = (index: number) => {
    setActiveBoardIndex(index);
    mobileBoardTabRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    mobileBoardCardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  const handleMobileBoardScroll = () => {
    const container = mobileBoardRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    let nextIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const distance = Math.abs(child.offsetLeft - container.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        nextIndex = index;
      }
    });

    if (nextIndex !== activeBoardIndex) {
      setActiveBoardIndex(nextIndex);
      mobileBoardTabRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const renderBlockCard = (
    key: keyof typeof blockConfig,
    config: (typeof blockConfig)[keyof typeof blockConfig],
    items: WorkflowItem[],
    moduleHref: string,
  ) => {
    const Icon = config.icon;

    return (
      <Card className={`p-4 border ${config.accent} min-h-[22rem] md:min-h-[20rem] flex flex-col`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-cmyk-cyan" />
              <h2 className="text-lg font-semibold text-white">{config.title}</h2>
            </div>
            <p className="text-neutral-500 text-xs mt-1">{config.subtitle}</p>
          </div>
          <span className="text-xs text-neutral-400">{items.length}</span>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm text-center px-4">
            {config.empty}
          </div>
        ) : (
          <div className="space-y-2 flex-1 md:overflow-y-auto pr-1">
            {items.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`/${locale}${item.href}`}
                className="block rounded-lg border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800/80 transition-colors p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <p className="text-neutral-400 text-xs truncate">{item.subtitle}</p>
                  </div>
                  {item.amount && (
                    <span className="text-green-400 text-xs font-medium whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
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
            {items.length > 3 && (
              <p className="text-xs text-neutral-500 px-1">+{items.length - 3} más</p>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewBlockKey(key)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-700 text-xs text-neutral-300 hover:text-white hover:border-cmyk-cyan hover:bg-neutral-800 transition-colors"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            Preview
          </button>
          <Link
            href={moduleHref}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-cmyk-cyan/40 text-xs text-cmyk-cyan hover:bg-cmyk-cyan/10 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            Ir al módulo
          </Link>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Flujo Operativo Unificado</h1>
        <div className="inline-flex items-center rounded-lg border border-neutral-700 overflow-hidden">
          <button
            onClick={() => setViewMode('board')}
            className={`px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${viewMode === 'board' ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'text-neutral-300 hover:bg-neutral-800'}`}
            title="Mostrar tablero"
          >
            <ListBulletIcon className="h-3.5 w-3.5" />
            Tablero
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-2.5 py-1.5 text-xs transition-colors border-l border-neutral-700 flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'text-neutral-300 hover:bg-neutral-800'}`}
            title="Mostrar calendario"
          >
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            Calendario
          </button>
        </div>
      </div>

      {viewMode !== 'calendar' && (
      <>
      <div className="xl:hidden space-y-3">
        <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max items-center gap-1 rounded-lg border border-neutral-700 p-1 bg-neutral-900/70">
            {blockEntries.map(([key, config], index) => (
              <button
                key={key}
                ref={(el) => { mobileBoardTabRefs.current[index] = el; }}
                onClick={() => goToBoardIndex(index)}
                className={`relative px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${activeBoardIndex === index ? 'text-cmyk-cyan bg-cmyk-cyan/10' : 'text-neutral-300 hover:bg-neutral-800'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{config.title}</span>
                  <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${activeBoardIndex === index ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'bg-neutral-800 text-neutral-300'}`}>
                    {(overview?.blocks[key as keyof typeof overview.blocks] || []).length}
                  </span>
                </span>
                {activeBoardIndex === index && (
                  <span className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-cmyk-cyan rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={mobileBoardRef}
          onScroll={handleMobileBoardScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {blockEntries.map(([key, config], index) => {
            const items = overview?.blocks[key as keyof typeof overview.blocks] || [];
            const moduleHref = `/${locale}${blockRouteMap[key]}`;
            return (
              <div
                key={key}
                ref={(el) => { mobileBoardCardRefs.current[index] = el; }}
                className="min-w-full snap-start"
              >
                {renderBlockCard(key, config, items as WorkflowItem[], moduleHref)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden xl:grid grid-cols-3 gap-4">
        {blockEntries.map(([key, config]) => {
          const items = overview?.blocks[key as keyof typeof overview.blocks] || [];
          const moduleHref = `/${locale}${blockRouteMap[key]}`;
          return (
            <div key={key}>
              {renderBlockCard(key, config, items as WorkflowItem[], moduleHref)}
            </div>
          );
        })}
      </div>
      </>
      )}

      {viewMode !== 'board' && (
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-cmyk-cyan" />
            Calendario
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="flex items-center rounded-lg border border-neutral-700 overflow-hidden">
                  <button
                    onClick={() => setCalendarMode('month')}
                    className={`px-2.5 py-1 text-[11px] transition-colors ${calendarMode === 'month' ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'text-neutral-300 hover:bg-neutral-800'}`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setCalendarMode('week')}
                    className={`px-2.5 py-1 text-[11px] transition-colors ${calendarMode === 'week' ? 'bg-cmyk-cyan/20 text-cmyk-cyan' : 'text-neutral-300 hover:bg-neutral-800'}`}
                  >
                    Semana
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 p-2">
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
                <button
                  type="button"
                  onClick={openCalendarNavigator}
                  className="flex-1 min-w-0 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-center text-white font-medium text-sm hover:border-cmyk-cyan/40 hover:bg-neutral-900 transition-colors"
                >
                  <span className="block truncate">{calendarMode === 'month' ? monthLabel : weekLabel}</span>
                </button>
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

            {calendarMode === 'month' ? (
            <div>
              <div className="grid grid-cols-7 gap-2 text-xs text-neutral-500 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="text-center py-2 uppercase tracking-wide">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const key = toDateKey(day);
                  const events = calendarEventsByDate.get(key) || [];
                  const inMonth = day.getMonth() === monthCursor.getMonth();

                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(key)}
                      key={key}
                      className={`aspect-square rounded-xl border p-2 overflow-hidden text-left transition-colors ${inMonth ? 'border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800/80' : 'border-neutral-800/40 bg-neutral-950/40 opacity-50 hover:opacity-80'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${inMonth ? 'text-white' : 'text-neutral-500'}`}>{day.getDate()}</span>
                        {events.length > 0 && (
                          <span className="inline-block h-2 w-2 rounded-full bg-cmyk-cyan" aria-label={`${events.length} evento(s)`} />
                        )}
                      </div>
                      <div className="mt-2 text-[10px] text-neutral-500">
                        {events.length > 0 ? `${events.length} evento(s)` : 'Sin evento'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-1.5 text-[10px] text-neutral-500 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={`week-head-${day}`} className="text-center py-1 uppercase tracking-wide">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const key = toDateKey(day);
                  const events = calendarEventsByDate.get(key) || [];

                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(key)}
                      key={key}
                      className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-2 hover:bg-neutral-800/80 transition-colors min-h-[5.25rem]"
                    >
                      <div className="h-full flex flex-col items-center justify-between py-1">
                        <span className="text-base text-white font-semibold leading-none">
                          {day.getDate()}
                        </span>
                        {events.length > 0 ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-cmyk-cyan" aria-label={`${events.length} evento(s)`} />
                        ) : (
                          <span className="inline-block h-2 w-2 rounded-full bg-transparent border border-neutral-700" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-cmyk-cyan" />
              Próximos eventos
            </h3>
              {effectiveCalendarEvents.length === 0 && (
                <p className="text-xs text-neutral-500">No hay eventos con fecha disponible por ahora.</p>
              )}
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {effectiveCalendarEvents.slice(0, 20).map((event) => (
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
      )}

      <Modal
        isOpen={!!selectedDateKey}
        onClose={() => setSelectedDateKey(null)}
        title={selectedDateLabel ? `Eventos - ${selectedDateLabel}` : 'Eventos del día'}
        size="lg"
      >
        {selectedDateEvents.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay tareas registradas para este día.</p>
        ) : (
          <div className="space-y-2 max-h-[65dvh] overflow-y-auto pr-1">
            {selectedDateEvents.map((event) => (
              <Link
                key={`${event.kind}-${event.id}-${event.date}-${event.status}`}
                href={`/${locale}${event.href}`}
                className="block p-3 rounded-lg border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 transition-colors"
                onClick={() => setSelectedDateKey(null)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{event.title}</p>
                    <p className="text-neutral-400 text-xs truncate">{event.subtitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] ${statusToneClasses[event.status] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                    {event.status_display}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!previewBlockKey}
        onClose={() => setPreviewBlockKey(null)}
        title={previewBlockKey ? blockConfig[previewBlockKey].title : 'Preview'}
        size="lg"
      >
        {previewBlockItems.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin elementos en esta etapa.</p>
        ) : (
          <div className="space-y-2 max-h-[65dvh] overflow-y-auto pr-1">
            {previewBlockItems.map((item) => (
              <Link
                key={`${item.kind}-${item.id}-${item.status}`}
                href={`/${locale}${item.href}`}
                className="block p-3 rounded-lg border border-neutral-800 bg-neutral-900/70 hover:bg-neutral-800 transition-colors"
                onClick={() => setPreviewBlockKey(null)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <p className="text-neutral-400 text-xs truncate">{item.subtitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] ${statusToneClasses[item.status] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                    {item.status_display}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {previewBlockKey && (
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <Link
              href={`/${locale}${blockRouteMap[previewBlockKey]}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-cmyk-cyan/40 text-sm text-cmyk-cyan hover:bg-cmyk-cyan/10 transition-colors"
              onClick={() => setPreviewBlockKey(null)}
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Ir al módulo
            </Link>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCalendarNavigatorOpen}
        onClose={() => setIsCalendarNavigatorOpen(false)}
        title={calendarMode === 'month' ? 'Navegar por año y mes' : 'Navegar por semana'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/50 p-2">
            <button
              type="button"
              onClick={() => setCalendarPickerYear((year) => year - 1)}
              className="p-2 rounded-md border border-neutral-700 text-neutral-300 hover:text-white hover:border-cmyk-cyan transition-colors"
              aria-label="Año anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-white font-semibold">{calendarPickerYear}</span>
            <button
              type="button"
              onClick={() => setCalendarPickerYear((year) => year + 1)}
              className="p-2 rounded-md border border-neutral-700 text-neutral-300 hover:text-white hover:border-cmyk-cyan transition-colors"
              aria-label="Año siguiente"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, monthIndex) => {
              const monthName = new Date(calendarPickerYear, monthIndex, 1).toLocaleDateString('es-MX', { month: 'short' });
              const isActive = monthIndex === calendarPickerMonth;
              return (
                <button
                  key={`month-picker-${monthIndex}`}
                  type="button"
                  onClick={() => {
                    setCalendarPickerMonth(monthIndex);
                    if (calendarMode === 'month') {
                      setMonthCursor(new Date(calendarPickerYear, monthIndex, 1));
                      setIsCalendarNavigatorOpen(false);
                    }
                  }}
                  className={`rounded-md border px-2 py-2 text-xs uppercase transition-colors ${isActive ? 'border-cmyk-cyan/50 bg-cmyk-cyan/15 text-cmyk-cyan' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-white'}`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>

          {calendarMode === 'week' && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400">Selecciona la semana dentro del mes:</p>
              <div className="space-y-2 max-h-[38dvh] overflow-y-auto pr-1">
                {navigatorWeeks.map((weekStart) => {
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  const isCurrent = toDateKey(getWeekStart(weekCursor)) === toDateKey(weekStart);
                  return (
                    <button
                      key={`week-picker-${toDateKey(weekStart)}`}
                      type="button"
                      onClick={() => {
                        setWeekCursor(new Date(weekStart));
                        setIsCalendarNavigatorOpen(false);
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${isCurrent ? 'border-cmyk-cyan/50 bg-cmyk-cyan/10 text-cmyk-cyan' : 'border-neutral-800 bg-neutral-900/80 text-neutral-200 hover:border-neutral-600 hover:text-white'}`}
                    >
                      {weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
