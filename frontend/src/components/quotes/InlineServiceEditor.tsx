'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  MapPinIcon,
  CalendarDaysIcon,
  PaperClipIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';

import { ServiceFormFields, type ServiceDetailsData, cleanServiceDetailsForApi } from './ServiceFormFields';
import {
  type ServiceId,
  SERVICE_LABELS,
  DELIVERY_METHODS,
  DELIVERY_METHOD_LABELS,
  DELIVERY_METHOD_ICONS,
  type DeliveryMethod,
  getDeliveryMethodsForService,
} from '@/lib/service-ids';
import { getBranches, type Branch } from '@/lib/api/content';

/* ---------- helpers ---------- */

const addBusinessDays = (from: Date, days: number): string => {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result.toISOString().split('T')[0];
};

const SERVICE_MIN_BUSINESS_DAYS: Record<string, number> = {
  'impresion-gran-formato': 1,
  'impresion-offset-serigrafia': 5,
};

const getMinDateForService = (service: string): string => {
  if (!service) return new Date().toISOString().split('T')[0];
  const days = SERVICE_MIN_BUSINESS_DAYS[service] ?? 8;
  return addBusinessDays(new Date(), days);
};

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.ai', '.cdr', '.dxf', '.svg', '.mp3', '.wav', '.ogg', '.m4a'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ---------- types ---------- */

export interface ServiceEditData {
  /** The service type slug */
  serviceType: ServiceId | '';
  /** service_details bag (matches ServiceFormFields state) */
  details: ServiceDetailsData;
  /** Delivery method */
  deliveryMethod: DeliveryMethod | '';
  /** Delivery address object (for installation / shipping) */
  deliveryAddress: Record<string, string>;
  /** Pickup branch id */
  pickupBranch: string;
  /** Customer-required date (YYYY-MM-DD) */
  requiredDate: string;
  /** Customer comments for this service */
  comments: string;
  /** New files attached by customer */
  newFiles: File[];
  /** Existing attachment URLs (from original quote) */
  existingAttachments: Array<{ id: string; file: string; filename: string }>;
  /** Attachments marked for removal */
  removedAttachmentIds: string[];
}

interface InlineServiceEditorProps {
  /** Initial data to populate the editor */
  initial: ServiceEditData;
  /** Index / label for display (e.g. "Servicio 1") */
  label: string;
  /** Called when the user saves changes for this service */
  onSave: (data: ServiceEditData) => void;
  /** Called when the user cancels editing */
  onCancel: () => void;
  /** Called when the user wants to delete this service */
  onDelete: () => void;
  /** Whether this is a vendor-added service (shows badge, some fields non-editable) */
  isVendorAdded?: boolean;
  /** Estimated delivery date set by vendor (read-only) */
  vendorEstimatedDate?: string;
}

/* ================================================================
   Component
   ================================================================ */

