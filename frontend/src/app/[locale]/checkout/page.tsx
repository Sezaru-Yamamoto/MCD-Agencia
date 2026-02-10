'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ChevronLeftIcon,
  LockClosedIcon,
  TruckIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLegalModal } from '@/contexts/LegalModalContext';
import { getAddresses, createAddress, createOrder, Address } from '@/lib/api/orders';
import { initiateMercadoPagoPayment, initiatePayPalPayment } from '@/lib/api/payments';
import { Button, Input, Card, LoadingPage, Modal } from '@/components/ui';
import { formatPrice, cn } from '@/lib/utils';

const addressSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().min(10, 'Teléfono inválido'),
  street: z.string().min(3, 'Calle requerida'),
  exterior_number: z.string().min(1, 'Número exterior requerido'),
  interior_number: z.string().optional(),
  neighborhood: z.string().min(2, 'Colonia requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  state: z.string().min(2, 'Estado requerido'),
  postal_code: z.string().min(5, 'Código postal inválido'),
  reference: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

const PAYMENT_METHODS = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Tarjetas, OXXO, transferencia',
    icon: CreditCardIcon,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pago seguro con PayPal',
    icon: BuildingLibraryIcon,
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading, refreshCart } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { openPrivacy, openTerms } = useLegalModal();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('mercadopago');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { data: addressesData, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: getAddresses,
    enabled: isAuthenticated,
  });

  const addresses = addressesData?.results || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Set default address
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses, selectedAddressId]);

  const handleAddAddress = async (data: AddressFormData) => {
    try {
      await createAddress({
        ...data,
        type: 'shipping',
        is_default: addresses.length === 0,
        country: 'MX',
      });
      toast.success('Dirección agregada');
      refetchAddresses();
      setIsAddressModalOpen(false);
      reset();
    } catch {
      toast.error('Error al agregar dirección');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Selecciona una dirección de envío');
      return;
    }

    if (!termsAccepted) {
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the order first
      const order = await createOrder({
        shipping_address_id: selectedAddressId,
        use_shipping_as_billing: true,
        payment_method: selectedPaymentMethod as 'mercadopago' | 'paypal',
        terms_accepted: true,
      });

      // Refresh cart (should be empty now)
      await refreshCart();

      // Redirect to payment gateway based on selected method
      if (selectedPaymentMethod === 'mercadopago') {
        const preference = await initiateMercadoPagoPayment(order.id);
        // Use sandbox in development, production in production
        const redirectUrl = process.env.NODE_ENV === 'production'
          ? preference.init_point
          : preference.sandbox_init_point || preference.init_point;
        window.location.href = redirectUrl;
      } else if (selectedPaymentMethod === 'paypal') {
        const paypalOrder = await initiatePayPalPayment(order.id);
        window.location.href = paypalOrder.approval_url;
      } else {
        // Direct to order confirmation for other methods
        toast.success('Orden creada exitosamente');
        router.push(`/mi-cuenta/pedidos/${order.id}`);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isCartLoading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Tu carrito está vacío</h1>
          <Link href="/catalogo">
            <Button>Ir al catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/catalogo"
            className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Seguir comprando
          </Link>
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TruckIcon className="h-6 w-6 text-cyan-400" />
                  Dirección de envío
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddressModalOpen(true)}
                >
                  + Agregar nueva
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-400 mb-4">No tienes direcciones guardadas</p>
                  <Button onClick={() => setIsAddressModalOpen(true)}>
                    Agregar dirección
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      className={cn(
                        'text-left p-4 rounded-lg border transition-colors',
                        selectedAddressId === address.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      )}
                    >
                      <p className="text-white font-medium">{address.name}</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        {address.street} {address.exterior_number}
                        {address.interior_number && `, Int. ${address.interior_number}`}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {address.neighborhood}, {address.city}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {address.state}, CP {address.postal_code}
                      </p>
                      <p className="text-sm text-neutral-400 mt-1">{address.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Payment Method */}
            <Card>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <CreditCardIcon className="h-6 w-6 text-cyan-400" />
                Método de pago
              </h2>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left',
                      selectedPaymentMethod === method.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    )}
                  >
                    <method.icon className="h-8 w-8 text-neutral-400" />
                    <div>
                      <p className="text-white font-medium">{method.name}</p>
                      <p className="text-sm text-neutral-400">{method.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Terms */}
            <Card>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-neutral-950"
                />
                <span className="text-sm text-neutral-400">
                  He leído y acepto los{' '}
                  <button type="button" onClick={openTerms} className="text-cyan-400 hover:underline">
                    Términos y Condiciones
                  </button>{' '}
                  y la{' '}
                  <button type="button" onClick={openPrivacy} className="text-cyan-400 hover:underline">
                    Política de Privacidad
                  </button>
                </span>
              </label>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-8">
              <h2 className="text-xl font-semibold text-white mb-4">Resumen del pedido</h2>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                      <Image
                        src={item.variant.images?.[0]?.image || '/images/placeholder-product.jpg'}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {item.variant.name} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-white text-sm font-medium">
                      {formatPrice(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-neutral-800 pt-4">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>IVA (16%)</span>
                  <span>{formatPrice(cart.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Envío</span>
                  <span>Por calcular</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-neutral-800">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </div>

              {/* Place Order */}
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handlePlaceOrder}
                isLoading={isSubmitting}
                disabled={!selectedAddressId || !termsAccepted}
                leftIcon={<LockClosedIcon className="h-5 w-5" />}
              >
                Pagar {formatPrice(cart.total)}
              </Button>

              <p className="text-xs text-neutral-500 text-center mt-4">
                Pago seguro con encriptación SSL
              </p>
            </Card>
          </div>
        </div>

        {/* Add Address Modal */}
        <Modal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          title="Nueva dirección"
          size="lg"
        >
          <form onSubmit={handleSubmit(handleAddAddress)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre completo"
                placeholder="Juan Pérez"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Teléfono"
                placeholder="(555) 123-4567"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <Input
              label="Calle"
              placeholder="Av. Principal"
              error={errors.street?.message}
              {...register('street')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Número exterior"
                placeholder="123"
                error={errors.exterior_number?.message}
                {...register('exterior_number')}
              />
              <Input
                label="Número interior (opcional)"
                placeholder="4A"
                {...register('interior_number')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Colonia"
                placeholder="Centro"
                error={errors.neighborhood?.message}
                {...register('neighborhood')}
              />
              <Input
                label="Código postal"
                placeholder="39300"
                error={errors.postal_code?.message}
                {...register('postal_code')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ciudad"
                placeholder="Acapulco"
                error={errors.city?.message}
                {...register('city')}
              />
              <Input
                label="Estado"
                placeholder="Guerrero"
                error={errors.state?.message}
                {...register('state')}
              />
            </div>

            <Input
              label="Referencia (opcional)"
              placeholder="Entre calles, color de casa, etc."
              {...register('reference')}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setIsAddressModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Guardar dirección
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
