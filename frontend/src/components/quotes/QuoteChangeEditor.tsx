'use client';

import { useState, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button, Card } from '@/components/ui';
import { QuoteLine, ProposedLine, SubmitChangeRequestData } from '@/lib/api/quotes';

interface EditingLine extends QuoteLine {
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
  newQuantity?: number;
  newDescription?: string;
  newConcept?: string;
}

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
          newLine.isModified = Number(value) !== originalLine?.quantity;
        } else if (field === 'description') {
          newLine.newDescription = String(value);
          newLine.isModified = value !== originalLine?.description;
        }

        // Check if actually modified compared to original
        const qtyChanged =
          newLine.newQuantity !== undefined &&
          newLine.newQuantity !== originalLine?.quantity;
        const descChanged =
          newLine.newDescription !== undefined &&
          newLine.newDescription !== originalLine?.description;
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
    const tempId = `new-${Date.now()}`;
    setNewLines((prev) => [
      ...prev,
      {
        id: tempId,
        concept: '',
        description: '',
        quantity: 1,
        unit: 'pz',
        unit_price: '0',
        line_total: '0',
        position: editingLines.length + prev.length,
        isNew: true,
      },
    ]);
    setEditingLineId(tempId);
  };

  const handleUpdateNewLine = (
    tempId: string,
    updates: Partial<EditingLine>
  ) => {
    setNewLines((prev) =>
      prev.map((line) =>
        line.id === tempId ? { ...line, ...updates } : line
      )
    );
  };

  const handleRemoveNewLine = (tempId: string) => {
    setNewLines((prev) => prev.filter((line) => line.id !== tempId));
    if (editingLineId === tempId) {
      setEditingLineId(null);
    }
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
        proposedLines.push({
          id: line.id,
          action: 'modify',
          quantity: line.newQuantity ?? originalLine.quantity,
          description: line.newDescription ?? originalLine.description,
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
            Modifica las cantidades, elimina elementos o agrega nuevos. El vendedor
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
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="text-xs text-neutral-400">
                            Descripción
                          </label>
                          <textarea
                            value={line.newDescription ?? line.description}
                            onChange={(e) =>
                              handleModifyLine(line.id, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none resize-none"
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-xs text-neutral-400">
                              Cantidad
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
                            className={`text-sm ${
                              line.isDeleted
                                ? 'text-red-400/70 line-through'
                                : line.isModified && line.newDescription !== undefined
                                ? 'text-yellow-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {line.newDescription ?? line.description}
                          </p>
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
            {newLines.map((line) => {
              const isEditing = editingLineId === line.id;

              return (
                <div
                  key={line.id}
                  className="p-3 rounded-lg border bg-green-500/10 border-green-500/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-neutral-400">
                              Concepto *
                            </label>
                            <input
                              type="text"
                              value={line.concept}
                              onChange={(e) =>
                                handleUpdateNewLine(line.id, {
                                  concept: e.target.value,
                                })
                              }
                              placeholder="Nombre del servicio o producto"
                              className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-neutral-400">
                              Descripción
                            </label>
                            <textarea
                              value={line.description}
                              onChange={(e) =>
                                handleUpdateNewLine(line.id, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Detalles adicionales (opcional)"
                              className="w-full px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <label className="text-xs text-neutral-400">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity}
                                onChange={(e) =>
                                  handleUpdateNewLine(line.id, {
                                    quantity: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-24 px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-neutral-400">
                                Unidad
                              </label>
                              <select
                                value={line.unit}
                                onChange={(e) =>
                                  handleUpdateNewLine(line.id, {
                                    unit: e.target.value,
                                  })
                                }
                                className="w-24 px-3 py-2 mt-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm focus:border-cmyk-cyan focus:outline-none"
                              >
                                <option value="pz">pz</option>
                                <option value="m²">m²</option>
                                <option value="ml">ml</option>
                                <option value="hr">hr</option>
                                <option value="servicio">servicio</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => setEditingLineId(null)}
                              leftIcon={<CheckIcon className="h-4 w-4" />}
                            >
                              Listo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-white">
                            {line.concept || (
                              <span className="text-neutral-500 italic">
                                Sin concepto
                              </span>
                            )}
                          </p>
                          {line.description && (
                            <p className="text-sm text-neutral-400">
                              {line.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-sm text-neutral-300">
                            <span>
                              {line.quantity} {line.unit}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-start gap-1">
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
                        onClick={() => handleRemoveNewLine(line.id)}
                        className="text-neutral-400 hover:text-red-400"
                        title="Eliminar"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-700/50">
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                      Nuevo elemento
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add new line button */}
      <Button
        variant="outline"
        onClick={handleAddNewLine}
        className="w-full"
        leftIcon={<PlusIcon className="h-5 w-5" />}
      >
        Agregar elemento
      </Button>

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
