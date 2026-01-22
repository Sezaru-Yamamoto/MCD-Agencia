'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, Input, LoadingPage } from '@/components/ui';

// Types
interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  category: string;
  image?: string;
}

interface QuoteItem {
  id: string;
  product: Product;
  quantity: number;
  unit_price: number;
  notes?: string;
}

// Mock data - Replace with API calls
const mockClients: Client[] = [
  { id: '1', name: 'Juan Pérez', email: 'juan@example.com', phone: '555-1234', company: 'Empresa A' },
  { id: '2', name: 'María García', email: 'maria@example.com', phone: '555-5678', company: 'Empresa B' },
  { id: '3', name: 'Carlos López', email: 'carlos@example.com', phone: '555-9012' },
];

const mockProducts: Product[] = [
  { id: '1', name: 'Tarjetas de Presentación 1000 pzas', sku: 'TAR-001', base_price: 450, category: 'Impresión' },
  { id: '2', name: 'Flyers Media Carta 500 pzas', sku: 'FLY-001', base_price: 350, category: 'Impresión' },
  { id: '3', name: 'Banner Lona 1x2m', sku: 'BAN-001', base_price: 800, category: 'Gran Formato' },
  { id: '4', name: 'Volantes 1/4 Carta 1000 pzas', sku: 'VOL-001', base_price: 280, category: 'Impresión' },
  { id: '5', name: 'Carpetas Corporativas', sku: 'CAR-001', base_price: 1200, category: 'Papelería' },
];

export default function NewQuotePage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [validDays, setValidDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSalesOrAdmin = user?.role?.name && ['superadmin', 'admin', 'sales'].includes(user.role.name);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/${locale}/login?redirect=/${locale}/ventas/cotizaciones/nueva`);
      } else if (!isSalesOrAdmin) {
        router.push(`/${locale}`);
      }
    }
  }, [authLoading, isAuthenticated, isSalesOrAdmin, router, locale]);

  if (authLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!isAuthenticated || !isSalesOrAdmin) {
    return null;
  }

  // Filter clients based on search
  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.company?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Filter products based on search
  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Add product to quote
  const addProduct = (product: Product) => {
    const existingItem = items.find(item => item.product.id === product.id);

    if (existingItem) {
      setItems(items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setItems([...items, {
        id: `item-${Date.now()}`,
        product,
        quantity: 1,
        unit_price: product.base_price,
      }]);
    }

    setProductSearch('');
    setShowProductDropdown(false);
  };

  // Remove item from quote
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  // Update item price
  const updatePrice = (itemId: string, price: number) => {
    if (price < 0) return;
    setItems(items.map(item =>
      item.id === itemId ? { ...item, unit_price: price } : item
    ));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Submit quote
  const handleSubmit = async (asDraft: boolean = false) => {
    if (!selectedClient) {
      toast.error('Selecciona un cliente');
      return;
    }

    if (items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(asDraft ? 'Cotización guardada como borrador' : 'Cotización creada exitosamente');
      router.push(`/${locale}/ventas/cotizaciones`);
    } catch {
      toast.error('Error al crear la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
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
            <p className="text-neutral-400">Crea una cotización para tu cliente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Cliente</h2>

              {selectedClient ? (
                <div className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{selectedClient.name}</p>
                    <p className="text-neutral-400 text-sm">{selectedClient.email}</p>
                    {selectedClient.company && (
                      <p className="text-neutral-500 text-sm">{selectedClient.company}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="text-neutral-400 hover:text-white"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre, email o empresa..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {showClientDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearch('');
                              setShowClientDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-neutral-700 transition-colors"
                          >
                            <p className="text-white">{client.name}</p>
                            <p className="text-neutral-400 text-sm">{client.email}</p>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-neutral-400 mb-2">No se encontró el cliente</p>
                          <button className="flex items-center gap-2 mx-auto text-cyan-400 hover:text-cyan-300">
                            <UserPlusIcon className="h-5 w-5" />
                            Crear nuevo cliente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Products */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Productos</h2>

              {/* Product Search */}
              <div className="relative mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {showProductDropdown && productSearch && (
                  <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addProduct(product)}
                          className="w-full px-4 py-3 text-left hover:bg-neutral-700 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="text-white">{product.name}</p>
                            <p className="text-neutral-400 text-sm">{product.sku} • {product.category}</p>
                          </div>
                          <span className="text-cyan-400">{formatCurrency(product.base_price)}</span>
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
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-neutral-800 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.product.name}</p>
                        <p className="text-neutral-500 text-sm">{item.product.sku}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-neutral-400 text-sm">Cant:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-white text-center focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-neutral-400 text-sm">Precio:</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-white text-right focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <p className="w-24 text-right text-white font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </p>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <p>No hay productos agregados</p>
                  <p className="text-sm mt-1">Busca y agrega productos a la cotización</p>
                </div>
              )}
            </Card>

            {/* Additional Options */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Opciones</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">Vigencia (días)</label>
                  <input
                    type="number"
                    min="1"
                    value={validDays}
                    onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-neutral-400 text-sm mb-2">Notas adicionales</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Términos, condiciones o notas para el cliente..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 resize-none"
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
                  <span>{formatCurrency(iva)}</span>
                </div>
                <div className="border-t border-neutral-700 pt-3 flex justify-between text-white font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !selectedClient || items.length === 0}
                  isLoading={isSubmitting}
                  className="w-full"
                >
                  Crear y Enviar
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || !selectedClient || items.length === 0}
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
                  <strong className="text-white">Nota:</strong> Al crear la cotización,
                  el cliente recibirá un email con el enlace para verla y aceptarla.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
