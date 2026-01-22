'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import {
  ShoppingCartIcon,
  DocumentTextIcon,
  HeartIcon,
  ShareIcon,
  MinusIcon,
  PlusIcon,
  CheckIcon,
  TruckIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

import { getProductBySlug, ProductVariant } from '@/lib/api/catalog';
import { Breadcrumb, Button, Badge, LoadingPage, Card } from '@/components/ui';
import { formatPrice, cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ProductDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const router = useRouter();
  const { addItem, isLoading: isCartLoading } = useCart();
  const { isAuthenticated } = useAuth();

  const slug = params.slug as string;
  const categorySlug = params.category as string;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug),
  });

  // Find matching variant based on selected attributes
  const matchingVariant = useMemo(() => {
    if (!product?.variants?.length || Object.keys(selectedAttributes).length === 0) {
      return product?.variants?.[0] || null;
    }

    return product.variants.find((variant) => {
      return variant.attribute_values.every((av) => {
        const selectedValue = selectedAttributes[av.id];
        return !selectedValue || selectedValue === av.slug;
      });
    }) || null;
  }, [product?.variants, selectedAttributes]);

  // Update selected variant when matching variant changes
  useMemo(() => {
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
    }
  }, [matchingVariant]);

  if (isLoading) {
    return <LoadingPage message="Cargando producto..." />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Producto no encontrado</h1>
          <Link href="/catalogo">
            <Button>Volver al catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  const name = locale === 'en' && product.name_en ? product.name_en : product.name;
  const description = locale === 'en' && product.description_en ? product.description_en : product.description;
  const shortDescription = locale === 'en' && product.short_description_en ? product.short_description_en : product.short_description;
  const installationInfo = locale === 'en' && product.installation_info_en ? product.installation_info_en : product.installation_info;

  const images = product.images?.length > 0 ? product.images : [{ id: '0', image: '/images/placeholder-product.jpg', alt_text: name }];
  const currentPrice = selectedVariant?.price || product.base_price;
  const comparePrice = selectedVariant?.compare_at_price || product.compare_at_price;
  const stock = selectedVariant?.stock ?? product.total_stock;
  const isOutOfStock = product.track_inventory && stock <= 0;

  const handleAttributeSelect = (attributeId: string, valueSlug: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeId]: valueSlug,
    }));
  };

  const handleAddToCart = async () => {
    // Use selected variant or fall back to first variant if no attributes to select
    const variantToAdd = selectedVariant || product.variants?.[0];
    
    if (!variantToAdd) {
      toast.error('Producto no disponible');
      return;
    }

    try {
      await addItem(variantToAdd.id, quantity);
      toast.success('Producto agregado al carrito');
    } catch {
      toast.error('Error al agregar al carrito');
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && (!product.track_inventory || newQuantity <= stock)) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Catálogo', href: '/catalogo' },
            ...(product.category
              ? [{ label: product.category.name, href: `/catalogo?categoria=${product.category.slug}` }]
              : []),
            { label: name },
          ]}
          className="mb-6"
        />

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
              <Image
                src={images[selectedImage]?.image || '/images/placeholder-product.jpg'}
                alt={images[selectedImage]?.alt_text || name}
                fill
                className="object-cover"
                priority
              />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.has_discount && product.discount_percentage && (
                  <Badge variant="magenta">-{product.discount_percentage}%</Badge>
                )}
                {product.is_featured && <Badge variant="cyan">Destacado</Badge>}
                {isOutOfStock && <Badge variant="error">Agotado</Badge>}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors',
                      selectedImage === index
                        ? 'border-cyan-500'
                        : 'border-neutral-800 hover:border-neutral-600'
                    )}
                  >
                    <Image
                      src={image.image}
                      alt={image.alt_text || `${name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.category && (
              <Link
                href={`/catalogo?categoria=${product.category.slug}`}
                className="text-sm text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
              >
                {product.category.name}
              </Link>
            )}

            {/* Name */}
            <h1 className="text-3xl lg:text-4xl font-bold text-white">{name}</h1>

            {/* Short Description */}
            <p className="text-neutral-400 text-lg">{shortDescription}</p>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold text-white">{formatPrice(currentPrice)}</span>
              {comparePrice && (
                <span className="text-xl text-neutral-500 line-through">
                  {formatPrice(comparePrice)}
                </span>
              )}
              {product.has_discount && product.discount_percentage && (
                <Badge variant="magenta">-{product.discount_percentage}%</Badge>
              )}
            </div>

            {/* Deposit info */}
            {product.payment_mode === 'DEPOSIT_ALLOWED' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-300">
                  <span className="text-yellow-400 font-medium">Anticipo disponible:</span>{' '}
                  {product.deposit_percentage
                    ? `${product.deposit_percentage}% del total`
                    : product.deposit_amount
                    ? `${formatPrice(product.deposit_amount)} de anticipo`
                    : '50% del total'}
                </p>
              </div>
            )}

            {/* Attributes / Variants */}
            {product.available_attributes && product.available_attributes.length > 0 && (
              <div className="space-y-4">
                {product.available_attributes.map((attribute) => (
                  <div key={attribute.id}>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      {locale === 'en' && attribute.name_en ? attribute.name_en : attribute.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attribute.values.map((value) => {
                        const isSelected = selectedAttributes[attribute.id] === value.id;
                        return (
                          <button
                            key={value.id}
                            onClick={() => handleAttributeSelect(attribute.id, value.id)}
                            className={cn(
                              'px-4 py-2 rounded-lg border transition-colors',
                              isSelected
                                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                                : 'border-neutral-700 text-neutral-300 hover:border-yellow-400/50'
                            )}
                          >
                            {value.color_code && (
                              <span
                                className="inline-block w-4 h-4 rounded-full mr-2 border border-neutral-600"
                                style={{ backgroundColor: value.color_code }}
                              />
                            )}
                            {locale === 'en' && value.value_en ? value.value_en : value.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stock info */}
            {product.track_inventory && (
              <div className="flex items-center gap-2">
                {stock > 10 ? (
                  <>
                    <CheckIcon className="h-5 w-5 text-green-500" />
                    <span className="text-green-500">En stock</span>
                  </>
                ) : stock > 0 ? (
                  <>
                    <CheckIcon className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-500">Solo {stock} disponibles</span>
                  </>
                ) : (
                  <span className="text-red-500">Agotado</span>
                )}
              </div>
            )}

            {/* Quantity and Add to Cart */}
            {product.sale_mode !== 'QUOTE' && (
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Quantity */}
                <div className="flex items-center border border-neutral-700 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-3 text-neutral-400 hover:text-white disabled:opacity-50"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                  <span className="w-12 text-center text-white">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={product.track_inventory && quantity >= stock}
                    className="p-3 text-neutral-400 hover:text-white disabled:opacity-50"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  size="lg"
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-semibold"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isCartLoading}
                  isLoading={isCartLoading}
                  leftIcon={<ShoppingCartIcon className="h-5 w-5" />}
                >
                  {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                </Button>
              </div>
            )}

            {/* Quote button */}
            {(product.sale_mode === 'QUOTE' || product.sale_mode === 'HYBRID') && (
              <Link href={`/?producto=${product.id}#cotizar`}>
                <Button
                  variant={product.sale_mode === 'QUOTE' ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full"
                  leftIcon={<DocumentTextIcon className="h-5 w-5" />}
                >
                  Solicitar cotización
                </Button>
              </Link>
            )}

            {/* Secondary actions */}
            <div className="flex gap-4">
              <Button variant="ghost" leftIcon={<HeartIcon className="h-5 w-5" />}>
                Guardar
              </Button>
              <Button variant="ghost" leftIcon={<ShareIcon className="h-5 w-5" />}>
                Compartir
              </Button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-neutral-800">
              <div className="flex items-center gap-3 text-neutral-400">
                <TruckIcon className="h-6 w-6 text-yellow-400" />
                <div className="text-sm">
                  <p className="text-white font-medium">Envío a todo México</p>
                  <p>Cotizamos tu envío</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <ShieldCheckIcon className="h-6 w-6 text-cyan-400" />
                <div className="text-sm">
                  <p className="text-white font-medium">Garantía de calidad</p>
                  <p>Materiales premium</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Description */}
            <Card className="lg:col-span-2">
              <h2 className="text-xl font-bold text-white mb-4">Descripción</h2>
              <div className="prose prose-invert max-w-none">
                {description ? (
                  <div dangerouslySetInnerHTML={{ __html: description }} />
                ) : (
                  <p className="text-neutral-400">{shortDescription}</p>
                )}
              </div>
            </Card>

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <Card>
                <h2 className="text-xl font-bold text-white mb-4">Especificaciones</h2>
                <dl className="space-y-3">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <dt className="text-neutral-400">{key}</dt>
                      <dd className="text-white font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {/* Installation Info */}
            {installationInfo && (
              <Card className="lg:col-span-3">
                <h2 className="text-xl font-bold text-white mb-4">Información de instalación</h2>
                <div className="prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: installationInfo }} />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
