'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import {
  DocumentTextIcon,
  HeartIcon,
  ShareIcon,
  TruckIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import { getProductBySlug, ProductVariant } from '@/lib/api/catalog';
import { Button, Badge, LoadingPage, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';

export default function ProductDetailPage() {
  const params = useParams();
  const locale = useLocale();

  const slug = params.slug as string;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
      <div className="h-screen flex items-center justify-center">
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

  const handleAttributeSelect = (attributeId: string, valueSlug: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeId]: valueSlug,
    }));
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      {/* Main Container - Centered card layout */}
      <div className="min-h-screen pt-20 pb-8 px-4 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-6xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <Link href="/" className="text-neutral-400 hover:text-cyan-400 transition-colors">
              Inicio
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
            <Link href="/catalogo" className="text-neutral-400 hover:text-cyan-400 transition-colors">
              Catálogo
            </Link>
            {product.category && (
              <>
                <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
                <Link
                  href={`/catalogo?categoria=${product.category.slug}`}
                  className="text-neutral-400 hover:text-cyan-400 transition-colors"
                >
                  {product.category.name}
                </Link>
              </>
            )}
          </div>

          {/* Product Card */}
          <div className="border border-neutral-700 rounded-xl bg-neutral-900/50 overflow-hidden">
            <div className="flex flex-col md:flex-row h-auto md:h-[450px]">
              {/* Image Section */}
              <div className="md:w-2/5 relative h-[250px] md:h-full bg-neutral-800 flex-shrink-0">
                <Image
                  src={images[selectedImage]?.image || '/images/placeholder-product.jpg'}
                  alt={images[selectedImage]?.alt_text || name}
                  fill
                  className="object-contain p-4"
                  priority
                  sizes="(max-width: 768px) 100vw, 40vw"
                />

                {/* Badges */}
                {product.is_featured && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="cyan">Destacado</Badge>
                  </div>
                )}

                {/* Image Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors z-10"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors z-10"
                      aria-label="Siguiente imagen"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>

                    {/* Image Indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            selectedImage === index ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/70'
                          )}
                          aria-label={`Ver imagen ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Info Section */}
              <div className="md:w-3/5 flex flex-col p-5 overflow-hidden">
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {/* Name */}
                  <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{name}</h1>

                  {/* Short Description */}
                  <p className="text-neutral-400 text-sm">{shortDescription}</p>

                  {/* Info banner */}
                  <div className="bg-cmyk-cyan/10 border border-cmyk-cyan/30 rounded-lg p-2.5">
                    <p className="text-xs text-neutral-300">
                      Este producto requiere cotización personalizada.
                    </p>
                  </div>

                  {/* Trust badges */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <TruckIcon className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs">Envío nacional</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <ShieldCheckIcon className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs">Garantía de calidad</span>
                    </div>
                  </div>

                  {/* More details button */}
                  {(description || (product.specifications && Object.keys(product.specifications).length > 0)) && (
                    <button
                      onClick={() => setShowDetailsModal(true)}
                      className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                    >
                      <InformationCircleIcon className="h-4 w-4" />
                      Ver más detalles
                    </button>
                  )}
                </div>

                {/* Actions - Fixed at bottom */}
                <div className="pt-4 mt-auto border-t border-neutral-700 space-y-2">
                  <Link href={`/?producto=${product.id}#cotizar`} className="block">
                    <Button
                      size="lg"
                      className="w-full font-semibold bg-cmyk-cyan hover:bg-cmyk-cyan/90 text-white"
                      leftIcon={<DocumentTextIcon className="h-5 w-5" />}
                    >
                      Solicitar cotización
                    </Button>
                  </Link>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" leftIcon={<HeartIcon className="h-4 w-4" />}>
                      Guardar
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs" leftIcon={<ShareIcon className="h-4 w-4" />}>
                      Compartir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Detalles del producto"
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          {description && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
              <div className="prose prose-invert prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }} />
              </div>
            </div>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Especificaciones</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between col-span-2 sm:col-span-1 py-1 border-b border-neutral-800">
                    <dt className="text-neutral-400 text-sm">{key}</dt>
                    <dd className="text-white text-sm font-medium">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Installation Info */}
          {installationInfo && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Información de instalación</h3>
              <div className="prose prose-invert prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(installationInfo) }} />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