export function InlineServiceEditor({
  initial,
  label,
  onSave,
  onCancel,
  onDelete,
  isVendorAdded = false,
  vendorEstimatedDate,
}: InlineServiceEditorProps) {
  /* ---- state ---- */
  const [data, setData] = useState<ServiceEditData>(initial);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  /* ---- sync when initial prop changes (covers stale-initial-value) ---- */
  const initialRef = useRef(initial);
  useEffect(() => {
    // Only sync if the initial prop materially changed (different service_type or details)
    const prev = initialRef.current;
    const hasRicherDetails = initial.details && Object.keys(initial.details).length > Object.keys(prev.details || {}).length;
    const serviceTypeChanged = initial.serviceType !== prev.serviceType;
    const deliveryChanged = initial.deliveryMethod !== prev.deliveryMethod;
    const addressChanged = JSON.stringify(initial.deliveryAddress) !== JSON.stringify(prev.deliveryAddress);
    const branchChanged = initial.pickupBranch !== prev.pickupBranch;
    const dateChanged = initial.requiredDate !== prev.requiredDate;
    if (hasRicherDetails || serviceTypeChanged || deliveryChanged || addressChanged || branchChanged || dateChanged) {
      setData(initial);
      initialRef.current = initial;
    }
  }, [initial]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- fetch branches on mount ---- */
  useEffect(() => {
    let cancelled = false;
    setBranchesLoading(true);
    getBranches()
      .then((b) => { if (!cancelled) setBranches(b); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBranchesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ---- helpers ---- */
  const update = useCallback(<K extends keyof ServiceEditData>(key: K, val: ServiceEditData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleDetailsChange = useCallback((details: ServiceDetailsData) => {
    setData((prev) => ({ ...prev, details }));
  }, []);

  const handleDeliveryMethodChange = useCallback((method: DeliveryMethod | '') => {
    setData((prev) => ({
      ...prev,
      deliveryMethod: method,
      // reset address / branch when switching method
      deliveryAddress: method === prev.deliveryMethod ? prev.deliveryAddress : {},
      pickupBranch: method === prev.deliveryMethod ? prev.pickupBranch : '',
    }));
  }, []);

  /* ---- file handling ---- */
  const handleFileChange = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const valid: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
      if (f.size > MAX_FILE_SIZE) continue;
      valid.push(f);
    }
    if (valid.length > 0) {
      setData((prev) => ({ ...prev, newFiles: [...prev.newFiles, ...valid] }));
    }
  }, []);

  const removeNewFile = useCallback((idx: number) => {
    setData((prev) => ({ ...prev, newFiles: prev.newFiles.filter((_, i) => i !== idx) }));
  }, []);

  const removeExistingAttachment = useCallback((attachmentId: string) => {
    setData((prev) => ({
      ...prev,
      removedAttachmentIds: [...prev.removedAttachmentIds, attachmentId],
    }));
  }, []);

  /* ---- computed ---- */
  const serviceType = data.details.service_type as ServiceId | '';
  const availableMethods = useMemo(
    () => getDeliveryMethodsForService(serviceType, data.details.subtipo as string | undefined),
    [serviceType, data.details.subtipo]
  );
  const isSingleNotApplicable = availableMethods.length === 1 && availableMethods[0] === 'not_applicable';
  const minDate = useMemo(() => getMinDateForService(serviceType), [serviceType]);
  const isRouteBasedPubMovil = serviceType === 'publicidad-movil' &&
    ['vallas-moviles', 'publibuses', 'perifoneo'].includes(data.details.subtipo as string || '');

  const visibleAttachments = useMemo(
    () => data.existingAttachments.filter((a) => !data.removedAttachmentIds.includes(a.id)),
    [data.existingAttachments, data.removedAttachmentIds]
  );

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === data.pickupBranch),
    [branches, data.pickupBranch]
  );

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="space-y-5 rounded-xl border-2 border-cmyk-cyan/30 bg-neutral-900/60 p-4 sm:p-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">{label}</h3>
          {isVendorAdded && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
              Agregado por el vendedor
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
          Eliminar servicio
        </button>
      </div>

      {/* ---- Service details fields (ServiceFormFields) ---- */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4">
        <ServiceFormFields
          value={data.details}
          onChange={handleDetailsChange}
          disabled={false}
          hideRoutePricing
        />
      </div>

      {/* ---- Delivery method ---- */}
      {!isSingleNotApplicable && (
        <div className="space-y-3 border border-neutral-700 rounded-xl p-4 bg-neutral-800/30">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-cmyk-cyan" />
            Método de entrega
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
            {availableMethods.filter((m) => m !== 'not_applicable').map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleDeliveryMethodChange(data.deliveryMethod === method ? '' : method as DeliveryMethod)}
                className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                  data.deliveryMethod === method
                    ? 'border-cmyk-magenta bg-cmyk-magenta/15 text-white ring-2 ring-cmyk-magenta/50'
                    : 'border-neutral-600 bg-neutral-800 text-neutral-300 hover:border-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <span className="text-lg">{DELIVERY_METHOD_ICONS[method as DeliveryMethod]}</span>
                <span>{DELIVERY_METHOD_LABELS[method as DeliveryMethod]?.es || method}</span>
              </button>
            ))}
          </div>

          {/* Address form for installation / shipping */}
          {(data.deliveryMethod === 'installation' || data.deliveryMethod === 'shipping') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-neutral-400">Calle *</label>
                <input type="text" value={data.deliveryAddress.calle || ''}
                  onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, calle: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                  placeholder="Calle" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400">No. Ext *</label>
                  <input type="text" value={data.deliveryAddress.numero_exterior || ''}
                    onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, numero_exterior: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                    placeholder="#" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">No. Int</label>
                  <input type="text" value={data.deliveryAddress.numero_interior || ''}
                    onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, numero_interior: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                    placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Colonia *</label>
                <input type="text" value={data.deliveryAddress.colonia || ''}
                  onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, colonia: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                  placeholder="Colonia" />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Ciudad *</label>
                <input type="text" value={data.deliveryAddress.ciudad || ''}
                  onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, ciudad: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                  placeholder="Ciudad" />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Estado *</label>
                <input type="text" value={data.deliveryAddress.estado || ''}
                  onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, estado: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                  placeholder="Estado" />
              </div>
              <div>
                <label className="text-xs text-neutral-400">C.P. *</label>
                <input type="text" value={data.deliveryAddress.codigo_postal || ''}
                  onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, codigo_postal: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                  placeholder="C.P." maxLength={5} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-neutral-400">Referencia</label>
                <input type="text" value={data.deliveryAddress.referencia || ''}
                  onChange={(e) => update('deliveryAddress', { ...data.deliveryAddress, referencia: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
                  placeholder="Punto de referencia (opcional)" />
              </div>
            </div>
          )}

          {/* Branch picker for pickup */}
          {data.deliveryMethod === 'pickup' && (
            <div className="mt-3 space-y-2">
              {branchesLoading ? (
                <p className="text-neutral-400 text-sm">Cargando sucursales…</p>
              ) : branches.length === 0 ? (
                <p className="text-neutral-400 text-sm">No hay sucursales disponibles.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => update('pickupBranch', data.pickupBranch === branch.id ? '' : branch.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        data.pickupBranch === branch.id
                          ? 'border-cmyk-magenta bg-cmyk-magenta/10 ring-2 ring-cmyk-magenta/50'
                          : 'border-neutral-600 bg-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <p className="font-medium text-white text-sm">{branch.name}</p>
                      <p className="text-neutral-400 text-xs mt-0.5">{branch.full_address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Digital delivery confirmation */}
          {data.deliveryMethod === 'digital' && (
            <p className="text-sm text-neutral-400 mt-2">
              ✅ La entrega será de forma digital (correo electrónico o enlace de descarga).
            </p>
          )}
        </div>
      )}

      {/* ---- Required date ---- */}
      {!isRouteBasedPubMovil && (
        <div className="space-y-2 border border-neutral-700 rounded-xl p-4 bg-neutral-800/30">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 text-cmyk-cyan" />
            Fecha requerida
          </label>
          <input
            type="date"
            value={data.requiredDate}
            min={minDate}
            onChange={(e) => update('requiredDate', e.target.value)}
            className="w-full sm:w-auto rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50"
          />
          <p className="text-xs text-amber-400/80">
            ⏱️ Tiempo mínimo: {SERVICE_MIN_BUSINESS_DAYS[serviceType] ?? 8} días hábiles
          </p>
        </div>
      )}

      {/* ---- Vendor estimated delivery (read-only) ---- */}
      {vendorEstimatedDate && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CalendarDaysIcon className="h-4 w-4 text-green-400" />
          <span className="text-sm text-neutral-300">Fecha de entrega estimada:</span>
          <span className="text-sm font-semibold text-green-400">{vendorEstimatedDate}</span>
        </div>
      )}

      {/* ---- Comments ---- */}
      <div className="space-y-2 border border-neutral-700 rounded-xl p-4 bg-neutral-800/30">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-4 w-4 text-cmyk-cyan" />
          Comentarios
        </label>
        <textarea
          value={data.comments}
          onChange={(e) => update('comments', e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-cmyk-cyan focus:ring-1 focus:ring-cmyk-cyan/50 resize-none"
          placeholder="Describe los cambios o especificaciones adicionales…"
        />
        <p className="text-xs text-neutral-500 text-right">{data.comments.length} / 2000</p>
      </div>

      {/* ---- Attachments ---- */}
      <div className="space-y-3 border border-neutral-700 rounded-xl p-4 bg-neutral-800/30">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <PaperClipIcon className="h-4 w-4 text-cmyk-cyan" />
          Archivos adjuntos
        </label>

        {/* Existing attachments */}
        {visibleAttachments.length > 0 && (
          <div className="space-y-1">
            {visibleAttachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/60">
                <a href={att.file} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-cmyk-cyan hover:underline truncate flex-1">
                  📎 {att.filename}
                </a>
                <button type="button" onClick={() => removeExistingAttachment(att.id)}
                  className="ml-2 text-red-400 hover:text-red-300 text-xs flex-shrink-0">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New files */}
        {data.newFiles.length > 0 && (
          <div className="space-y-1">
            {data.newFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/60">
                <span className="text-sm text-white truncate flex-1">
                  📄 {f.name} <span className="text-neutral-500">({(f.size / 1024).toFixed(0)} KB)</span>
                </span>
                <button type="button" onClick={() => removeNewFile(i)}
                  className="ml-2 text-red-400 hover:text-red-300 text-xs flex-shrink-0">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-cmyk-magenta bg-cmyk-magenta/10'
              : 'border-neutral-600 hover:border-cmyk-magenta hover:bg-cmyk-magenta/5'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); }}
        >
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={(e) => { handleFileChange(e.target.files); e.target.value = ''; }}
            accept=".pdf,.jpg,.jpeg,.png,.ai,.cdr,.dxf,.svg,.mp3,.wav,.ogg,.m4a" />
          <PlusIcon className="h-6 w-6 text-neutral-400 mx-auto" />
          <p className="text-white font-medium text-sm mt-1">Arrastra archivos o haz clic</p>
          <p className="text-neutral-500 text-xs mt-0.5">PDF, JPG, PNG, AI, CDR, DXF, SVG, MP3, WAV (max 10MB)</p>
        </div>
      </div>

      {/* ---- Action buttons ---- */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 border border-neutral-600 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(data)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-cmyk-cyan hover:bg-cmyk-cyan/80 transition-colors"
        >
          <CheckIcon className="h-4 w-4" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Helper: Build ServiceEditData from existing quote data
   ================================================================ */

/**
 * Build an InlineServiceEditor initial state from a QuoteRequestService
 * and its matched QuoteLines.
 */
export function buildServiceEditData(opts: {
  serviceType: string;
  serviceDetails: Record<string, unknown> | undefined;
  deliveryMethod?: string;
  deliveryAddress?: Record<string, string>;
  pickupBranch?: string;
  requiredDate?: string;
  comments?: string;
  attachments?: Array<{ id: string; file: string; filename: string }>;
}): ServiceEditData {
  return {
    serviceType: (opts.serviceType || '') as ServiceId | '',
    details: {
      service_type: (opts.serviceType || '') as ServiceId | '',
      ...((opts.serviceDetails || {}) as Record<string, unknown>),
    } as ServiceDetailsData,
    deliveryMethod: (opts.deliveryMethod || '') as DeliveryMethod | '',
    deliveryAddress: opts.deliveryAddress || {},
    pickupBranch: opts.pickupBranch || '',
    requiredDate: opts.requiredDate || '',
    comments: opts.comments || '',
    newFiles: [],
    existingAttachments: opts.attachments || [],
    removedAttachmentIds: [],
  };
}
