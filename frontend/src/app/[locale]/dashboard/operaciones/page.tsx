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

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      try {
        const data = await getWorkflowOverview();
        setOverview(data);
      } catch (error) {
        console.error('Error fetching workflow overview:', error);
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
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/dashboard/pedidos`}
            className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:border-cmyk-cyan transition-colors"
          >
            Pedidos
          </Link>
          <Link
            href={`/${locale}/dashboard/cotizaciones`}
            className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:border-cmyk-cyan transition-colors"
          >
            Cotizaciones
          </Link>
        </div>
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
