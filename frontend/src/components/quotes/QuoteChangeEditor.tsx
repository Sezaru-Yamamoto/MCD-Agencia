'use client';

import { useState, useMemo, useRef } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  InformationCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button, Card } from '@/components/ui';
import { QuoteLine, ProposedLine, SubmitChangeRequestData } from '@/lib/api/quotes';
import {
  SERVICE_LABELS,
  SERVICE_SUBCATEGORIES,
  SERVICE_IDS,
  type ServiceId,
} from '@/lib/service-ids';

interface EditingLine extends QuoteLine {
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
  newQuantity?: number;
  newDescription?: string;
  newConcept?: string;
  serviceType?: string;
  subtype?: string;
  dimensions?: string;
}

interface NewItemForm {
  serviceType: ServiceId | '';
  subtype: string;
  dimensions: string;
  quantity: number;
  unit: string;
  description: string;
}

const INITIAL_NEW_ITEM: NewItemForm = {
  serviceType: '',
  subtype: '',
  dimensions: '',
  quantity: 1,
  unit: 'pz',
  description: '',
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

interface QuoteChangeEditorProps {
  lines: QuoteLine[];
  onSubmit: (data: SubmitChangeRequestData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function QuoteChangeEditor({
  lines,
  onSubmit,
  onCancel,
  isSubmitting,
}: QuoteChangeEditorProps) {
  // Convert QuoteLine[] to EditingLine[] with editable state
  const [editingLines, setEditingLines] = useState<EditingLine[]>(() =>
    lines.map((line) => ({ ...line }))
  );
  const [newLines, setNewLines] = useState<EditingLine[]>([]);
  const [customerComments, setCustomerComments] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemForm, setNewItemForm] = useState<NewItemForm>(INITIAL_NEW_ITEM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate if there are any changes
  const hasChanges = useMemo(() => {
    const hasModifiedLines = editingLines.some(
      (line) => line.isModified || line.isDeleted
    );
    const hasNewLines = newLines.length > 0;
    return hasModifiedLines || hasNewLines;
  }, [editingLines, newLines]);

  // Calculate remaining lines (not deleted)
  const remainingLinesCount = useMemo(() => {
    return editingLines.filter((line) => !line.isDeleted).length + newLines.length;
  }, [editingLines, newLines]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(num || 0);
  };

  const handleModifyLine = (lineId: string, field: 'quantity' | 'description', value: string | number) => {
    setEditingLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;

        const originalLine = lines.find((l) => l.id === lineId);
        const newLine = { ...line };

        if (field === 'quantity') {
          newLine.newQuantity = Number(value);
        } else if (field === 'description') {
          newLine.newDescription = String(value);
        }

        // Check if actually modified compared to original
        const qtyChanged =
          newLine.newQuantity !== undefined &&
          newLine.newQuantity !== originalLine?.quantity;
        const descChanged =
          newLine.newDescription !== undefined &&
          newLine.newDescription.trim() !== '';
        newLine.isModified = qtyChanged || descChanged;

        return newLine;
      })
    );
  };

  const handleDeleteLine = (lineId: string) => {
    setEditingLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, isDeleted: true } : line
      )
    );
  };

  const handleRestoreLine = (lineId: string) => {
    setEditingLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, isDeleted: false } : line
      )
    );
  };

  const handleResetLine = (lineId: string) => {
    const originalLine = lines.find((l) => l.id === lineId);
    if (!originalLine) return;

    setEditingLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...originalLine,
              isModified: false,
              newQuantity: undefined,
              newDescription: undefined,
            }
          : line
      )
    );
    setEditingLineId(null);
  };

  const handleAddNewLine = () => {
    setShowNewItemForm(true);
    setNewItemForm(INITIAL_NEW_ITEM);
  };

  const handleConfirmNewItem = () => {
    if (!newItemForm.serviceType) {
      toast.error('Selecciona un tipo de servicio');
      return;
    }

    // Auto-generate concept from service + subtype
    const serviceLabel = SERVICE_LABELS[newItemForm.serviceType] || newItemForm.serviceType;
    const subcats = SERVICE_SUBCATEGORIES[newItemForm.serviceType as keyof typeof SERVICE_SUBCATEGORIES];
    const subtypeLabel = subcats?.find(s => s.id === newItemForm.subtype)?.label || '';
    const concept = subtypeLabel ? `${serviceLabel} — ${subtypeLabel}` : serviceLabel;

    // Build description from dimensions + additional notes
    const descParts: string[] = [];
    if (newItemForm.dimensions) descParts.push(`Medidas: ${newItemForm.dimensions}`);
    if (newItemForm.description) descParts.push(newItemForm.description);
    const description = descParts.join('\n');

    const tempId = `new-${Date.now()}`;
    setNewLines(prev => [
      ...prev,
      {
        id: tempId,
        concept,
        description,
        quantity: newItemForm.quantity,
        unit: newItemForm.unit,
        unit_price: '0',
        line_total: '0',
        position: editingLines.length + newLines.length,
        isNew: true,
        serviceType: newItemForm.serviceType,
        subtype: newItemForm.subtype,
        dimensions: newItemForm.dimensions,
      },
    ]);

    setShowNewItemForm(false);
    setNewItemForm(INITIAL_NEW_ITEM);
  };

  // Image attachment handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const valid: File[] = [];
    Array.from(files).forEach(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" no es un formato permitido`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede 10 MB`);
        return;
      }
      valid.push(file);
    });
    if (attachments.length + valid.length > 5) {
      toast.error('Máximo 5 archivos');
      return;
    }
    setAttachments(prev => [...prev, ...valid]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewLine = (tempId: string) => {
    setNewLines((prev) => prev.filter((line) => line.id !== tempId));
  };

  const handleSubmit = async () => {
    // Validate we have at least one remaining line
    if (remainingLinesCount === 0) {
      toast.error('Debe quedar al menos un elemento en la cotización');
      return;
    }

    // Validate new lines have concept
    const incompleteNewLines = newLines.filter((line) => !line.concept?.trim());
    if (incompleteNewLines.length > 0) {
      toast.error('Los nuevos elementos deben tener un concepto');
      return;
    }

    // Build proposed_lines array
    const proposedLines: ProposedLine[] = [];

    // Add modified lines
    editingLines.forEach((line) => {
      const originalLine = lines.find((l) => l.id === line.id);
      if (!originalLine) return;

      if (line.isDeleted) {
        proposedLines.push({
          id: line.id,
          action: 'delete',
        });
      } else if (line.isModified) {
        const hasChangeNotes = line.newDescription !== undefined && line.newDescription.trim() !== '';
        proposedLines.push({
          id: line.id,
          action: 'modify',
          quantity: line.newQuantity ?? originalLine.quantity,
          description: hasChangeNotes ? line.newDescription!.trim() : originalLine.description,
          original_values: {
            quantity: String(originalLine.quantity),
            description: originalLine.description,
          },
        });
      }
    });

    // Add new lines
    newLines.forEach((line) => {
      if (line.concept?.trim()) {
        proposedLines.push({
          action: 'add',
          concept: line.concept,
          description: line.description || '',
          quantity: line.quantity,
          unit: line.unit,
        });
      }
    });

    if (proposedLines.length === 0) {
      toast.error('No hay cambios para enviar');
      return;
    }

    await onSubmit({
      proposed_lines: proposedLines,
      customer_comments: customerComments.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="p-4 bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg flex gap-3">
        <InformationCircleIcon className="h-5 w-5 text-cmyk-cyan flex-shrink-0 mt-0.5" />
        <div className="text-sm text-neutral-300">
          <p className="font-medium text-white mb-1">Editor de cambios</p>
          <p>
            Revisa los detalles de cada elemento, modifica cantidades, describe los
            cambios que necesitas, elimina elementos o agrega nuevos. El vendedor
            revisará tus cambios y te enviará una cotización actualizada.
          </p>
        </div>
      </div>

      {/* Existing lines */}
      <Card className="p-4">
        <h3 className="font-semibold text-white mb-4">Elementos actuales</h3>
        <div className="space-y-3">
          {editingLines.map((line) => {
            const originalLine = lines.find((l) => l.id === line.id);
            const isEditing = editingLineId === line.id;

            return (
              <div
                key={line.id}
                className={`p-3 rounded-lg border transition-colors ${
                  line.isDeleted
                    ? 'bg-red-500/10 border-red-500/30'
                    : line.isModified
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-neutral-800/50 border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        line.isDeleted
                          ? 'text-red-400 line-through'
                          : 'text-white'
                      }`}
                    >
                      {line.concept}
                    </p>

                    {isEditing && !line.isDeleted ? (
                      <div className="mt-3 space-y-3">
                        {/* Current details - read-only reference */}
                        <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2 font-medium">Detalles actuales</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-neutral-500">Concepto</p>
                              <p className="text-sm text-white">{line.concept}</p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500">Precio unitario</p>
                              <p className="text-sm text-white">{formatCurrency(line.unit_price)}</p>
                            </div>
                          </div>
                          {line.description && (
                            <div className="mt-2">
                              <p className="text-xs text-neutral-500">Descripción</p>
                              <p className="text-sm text-neutral-300 whitespace-pre-line mt-0.5">{line.description}</p>
                            </div>
                          )}
                        </div>

                        {/* Editable fields */}
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-xs text-neutral-400">
                              Nueva cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={line.newQuantity ?? line.quantity}
                              onChange={(e) =>
                                handleModifyLine(
                                  line.id,
                                  'quantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-24 px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                            />
                          </div>
                          <div className="text-neutral-400 text-sm pt-5">
                            {line.unit}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-neutral-400">
                            Cambios solicitados
                          </label>
                          <textarea
                            value={line.newDescription ?? ''}
                            onChange={(e) =>
                              handleModifyLine(line.id, 'description', e.target.value)
                            }
                            placeholder="Describe aquí los cambios que necesitas para este elemento..."
                            className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none resize-none"
                            rows={2}
                          />
                          <p className="text-xs text-neutral-600 mt-1">Ej: Cambiar medidas a 4x3m, usar material diferente, etc.</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => setEditingLineId(null)}
                            leftIcon={<CheckIcon className="h-4 w-4" />}
                          >
                            Listo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetLine(line.id)}
                            leftIcon={<ArrowUturnLeftIcon className="h-4 w-4" />}
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {line.description && (
                          <p
                            className={`text-sm whitespace-pre-line ${
                              line.isDeleted
                                ? 'text-red-400/70 line-through'
                                : line.isModified && line.newDescription !== undefined && line.newDescription.trim() !== ''
                                ? 'text-neutral-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {line.description}
                          </p>
                        )}
                        {line.isModified && line.newDescription !== undefined && line.newDescription.trim() !== '' && (
                          <div className="mt-1 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                            <p className="text-xs text-yellow-500 font-medium mb-0.5">Cambios solicitados:</p>
                            <p className="text-sm text-yellow-400 whitespace-pre-line">{line.newDescription}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-sm ${
                              line.isDeleted
                                ? 'text-red-400/70 line-through'
                                : line.isModified &&
                                  line.newQuantity !== undefined &&
                                  line.newQuantity !== originalLine?.quantity
                                ? 'text-yellow-400'
                                : 'text-neutral-300'
                            }`}
                          >
                            {line.newQuantity ?? line.quantity} {line.unit}
                          </span>
                          {line.isModified &&
                            line.newQuantity !== undefined &&
                            line.newQuantity !== originalLine?.quantity && (
                              <span className="text-xs text-neutral-500">
                                (antes: {originalLine?.quantity})
                              </span>
                            )}
                          <span className="text-neutral-500">x</span>
                          <span className="text-neutral-300">
                            {formatCurrency(line.unit_price)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-1">
                    {line.isDeleted ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestoreLine(line.id)}
                        className="text-neutral-400 hover:text-white"
                        title="Restaurar"
                      >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLineId(line.id)}
                            className="text-neutral-400 hover:text-cmyk-cyan"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLine(line.id)}
                          className="text-neutral-400 hover:text-red-400"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                {(line.isDeleted || line.isModified) && (
                  <div className="mt-2 pt-2 border-t border-neutral-700/50">
                    {line.isDeleted && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        Será eliminado
                      </span>
                    )}
                    {line.isModified && !line.isDeleted && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                        Modificado
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* New lines */}
      {newLines.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-white mb-4">Nuevos elementos</h3>
          <div className="space-y-3">
            {newLines.map((line) => (
              <div
                key={line.id}
                className="p-3 rounded-lg border bg-green-500/10 border-green-500/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{line.concept}</p>
                    {line.description && (
                      <p className="text-sm text-neutral-400 whitespace-pre-line mt-1">
                        {line.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-sm text-neutral-300">
                      <span>{line.quantity} {line.unit}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveNewLine(line.id)}
                    className="text-neutral-400 hover:text-red-400"
                    title="Eliminar"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-700/50">
                  <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                    Nuevo elemento
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mini-quoter: add new item form */}
      {showNewItemForm && (
        <Card className="p-4 border-cmyk-cyan/30">
          <h3 className="font-semibold text-white mb-4">Nuevo elemento</h3>
          <div className="space-y-3">
            {/* Service type */}
            <div>
              <label className="text-xs text-neutral-400">Tipo de servicio *</label>
              <select
                value={newItemForm.serviceType}
                onChange={(e) => {
                  const val = e.target.value as ServiceId | '';
                  setNewItemForm(prev => ({ ...prev, serviceType: val, subtype: '' }));
                }}
                className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
              >
                <option value="">Selecciona un servicio</option>
                {SERVICE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SERVICE_LABELS[id] || id}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtype (dynamic based on service) */}
            {newItemForm.serviceType && newItemForm.serviceType !== 'otros' &&
              SERVICE_SUBCATEGORIES[newItemForm.serviceType as keyof typeof SERVICE_SUBCATEGORIES] && (
              <div>
                <label className="text-xs text-neutral-400">Subtipo</label>
                <select
                  value={newItemForm.subtype}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, subtype: e.target.value }))}
                  className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                >
                  <option value="">Selecciona subtipo</option>
                  {SERVICE_SUBCATEGORIES[newItemForm.serviceType as keyof typeof SERVICE_SUBCATEGORIES]?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dimensions */}
            <div>
              <label className="text-xs text-neutral-400">Medidas (opcional)</label>
              <input
                type="text"
                value={newItemForm.dimensions}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, dimensions: e.target.value }))}
                placeholder="Ej: 4x3 metros, 90x60 cm..."
                className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
              />
            </div>

            {/* Quantity + Unit */}
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-neutral-400">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newItemForm.quantity}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-24 px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Unidad</label>
                <select
                  value={newItemForm.unit}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-28 px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                >
                  <option value="pz">pz</option>
                  <option value="m²">m²</option>
                  <option value="ml">ml</option>
                  <option value="hr">hr</option>
                  <option value="servicio">servicio</option>
                </select>
              </div>
            </div>

            {/* Additional notes */}
            <div>
              <label className="text-xs text-neutral-400">Detalles adicionales (opcional)</label>
              <textarea
                value={newItemForm.description}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Material, acabado, colores, uso interior/exterior, etc."
                rows={2}
                className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleConfirmNewItem}
                leftIcon={<CheckIcon className="h-4 w-4" />}
              >
                Agregar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowNewItemForm(false); setNewItemForm(INITIAL_NEW_ITEM); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add new line button */}
      {!showNewItemForm && (
        <Button
          variant="outline"
          onClick={handleAddNewLine}
          className="w-full"
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Agregar elemento
        </Button>
      )}

      {/* Image attachments */}
      <Card className="p-4">
        <h3 className="font-semibold text-white mb-3">
          Imágenes de referencia (opcional)
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Adjunta fotos, bocetos o archivos de referencia para que el vendedor entienda mejor tus cambios. Máx. 5 archivos, 10 MB c/u.
        </p>

        {/* File previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-3">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative group w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800"
              >
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1">
                    <PhotoIcon className="h-6 w-6 text-neutral-500" />
                    <span className="text-[10px] text-neutral-500 text-center truncate w-full mt-1">
                      {file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        {attachments.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 border-2 border-dashed border-neutral-700 rounded-lg hover:border-cmyk-cyan/50 transition-colors text-center cursor-pointer"
          >
            <PhotoIcon className="h-8 w-8 text-neutral-500 mx-auto mb-1" />
            <p className="text-sm text-neutral-400">
              Haz clic para seleccionar archivos
            </p>
            <p className="text-xs text-neutral-600 mt-0.5">
              JPG, PNG, WebP, GIF, PDF
            </p>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </Card>

      {/* Comments */}
      <Card className="p-4">
        <h3 className="font-semibold text-white mb-3">
          Comentarios adicionales (opcional)
        </h3>
        <textarea
          value={customerComments}
          onChange={(e) => setCustomerComments(e.target.value)}
          placeholder="Escribe aquí cualquier aclaración o detalle adicional para el vendedor..."
          rows={3}
          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan resize-none"
        />
      </Card>

      {/* Summary */}
      {hasChanges && (
        <Card className="p-4 bg-neutral-800/50">
          <h4 className="text-sm font-medium text-neutral-400 mb-2">
            Resumen de cambios
          </h4>
          <div className="flex flex-wrap gap-3 text-sm">
            {editingLines.filter((l) => l.isModified && !l.isDeleted).length >
              0 && (
              <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                {editingLines.filter((l) => l.isModified && !l.isDeleted).length}{' '}
                modificado(s)
              </span>
            )}
            {editingLines.filter((l) => l.isDeleted).length > 0 && (
              <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                {editingLines.filter((l) => l.isDeleted).length} eliminado(s)
              </span>
            )}
            {newLines.length > 0 && (
              <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">
                {newLines.length} agregado(s)
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1"
        >
          Enviar solicitud de cambios
        </Button>
      </div>
    </div>
  );
}
