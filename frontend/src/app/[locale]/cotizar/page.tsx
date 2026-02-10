'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

import { submitQuoteRequest } from '@/lib/api/quotes';
import { getProducts } from '@/lib/api/catalog';
import { useLegalModal } from '@/contexts/LegalModalContext';
import { Button, Input, Textarea, Select, Card, Breadcrumb } from '@/components/ui';

const quoteSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  catalog_item_id: z.string().optional(),
  quantity: z.string().optional(),
  dimensions: z.string().optional(),
  material: z.string().optional(),
  installation_required: z.boolean().optional(),
  description: z.string().min(10, 'Describe tu proyecto (mínimo 10 caracteres)'),
  privacy_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad' }),
  }),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const MATERIAL_OPTIONS = [
  { value: '', label: 'Seleccionar material...' },
  { value: 'lona', label: 'Lona' },
  { value: 'vinil', label: 'Vinil' },
  { value: 'acrilico', label: 'Acrílico' },
  { value: 'aluminio', label: 'Aluminio' },
  { value: 'pvc', label: 'PVC' },
  { value: 'otro', label: 'Otro (especificar en descripción)' },
];

export default function QuotePage() {
  const searchParams = useSearchParams();
  const preselectedProduct = searchParams.get('producto');
  const { openPrivacy } = useLegalModal();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-quote'],
    queryFn: () => getProducts({ page_size: 100 }),
  });

  const productOptions = [
    { value: '', label: 'Seleccionar producto/servicio...' },
    ...(productsData?.results || []).map((p) => ({
      value: p.id,
      label: p.name,
    })),
  ];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      catalog_item_id: preselectedProduct || '',
      installation_required: false,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length !== selectedFiles.length) {
      toast.error('Algunos archivos no son válidos (máx 10MB, formatos: JPG, PNG, PDF)');
    }

    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: QuoteFormData) => {
    setIsLoading(true);
    try {
      const result = await submitQuoteRequest({
        customer_name: data.name,
        customer_email: data.email,
        customer_phone: data.phone,
        customer_company: data.company,
        catalog_item_id: data.catalog_item_id,
        quantity: data.quantity ? parseInt(data.quantity) : undefined,
        dimensions: data.dimensions,
        material: data.material,
        includes_installation: data.installation_required,
        description: data.description,
        attachments: files,
      });
      setRequestNumber(result.request_number);
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Error al enviar cotización');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center py-12">
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              ¡Solicitud enviada con éxito!
            </h1>
            <p className="text-neutral-400 mb-2">
              Tu número de solicitud es:
            </p>
            <p className="text-2xl font-mono text-cyan-400 mb-6">{requestNumber}</p>
            <p className="text-neutral-400 mb-8">
              Nuestro equipo de ventas revisará tu solicitud y te contactará
              en las próximas 24 horas con una cotización personalizada.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/catalogo">
                <Button variant="outline">Seguir explorando</Button>
              </Link>
              <Link href="/">
                <Button>Volver al inicio</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: 'Solicitar Cotización' }]}
          className="mb-6"
        />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Solicitar Cotización
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Cuéntanos sobre tu proyecto y te enviaremos una cotización
            personalizada en menos de 24 horas.
          </p>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Info */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-cyan-400" />
                Información de contacto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre completo"
                  placeholder="Juan Pérez"
                  leftIcon={<UserIcon className="h-5 w-5" />}
                  error={errors.name?.message}
                  required
                  {...register('name')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />
                <Input
                  label="Teléfono (opcional)"
                  placeholder="(555) 123-4567"
                  leftIcon={<PhoneIcon className="h-5 w-5" />}
                  {...register('phone')}
                />
                <Input
                  label="Empresa (opcional)"
                  placeholder="Mi Empresa S.A."
                  leftIcon={<BuildingOfficeIcon className="h-5 w-5" />}
                  {...register('company')}
                />
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-cyan-400" />
                Detalles del proyecto
              </h2>
              <div className="space-y-4">
                <Select
                  label="Producto o servicio"
                  value={watch('catalog_item_id') || ''}
                  onChange={(value) => setValue('catalog_item_id', value)}
                  options={productOptions}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Cantidad"
                    type="number"
                    placeholder="1"
                    min="1"
                    {...register('quantity')}
                  />
                  <Input
                    label="Dimensiones"
                    placeholder="Ej: 3m x 2m"
                    {...register('dimensions')}
                  />
                </div>

                <Select
                  label="Material preferido"
                  value={watch('material') || ''}
                  onChange={(value) => setValue('material', value)}
                  options={MATERIAL_OPTIONS}
                />

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-neutral-950"
                    {...register('installation_required')}
                  />
                  <span className="text-neutral-300">
                    Requiero servicio de instalación
                  </span>
                </label>

                <Textarea
                  label="Descripción del proyecto"
                  placeholder="Describe tu proyecto con el mayor detalle posible: ubicación, acabados deseados, plazos de entrega, etc."
                  rows={5}
                  error={errors.description?.message}
                  required
                  {...register('description')}
                />
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PaperClipIcon className="h-5 w-5 text-cyan-400" />
                Archivos adjuntos (opcional)
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                Sube artes, bocetos o referencias. Máximo 5 archivos de 10MB cada uno.
                Formatos: JPG, PNG, PDF.
              </p>

              <div className="space-y-3">
                {/* File list */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-neutral-800 rounded-lg px-4 py-2"
                      >
                        <span className="text-sm text-neutral-300 truncate flex-1">
                          {file.name}
                        </span>
                        <span className="text-xs text-neutral-500 mx-4">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {files.length < 5 && (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-neutral-600 transition-colors">
                    <div className="text-center">
                      <PaperClipIcon className="h-8 w-8 text-neutral-500 mx-auto mb-2" />
                      <span className="text-neutral-400">
                        Haz clic para subir archivos
                      </span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Privacy consent */}
            <div className="border-t border-neutral-800 pt-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-neutral-950"
                  {...register('privacy_accepted')}
                />
                <span className="text-sm text-neutral-400">
                  He leído y acepto la{' '}
                  <button type="button" onClick={openPrivacy} className="text-cyan-400 hover:underline">
                    Política de Privacidad
                  </button>
                  . Entiendo que mis datos serán utilizados para procesar mi solicitud
                  de cotización.
                </span>
              </label>
              {errors.privacy_accepted && (
                <p className="text-red-500 text-sm mt-2">
                  {errors.privacy_accepted.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Enviar solicitud de cotización
            </Button>
          </form>
        </Card>

        {/* Contact info */}
        <div className="mt-8 text-center text-neutral-400">
          <p>
            ¿Prefieres contactarnos directamente? Llámanos al{' '}
            <a href="tel:+527441234567" className="text-cyan-400 hover:underline">
              (744) 123-4567
            </a>{' '}
            o escríbenos a{' '}
            <a href="mailto:ventas@agenciamcd.mx" className="text-cyan-400 hover:underline">
              ventas@agenciamcd.mx
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
