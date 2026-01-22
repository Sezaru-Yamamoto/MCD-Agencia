'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCartIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';

import { ProductListItem } from '@/lib/api/catalog';
import { Button, Badge } from '@/components/ui';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: ProductListItem;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const router = useRouter();

  const name = locale === 'en' && product.name_en ? product.name_en : product.name;
  const description =
    locale === 'en' && product.short_description_en
      ? product.short_description_en
      : product.short_description;

  const imageUrl = product.primary_image?.image || '/images/placeholder-product.jpg';

  const getPrice = () => {
    if (product.price_range.has_range && product.price_range.min) {
      return `Desde ${formatPrice(product.price_range.min)}`;
    }
    return formatPrice(product.base_price);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    // Redirigir a la página de detalle para seleccionar variante y agregar al carrito
    router.push(`/catalogo/${product.category?.slug || 'productos'}/${product.slug}`);
  };

  // LIST VIEW - Horizontal compact layout (MercadoLibre style)
  if (viewMode === 'list') {
    return (
      <Link
        href={`/catalogo/${product.category?.slug || 'productos'}/${product.slug}`}
        className="group block"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-400/10 transition-all duration-200 h-40 flex flex-row">
          {/* Image Container - Left side, square and small */}
          <div className="relative w-40 h-40 flex-shrink-0 overflow-hidden bg-neutral-800">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="160px"
            />

            {/* Discount Badge */}
            {product.has_discount && product.discount_percentage && (
              <div className="absolute top-1 left-1">
                <Badge variant="magenta" size="sm">
                  -{product.discount_percentage}%
                </Badge>
              </div>
            )}
          </div>

          {/* Content - Right side, vertical layout */}
          <div className="p-2 flex-1 flex flex-col justify-between">
            {/* Header: Name & Category */}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                {name}
              </h3>
              {product.category && (
                <p className="text-xs text-neutral-500 mt-0.5">{product.category.name}</p>
              )}
            </div>

            {/* Footer: Price & Buttons */}
            <div className="flex items-end justify-between gap-2 mt-1">
              {/* Price */}
              <div className="flex-1">
                {product.sale_mode !== 'QUOTE' ? (
                  <div>
                    <span className="text-base font-bold text-cyan-400">{getPrice()}</span>
                    {product.compare_at_price && (
                      <div className="text-xs text-neutral-500 line-through">
                        {formatPrice(product.compare_at_price)}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">Cotizar</span>
                )}
              </div>

              {/* Button */}
              <div className="flex-shrink-0">
                {product.sale_mode === 'BUY' && (
                  <Button
                    size="xs"
                    className="bg-yellow-400 hover:bg-yellow-500 text-neutral-900 text-xs px-2 py-1 font-semibold"
                    onClick={handleQuickAdd}
                  >
                    <ShoppingCartIcon className="h-3 w-3" />
                  </Button>
                )}
                {product.sale_mode === 'QUOTE' && (
                  <Link href={`/?producto=${product.id}#cotizar`}>
                    <Button
                      size="xs"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-2 py-1"
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quote badge - Top right */}
          {product.sale_mode === 'QUOTE' && (
            <div className="absolute top-1 right-1">
              <Badge variant="warning" size="sm">
                Cotizar
              </Badge>
            </div>
          )}
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-200 h-full flex flex-col">
        {/* Image Container - More compact */}
        <div className="relative aspect-square overflow-hidden bg-neutral-800">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Badges - Compact */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.has_discount && product.discount_percentage && (
              <Badge variant="magenta" size="sm">
                -{product.discount_percentage}%
              </Badge>
            )}
          </div>

          {/* Quote mode indicator */}
          {product.sale_mode === 'QUOTE' && (
            <div className="absolute top-2 right-2">
              <Badge variant="warning" size="sm">
                Cotizar
              </Badge>
            </div>
          )}
        </div>

        {/* Content - Minimal and compact */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          {/* Name - Single line, compact */}
          <h3 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-2 min-h-10">
            {name}
          </h3>

          {/* Price Section */}
          <div className="mt-2">
            {product.sale_mode !== 'QUOTE' ? (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-cyan-400">{getPrice()}</span>
                {product.compare_at_price && (
                  <span className="text-xs text-neutral-500 line-through mt-0.5">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-neutral-400">Solicitar precio</span>
            )}
          </div>

          {/* Action Button - Minimal */}
          <div className="mt-2">
            {product.sale_mode === 'BUY' && (
              <Button
                size="xs"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-neutral-900 text-xs py-1.5 font-semibold"
                onClick={handleQuickAdd}
              >
                <ShoppingCartIcon className="h-3.5 w-3.5 mr-1" />
                Agregar
              </Button>
            )}
            {product.sale_mode === 'QUOTE' && (
              <Link href={`/?producto=${product.id}#cotizar`} className="block">
                <Button
                  size="xs"
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs py-1.5"
                >
                  <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
                  Cotizar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
