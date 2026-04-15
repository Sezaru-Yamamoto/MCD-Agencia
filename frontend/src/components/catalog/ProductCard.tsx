'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useLocale } from 'next-intl';

import { ProductListItem } from '@/lib/api/catalog';
import { Button } from '@/components/ui';

interface ProductCardProps {
  product: ProductListItem;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const locale = useLocale();
  const router = useRouter();

  const name = locale === 'en' && product.name_en ? product.name_en : product.name;

  const imageUrl = product.primary_image?.image || '/images/logo.png';
  const isDirectPurchase = product.sale_mode === 'BUY' || product.sale_mode === 'HYBRID';
  const basePrice = Number(product.base_price || 0);
  const taxAmount = basePrice * 0.16;
  const totalWithTax = basePrice + taxAmount;

  const formatMx = (value: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    }).format(value);

  const handleQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    // Redirige al detalle para completar compra o cotización.
    router.push(`/catalogo/${product.category?.slug || 'productos'}/${product.slug}`);
  };

  // LIST VIEW - Horizontal compact layout (MercadoLibre style)
  if (viewMode === 'list') {
    return (
      <Link
        href={`/catalogo/${product.category?.slug || 'productos'}/${product.slug}`}
        className="group block"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-cmyk-yellow/50 hover:shadow-lg hover:shadow-cmyk-yellow/10 transition-all duration-200 h-40 flex flex-row">
          {/* Image Container - Left side, square and small */}
          <div className="relative w-40 h-40 flex-shrink-0 overflow-hidden bg-neutral-800">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="160px"
            />
          </div>

          {/* Content - Right side, vertical layout */}
          <div className="p-2 flex-1 flex flex-col justify-between">
            {/* Header: Name & Category */}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white group-hover:text-cmyk-cyan transition-colors line-clamp-2">
                {name}
              </h3>
              {product.category && (
                <p className="text-xs text-neutral-500 mt-0.5">{product.category.name}</p>
              )}
              {isDirectPurchase && basePrice > 0 && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-neutral-300">Precio: <span className="font-medium text-white">{formatMx(basePrice)}</span></p>
                  <p className="text-xs text-neutral-400">IVA: {formatMx(taxAmount)}</p>
                  <p className="text-xs text-cyan-400 font-semibold">Total: {formatMx(totalWithTax)}</p>
                </div>
              )}
            </div>

            {/* Footer: Button */}
            <div className="flex items-end justify-end gap-2 mt-2">
              <Button
                size="xs"
                className={isDirectPurchase
                  ? 'bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5'
                  : 'bg-cmyk-cyan hover:bg-cmyk-cyan text-white text-xs px-3 py-1.5'}
                onClick={handleQuote}
              >
                <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
                {isDirectPurchase ? 'Comprar' : 'Cotizar'}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // GRID VIEW - Vertical compact layout (original)
  return (
    <Link
      href={`/catalogo/${product.category?.slug || 'productos'}/${product.slug}`}
      className="group block"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-cmyk-cyan/50 hover:shadow-lg hover:shadow-cmyk-cyan/10 transition-all duration-200 h-full flex flex-col">
        {/* Image Container - More compact */}
        <div className="relative aspect-square overflow-hidden bg-neutral-800">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

        </div>

        {/* Content - Minimal and compact */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          {/* Name - Single line, compact */}
          <h3 className="text-sm font-medium text-white group-hover:text-cmyk-cyan transition-colors line-clamp-2 min-h-10">
            {name}
          </h3>

          {/* Category */}
          {product.category && (
            <p className="text-xs text-neutral-500 mt-1">{product.category.name}</p>
          )}

          {isDirectPurchase && basePrice > 0 && (
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-neutral-300">Precio: <span className="font-medium text-white">{formatMx(basePrice)}</span></p>
              <p className="text-xs text-neutral-400">IVA: {formatMx(taxAmount)}</p>
              <p className="text-xs text-cyan-400 font-semibold">Total: {formatMx(totalWithTax)}</p>
            </div>
          )}

          {/* Action Button - Minimal */}
          <div className="mt-3">
            <Button
              size="xs"
              className={isDirectPurchase
                ? 'w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1.5'
                : 'w-full bg-cmyk-cyan hover:bg-cmyk-cyan text-white text-xs py-1.5'}
              onClick={handleQuote}
            >
              <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
              {isDirectPurchase ? 'Comprar' : 'Cotizar'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
