'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage, SuccessModal } from '@/components/ui';
import {
  getAdminQuoteById,
  updateQuote,
  sendQuote,
  Quote,
  CreateQuoteData,
} from '@/lib/api/quotes';
import { getProducts, ProductListItem } from '@/lib/api/catalog';

type CatalogItem = ProductListItem;

interface QuoteLineItem {
  id: string;
  concept: string;
  concept_en?: string;
  description?: string;
  description_en?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  catalogItem?: CatalogItem;
}

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const quoteId = params.id as string;

  // Form state
  const [originalQuote, setOriginalQuote] = useState<Quote | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [validDays, setValidDays] = useState(15);
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'DEPOSIT_ALLOWED'>('FULL');
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [deliveryTimeText, setDeliveryTimeText] = useState('');
  const [paymentConditions, setPaymentConditions] = useState('');
  const [terms, setTerms] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSalesOrAdmin = user?.role?.name && ['admin', 'sales'].includes(user.role.name);

  // Load existing quote data
  const loadQuote = useCallback(async () => {
    if (!quoteId) return;

    try {
      const quote = await getAdminQuoteById(quoteId);

      // Only allow editing drafts
      if (quote.status !== 'draft') {
        toast.error('Solo se pueden editar cotizaciones en borrador');
        router.push(`/${locale}/dashboard/cotizaciones/${quoteId}`);
        return;
      }

      setOriginalQuote(quote);
      setCustomerName(quote.customer_name);
      setCustomerEmail(quote.customer_email);
      setCustomerCompany(quote.customer_company || '');
      setPaymentMode(quote.payment_mode);
      setDepositPercentage(Number(quote.deposit_percentage) || 50);
      setDeliveryTimeText(quote.delivery_time_text || '');
      setPaymentConditions(quote.payment_conditions || '');
      setTerms(quote.terms || '');
      setInternalNotes(quote.internal_notes || '');

      // Calculate valid days from valid_until
      if (quote.valid_until) {
        const validUntil = new Date(quote.valid_until);
        const now = new Date();
        const diffDays = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setValidDays(Math.max(1, diffDays));
      }

      // Load line items
      if (quote.lines && quote.lines.length > 0) {
        setItems(quote.lines.map((line, index) => ({
          id: line.id || `item-${index}`,
          concept: line.concept,
          concept_en: line.concept_en,
          description: line.description,
          description_en: line.description_en,
          quantity: line.quantity,
          unit: line.unit,
          unit_price: Number(line.unit_price),
        })));
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      toast.error('Error al cargar la cotizacion');
      router.push(`/${locale}/dashboard/cotizaciones`);
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, router, locale]);

  // Load catalog items for search
  const loadCatalogItems = useCallback(async () => {
    try {
      const response = await getProducts({ page_size: 100 });
      setCatalogItems(response.results || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/dashboard/cotizaciones/${quoteId}/editar`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale, quoteId]);

  useEffect(() => {
    if (isAuthenticated && isSalesOrAdmin) {
      loadQuote();
      loadCatalogItems();
    }
  }, [isAuthenticated, isSalesOrAdmin, loadQuote, loadCatalogItems]);

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando cotizacion..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin || !originalQuote) {
    return null;
  }

  // Filter products based on search
  const filteredProducts = catalogItems.filter(item =>
    item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    item.slug.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Add product from catalog
  const addCatalogItem = (item: CatalogItem) => {
    setItems([...items, {
      id: `item-${Date.now()}`,
      concept: item.name,
      description: item.short_description || '',
      quantity: 1,
      unit: 'pza',
      unit_price: parseFloat(item.base_price || '0'),
      catalogItem: item,
    }]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  // Add custom line item
  const addCustomItem = () => {
    setItems([...items, {
      id: `item-${Date.now()}`,
      concept: '',
      description: '',
      quantity: 1,
      unit: 'pza',
      unit_price: 0,
    }]);
  };

  // Remove item from quote
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Update item field
  const updateItem = (itemId: string, field: keyof QuoteLineItem, value: unknown) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxRate = 0.16;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  const depositAmount = paymentMode === 'DEPOSIT_ALLOWED' ? total * (depositPercentage / 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      toast.error('El nombre del cliente es requerido');
      return false;
    }
    if (!customerEmail.trim()) {
      toast.error('El email del cliente es requerido');
      return false;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un concepto');
      return false;
    }
    if (items.some(item => !item.concept.trim())) {
      toast.error('Todos los conceptos deben tener un nombre');
      return false;
    }
    if (items.some(item => item.unit_price <= 0)) {
      toast.error('Todos los conceptos deben tener un precio valido');
      return false;
    }
    return true;
  };

  // -- Modal state --
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' }>({ open: false, title: '', message: '', variant: 'success' });

  // Submit quote update
  const handleSubmit = async (sendImmediately: boolean = false) => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const quoteData: Partial<CreateQuoteData> = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_company: customerCompany || undefined,
        valid_days: validDays,
        payment_mode: paymentMode,
        deposit_percentage: paymentMode === 'DEPOSIT_ALLOWED' ? depositPercentage : undefined,
        terms: terms || undefined,
        internal_notes: internalNotes || undefined,
        delivery_time_text: deliveryTimeText || undefined,
        payment_conditions: paymentConditions || undefined,
        lines: items.map((item, index) => ({
          concept: item.concept,
          concept_en: item.concept_en,
          description: item.description,
          description_en: item.description_en,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          position: index + 1,
        })),
      };

      const quote = await updateQuote(quoteId, quoteData);

      if (sendImmediately) {
        await sendQuote(quote.id, { send_email: true });
        setModal({ open: true, title: 'Cotización actualizada y enviada', message: `La cotización se actualizó y envió al cliente (${customerEmail}).`, variant: 'success' });
      } else {
        setModal({ open: true, title: 'Cotización actualizada', message: 'Los cambios se guardaron correctamente.', variant: 'success' });
      }
    } catch (error) {
      console.error('Error updating quote:', error);
      setModal({ open: true, title: 'Error', message: 'No se pudo actualizar la cotización.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Editar Cotizacion</h1>
            <p className="text-neutral-400">{originalQuote.quote_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Informacion del Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">
                    Nombre <span className="text-cmyk-magenta">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">
                    Email <span className="text-cmyk-magenta">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-neutral-400 text-sm mb-2">Empresa</label>
                  <input
                    type="text"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder="Nombre de la empresa (opcional)"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
              </div>
            </Card>

            {/* Line Items */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Conceptos</h2>
                <Button
                  onClick={addCustomItem}
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                >
                  Agregar Concepto
                </Button>
              </div>

              {/* Product Search */}
              <div className="relative mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar producto del catalogo..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>

                {showProductDropdown && productSearch && (
                  <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 10).map(item => (
                        <button
                          key={item.id}
                          onClick={() => addCatalogItem(item)}
                          className="w-full px-4 py-3 text-left hover:bg-neutral-700 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="text-white">{item.name}</p>
                            <p className="text-neutral-400 text-sm">{item.category?.name || item.type}</p>
                          </div>
                          <span className="text-cmyk-cyan">{formatCurrency(parseFloat(item.base_price || '0'))}</span>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-center text-neutral-400">No se encontraron productos</p>
                    )}
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                      <div className="flex items-start gap-4">
                        <span className="text-neutral-500 text-sm font-medium mt-2">{index + 1}.</span>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-neutral-500 text-xs mb-1">Concepto *</label>
                              <input
                                type="text"
                                value={item.concept}
                                onChange={(e) => updateItem(item.id, 'concept', e.target.value)}
                                placeholder="Nombre del concepto"
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-neutral-500 text-xs mb-1">Descripcion</label>
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                placeholder="Descripcion opcional"
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-neutral-500 text-xs">Cantidad:</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-center focus:outline-none focus:border-cmyk-cyan text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-neutral-500 text-xs">Unidad:</label>
                              <select
                                value={item.unit}
                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:border-cmyk-cyan text-sm"
                              >
                                <option value="pza">pza</option>
                                <option value="m2">m2</option>
                                <option value="ml">ml</option>
                                <option value="kg">kg</option>
                                <option value="hr">hr</option>
                                <option value="servicio">servicio</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-neutral-500 text-xs">Precio Unit.:</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-right focus:outline-none focus:border-cmyk-cyan text-sm"
                              />
                            </div>
                            <div className="ml-auto flex items-center gap-3">
                              <span className="text-white font-medium">
                                {formatCurrency(item.quantity * item.unit_price)}
                              </span>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400 border border-dashed border-neutral-700 rounded-lg">
                  <p>No hay conceptos agregados</p>
                  <p className="text-sm mt-1">Busca productos del catalogo o agrega conceptos personalizados</p>
                </div>
              )}
            </Card>

            {/* Additional Options */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Configuracion</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">Vigencia (dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={validDays}
                    onChange={(e) => setValidDays(parseInt(e.target.value) || 15)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">Modo de Pago</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as 'FULL' | 'DEPOSIT_ALLOWED')}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan"
                  >
                    <option value="FULL">Pago completo</option>
                    <option value="DEPOSIT_ALLOWED">Permite anticipo</option>
                  </select>
                </div>
              </div>

              {paymentMode === 'DEPOSIT_ALLOWED' && (
                <div className="mb-4">
                  <label className="block text-neutral-400 text-sm mb-2">Porcentaje de Anticipo (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseInt(e.target.value) || 50)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">Tiempo de Entrega</label>
                  <input
                    type="text"
                    value={deliveryTimeText}
                    onChange={(e) => setDeliveryTimeText(e.target.value)}
                    placeholder="Ej: 5 a 7 dias habiles"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">Condiciones de Pago</label>
                  <input
                    type="text"
                    value={paymentConditions}
                    onChange={(e) => setPaymentConditions(e.target.value)}
                    placeholder="Ej: Transferencia, tarjeta"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-neutral-400 text-sm mb-2">Terminos y Condiciones</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Terminos y condiciones para el cliente..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan resize-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 text-sm mb-2">Notas Internas (no visibles para el cliente)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notas internas para el equipo..."
                  rows={2}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan resize-none"
                />
              </div>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4">Resumen</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t border-neutral-700 pt-3 flex justify-between text-white font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {paymentMode === 'DEPOSIT_ALLOWED' && depositAmount > 0 && (
                  <div className="flex justify-between text-cmyk-cyan text-sm">
                    <span>Anticipo ({depositPercentage}%)</span>
                    <span>{formatCurrency(depositAmount)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || items.length === 0}
                  isLoading={isSubmitting}
                  className="w-full"
                >
                  Guardar y Enviar
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || items.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  Guardar Cambios
                </Button>
                <button
                  onClick={() => router.back()}
                  className="w-full py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </Card>
          </div>
        </div>

    {/* Success/Error Modal */}
    <SuccessModal
      isOpen={modal.open}
      onClose={() => {
        setModal((m) => ({ ...m, open: false }));
        if (modal.variant === 'success') {
          router.push(`/${locale}/dashboard/cotizaciones/${quoteId}`);
        }
      }}
      title={modal.title}
      message={modal.message}
      variant={modal.variant}
    />
    </div>
  );
}
