'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

import {
  getMovements,
  createMovement,
  getActiveAlerts,
  getAlertCounts,
  acknowledgeAlert,
  resolveAlert,
  getStockSummary,
  getLowStockReport,
  getInventoryValueReport,
  type StockMovement,
  type StockAlert,
  type StockSummaryItem,
  type CreateMovementData,
  type AlertCounts,
  type LowStockReport,
  type InventoryValueReport,
} from '@/lib/api/inventory';
import { Card, Button, Input, Modal, Badge, LoadingPage } from '@/components/ui';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────
type InventoryTab = 'summary' | 'movements' | 'alerts';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  ADJUSTMENT: 'Ajuste',
};

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  IN: 'text-green-400',
  OUT: 'text-red-400',
  ADJUSTMENT: 'text-yellow-400',
};

const REASON_LABELS: Record<string, string> = {
  purchase: 'Compra a proveedor',
  return: 'Devolución de cliente',
  production: 'Producción interna',
  transfer_in: 'Transferencia entrante',
  sale: 'Venta',
  internal_use: 'Uso interno',
  damaged: 'Dañado/Defectuoso',
  expired: 'Expirado',
  lost: 'Perdido/Extraviado',
  transfer_out: 'Transferencia saliente',
  inventory_count: 'Conteo de inventario',
  correction: 'Corrección de error',
  initial: 'Stock inicial',
};

