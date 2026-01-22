'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';

import { getProducts, getCategories, getAttributes, ProductFilters as IProductFilters } from '@/lib/api/catalog';
import { ProductCard, ProductFilters } from '@/components/catalog';
import { Breadcrumb, Pagination, LoadingPage, Button, Select } from '@/components/ui';
import { cn, debounce } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Más recientes' },
  { value: 'name', label: 'Nombre (A-Z)' },
  { value: '-name', label: 'Nombre (Z-A)' },
  { value: 'base_price', label: 'Precio: Menor a Mayor' },
  { value: '-base_price', label: 'Precio: Mayor a Menor' },
];

export default function CatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params
  const initialFilters: IProductFilters = {
    category_slug: searchParams.get('categoria') || undefined,
    search: searchParams.get('buscar') || undefined,
    min_price: searchParams.get('precio_min') ? Number(searchParams.get('precio_min')) : undefined,
    max_price: searchParams.get('precio_max') ? Number(searchParams.get('precio_max')) : undefined,
    ordering: searchParams.get('orden') || '-created_at',
    page: searchParams.get('pagina') ? Number(searchParams.get('pagina')) : 1,
    page_size: 20,
  };

  const [filters, setFilters] = useState<IProductFilters>(initialFilters);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');

  // Fetch data
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', filters, selectedAttributes],
    queryFn: () => getProducts(filters),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: attributesData } = useQuery({
    queryKey: ['attributes'],
    queryFn: getAttributes,
  });

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: IProductFilters) => {
    const params = new URLSearchParams();
    if (newFilters.category_slug) params.set('categoria', newFilters.category_slug);
    if (newFilters.search) params.set('buscar', newFilters.search);
    if (newFilters.min_price) params.set('precio_min', String(newFilters.min_price));
    if (newFilters.max_price) params.set('precio_max', String(newFilters.max_price));
    if (newFilters.ordering && newFilters.ordering !== '-created_at') params.set('orden', newFilters.ordering);
    if (newFilters.page && newFilters.page > 1) params.set('pagina', String(newFilters.page));

    const queryString = params.toString();
    router.push(`/catalogo${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      const newFilters = { ...filters, search: query || undefined, page: 1 };
      setFilters(newFilters);
      updateUrl(newFilters);
    }, 300),
    [filters, updateUrl]
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleCategoryChange = (categorySlug?: string) => {
    const newFilters = { ...filters, category_slug: categorySlug, page: 1 };
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const handlePriceRangeChange = (range: { min?: number; max?: number }) => {
    const newFilters = { ...filters, min_price: range.min, max_price: range.max, page: 1 };
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const handleAttributeChange = (attributeSlug: string, values: string[]) => {
    setSelectedAttributes((prev) => {
      if (values.length === 0) {
        const { [attributeSlug]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [attributeSlug]: values };
    });
  };

  const handleSortChange = (value: string) => {
    const newFilters = { ...filters, ordering: value, page: 1 };
    setFilters(newFilters);
    updateUrl(newFilters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    updateUrl(newFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setFilters({ ordering: '-created_at', page: 1, page_size: 12 });
    setSelectedAttributes({});
    setSearchQuery('');
    router.push('/catalogo');
  };

  const products = productsData?.results || [];
  const totalProducts = productsData?.count || 0;
  const totalPages = Math.ceil(totalProducts / (filters.page_size || 12));
  const categories = categoriesData?.results || [];
  const attributes = attributesData?.results || [];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Catálogo' },
            ...(filters.category_slug
              ? [{ label: categories.find((c) => c.slug === filters.category_slug)?.name || '' }]
              : []),
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {filters.category_slug
                ? categories.find((c) => c.slug === filters.category_slug)?.name || 'Catálogo'
                : 'Catálogo'}
            </h1>
            <p className="text-neutral-400">
              {totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort */}
            <Select
              value={filters.ordering || '-created_at'}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
              className="w-48"
            />

            {/* View mode */}
            <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-yellow-400 text-neutral-900'
                    : 'text-neutral-400 hover:text-yellow-400'
                )}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'list'
                    ? 'bg-cyan-500 text-neutral-900'
                    : 'text-neutral-400 hover:text-cyan-400'
                )}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <ProductFilters
              categories={categories}
              attributes={attributes}
              selectedCategory={filters.category_slug}
              selectedAttributes={selectedAttributes}
              priceRange={{ min: filters.min_price, max: filters.max_price }}
              searchQuery={searchQuery}
              onCategoryChange={handleCategoryChange}
              onAttributeChange={handleAttributeChange}
              onPriceRangeChange={handlePriceRangeChange}
              onSearchChange={handleSearchChange}
              onClearFilters={handleClearFilters}
            />
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoadingProducts ? (
              <LoadingPage message="Cargando productos..." />
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-neutral-400 mb-4">No se encontraron productos</p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'grid gap-4',
                    viewMode === 'grid'
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                      : 'grid-cols-1'
                  )}
                >
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={filters.page || 1}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
