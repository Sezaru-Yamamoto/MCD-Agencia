'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  SERVICE_IDS,
  ESPECTACULARES_TIPOS,
  FABRICACION_ANUNCIOS_TIPOS,
  PUBLICIDAD_MOVIL_SUBTIPOS,
  GRAN_FORMATO_MATERIALES,
  ROTULACION_TIPOS,
  OFFSET_PRODUCTOS,
  IMPRESION_TIPOS,
  SENALIZACION_TIPOS,
  CNC_LASER_TIPOS,
  DISENO_GRAFICO_TIPOS,
  SERVICE_LABELS,
  type ServiceId,
} from '@/lib/service-ids';

const RouteSelector = dynamic(
  () => import('@/components/landing/RouteSelector').then(mod => mod.RouteSelector),
  {
    ssr: false,
    loading: () => (
      <div className="w-full p-4 rounded-xl border-2 border-dashed border-cmyk-cyan/50 bg-neutral-900/30">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cmyk-cyan" />
          <span className="text-neutral-500 text-sm">Cargando mapa...</span>
        </div>
      </div>
    ),
  }
);

/* ─── Route types (same as QuoteForm) ──────────────────────────── */
interface RouteInfo {
  pointA: { name: string; lat: number; lon: number } | null;
  pointB: { name: string; lat: number; lon: number } | null;
  routeData: { coordinates: Array<[number, number]>; distance: number; duration: number } | null;
}

interface ConfigurableRouteEntry {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio: string;
  horarioFin: string;
  route: RouteInfo | null;
  precio: number; // price per route
}

interface EstablishedRouteEntry {
  id: string;
  ruta: string;
  fechaInicio: string;
  precio: number; // price per route
}

const createConfigurableRoute = (): ConfigurableRouteEntry => ({
  id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  fechaInicio: '',
  fechaFin: '',
  horarioInicio: '',
  horarioFin: '',
  route: null,
  precio: 0,
});

