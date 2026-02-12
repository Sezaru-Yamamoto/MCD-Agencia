'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { getProducts, getCategories, type ProductListItem, type Category } from '@/lib/api/catalog';
import { LANDING_SERVICE_IDS, SERVICE_LABELS, SERVICE_SUBCATEGORIES, type ServiceSubcategory } from '@/lib/service-ids';
import { createProduct, updateProduct, deleteProduct, uploadProductImages, deleteProductImage, type CreateProductData } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { Card, Badge, Button, Input, Select, Modal, Pagination, LoadingPage } from '@/components/ui';
import { Textarea } from '@/components/ui/Textarea';
import { formatCurrency } from '@/lib/utils';

const SALE_MODE_OPTIONS = [
  { value: '', label: 'Todos los modos' },
  { value: 'BUY', label: 'Compra directa' },
  { value: 'QUOTE', label: 'Cotizable' },
  { value: 'HYBRID', label: 'Ambos' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'product', label: 'Producto' },
  { value: 'service', label: 'Servicio' },
];

const getSaleModeVariant = (mode: string): 'success' | 'warning' | 'info' | 'default' => {
  const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    BUY: 'success',
    QUOTE: 'warning',
    HYBRID: 'info',
  };
  return variants[mode] || 'default';
};

const getSaleModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    BUY: 'Compra',
    QUOTE: 'Cotizable',
    HYBRID: 'Ambos',
  };
  return labels[mode] || mode;
};

interface ProductFormData {
  type: 'product' | 'service';
  name: string;
  short_description: string;
  description: string;
  category_id: string;
  sale_mode: 'BUY' | 'QUOTE' | 'HYBRID';
  payment_mode: 'FULL' | 'DEPOSIT_ALLOWED';
  base_price: string;
  compare_at_price: string;
  is_active: boolean;
  is_featured: boolean;
}

const initialFormData: ProductFormData = {
  type: 'product',
  name: '',
  short_description: '',
  description: '',
  category_id: '',
  sale_mode: 'BUY',
  payment_mode: 'FULL',
  base_price: '',
  compare_at_price: '',
  is_active: true,
  is_featured: false,
};