const IN_REASONS = ['purchase', 'return', 'production', 'transfer_in'];
const OUT_REASONS = ['sale', 'internal_use', 'damaged', 'expired', 'lost', 'transfer_out'];
const ADJUSTMENT_REASONS = ['inventory_count', 'correction', 'initial'];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InventoryTab>('summary');

  const { data: summary = [], isLoading: l1 } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: getStockSummary,
  });
  const { data: alertCounts, isLoading: l2 } = useQuery({
    queryKey: ['inventory-alert-counts'],
    queryFn: getAlertCounts,
  });
  const { data: lowStock, isLoading: l3 } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: getLowStockReport,
  });
  const { data: valueReport } = useQuery({
    queryKey: ['inventory-value'],
    queryFn: getInventoryValueReport,
  });

  if (l1 || l2 || l3) return <LoadingPage message="Cargando inventario..." />;

  const outOfStock = summary.filter((s) => s.is_out_of_stock).length;
  const lowStockCount = lowStock?.count ?? 0;
  const activeAlerts = alertCounts?.active ?? 0;

  const tabs: { id: InventoryTab; label: string; badge?: number }[] = [
    { id: 'summary', label: '📊 Resumen de Stock' },
    { id: 'movements', label: '📦 Movimientos' },
    { id: 'alerts', label: '⚠️ Alertas', badge: activeAlerts },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventario</h1>
        <p className="text-neutral-400 text-sm">Gestiona stock, entradas, salidas y alertas de inventario</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <ArchiveBoxIcon className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{summary.length}</p>
              <p className="text-xs text-neutral-400">Variantes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                ${valueReport?.total_value?.toLocaleString('es-MX', { minimumFractionDigits: 0 }) ?? '0'}
              </p>
              <p className="text-xs text-neutral-400">Valor total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{lowStockCount}</p>
              <p className="text-xs text-neutral-400">Stock bajo</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{outOfStock}</p>
              <p className="text-xs text-neutral-400">Sin stock</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-800 pb-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-xs sm:text-sm flex items-center gap-2',
              activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white')}>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && <SummaryTab summary={summary} lowStock={lowStock} valueReport={valueReport} />}
      {activeTab === 'movements' && <MovementsTab queryClient={queryClient} />}
      {activeTab === 'alerts' && <AlertsTab queryClient={queryClient} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY TAB
// ═══════════════════════════════════════════════════════════════════════════
function SummaryTab({ summary, lowStock, valueReport }: {
  summary: StockSummaryItem[];
  lowStock?: LowStockReport;
  valueReport?: InventoryValueReport;
}) {
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const filtered = summary.filter((item) => {
    if (filter === 'low') return item.is_low_stock && !item.is_out_of_stock;
    if (filter === 'out') return item.is_out_of_stock;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Value by category */}
      {valueReport && Object.keys(valueReport.by_category).length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-neutral-200 mb-3">Valor por categoría</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(valueReport.by_category).map(([cat, data]) => (
              <div key={cat} className="bg-neutral-800/50 rounded-lg p-3">
                <p className="text-sm font-medium text-white">{cat}</p>
                <p className="text-lg font-bold text-cyan-400">${data.value.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                <p className="text-xs text-neutral-500">{data.items} unidades</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            filter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-neutral-800 text-neutral-400 hover:text-white')}>
          Todos ({summary.length})
        </button>
        <button onClick={() => setFilter('low')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            filter === 'low' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-neutral-800 text-neutral-400 hover:text-white')}>
          Stock bajo ({lowStock?.count ?? 0})
        </button>
        <button onClick={() => setFilter('out')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            filter === 'out' ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-400 hover:text-white')}>
          Sin stock ({summary.filter(s => s.is_out_of_stock).length})
        </button>
      </div>

      {/* Stock table */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <ArchiveBoxIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No hay productos con inventario rastreado</p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/50">
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">SKU</th>
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">Producto</th>
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">Variante</th>
                    <th className="text-right text-xs font-medium text-neutral-400 px-4 py-3">Stock</th>
                    <th className="text-right text-xs font-medium text-neutral-400 px-4 py-3">Umbral</th>
                    <th className="text-center text-xs font-medium text-neutral-400 px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-neutral-400 px-4 py-3">Último mov.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.variant_id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-xs text-cyan-400 font-mono">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-neutral-400">{item.variant_name}</td>
                      <td className={cn('px-4 py-3 text-sm text-right font-semibold',
                        item.is_out_of_stock ? 'text-red-400' : item.is_low_stock ? 'text-yellow-400' : 'text-green-400')}>
                        {item.current_stock}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-500">{item.low_stock_threshold}</td>
                      <td className="px-4 py-3 text-center">
                        {item.is_out_of_stock ? (
                          <Badge variant="error" className="text-[10px]">Sin stock</Badge>
                        ) : item.is_low_stock ? (
                          <Badge variant="warning" className="text-[10px]">Bajo</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">OK</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-neutral-500">
                        {item.last_movement_date
                          ? new Date(item.last_movement_date).toLocaleDateString('es-MX')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((item) => (
              <Card key={item.variant_id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.product_name}</p>
                    <p className="text-xs text-neutral-400">{item.variant_name}</p>
                    <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{item.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-lg font-bold',
                      item.is_out_of_stock ? 'text-red-400' : item.is_low_stock ? 'text-yellow-400' : 'text-green-400')}>
                      {item.current_stock}
                    </p>
                    {item.is_out_of_stock ? (
                      <Badge variant="error" className="text-[10px]">Sin stock</Badge>
                    ) : item.is_low_stock ? (
                      <Badge variant="warning" className="text-[10px]">Bajo</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">OK</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVEMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════
function MovementsTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['inventory-movements', typeFilter, page],
    queryFn: () => getMovements({ movement_type: typeFilter || undefined, page }),
  });

  const movements = movementsData?.results ?? [];
  const totalPages = Math.ceil((movementsData?.count ?? 0) / 20);

  const [form, setForm] = useState<CreateMovementData>({
    variant_id: '',
    movement_type: 'IN',
    quantity: 1,
    reason: 'purchase',
    notes: '',
  });

  const createMut = useMutation({
    mutationFn: createMovement,
    onSuccess: () => {
      toast.success('Movimiento registrado');
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-value'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alert-counts'] });
      setShowModal(false);
    },
    onError: (err: { message?: string; data?: Record<string, unknown> }) => {
      const msg = err?.data
        ? Object.values(err.data).flat().join(', ')
        : err?.message || 'Error al registrar movimiento';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.variant_id) { toast.error('Ingresa el ID de la variante'); return; }
    createMut.mutate(form);
  };

  const getReasons = () => {
    if (form.movement_type === 'IN') return IN_REASONS;
    if (form.movement_type === 'OUT') return OUT_REASONS;
    return ADJUSTMENT_REASONS;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-neutral-400" />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg bg-neutral-800 border border-neutral-700 text-white px-3 py-1.5 text-xs">
            <option value="">Todos los tipos</option>
            <option value="IN">Entradas</option>
            <option value="OUT">Salidas</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </select>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex-shrink-0">
          <PlusIcon className="h-5 w-5 mr-1" /> Nuevo Movimiento
        </Button>
      </div>

      {isLoading ? (
        <Card className="text-center py-12">
          <p className="text-neutral-400">Cargando movimientos...</p>
        </Card>
      ) : movements.length === 0 ? (
        <Card className="text-center py-12">
          <ArchiveBoxIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No hay movimientos registrados</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowModal(true)}>Registrar primer movimiento</Button>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/50">
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">Fecha</th>
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">Tipo</th>
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">SKU</th>
                    <th className="text-right text-xs font-medium text-neutral-400 px-4 py-3">Cant.</th>
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">Razón</th>
                    <th className="text-right text-xs font-medium text-neutral-400 px-4 py-3">Antes</th>
                    <th className="text-right text-xs font-medium text-neutral-400 px-4 py-3">Después</th>
                    <th className="text-left text-xs font-medium text-neutral-400 px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-xs text-neutral-400">
                        {new Date(mov.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold flex items-center gap-1', MOVEMENT_TYPE_COLORS[mov.movement_type])}>
                          {mov.movement_type === 'IN' && <ArrowDownTrayIcon className="h-3.5 w-3.5" />}
                          {mov.movement_type === 'OUT' && <ArrowUpTrayIcon className="h-3.5 w-3.5" />}
                          {mov.movement_type === 'ADJUSTMENT' && <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />}
                          {MOVEMENT_TYPE_LABELS[mov.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-cyan-400 font-mono">{mov.variant?.sku || '—'}</td>
                      <td className={cn('px-4 py-3 text-sm text-right font-semibold', MOVEMENT_TYPE_COLORS[mov.movement_type])}>
                        {mov.movement_type === 'IN' ? '+' : mov.movement_type === 'OUT' ? '-' : '±'}{Math.abs(mov.quantity)}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400">{REASON_LABELS[mov.reason] || mov.reason}</td>
                      <td className="px-4 py-3 text-xs text-right text-neutral-500">{mov.stock_before}</td>
                      <td className="px-4 py-3 text-xs text-right text-white font-medium">{mov.stock_after}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500 max-w-[200px] truncate">{mov.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {movements.map((mov) => (
              <Card key={mov.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-semibold flex items-center gap-1', MOVEMENT_TYPE_COLORS[mov.movement_type])}>
                        {mov.movement_type === 'IN' && <ArrowDownTrayIcon className="h-3.5 w-3.5" />}
                        {mov.movement_type === 'OUT' && <ArrowUpTrayIcon className="h-3.5 w-3.5" />}
                        {mov.movement_type === 'ADJUSTMENT' && <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />}
                        {MOVEMENT_TYPE_LABELS[mov.movement_type]}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(mov.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                    <p className="text-xs text-cyan-400 font-mono">{mov.variant?.sku || '—'}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{REASON_LABELS[mov.reason] || mov.reason}</p>
                    {mov.notes && <p className="text-[10px] text-neutral-600 mt-0.5 truncate">{mov.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-lg font-bold', MOVEMENT_TYPE_COLORS[mov.movement_type])}>
                      {mov.movement_type === 'IN' ? '+' : mov.movement_type === 'OUT' ? '-' : '±'}{Math.abs(mov.quantity)}
                    </p>
                    <p className="text-[10px] text-neutral-500">{mov.stock_before} → {mov.stock_after}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm text-neutral-400 px-3 py-1">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          )}
        </>
      )}

      {/* New Movement Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Movimiento de Inventario" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ID de Variante"
            value={form.variant_id}
            onChange={(e) => setForm({ ...form, variant_id: e.target.value })}
            placeholder="UUID de la variante del catálogo"
            required
          />

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Tipo de movimiento <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {(['IN', 'OUT', 'ADJUSTMENT'] as const).map((type) => (
                <button key={type} type="button"
                  onClick={() => {
                    const reasons = type === 'IN' ? IN_REASONS : type === 'OUT' ? OUT_REASONS : ADJUSTMENT_REASONS;
                    setForm({ ...form, movement_type: type, reason: reasons[0] });
                  }}
                  className={cn('py-2 rounded-lg text-xs font-semibold transition-all border',
                    form.movement_type === type
                      ? type === 'IN' ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : type === 'OUT' ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white')}>
                  {type === 'IN' && '📥 Entrada'}
                  {type === 'OUT' && '📤 Salida'}
                  {type === 'ADJUSTMENT' && '🔧 Ajuste'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label={form.movement_type === 'ADJUSTMENT' ? 'Nuevo stock absoluto' : 'Cantidad'}
              value={form.quantity.toString()}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Razón <span className="text-red-400">*</span></label>
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-3 py-2 text-sm">
                {getReasons().map((r) => (
                  <option key={r} value={r}>{REASON_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-3 py-2 text-sm resize-none"
              rows={3} placeholder="Notas adicionales sobre el movimiento..." />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Registrando...' : 'Registrar Movimiento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS TAB
// ═══════════════════════════════════════════════════════════════════════════
function AlertsTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['inventory-active-alerts'],
    queryFn: getActiveAlerts,
  });

  const ackMut = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      toast.success('Alerta reconocida');
      queryClient.invalidateQueries({ queryKey: ['inventory-active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alert-counts'] });
    },
    onError: () => toast.error('Error al reconocer alerta'),
  });

  const resolveMut = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => {
      toast.success('Alerta resuelta');
      queryClient.invalidateQueries({ queryKey: ['inventory-active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alert-counts'] });
    },
    onError: () => toast.error('Error al resolver alerta'),
  });

  if (isLoading) return <Card className="text-center py-12"><p className="text-neutral-400">Cargando alertas...</p></Card>;

  if (alerts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500 mb-4" />
        <p className="text-neutral-400">No hay alertas activas — ¡todo en orden!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400">
        {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} activa{alerts.length !== 1 ? 's' : ''} de stock bajo.
      </p>

      <div className="grid gap-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{alert.variant?.product_name || 'Producto'}</p>
                <p className="text-xs text-neutral-400">{alert.variant?.name} · SKU: {alert.variant?.sku}</p>
                <p className="text-xs text-red-400 mt-1">
                  Stock actual: <strong>{alert.current_stock}</strong> · Umbral: {alert.threshold}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Creada: {new Date(alert.created_at).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => ackMut.mutate(alert.id)} disabled={ackMut.isPending}>
                  Reconocer
                </Button>
                <Button size="sm" onClick={() => resolveMut.mutate(alert.id)} disabled={resolveMut.isPending}>
                  Resolver
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
