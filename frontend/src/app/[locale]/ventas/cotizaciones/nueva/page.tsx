'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage } from '@/components/ui';
import {
  getAdminQuoteRequestById,
  createQuote,
  sendQuote,
  QuoteRequest,
  CreateQuoteData,
} from '@/lib/api/quotes';
import { getProducts, ProductListItem } from '@/lib/api/catalog';
import { SERVICE_LABELS, type ServiceId } from '@/lib/service-ids';

// Alias for better readability
type CatalogItem = ProductListItem;

// Types
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

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Get quote request ID from URL if provided
  const quoteRequestId = searchParams.get('solicitud');

  // Form state
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
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

  // Load quote request data if provided
  const loadQuoteRequest = useCallback(async () => {
    if (!quoteRequestId) {
      setIsLoading(false);
      return;
    }

    try {
      const request = await getAdminQuoteRequestById(quoteRequestId);
      setQuoteRequest(request);

      // Pre-fill customer info
      setCustomerName(request.customer_name);
      setCustomerEmail(request.customer_email);
      setCustomerCompany(request.customer_company || '');

      // Generate concept based on service type and details
      let conceptText = '';
      let descriptionText = request.description || '';
      let quantityValue = request.quantity || 1;

      if (request.service_type) {
        // Get service label
        const serviceLabel = SERVICE_LABELS[request.service_type as ServiceId] || request.service_type;
        conceptText = serviceLabel;

        // Add subtype if available
        const details = request.service_details as Record<string, unknown> | undefined;
        if (details) {
          // Map subtypes to readable labels
          const subtipoLabels: Record<string, string> = {
            'vallas-moviles': 'Vallas móviles',
            'publibuses': 'Publibuses',
            'perifoneo': 'Perifoneo',
            'unipolar': 'Unipolar',
            'azotea': 'Azotea',
            'mural': 'Mural publicitario',
            'cajas-luz': 'Cajas de luz',
            'letras-3d': 'Letras 3D',
            'anuncios-2d': 'Anuncios 2D',
            'bastidores': 'Bastidores',
            'toldos': 'Toldos',
            'neon': 'Neón',
            'completa': 'Rotulación completa',
            'parcial': 'Rotulación parcial',
            'vinil-recortado': 'Vinil recortado',
            'impresion-digital': 'Impresión digital',
            'lona': 'Lona',
            'vinil': 'Vinil',
            'tela': 'Tela',
            'corte': 'Corte',
            'grabado': 'Grabado',
            'offset': 'Offset',
            'serigrafia': 'Serigrafía',
            'sublimacion': 'Sublimación',
          };

          // Check for subtype/tipo fields
          const subtype = details.subtipo || details.tipo || details.tipo_anuncio ||
                         details.tipo_rotulacion || details.material || details.tipo_diseno ||
                         details.producto || details.servicio || details.tipo_servicio;

          if (subtype && typeof subtype === 'string') {
            const subtypeLabel = subtipoLabels[subtype] || subtype;
            conceptText = `${serviceLabel} - ${subtypeLabel}`;
          }

          // Use quantity from details if available
          if (details.cantidad && typeof details.cantidad === 'number') {
            quantityValue = details.cantidad;
          }

          // Build description from service details
          const descParts: string[] = [];

          if (details.medidas) descParts.push(`Medidas: ${details.medidas}`);
          if (details.ubicacion) descParts.push(`Ubicación: ${details.ubicacion}`);
          if (details.zona) descParts.push(`Zona: ${details.zona}`);
          if (details.ciudad_zona) descParts.push(`Ciudad/Zona: ${details.ciudad_zona}`);
          if (details.tiempo_exhibicion) descParts.push(`Tiempo de exhibición: ${details.tiempo_exhibicion}`);
          if (details.tiempo_campana) descParts.push(`Tiempo de campaña: ${details.tiempo_campana}`);
          if (details.tipo_vehiculo) descParts.push(`Tipo de vehículo: ${details.tipo_vehiculo}`);
          if (typeof details.impresion_incluida === 'boolean') {
            descParts.push(`Impresión incluida: ${details.impresion_incluida ? 'Sí' : 'No'}`);
          }
          if (typeof details.instalacion_incluida === 'boolean') {
            descParts.push(`Instalación incluida: ${details.instalacion_incluida ? 'Sí' : 'No'}`);
          }
          if (typeof details.diseno_incluido === 'boolean') {
            descParts.push(`Diseño incluido: ${details.diseno_incluido ? 'Sí' : 'No'}`);
          }
          if (details.descripcion) descParts.push(`Descripción: ${details.descripcion}`);

          if (descParts.length > 0) {
            descriptionText = descParts.join(' | ') + (request.description ? ` | Comentarios: ${request.description}` : '');
          }
        }
      } else if (request.catalog_item) {
        conceptText = request.catalog_item.name;
      }

      // Pre-fill items if we have a concept
      if (conceptText) {
        setItems([{
          id: `item-${Date.now()}`,
          concept: conceptText,
          description: descriptionText,
          quantity: quantityValue,
          unit: 'pza',
          unit_price: 0,
        }]);
      }
    } catch (error) {
      console.error('Error loading quote request:', error);
      toast.error('Error al cargar la solicitud');
    } finally {
      setIsLoading(false);
    }
  }, [quoteRequestId]);

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
        router.push(`/${locale}/login?redirect=/${locale}/ventas/cotizaciones/nueva`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  useEffect(() => {
    if (isAuthenticated && isSalesOrAdmin) {
      loadQuoteRequest();
      loadCatalogItems();
    }
  }, [isAuthenticated, isSalesOrAdmin, loadQuoteRequest, loadCatalogItems]);

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  // Check if sales user can create quote for this request
  const isSales = user?.role?.name === 'sales';
  const isAdmin = user?.role?.name === 'admin';
  const isAssignedToMe = quoteRequest?.assigned_to === user?.id;
  const isUrgent = quoteRequest?.urgency === 'high';
  const cannotCreateForRequest = isSales && quoteRequest && !isAssignedToMe && !isUrgent;

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
      toast.error('Todos los conceptos deben tener un precio válido');
      return false;
    }
    return true;
  };

  // Submit quote
  const handleSubmit = async (sendImmediately: boolean = false) => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const quoteData: CreateQuoteData = {
        quote_request_id: quoteRequestId || undefined,
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

      const quote = await createQuote(quoteData);

      if (sendImmediately) {
        await sendQuote(quote.id, { send_email: true });
        toast.success('Cotización creada y enviada al cliente');
      } else {
        toast.success('Cotización guardada como borrador');
      }

      router.push(`/${locale}/ventas/cotizaciones`);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Error al crear la cotización');
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
            <h1 className="text-3xl font-bold text-white">Nueva Cotización</h1>
            <p className="text-neutral-400">
              {quoteRequest
                ? `Basada en solicitud ${quoteRequest.request_number}`
                : 'Crea una cotización para tu cliente'}
            </p>
          </div>
        </div>

        {/* Assignment restriction warning */}
        {cannotCreateForRequest && (
          <Card className="p-4 mb-6 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Solicitud asignada a otro vendedor</p>
                <p className="text-neutral-400 text-sm mt-1">
                  Esta solicitud está asignada a {quoteRequest?.assigned_to_name || 'otro vendedor'}.
                  Solo puedes crear cotizaciones para solicitudes asignadas a ti o marcadas como urgentes.
                </p>
                <button
                  onClick={() => router.back()}
                  className="mt-2 text-cmyk-cyan hover:text-cmyk-cyan/80 text-sm"
                >
                  ← Volver a solicitudes
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Quote Request Info Banner */}
        {quoteRequest && (
          <Card className="p-4 mb-6 border-cmyk-cyan/30 bg-cmyk-cyan/5">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 text-cmyk-cyan flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Solicitud: {quoteRequest.request_number}</p>
                <p className="text-neutral-400 text-sm mt-1">
                  {quoteRequest.description || 'Sin descripción adicional'}
                </p>
                {quoteRequest.required_date && (
                  <p className="text-cmyk-cyan text-sm mt-1">
                    Fecha requerida: {new Date(quoteRequest.required_date).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Información del Cliente</h2>
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
                    placeholder="Buscar producto del catálogo..."
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
                              <label className="block text-neutral-500 text-xs mb-1">Descripción</label>
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                placeholder="Descripción opcional"
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
                                <option value="m2">m²</option>
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
                  <p className="text-sm mt-1">Busca productos del catálogo o agrega conceptos personalizados</p>
                </div>
              )}
            </Card>

            {/* Additional Options */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Configuración</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">Vigencia (días)</label>
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
                    placeholder="Ej: 5 a 7 días hábiles"
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
                <label className="block text-neutral-400 text-sm mb-2">Términos y Condiciones</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Términos y condiciones para el cliente..."
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
                  disabled={isSubmitting || items.length === 0 || !!cannotCreateForRequest}
                  isLoading={isSubmitting}
                  className="w-full"
                >
                  Crear y Enviar
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || items.length === 0 || !!cannotCreateForRequest}
                  variant="outline"
                  className="w-full"
                >
                  Guardar Borrador
                </Button>
                <button
                  onClick={() => router.back()}
                  className="w-full py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-neutral-800/50 rounded-lg">
                <p className="text-neutral-400 text-sm">
                  <strong className="text-white">Nota:</strong> Al crear y enviar, el cliente recibirá un email con el enlace para ver y aceptar la cotización.
                </p>
              </div>
            </Card>
          </div>
        </div>
    </div>
  );
}