export default function AdminCatalogPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    sale_mode: '',
    type: '',
    search: '',
    page: 1,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products', filters],
    queryFn: () => getProducts({
      sale_mode: filters.sale_mode as 'BUY' | 'QUOTE' | 'HYBRID' | undefined,
      type: filters.type as 'product' | 'service' | undefined,
      search: filters.search || undefined,
      page: filters.page,
      page_size: 20,
    }),
  });

  // Fetch categories for select (tree structure with children)
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const products = productsData?.results || [];
  const totalPages = Math.ceil((productsData?.count || 0) / 20);
  const categories = categoriesData?.results || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CreateProductData) => {
      const product = await createProduct(data) as { id: string };
      // Upload images if any
      if (selectedImages.length > 0) {
        try {
          await uploadProductImages(product.id, selectedImages);
          toast.success('Producto e imágenes creados');
        } catch {
          toast.error('Producto creado, pero hubo error al subir imágenes');
        }
      } else {
        toast.success('Producto creado');
      }
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      closeModal();
    },
    onError: () => {
      toast.error('Error al crear producto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductData> }) => {
      const product = await updateProduct(id, data);
      // Upload new images if any
      if (selectedImages.length > 0) {
        try {
          await uploadProductImages(id, selectedImages);
          toast.success('Producto e imágenes actualizados');
        } catch {
          toast.error('Producto actualizado, pero hubo error al subir imágenes');
        }
      } else {
        toast.success('Producto actualizado');
      }
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      closeModal();
    },
    onError: () => {
      toast.error('Error al actualizar producto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setSelectedImages([]);
    setImagePreview([]);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductListItem) => {
    setEditingProduct(product);
    setFormData({
      type: product.type,
      name: product.name,
      short_description: product.short_description,
      description: '',
      category_id: product.category?.id || '',
      sale_mode: product.sale_mode,
      payment_mode: 'FULL',
      base_price: product.base_price,
      compare_at_price: product.compare_at_price || '',
      is_active: true,
      is_featured: product.is_featured,
    });
    // Set existing images for preview if editing
    if (product.primary_image) {
      setImagePreview([product.primary_image.image]);
    } else {
      setImagePreview([]);
    }
    setSelectedImages([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData(initialFormData);
    setSelectedImages([]);
    setImagePreview([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreview(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateProductData = {
      type: formData.type,
      name: formData.name,
      short_description: formData.short_description,
      description: formData.description || undefined,
      category_id: formData.category_id || undefined,
      sale_mode: formData.sale_mode,
      payment_mode: formData.payment_mode,
      base_price: formData.base_price || undefined,
      compare_at_price: formData.compare_at_price || undefined,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Build flat options from tree for filter Select component
  const categoryOptions = [
    { value: '', label: 'Sin categoría' },
    ...categories.map((cat: Category) => ({ value: cat.id, label: cat.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo</h1>
          <p className="text-neutral-400">
            Administra productos y servicios del catálogo
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo producto
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
          <Select
            value={filters.type}
            onChange={(value) => setFilters({ ...filters, type: value, page: 1 })}
            options={TYPE_OPTIONS}
            className="w-40"
          />
          <Select
            value={filters.sale_mode}
            onChange={(value) => setFilters({ ...filters, sale_mode: value, page: 1 })}
            options={SALE_MODE_OPTIONS}
            className="w-44"
          />
        </div>
      </Card>

      {/* Products Table */}
      {isLoading ? (
        <LoadingPage message="Cargando productos..." />
      ) : products.length === 0 ? (
        <Card className="text-center py-12">
          <PhotoIcon className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400 mb-4">No se encontraron productos</p>
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Crear primer producto
          </Button>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Producto
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Categoría
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Tipo
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Modo venta
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Precio
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-400 py-3 px-4">
                    Estado
                  </th>
                  <th className="text-right text-sm font-medium text-neutral-400 py-3 px-4">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {product.primary_image ? (
                          <img
                            src={product.primary_image.image}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover bg-neutral-800"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center">
                            <PhotoIcon className="h-6 w-6 text-neutral-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{product.name}</p>
                          <p className="text-sm text-neutral-400 truncate max-w-xs">
                            {product.short_description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {product.category ? (
                        <span className="text-neutral-300">{product.category.name}</span>
                      ) : (
                        <span className="text-neutral-500">Sin categoría</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={product.type === 'product' ? 'info' : 'default'}>
                        {product.type === 'product' ? 'Producto' : 'Servicio'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={getSaleModeVariant(product.sale_mode)}>
                        {getSaleModeLabel(product.sale_mode)}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      {product.sale_mode === 'QUOTE' ? (
                        <span className="text-neutral-400">A cotizar</span>
                      ) : (
                        <span className="text-white">
                          {formatCurrency(parseFloat(product.base_price))}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {product.is_featured ? (
                        <Badge variant="success">Destacado</Badge>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(product)}
                          title="Editar"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(product.id)}
                          title="Eliminar"
                          className="text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Imágenes del producto
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {imagePreview.map((url, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-neutral-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <PlusIcon className="h-8 w-8 text-neutral-500" />
              </label>
            </div>
            <p className="text-xs text-neutral-500">
              Formatos: JPG, PNG, WebP. Máximo 5MB por imagen.
            </p>
          </div>

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Nombre *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del producto"
              required
            />
          </div>

          {/* Type & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Tipo *
              </label>
              <Select
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as 'product' | 'service' })}
                options={[
                  { value: 'product', label: 'Producto' },
                  { value: 'service', label: 'Servicio' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Categoría
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Seleccionar categoría...</option>
                {LANDING_SERVICE_IDS.map((serviceId) => {
                  const subs = SERVICE_SUBCATEGORIES[serviceId] || [];
                  return (
                    <optgroup key={serviceId} label={`📁 ${SERVICE_LABELS[serviceId]}`}>
                      <option value={serviceId}>{SERVICE_LABELS[serviceId]} (general)</option>
                      {subs.filter((s: ServiceSubcategory) => s.id !== 'otro').map((sub: ServiceSubcategory) => (
                        <option key={`${serviceId}-${sub.id}`} value={`${serviceId}::${sub.id}`}>↳ {sub.label}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Descripción corta *
            </label>
            <Textarea
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              placeholder="Descripción breve del producto (aparece en listados)"
              rows={2}
              required
            />
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Descripción completa
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción detallada del producto (aparece en la página del producto)"
              rows={4}
            />
          </div>

          {/* Sale Mode & Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Modo de venta *
              </label>
              <Select
                value={formData.sale_mode}
                onChange={(value) => setFormData({ ...formData, sale_mode: value as 'BUY' | 'QUOTE' | 'HYBRID' })}
                options={[
                  { value: 'BUY', label: 'Compra directa' },
                  { value: 'QUOTE', label: 'Cotizable' },
                  { value: 'HYBRID', label: 'Ambos' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Precio base
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                placeholder="0.00"
                disabled={formData.sale_mode === 'QUOTE'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Precio comparación
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.compare_at_price}
                onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                placeholder="0.00"
                disabled={formData.sale_mode === 'QUOTE'}
              />
            </div>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-neutral-300">Activo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-neutral-300">Destacado</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : editingProduct
                ? 'Guardar cambios'
                : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar eliminación"
        size="sm"
      >
        <p className="text-neutral-300 mb-6">
          ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