const createEstablishedRoute = (): EstablishedRouteEntry => ({
  id: `er-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  ruta: '',
  fechaInicio: '',
  precio: 0,
});

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

/* ─── Service details data shape ───────────────────────────────── */
export interface ServiceDetailsData {
  service_type: ServiceId | '';
  [key: string]: unknown;
}

/* ─── Props ─────────────────────────────────────────────────────── */
interface ServiceFormFieldsProps {
  /** Current service details (JSON object). The component calls onChange every time a field changes. */
  value: ServiceDetailsData;
  onChange: (details: ServiceDetailsData) => void;
  /** Whether to show a price field per route (for publicidad-movil) */
  showRoutePrices?: boolean;
  /** Called when total price derived from routes changes */
  onTotalPriceChange?: (total: number) => void;
  disabled?: boolean;
}

/* ─── Shared field styles ──────────────────────────────────────── */
const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan text-sm';
const labelCls = 'block text-neutral-400 text-xs mb-1';
const radioCls = 'text-cmyk-cyan';

/* ─── Helpers ──────────────────────────────────────────────────── */
const RadioGroup = ({ label, name, value, options, onChange, disabled }: {
  label: string; name: string; value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; disabled?: boolean;
}) => (
  <div>
    <label className={labelCls}>{label}</label>
    <div className="flex flex-wrap gap-3 mt-1">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-1.5 text-white text-sm cursor-pointer">
          <input type="radio" name={name} value={opt.value} checked={value === opt.value}
            onChange={() => onChange(opt.value)} className={radioCls} disabled={disabled} />
          {opt.label}
        </label>
      ))}
    </div>
  </div>
);

/* ─── Component ────────────────────────────────────────────────── */
export function ServiceFormFields({ value, onChange, showRoutePrices = true, onTotalPriceChange, disabled }: ServiceFormFieldsProps) {
  const serviceType = value.service_type as ServiceId | '';

  // Route state for publicidad-movil subtypes
  const [vallasRoutes, setVallasRoutes] = useState<ConfigurableRouteEntry[]>(() => {
    const existing = value._vallasRoutes as ConfigurableRouteEntry[] | undefined;
    return existing && existing.length > 0 ? existing : [createConfigurableRoute()];
  });
  const [pubRoutes, setPubRoutes] = useState<EstablishedRouteEntry[]>(() => {
    const existing = value._pubRoutes as EstablishedRouteEntry[] | undefined;
    return existing && existing.length > 0 ? existing : [createEstablishedRoute()];
  });
  const [perifoneoRoutes, setPerifoneoRoutes] = useState<ConfigurableRouteEntry[]>(() => {
    const existing = value._perifoneoRoutes as ConfigurableRouteEntry[] | undefined;
    return existing && existing.length > 0 ? existing : [createConfigurableRoute()];
  });

  // Helper to update a field
  const set = (key: string, v: unknown) => {
    onChange({ ...value, [key]: v });
  };

  // Sync route state back to parent whenever routes change
  useEffect(() => {
    const subtipo = value.subtipo as string | undefined;
    if (serviceType !== 'publicidad-movil') return;

    // Build serializable route data + calculate totals
    let totalFromRoutes = 0;
    if (subtipo === 'vallas-moviles') {
      totalFromRoutes = vallasRoutes.reduce((s, r) => s + (r.precio || 0), 0);
      onChange({
        ...value,
        _vallasRoutes: vallasRoutes,
        rutas: vallasRoutes.map((r, i) => ({
          numero: i + 1,
          fecha_inicio: r.fechaInicio || null,
          fecha_fin: r.fechaFin || null,
          horario_inicio: r.horarioInicio || null,
          horario_fin: r.horarioFin || null,
          precio: r.precio || 0,
          ruta: r.route ? {
            punto_a: r.route.pointA,
            punto_b: r.route.pointB,
            distancia_metros: r.route.routeData?.distance,
            duracion_segundos: r.route.routeData?.duration,
            coordenadas: r.route.routeData?.coordinates,
          } : null,
        })),
      });
    } else if (subtipo === 'publibuses') {
      totalFromRoutes = pubRoutes.reduce((s, r) => s + (r.precio || 0), 0);
      const meses = value.meses_campana as number | undefined;
      onChange({
        ...value,
        _pubRoutes: pubRoutes,
        rutas: pubRoutes.map((r, i) => ({
          numero: i + 1,
          ruta_preestablecida: r.ruta || null,
          fecha_inicio: r.fechaInicio || null,
          fecha_fin: r.fechaInicio && meses ? addMonths(r.fechaInicio, Number(meses)) : null,
          precio: r.precio || 0,
        })),
      });
    } else if (subtipo === 'perifoneo') {
      totalFromRoutes = perifoneoRoutes.reduce((s, r) => s + (r.precio || 0), 0);
      onChange({
        ...value,
        _perifoneoRoutes: perifoneoRoutes,
        rutas: perifoneoRoutes.map((r, i) => ({
          numero: i + 1,
          fecha_inicio: r.fechaInicio || null,
          fecha_fin: r.fechaFin || null,
          horario_inicio: r.horarioInicio || null,
          horario_fin: r.horarioFin || null,
          precio: r.precio || 0,
          ruta: r.route ? {
            punto_a: r.route.pointA,
            punto_b: r.route.pointB,
            distancia_metros: r.route.routeData?.distance,
            duracion_segundos: r.route.routeData?.duration,
            coordenadas: r.route.routeData?.coordinates,
          } : null,
        })),
      });
    }
    if (onTotalPriceChange) onTotalPriceChange(totalFromRoutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vallasRoutes, pubRoutes, perifoneoRoutes]);

  // Reset routes when service type changes
  useEffect(() => {
    if (serviceType !== 'publicidad-movil') return;
    // Only reset if the value doesn't already have route data
    if (!value._vallasRoutes) setVallasRoutes([createConfigurableRoute()]);
    if (!value._pubRoutes) setPubRoutes([createEstablishedRoute()]);
    if (!value._perifoneoRoutes) setPerifoneoRoutes([createConfigurableRoute()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

  const today = new Date().toISOString().split('T')[0];

  if (!serviceType) return null;

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  /* ── Render per service type ─────────────────────────────────── */

  // ── ESPECTACULARES ──
  if (serviceType === 'espectaculares') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de espectacular</label>
          <select value={(value.tipo as string) || ''} onChange={e => set('tipo', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {ESPECTACULARES_TIPOS.map(t => (
              <option key={t} value={t}>{t === 'unipolar' ? 'Unipolar' : t === 'azotea' ? 'Azotea' : t === 'mural' ? 'Mural publicitario' : 'Otro'}</option>
            ))}
          </select>
          {value.tipo === 'otro' && (
            <input value={(value.tipo_otro as string) || ''} onChange={e => set('tipo_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Ubicación</label>
          <input value={(value.ubicacion as string) || ''} onChange={e => set('ubicacion', e.target.value)}
            className={inputCls} placeholder="Dirección o zona" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Medidas (ancho × alto)</label>
          <input value={(value.medidas as string) || ''} onChange={e => set('medidas', e.target.value)}
            className={inputCls} placeholder="ej. 12m × 6m" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Tiempo de exhibición</label>
          <input value={(value.tiempo_exhibicion as string) || ''} onChange={e => set('tiempo_exhibicion', e.target.value)}
            className={inputCls} placeholder="ej. 3 meses" disabled={disabled} />
        </div>
        <RadioGroup label="¿Impresión incluida?" name="esp_imp" value={value.impresion_incluida as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('impresion_incluida', v)} disabled={disabled} />
        <RadioGroup label="¿Instalación incluida?" name="esp_inst" value={value.instalacion_incluida as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('instalacion_incluida', v)} disabled={disabled} />
      </div>
    );
  }

  // ── FABRICACIÓN DE ANUNCIOS ──
  if (serviceType === 'fabricacion-anuncios') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de anuncio</label>
          <select value={(value.tipo_anuncio as string) || ''} onChange={e => set('tipo_anuncio', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {FABRICACION_ANUNCIOS_TIPOS.map(t => (
              <option key={t} value={t}>
                {t === 'cajas-luz' ? 'Cajas de luz' : t === 'letras-3d' ? 'Letras 3D' : t === 'anuncios-2d' ? 'Anuncios 2D' : t === 'bastidores' ? 'Bastidores' : t === 'toldos' ? 'Toldos' : t === 'neon' ? 'Neón' : 'Otro'}
              </option>
            ))}
          </select>
          {value.tipo_anuncio === 'otro' && (
            <input value={(value.tipo_anuncio_otro as string) || ''} onChange={e => set('tipo_anuncio_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Medidas</label>
          <input value={(value.medidas as string) || ''} onChange={e => set('medidas', e.target.value)}
            className={inputCls} placeholder="ancho × alto × profundidad" disabled={disabled} />
        </div>
        <RadioGroup label="Uso" name="fab_uso" value={value.uso as string}
          options={[{ value: 'interior', label: 'Interior' }, { value: 'exterior', label: 'Exterior' }]}
          onChange={v => set('uso', v)} disabled={disabled} />
        <RadioGroup label="¿Iluminación?" name="fab_ilum" value={value.iluminacion as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('iluminacion', v)} disabled={disabled} />
        <RadioGroup label="¿Instalación incluida?" name="fab_inst" value={value.instalacion_incluida as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('instalacion_incluida', v)} disabled={disabled} />
      </div>
    );
  }

  // ── PUBLICIDAD MÓVIL ──
  if (serviceType === 'publicidad-movil') {
    const subtipo = value.subtipo as string | undefined;
    const mesesCampana = value.meses_campana as number | undefined;

    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Subtipo</label>
          <select value={subtipo || ''} onChange={e => set('subtipo', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona subtipo</option>
            <option value="vallas-moviles">Vallas móviles</option>
            <option value="publibuses">Publibuses</option>
            <option value="perifoneo">Perifoneo</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Otro */}
        {subtipo === 'otro' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-700/50">
            <div className="md:col-span-2">
              <label className={labelCls}>Tipo de publicidad móvil</label>
              <input value={(value.subtipo_otro as string) || ''} onChange={e => set('subtipo_otro', e.target.value)}
                className={inputCls} placeholder="Especifica el tipo" disabled={disabled} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Descripción del servicio</label>
              <textarea value={(value.descripcion as string) || ''} onChange={e => set('descripcion', e.target.value)}
                className={inputCls} rows={3} placeholder="Describe el servicio" disabled={disabled} />
            </div>
          </div>
        )}

        {/* Vallas móviles */}
        {subtipo === 'vallas-moviles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-700/50 overflow-hidden">
            <div>
              <label className={labelCls}>Cantidad de vallas</label>
              <input type="number" min="1" value={(value.cantidad as number) || ''} onChange={e => set('cantidad', parseInt(e.target.value) || '')}
                className={inputCls} placeholder="1" disabled={disabled} />
            </div>
            <div>
              <label className={labelCls}>Zona / ciudades</label>
              <input value={(value.zona as string) || ''} onChange={e => set('zona', e.target.value)}
                className={inputCls} placeholder="Zona o ciudades" disabled={disabled} />
            </div>
            <div>
              <label className={labelCls}>Duración de campaña</label>
              <input value={(value.tiempo_campana as string) || ''} onChange={e => set('tiempo_campana', e.target.value)}
                className={inputCls} placeholder="ej. 1 mes" disabled={disabled} />
            </div>
            <RadioGroup label="¿Impresión incluida?" name="vallas_imp" value={value.impresion_incluida as string}
              options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
              onChange={v => set('impresion_incluida', v)} disabled={disabled} />

            {/* Routes */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-cmyk-cyan flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  Rutas de circulación
                </h4>
                <span className="text-[10px] text-neutral-500">{vallasRoutes.length} ruta{vallasRoutes.length > 1 ? 's' : ''}</span>
              </div>

              {vallasRoutes.map((entry, idx) => (
                <div key={entry.id} className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-cmyk-cyan">Ruta {idx + 1}</span>
                    {vallasRoutes.length > 1 && (
                      <button type="button" onClick={() => setVallasRoutes(prev => prev.filter(r => r.id !== entry.id))}
                        className="text-red-400 hover:text-red-300 text-[10px]">Eliminar</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Fecha inicio</label>
                      <input type="date" className={inputCls} value={entry.fechaInicio} disabled={disabled}
                        onChange={e => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaInicio: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha fin</label>
                      <input type="date" className={inputCls} value={entry.fechaFin} disabled={disabled}
                        onChange={e => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaFin: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Horario inicio</label>
                      <input type="time" className={inputCls} value={entry.horarioInicio} disabled={disabled}
                        onChange={e => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioInicio: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Horario fin</label>
                      <input type="time" className={inputCls} value={entry.horarioFin} disabled={disabled}
                        onChange={e => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioFin: e.target.value } : r))} />
                    </div>
                  </div>
                  {showRoutePrices && (
                    <div>
                      <label className={labelCls}>Precio de esta ruta</label>
                      <input type="number" min="0" step="0.01" className={inputCls} value={entry.precio || ''} disabled={disabled}
                        onChange={e => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, precio: parseFloat(e.target.value) || 0 } : r))} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Trazar ruta en mapa (opcional)</label>
                    <RouteSelector onChange={route => setVallasRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, route } : r))} />
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => setVallasRoutes(prev => [...prev, createConfigurableRoute()])}
                className="w-full py-2 rounded-lg border-2 border-dashed border-cmyk-cyan/40 text-cmyk-cyan text-xs font-medium hover:bg-cmyk-cyan/10 transition-all flex items-center justify-center gap-1.5"
                disabled={disabled}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar otra ruta
              </button>
            </div>
          </div>
        )}

        {/* Publibuses */}
        {subtipo === 'publibuses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-700/50">
            <div>
              <label className={labelCls}>Ciudad / zona</label>
              <input value={(value.ciudad_zona as string) || ''} onChange={e => set('ciudad_zona', e.target.value)}
                className={inputCls} placeholder="Ciudad o zona" disabled={disabled} />
            </div>
            <div>
              <label className={labelCls}>Tiempo de campaña (meses)</label>
              <select value={mesesCampana || ''} onChange={e => set('meses_campana', parseInt(e.target.value) || '')} className={inputCls} disabled={disabled}>
                <option value="">Selecciona duración</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>
                ))}
              </select>
            </div>
            <RadioGroup label="¿Impresión incluida?" name="pub_imp" value={value.impresion_incluida as string}
              options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
              onChange={v => set('impresion_incluida', v)} disabled={disabled} />

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-cmyk-cyan">Rutas preestablecidas</h4>
                <span className="text-[10px] text-neutral-500">{pubRoutes.length} ruta{pubRoutes.length > 1 ? 's' : ''}</span>
              </div>

              {!mesesCampana && (
                <p className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-2 py-1.5">
                  ⚠️ Selecciona los meses de campaña para habilitar las fechas.
                </p>
              )}

              {pubRoutes.map((entry, idx) => (
                <div key={entry.id} className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-cmyk-cyan">Ruta {idx + 1}</span>
                    {pubRoutes.length > 1 && (
                      <button type="button" onClick={() => setPubRoutes(prev => prev.filter(r => r.id !== entry.id))}
                        className="text-red-400 hover:text-red-300 text-[10px]">Eliminar</button>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Ruta preestablecida</label>
                    <select className={inputCls} value={entry.ruta} disabled={disabled}
                      onChange={e => setPubRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, ruta: e.target.value } : r))}>
                      <option value="">Selecciona una ruta</option>
                      <option value="zocalo-base">Zócalo Base</option>
                      <option value="colosio-zocalo">Colosio Zócalo</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Fecha inicio</label>
                      <input type="date" className={inputCls} min={today} value={entry.fechaInicio}
                        disabled={disabled || !mesesCampana}
                        onChange={e => setPubRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaInicio: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha fin (auto)</label>
                      <input type="date" className={`${inputCls} cursor-default`} readOnly
                        value={entry.fechaInicio && mesesCampana ? addMonths(entry.fechaInicio, Number(mesesCampana)) : ''} />
                    </div>
                  </div>
                  {showRoutePrices && (
                    <div>
                      <label className={labelCls}>Precio de esta ruta</label>
                      <input type="number" min="0" step="0.01" className={inputCls} value={entry.precio || ''} disabled={disabled}
                        onChange={e => setPubRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, precio: parseFloat(e.target.value) || 0 } : r))} />
                    </div>
                  )}

                  {entry.ruta && (
                    <div className="rounded-lg overflow-hidden border border-cmyk-cyan/30">
                      <iframe
                        src={entry.ruta === 'zocalo-base'
                          ? 'https://www.google.com/maps/d/embed?mid=1VXvDDqbLCqv54dbwkmtfNs8XKjUxzvo&ll=16.835724183151132%2C-99.87844209999999&z=13'
                          : 'https://www.google.com/maps/d/embed?mid=1NrsT2SEvgGKOh7NusgOHD6-NJd4h1GE&ll=16.82830914325928%2C-99.85695&z=13'}
                        width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy"
                        title={entry.ruta === 'zocalo-base' ? 'Ruta Zócalo Base' : 'Ruta Colosio Zócalo'} />
                    </div>
                  )}
                </div>
              ))}

              <button type="button" onClick={() => setPubRoutes(prev => [...prev, createEstablishedRoute()])}
                className="w-full py-2 rounded-lg border-2 border-dashed border-cmyk-cyan/40 text-cmyk-cyan text-xs font-medium hover:bg-cmyk-cyan/10 transition-all flex items-center justify-center gap-1.5"
                disabled={disabled}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar otra ruta
              </button>
            </div>
          </div>
        )}

        {/* Perifoneo */}
        {subtipo === 'perifoneo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-700/50 overflow-hidden">
            <div>
              <label className={labelCls}>Zona de cobertura</label>
              <input value={(value.zona_cobertura as string) || ''} onChange={e => set('zona_cobertura', e.target.value)}
                className={inputCls} placeholder="Colonia, municipio o área" disabled={disabled} />
            </div>
            <div>
              <label className={labelCls}>Duración total</label>
              <input value={(value.duracion as string) || ''} onChange={e => set('duracion', e.target.value)}
                className={inputCls} placeholder="ej. 4 horas / 2 días" disabled={disabled} />
            </div>
            <RadioGroup label="¿Archivo de grabación proporcionado?" name="peri_arch" value={value.archivo_grabacion as string}
              options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
              onChange={v => set('archivo_grabacion', v)} disabled={disabled} />
            <RadioGroup label="¿Requiere grabación por proveedor?" name="peri_grab" value={value.requiere_grabacion as string}
              options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
              onChange={v => set('requiere_grabacion', v)} disabled={disabled} />

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-cmyk-cyan">Rutas de perifoneo</h4>
                <span className="text-[10px] text-neutral-500">{perifoneoRoutes.length} ruta{perifoneoRoutes.length > 1 ? 's' : ''}</span>
              </div>

              {perifoneoRoutes.map((entry, idx) => (
                <div key={entry.id} className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-cmyk-cyan">Ruta {idx + 1}</span>
                    {perifoneoRoutes.length > 1 && (
                      <button type="button" onClick={() => setPerifoneoRoutes(prev => prev.filter(r => r.id !== entry.id))}
                        className="text-red-400 hover:text-red-300 text-[10px]">Eliminar</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Fecha inicio</label>
                      <input type="date" className={inputCls} value={entry.fechaInicio} disabled={disabled}
                        onChange={e => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaInicio: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha fin</label>
                      <input type="date" className={inputCls} value={entry.fechaFin} disabled={disabled}
                        onChange={e => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, fechaFin: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Horario inicio</label>
                      <input type="time" className={inputCls} value={entry.horarioInicio} disabled={disabled}
                        onChange={e => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioInicio: e.target.value } : r))} />
                    </div>
                    <div>
                      <label className={labelCls}>Horario fin</label>
                      <input type="time" className={inputCls} value={entry.horarioFin} disabled={disabled}
                        onChange={e => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, horarioFin: e.target.value } : r))} />
                    </div>
                  </div>
                  {showRoutePrices && (
                    <div>
                      <label className={labelCls}>Precio de esta ruta</label>
                      <input type="number" min="0" step="0.01" className={inputCls} value={entry.precio || ''} disabled={disabled}
                        onChange={e => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, precio: parseFloat(e.target.value) || 0 } : r))} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Trazar ruta en mapa (opcional)</label>
                    <RouteSelector onChange={route => setPerifoneoRoutes(prev => prev.map(r => r.id === entry.id ? { ...r, route } : r))} />
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => setPerifoneoRoutes(prev => [...prev, createConfigurableRoute()])}
                className="w-full py-2 rounded-lg border-2 border-dashed border-cmyk-cyan/40 text-cmyk-cyan text-xs font-medium hover:bg-cmyk-cyan/10 transition-all flex items-center justify-center gap-1.5"
                disabled={disabled}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar otra ruta
              </button>
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Descripción de zona</label>
              <textarea value={(value.delimitacion_zona as string) || ''} onChange={e => set('delimitacion_zona', e.target.value)}
                className={inputCls} rows={2} placeholder="Calles, colonias o puntos de referencia" disabled={disabled} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── IMPRESIÓN GRAN FORMATO ──
  if (serviceType === 'impresion-gran-formato') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Material</label>
          <select value={(value.material as string) || ''} onChange={e => set('material', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona material</option>
            {GRAN_FORMATO_MATERIALES.map(m => (
              <option key={m} value={m}>{m === 'otro' ? 'Otro' : m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          {value.material === 'otro' && (
            <input value={(value.material_otro as string) || ''} onChange={e => set('material_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el material" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Medidas</label>
          <input value={(value.medidas as string) || ''} onChange={e => set('medidas', e.target.value)}
            className={inputCls} placeholder="ancho × alto" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" min="1" value={(value.cantidad as number) || ''} onChange={e => set('cantidad', parseInt(e.target.value) || '')}
            className={inputCls} placeholder="1" disabled={disabled} />
        </div>
        <RadioGroup label="¿Archivo listo para imprimir?" name="igf_arch" value={value.archivo_listo as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('archivo_listo', v)} disabled={disabled} />
      </div>
    );
  }

  // ── SEÑALIZACIÓN ──
  if (serviceType === 'senalizacion') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de señalización</label>
          <select value={(value.tipo as string) || ''} onChange={e => set('tipo', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {SENALIZACION_TIPOS.map(t => (
              <option key={t} value={t}>{t === 'interior' ? 'Interior' : t === 'exterior' ? 'Exterior' : t === 'vial' ? 'Vial' : 'Otro'}</option>
            ))}
          </select>
          {value.tipo === 'otro' && (
            <input value={(value.tipo_otro as string) || ''} onChange={e => set('tipo_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Medidas</label>
          <input value={(value.medidas as string) || ''} onChange={e => set('medidas', e.target.value)}
            className={inputCls} placeholder="ancho × alto" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" min="1" value={(value.cantidad as number) || ''} onChange={e => set('cantidad', parseInt(e.target.value) || '')}
            className={inputCls} placeholder="1" disabled={disabled} />
        </div>
        <RadioGroup label="¿Instalación incluida?" name="sen_inst" value={value.instalacion_incluida as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('instalacion_incluida', v)} disabled={disabled} />
      </div>
    );
  }

  // ── ROTULACIÓN VEHICULAR ──
  if (serviceType === 'rotulacion-vehicular') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de vehículo</label>
          <input value={(value.tipo_vehiculo as string) || ''} onChange={e => set('tipo_vehiculo', e.target.value)}
            className={inputCls} placeholder="ej. Camioneta, Sedán, Autobús" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Tipo de rotulación</label>
          <select value={(value.tipo_rotulacion as string) || ''} onChange={e => set('tipo_rotulacion', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {ROTULACION_TIPOS.map(t => (
              <option key={t} value={t}>
                {t === 'completa' ? 'Completa' : t === 'parcial' ? 'Parcial' : t === 'vinil-recortado' ? 'Vinil recortado' : t === 'impresion-digital' ? 'Impresión digital' : 'Otro'}
              </option>
            ))}
          </select>
          {value.tipo_rotulacion === 'otro' && (
            <input value={(value.tipo_rotulacion_otro as string) || ''} onChange={e => set('tipo_rotulacion_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <RadioGroup label="¿Diseño incluido?" name="rot_dis" value={value.diseno_incluido as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('diseno_incluido', v)} disabled={disabled} />
      </div>
    );
  }

  // ── CORTE Y GRABADO CNC/LÁSER ──
  if (serviceType === 'corte-grabado-cnc-laser') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de servicio</label>
          <select value={(value.tipo as string) || ''} onChange={e => set('tipo', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {CNC_LASER_TIPOS.map(t => (
              <option key={t} value={t}>{t === 'router-cnc' ? 'Router CNC' : t === 'corte-laser' ? 'Corte Láser' : t === 'grabado-laser' ? 'Grabado Láser' : 'Otro'}</option>
            ))}
          </select>
          {value.tipo === 'otro' && (
            <input value={(value.tipo_otro as string) || ''} onChange={e => set('tipo_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Medidas</label>
          <input value={(value.medidas as string) || ''} onChange={e => set('medidas', e.target.value)}
            className={inputCls} placeholder="ancho × alto × espesor" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" min="1" value={(value.cantidad as number) || ''} onChange={e => set('cantidad', parseInt(e.target.value) || '')}
            className={inputCls} placeholder="1" disabled={disabled} />
        </div>
        <RadioGroup label="¿Archivo listo?" name="cnc_arch" value={value.archivo_listo as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('archivo_listo', v)} disabled={disabled} />
      </div>
    );
  }

  // ── DISEÑO GRÁFICO ──
  if (serviceType === 'diseno-grafico') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de diseño</label>
          <select value={(value.tipo as string) || ''} onChange={e => set('tipo', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {DISENO_GRAFICO_TIPOS.map(t => (
              <option key={t} value={t}>{t === 'logotipos' ? 'Logotipos' : t === 'papeleria' ? 'Papelería' : t === 'redes-sociales' ? 'Redes Sociales' : 'Otro'}</option>
            ))}
          </select>
          {value.tipo === 'otro' && (
            <input value={(value.tipo_otro as string) || ''} onChange={e => set('tipo_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Número de piezas</label>
          <input type="number" min="1" value={(value.numero_piezas as number) || ''} onChange={e => set('numero_piezas', parseInt(e.target.value) || '')}
            className={inputCls} placeholder="1" disabled={disabled} />
        </div>
        <RadioGroup label="Uso del diseño" name="dis_uso" value={value.uso as string}
          options={[{ value: 'impresion', label: 'Impresión' }, { value: 'digital', label: 'Digital' }, { value: 'ambos', label: 'Ambos' }]}
          onChange={v => set('uso', v)} disabled={disabled} />
        <RadioGroup label="¿Cambios incluidos?" name="dis_cambios" value={value.cambios_incluidos as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('cambios_incluidos', v)} disabled={disabled} />
      </div>
    );
  }

  // ── IMPRESIÓN OFFSET/SERIGRAFÍA ──
  if (serviceType === 'impresion-offset-serigrafia') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Producto</label>
          <select value={(value.producto as string) || ''} onChange={e => set('producto', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona producto</option>
            {OFFSET_PRODUCTOS.map(p => (
              <option key={p} value={p}>{p === 'tarjetas-presentacion' ? 'Tarjetas de presentación' : p === 'volantes' ? 'Volantes' : 'Otro'}</option>
            ))}
          </select>
          {value.producto === 'otro' && (
            <input value={(value.producto_otro as string) || ''} onChange={e => set('producto_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el producto" disabled={disabled} />
          )}
        </div>
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" min="1" value={(value.cantidad as number) || ''} onChange={e => set('cantidad', parseInt(e.target.value) || '')}
            className={inputCls} placeholder="100" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Tipo</label>
          <select value={(value.tipo_impresion as string) || ''} onChange={e => set('tipo_impresion', e.target.value)} className={inputCls} disabled={disabled}>
            <option value="">Selecciona tipo</option>
            {IMPRESION_TIPOS.map(t => (
              <option key={t} value={t}>{t === 'tarjetas-presentacion' ? 'Tarjetas' : t === 'volantes' ? 'Volantes' : 'Otro'}</option>
            ))}
          </select>
          {value.tipo_impresion === 'otro' && (
            <input value={(value.tipo_impresion_otro as string) || ''} onChange={e => set('tipo_impresion_otro', e.target.value)}
              className={`${inputCls} mt-1`} placeholder="Especifica el tipo" disabled={disabled} />
          )}
        </div>
        <RadioGroup label="¿Archivo listo para imprimir?" name="off_arch" value={value.archivo_listo as string}
          options={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]}
          onChange={v => set('archivo_listo', v)} disabled={disabled} />
      </div>
    );
  }

  // ── OTROS ──
  if (serviceType === 'otros') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Tipo de servicio</label>
          <input value={(value.tipo_servicio as string) || ''} onChange={e => set('tipo_servicio', e.target.value)}
            className={inputCls} placeholder="Describe brevemente el tipo de servicio" disabled={disabled} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Descripción detallada</label>
          <textarea value={(value.descripcion as string) || ''} onChange={e => set('descripcion', e.target.value)}
            className={inputCls} rows={3} placeholder="Especificaciones, materiales, acabados..." disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Medidas (si aplica)</label>
          <input value={(value.medidas as string) || ''} onChange={e => set('medidas', e.target.value)}
            className={inputCls} placeholder="ej. 2m × 1m" disabled={disabled} />
        </div>
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" min="1" value={(value.cantidad as number) || ''} onChange={e => set('cantidad', parseInt(e.target.value) || '')}
            className={inputCls} placeholder="1" disabled={disabled} />
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Helper: Build ServiceDetailsData from a QuoteRequest's service_details ── */
export function serviceDetailsFromRequest(
  serviceType: string,
  serviceDetails: Record<string, unknown>
): ServiceDetailsData {
  return {
    service_type: serviceType as ServiceId,
    ...serviceDetails,
  };
}

/* ─── Helper: Clean service_details for API (strip internal route state) ────── */
export function cleanServiceDetailsForApi(details: ServiceDetailsData): Record<string, unknown> | null {
  if (!details.service_type) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _vallasRoutes, _pubRoutes, _perifoneoRoutes, ...rest } = details;
  return rest;
}
