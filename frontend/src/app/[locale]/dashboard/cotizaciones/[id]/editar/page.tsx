'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
  PaperClipIcon,
  TruckIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, LoadingPage, SuccessModal } from '@/components/ui';
import { SendConfirmationModal } from '@/components/quotes/SendConfirmationModal';
import { subtipoLabels } from '@/components/quotes/ServiceDetailsDisplay';
import {
  ServiceFormFields,
  type ServiceDetailsData,
  serviceDetailsFromRequest,
  cleanServiceDetailsForApi,
  isRouteBasedDetails,
  computeRoutesTotal,
  expandRouteLines,
} from '@/components/quotes/ServiceFormFields';
import {
  getAdminQuoteById,
  updateQuote,
  sendQuote,
  Quote,
  QuoteAttachment,
  CreateQuoteData,
} from '@/lib/api/quotes';
import { getProducts, ProductListItem } from '@/lib/api/catalog';
import { SERVICE_LABELS, SERVICE_SUBCATEGORIES, type ServiceId, type LandingServiceId, DELIVERY_METHOD_LABELS, DELIVERY_METHOD_ICONS, getDeliveryMethodsForService, type DeliveryMethod } from '@/lib/service-ids';
import { getBranches, type Branch } from '@/lib/api/content';

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
  serviceDetails?: ServiceDetailsData;
  showServiceForm?: boolean;
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
  const [searchTab, setSearchTab] = useState<'products' | 'services'>('products');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [validDays, setValidDays] = useState(15);
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'DEPOSIT_ALLOWED'>('FULL');
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [deliveryTimeText, setDeliveryTimeText] = useState('');
  const [paymentConditions, setPaymentConditions] = useState('');
  const [terms, setTerms] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error'; redirectTo?: string }>({ open: false, title: '', message: '', variant: 'success' });

  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | ''>('');
  const [pickupBranch, setPickupBranch] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableDeliveryMethods, setAvailableDeliveryMethods] = useState<DeliveryMethod[]>([]);

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

      // Load delivery method fields
      if (quote.delivery_method) {
        setDeliveryMethod(quote.delivery_method as DeliveryMethod);
      }
      if (quote.pickup_branch) {
        setPickupBranch(typeof quote.pickup_branch === 'string' ? quote.pickup_branch : '');
      }
      if (quote.delivery_address && typeof quote.delivery_address === 'object') {
        setDeliveryAddress(quote.delivery_address as Record<string, string>);
      }

      // Compute available delivery methods from quote request or service type
      if (quote.quote_request) {
        const qr = quote.quote_request as unknown as Record<string, unknown>;
        const serviceType = qr?.service_type as string | undefined;
        if (serviceType) {
          const subtypeId = (qr?.service_details as Record<string, unknown>)?.subtipo as string | undefined;
          setAvailableDeliveryMethods(getDeliveryMethodsForService(serviceType, subtypeId));
        } else {
          setAvailableDeliveryMethods(['installation', 'pickup', 'shipping', 'digital', 'not_applicable']);
        }
      } else {
        setAvailableDeliveryMethods(['installation', 'pickup', 'shipping', 'digital', 'not_applicable']);
      }

      // Calculate valid days from valid_until
      if (quote.valid_until) {
        const validUntil = new Date(quote.valid_until);
        const now = new Date();
        const diffDays = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setValidDays(Math.max(1, diffDays));
      }

      // Load line items — group expanded route lines back into a single item
      if (quote.lines && quote.lines.length > 0) {
        const loadedItems: QuoteLineItem[] = [];
        const processedLineIds = new Set<string>();

        for (let i = 0; i < quote.lines.length; i++) {
          const line = quote.lines[i];
          if (processedLineIds.has(line.id)) continue;

          // If this line has service_details, reconstruct the service item
          if (line.service_details && typeof line.service_details === 'object') {
            const sd = line.service_details as Record<string, unknown>;
            const serviceType = sd.service_type as string | undefined;

            if (serviceType) {
              // Reconstruct service details using serviceDetailsFromRequest
              const prefillDetails = serviceDetailsFromRequest(serviceType, sd);

              // Determine concept from service labels
              const svcLabel = SERVICE_LABELS[serviceType as ServiceId] || serviceType;
              const subtipo = sd.subtipo as string | undefined;
              const subLabel = subtipo ? (subtipoLabels[subtipo] || subtipo) : '';
              const conceptText = subLabel ? `${svcLabel} — ${subLabel}` : svcLabel;

              // For route-based items, patch route prices from expanded QuoteLines
              // because service_details.rutas[].precio_unitario may have been
              // corrupted to 0 by a client change request.
              if (isRouteBasedDetails(prefillDetails)) {
                // The parent line (index i) IS Ruta 1.
                // Subsequent lines without service_details are Ruta 2, 3, etc.
                const allRouteLines: typeof quote.lines = [line]; // parent = Ruta 1
                for (let j = i + 1; j < quote.lines.length; j++) {
                  const nextLine = quote.lines[j];
                  if (!nextLine.service_details) {
                    allRouteLines.push(nextLine);
                    processedLineIds.add(nextLine.id);
                  } else {
                    break;
                  }
                }

                // Patch each internal route's unit_price from the corresponding line
                const routeArrayKey = prefillDetails._vallasRoutes
                  ? '_vallasRoutes'
                  : prefillDetails._pubRoutes
                    ? '_pubRoutes'
                    : prefillDetails._perifoneoRoutes
                      ? '_perifoneoRoutes'
                      : null;

                if (routeArrayKey) {
                  const routes = prefillDetails[routeArrayKey] as Array<{ unit_price?: number; cantidad?: number }>;
                  if (routes && allRouteLines.length > 0) {
                    for (let r = 0; r < routes.length && r < allRouteLines.length; r++) {
                      const linePrice = Number(allRouteLines[r].unit_price);
                      // Use line's price if route price is 0 or missing
                      if ((!routes[r].unit_price || routes[r].unit_price === 0) && linePrice > 0) {
                        routes[r].unit_price = linePrice;
                      }
                      // Also patch cantidad from line
                      const lineQty = Number(allRouteLines[r].quantity);
                      if ((!routes[r].cantidad || routes[r].cantidad === 0) && lineQty > 0) {
                        routes[r].cantidad = lineQty;
                      }
                    }
                  }
                }

                // Also patch the API-facing rutas[] array to keep them in sync
                const rutas = prefillDetails.rutas as Array<{ precio_unitario?: number; cantidad?: number }> | undefined;
                if (rutas && allRouteLines.length > 0) {
                  for (let r = 0; r < rutas.length && r < allRouteLines.length; r++) {
                    const linePrice = Number(allRouteLines[r].unit_price);
                    if ((!rutas[r].precio_unitario || rutas[r].precio_unitario === 0) && linePrice > 0) {
                      rutas[r].precio_unitario = linePrice;
                    }
                    const lineQty = Number(allRouteLines[r].quantity);
                    if ((!rutas[r].cantidad || rutas[r].cantidad === 0) && lineQty > 0) {
                      rutas[r].cantidad = lineQty;
                    }
                  }
                }
              }

              loadedItems.push({
                id: line.id || `item-${i}`,
                concept: conceptText,
                concept_en: line.concept_en,
                description: line.description,
                description_en: line.description_en,
                quantity: line.quantity,
                unit: line.unit,
                unit_price: Number(line.unit_price),
                serviceDetails: prefillDetails,
                showServiceForm: true,
              });
              continue;
            }
          }

          // Regular (non-service) line
          loadedItems.push({
            id: line.id || `item-${i}`,
            concept: line.concept,
            concept_en: line.concept_en,
            description: line.description,
            description_en: line.description_en,
            quantity: line.quantity,
            unit: line.unit,
            unit_price: Number(line.unit_price),
          });
        }

        setItems(loadedItems);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      toast.error('Error al cargar la cotización');
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

  // Load branches for pickup option
  const loadBranches = useCallback(async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
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
      loadBranches();
    }
  }, [isAuthenticated, isSalesOrAdmin, loadQuote, loadCatalogItems, loadBranches]);

  if (authLoading || isLoading) {
    return <LoadingPage message="Cargando cotización..." />;
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
  const subtotal = items.reduce((sum, item) => {
    // For route-based services, total comes from individual routes
    if (isRouteBasedDetails(item.serviceDetails)) {
      return sum + computeRoutesTotal(item.serviceDetails!);
    }
    return sum + (item.quantity * item.unit_price);
  }, 0);
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
    if (items.some(item => {
      // Service items get their concept from the service details display
      if (item.serviceDetails && item.serviceDetails.service_type) return false;
      return !item.concept.trim();
    })) {
      toast.error('Todos los conceptos deben tener un nombre');
      return false;
    }
    if (items.some(item => {
      // Route-based services get their pricing from routes, so skip top-level price check
      if (isRouteBasedDetails(item.serviceDetails)) return false;
      return item.unit_price <= 0;
    })) {
      toast.error('Todos los conceptos deben tener un precio válido');
      return false;
    }
    return true;
  };

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
        delivery_method: deliveryMethod || undefined,
        pickup_branch_id: deliveryMethod === 'pickup' && pickupBranch ? pickupBranch : undefined,
        delivery_address: (deliveryMethod === 'shipping' || deliveryMethod === 'installation') && Object.keys(deliveryAddress).length > 0 ? deliveryAddress : undefined,
        lines: items.flatMap((item) => {
          // Auto-generate concept from service details if it's a service item
          let concept = item.concept;
          if (item.serviceDetails && item.serviceDetails.service_type) {
            const svcLabel = SERVICE_LABELS[item.serviceDetails.service_type as ServiceId] || item.serviceDetails.service_type;
            const subLabel = item.serviceDetails.subtipo
              ? subtipoLabels[item.serviceDetails.subtipo as string] || (item.serviceDetails.subtipo as string)
              : '';
            concept = subLabel ? `${svcLabel} — ${subLabel}` : svcLabel;
          }

          // Route-based: expand into one line per route
          if (isRouteBasedDetails(item.serviceDetails)) {
            const routeLines = expandRouteLines(item.serviceDetails!, concept, item.description || '');
            return routeLines.map((rl, ri) => ({
              concept: rl.concept,
              concept_en: item.concept_en,
              description: rl.description,
              description_en: item.description_en,
              quantity: rl.quantity,
              unit: rl.unit,
              unit_price: rl.unit_price,
              position: 0, // will be set below
              service_details: ri === 0 ? (item.serviceDetails ? cleanServiceDetailsForApi(item.serviceDetails) || undefined : undefined) : undefined,
            }));
          }

          return [{
            concept,
            concept_en: item.concept_en,
            description: item.description,
            description_en: item.description_en,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            position: 0,
            service_details: item.serviceDetails ? cleanServiceDetailsForApi(item.serviceDetails) || undefined : undefined,
          }];
        }).map((line, idx) => ({ ...line, position: idx + 1 })),
      };

      const quote = await updateQuote(quoteId, quoteData);

      if (sendImmediately) {
        const sent = await sendQuote(quote.id, { send_email: true }) as Quote & { email_sent?: boolean; email_error?: string };
        if (sent.email_sent === false) {
          setModal({
            open: true,
            title: 'Cotización actualizada, pero el correo no se envió',
            message: `La cotización se actualizó y marcó como enviada, pero no se pudo enviar el correo a ${customerEmail}. Puedes reenviar el correo desde el detalle de la cotización.\n\nError: ${sent.email_error || 'Error desconocido'}`,
            variant: 'error',
            redirectTo: `/${locale}/dashboard/cotizaciones/${quoteId}`,
          });
        } else {
          setModal({ open: true, title: 'Cotización actualizada y enviada', message: `La cotización se actualizó y envió al cliente (${customerEmail}).`, variant: 'success' });
        }
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
            <h1 className="text-3xl font-bold text-white">Editar Cotización</h1>
            <p className="text-neutral-400">{originalQuote.quote_number}</p>
          </div>
        </div>

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

              {/* Search Tabs */}
              <div className="mb-4">
                <div className="flex gap-1 mb-3 bg-neutral-800/50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setSearchTab('products')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      searchTab === 'products'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    Productos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTab('services')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      searchTab === 'services'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                    Servicios
                  </button>
                </div>

                {/* Product Search */}
                {searchTab === 'products' && (
              <div className="relative">
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
                )}

                {/* Service Search */}
                {searchTab === 'services' && (
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Buscar servicio..."
                        value={serviceSearchQuery}
                        onChange={(e) => {
                          setServiceSearchQuery(e.target.value);
                          setShowServiceDropdown(true);
                        }}
                        onFocus={() => setShowServiceDropdown(true)}
                        onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
                        className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                      />
                    </div>

                    {showServiceDropdown && (
                      <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-72 overflow-auto">
                        {(() => {
                          const query = serviceSearchQuery.toLowerCase();
                          const entries = Object.entries(SERVICE_SUBCATEGORIES) as [LandingServiceId, typeof SERVICE_SUBCATEGORIES[LandingServiceId]][];
                          let hasResults = false;

                          const content = entries.map(([serviceId, subcategories]) => {
                            const serviceLabel = SERVICE_LABELS[serviceId] || serviceId;
                            const matchingSubs = subcategories.filter(sub =>
                              !query ||
                              serviceLabel.toLowerCase().includes(query) ||
                              sub.label.toLowerCase().includes(query) ||
                              `${serviceLabel} ${sub.label}`.toLowerCase().includes(query)
                            );

                            if (matchingSubs.length === 0) return null;
                            hasResults = true;

                            return (
                              <div key={serviceId}>
                                <div className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-800/80 sticky top-0">
                                  {serviceLabel}
                                </div>
                                {matchingSubs.map(sub => (
                                  <button
                                    key={`${serviceId}-${sub.id}`}
                                    onClick={() => {
                                      const conceptName = `${serviceLabel} - ${sub.label}`;
                                      const details: ServiceDetailsData = { service_type: serviceId as ServiceId };
                                      if (serviceId === 'publicidad-movil') {
                                        details.subtipo = sub.id;
                                      }
                                      setItems(prev => [...prev, {
                                        id: `item-${Date.now()}`,
                                        concept: conceptName,
                                        description: '',
                                        quantity: 1,
                                        unit: 'servicio',
                                        unit_price: 0,
                                        serviceDetails: details,
                                        showServiceForm: true,
                                      }]);
                                      setServiceSearchQuery('');
                                      setShowServiceDropdown(false);
                                    }}
                                    className="w-full px-4 py-2.5 pl-8 text-left hover:bg-neutral-700 transition-colors"
                                  >
                                    <p className="text-white text-sm">{sub.label}</p>
                                  </button>
                                ))}
                              </div>
                            );
                          });

                          if (!hasResults) {
                            return <p className="p-4 text-center text-neutral-400">No se encontraron servicios</p>;
                          }
                          return content;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items List */}
              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const itemIsRouteBased = isRouteBasedDetails(item.serviceDetails);

                    return (
                    <div key={item.id} className="relative p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                      {/* Delete button — top right */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Eliminar concepto"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      <div className="flex items-start gap-4 pr-8">
                        <span className="text-neutral-500 text-sm font-medium mt-2">{index + 1}.</span>
                        <div className="flex-1 space-y-3">
                          {/* Header: Categoría / Subtipo / Descripción (service items) OR Concepto / Descripción */}
                          {item.serviceDetails ? (() => {
                            const svcType = item.serviceDetails!.service_type as ServiceId;
                            const svcSubtipo = item.serviceDetails!.subtipo as string | undefined;
                            const subcats = SERVICE_SUBCATEGORIES[svcType as LandingServiceId] || [];
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-neutral-500 text-xs mb-1">Categoría *</label>
                                  <select
                                    value={svcType}
                                    onChange={(e) => {
                                      const newType = e.target.value as ServiceId;
                                      const newSubcats = SERVICE_SUBCATEGORIES[newType as LandingServiceId] || [];
                                      updateItem(item.id, 'serviceDetails', {
                                        ...item.serviceDetails!,
                                        service_type: newType,
                                        subtipo: newSubcats.length > 0 ? newSubcats[0].id : undefined,
                                      });
                                    }}
                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:border-cmyk-cyan text-sm"
                                  >
                                    {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                                      <option key={key} value={key}>{label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-neutral-500 text-xs mb-1">Subtipo</label>
                                  {subcats.length > 0 ? (
                                    <select
                                      value={svcSubtipo || ''}
                                      onChange={(e) => {
                                        updateItem(item.id, 'serviceDetails', {
                                          ...item.serviceDetails!,
                                          subtipo: e.target.value || undefined,
                                        });
                                      }}
                                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:border-cmyk-cyan text-sm"
                                    >
                                      {subcats.map((sc) => (
                                        <option key={sc.id} value={sc.id}>{sc.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="px-3 py-2 bg-neutral-800/30 border border-neutral-700/30 rounded text-neutral-500 text-sm">
                                      Sin subtipos
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-neutral-500 text-xs mb-1">Descripción</label>
                                  <textarea
                                    value={item.description || ''}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    placeholder="Descripción opcional"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan text-sm resize-none"
                                  />
                                </div>
                              </div>
                            );
                          })() : (
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
                                <textarea
                                  value={item.description || ''}
                                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                  placeholder="Descripción opcional"
                                  rows={2}
                                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan text-sm resize-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* Qty / Unit / Price — only for NON-route-based items */}
                          {!itemIsRouteBased && (
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
                            </div>
                          </div>
                          )}

                          {/* Service Form Toggle & Fields */}
                          {item.serviceDetails && (
                            <div className="pt-3 border-t border-neutral-700/50">
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, 'showServiceForm', !item.showServiceForm)}
                                className="flex items-center gap-2 text-xs font-medium text-cmyk-cyan hover:text-cmyk-cyan/80 transition-colors mb-3"
                              >
                                <WrenchScrewdriverIcon className="h-4 w-4" />
                                <span>{item.showServiceForm ? 'Ocultar' : 'Mostrar'} detalle de servicio</span>
                                <svg className={`h-3 w-3 transition-transform ${item.showServiceForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {item.showServiceForm && (
                                <ServiceFormFields
                                  value={item.serviceDetails}
                                  onChange={(details) => updateItem(item.id, 'serviceDetails', details)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400 border border-dashed border-neutral-700 rounded-lg">
                  <p>No hay conceptos agregados</p>
                  <p className="text-sm mt-1">Busca productos o servicios del catálogo, o agrega conceptos personalizados</p>
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

              {/* Delivery Method Section */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
                  <TruckIcon className="h-4 w-4" />
                  Método de Entrega
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableDeliveryMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setDeliveryMethod(method);
                        if (method !== 'pickup') setPickupBranch('');
                        if (method !== 'shipping' && method !== 'installation') setDeliveryAddress({});
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        deliveryMethod === method
                          ? 'border-cmyk-cyan bg-cmyk-cyan/10 text-cmyk-cyan'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      <span>{DELIVERY_METHOD_ICONS[method]}</span>
                      <span>{DELIVERY_METHOD_LABELS[method].es}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup Branch selector */}
              {deliveryMethod === 'pickup' && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
                    <MapPinIcon className="h-4 w-4" />
                    Sucursal de Recolección
                  </label>
                  <select
                    value={pickupBranch}
                    onChange={(e) => setPickupBranch(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cmyk-cyan"
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} — {branch.city}, {branch.state}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Delivery Address — shipping or installation */}
              {(deliveryMethod === 'shipping' || deliveryMethod === 'installation') && (
                <div className="mb-4 space-y-3">
                  <label className="flex items-center gap-2 text-neutral-400 text-sm">
                    <MapPinIcon className="h-4 w-4" />
                    {deliveryMethod === 'installation' ? 'Dirección de Instalación' : 'Dirección de Envío'}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={deliveryAddress.street || ''}
                      onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="Calle y número"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                    />
                    <input
                      type="text"
                      value={deliveryAddress.neighborhood || ''}
                      onChange={(e) => setDeliveryAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Colonia"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                    />
                    <input
                      type="text"
                      value={deliveryAddress.city || ''}
                      onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Ciudad"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                    />
                    <input
                      type="text"
                      value={deliveryAddress.state || ''}
                      onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="Estado"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                    />
                    <input
                      type="text"
                      value={deliveryAddress.postal_code || ''}
                      onChange={(e) => setDeliveryAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="Código Postal"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                    />
                    <input
                      type="text"
                      value={deliveryAddress.reference || ''}
                      onChange={(e) => setDeliveryAddress(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Referencia (opcional)"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cmyk-cyan"
                    />
                  </div>
                </div>
              )}

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

            {/* Attachments from quote / change requests */}
            {originalQuote.attachments && originalQuote.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                  Archivos Adjuntos
                </h2>
                <div className="space-y-2">
                  {originalQuote.attachments.map((att: QuoteAttachment) => {
                    const isImage = att.file_type?.startsWith('image/');
                    return (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                        {isImage ? (
                          <a href={att.file} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                            <img
                              src={att.file}
                              alt={att.filename}
                              className="w-16 h-16 object-cover rounded border border-neutral-600 hover:border-cmyk-cyan transition-colors"
                            />
                          </a>
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-neutral-700 rounded flex-shrink-0">
                            <PaperClipIcon className="h-5 w-5 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={att.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cmyk-cyan hover:underline truncate block"
                          >
                            {att.filename}
                          </a>
                          <p className="text-xs text-neutral-500">
                            {att.file_size > 0 && `${(att.file_size / 1024).toFixed(0)} KB`}
                            {att.file_type && ` · ${att.file_type}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
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
                  onClick={() => {
                    if (!validateForm()) return;
                    setShowSendConfirm(true);
                  }}
                  disabled={isSubmitting || items.length === 0}
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

    {/* Send Confirmation Modal */}
    <SendConfirmationModal
      isOpen={showSendConfirm}
      onClose={() => setShowSendConfirm(false)}
      onConfirm={() => {
        setShowSendConfirm(false);
        handleSubmit(true);
      }}
      isLoading={isSubmitting}
      customerName={customerName}
      customerEmail={customerEmail}
      lines={items.flatMap((item) => {
        let concept = item.concept;
        if (item.serviceDetails && item.serviceDetails.service_type) {
          const svcLabel = SERVICE_LABELS[item.serviceDetails.service_type as ServiceId] || item.serviceDetails.service_type;
          const subLabel = item.serviceDetails.subtipo
            ? subtipoLabels[item.serviceDetails.subtipo as string] || (item.serviceDetails.subtipo as string)
            : '';
          concept = subLabel ? `${svcLabel} — ${subLabel}` : svcLabel;
        }
        if (isRouteBasedDetails(item.serviceDetails)) {
          return expandRouteLines(item.serviceDetails!, concept, item.description || '');
        }
        return [{
          concept,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
        }];
      })}
      subtotal={subtotal}
      taxAmount={taxAmount}
      total={total}
    />

    {/* Success/Error Modal */}
    <SuccessModal
      isOpen={modal.open}
      onClose={() => {
        setModal((m) => ({ ...m, open: false }));
        const dest = modal.redirectTo || (modal.variant === 'success' ? `/${locale}/dashboard/cotizaciones/${quoteId}` : undefined);
        if (dest) {
          router.push(dest);
        }
      }}
      title={modal.title}
      message={modal.message}
      variant={modal.variant}
    />
    </div>
  );
}
