'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { quoteFormSchema, type QuoteFormData } from '@/lib/schemas';
import { trackEvent, trackingEvents } from '@/lib/tracking';
import { CONTACT_INFO } from '@/lib/constants';
import { SERVICE_IDS } from '@/lib/service-data';
import { RouteSelector } from './RouteSelector';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function QuoteForm() {
  const t = useTranslations('landing.quoteForm');
  const tServices = useTranslations('landing.services');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [routeInfo, setRouteInfo] = useState<{
    pointA: { name: string; lat: number; lon: number } | null;
    pointB: { name: string; lat: number; lon: number } | null;
    routeData: { coordinates: Array<[number, number]>; distance: number; duration: number } | null;
  } | null>(null);
  const [highlightService, setHighlightService] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      tipoSolicitud: 'cotizacion',
      entrega: 'envio',
    },
  });

  const servicioValue = watch('servicio');

  // Leer servicio y producto desde URL y hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const producto = searchParams.get('producto');
      
      if (hash.startsWith('#cotizar') || producto) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        const servicioFromUrl = params.get('servicio');
        const productoFromUrl = params.get('producto') || producto;
        
        if (servicioFromUrl) {
          const serviceExists = SERVICE_IDS.includes(servicioFromUrl as any);
          if (serviceExists) {
            setTimeout(() => {
              const selectElement = document.getElementById('servicio') as HTMLSelectElement;
              if (selectElement) {
                selectElement.value = servicioFromUrl;
                const event = new Event('change', { bubbles: true });
                selectElement.dispatchEvent(event);
              }
              
              setValue('servicio', servicioFromUrl as any, { 
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true 
              });
              setSelectedService(servicioFromUrl);
              
              const formElement = document.getElementById('cotizar');
              if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
              
              setTimeout(() => {
                setHighlightService(true);
                setTimeout(() => setHighlightService(false), 2000);
              }, 600);
            }, 200);
          }
        } else if (productoFromUrl) {
          // Si viene desde catálogo con producto
          setTimeout(() => {
            const formElement = document.getElementById('cotizar');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // Precargar producto en el campo de comentarios o descripción
            setValue('comentarios', `Producto ID: ${productoFromUrl}`, {
              shouldValidate: false,
              shouldDirty: false,
              shouldTouch: false
            });
          }, 200);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setValue, searchParams]);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedService(value);
    setRouteInfo(null);
  };

  const onSubmit = async (data: QuoteFormData) => {
    try {
      setFormStatus('submitting');
      trackEvent(trackingEvents.FORM_START);

      const metadata = {
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
        referrer: document.referrer || undefined,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
      };

      let body: any;
      const headers: any = {};

      if (selectedFile) {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('email', data.email);
        formData.append('telefono', data.telefono);
        formData.append('tipoSolicitud', data.tipoSolicitud);
        formData.append('servicio', data.servicio);
        formData.append('entrega', data.entrega);
        formData.append('privacidad', String(data.privacidad));
        if (data.medidaAncho) formData.append('medidaAncho', data.medidaAncho);
        if (data.medidaAlto) formData.append('medidaAlto', data.medidaAlto);
        if (data.uso) formData.append('uso', data.uso);
        if (data.fechaObjetivo) formData.append('fechaObjetivo', data.fechaObjetivo);
        if (data.comentarios) formData.append('comentarios', data.comentarios);
        if (data.website) formData.append('website', data.website);
        formData.append('metadata', JSON.stringify(metadata));
        formData.append('archivo', selectedFile);
        body = formData;
      } else {
        body = JSON.stringify({
          ...data,
          metadata,
        });
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }

      setFormStatus('success');
      trackEvent(trackingEvents.FORM_SUBMIT_SUCCESS, {
        servicio: data.servicio,
        tipo_solicitud: data.tipoSolicitud,
      });
      reset();
      setSelectedFile(null);

      setTimeout(() => {
        document.getElementById('form-status')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : t('error')
      );
      trackEvent(trackingEvents.FORM_SUBMIT_ERROR);
    }
  };

  return (
    <section id="cotizar" className="section py-10 sm:py-14 md:py-18 lg:py-24">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="mb-4">{t('title')}</h2>
          <p className="text-xl text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        {/* Status Messages */}
        <div id="form-status" className="max-w-4xl mx-auto mb-8">
          {formStatus === 'success' && (
            <div className="bg-cmyk-cyan/20 border-l-4 border-cmyk-cyan p-6 rounded-lg animate-fade-in">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 text-cmyk-cyan mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-cmyk-cyan mb-2">
                    {t('success')}
                  </h3>
                  <p className="text-gray-300">
                    {t('successMessage')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {formStatus === 'error' && (
            <div className="bg-cmyk-yellow/20 border-l-4 border-cmyk-yellow p-6 rounded-lg animate-fade-in">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 text-cmyk-yellow mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-cmyk-yellow mb-2">
                    {t('error')}
                  </h3>
                  <p className="text-gray-300 mb-3">{errorMessage}</p>
                  <p className="text-gray-300">
                    {t('errorRetry')}{' '}
                    <a
                      href={CONTACT_INFO.whatsapp.url}
                      className="font-semibold underline text-cmyk-cyan hover:text-cmyk-magenta"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {CONTACT_INFO.whatsapp.displayNumber}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-4xl mx-auto bg-cmyk-black rounded-2xl shadow-xl p-8 md:p-12 border border-cmyk-cyan/20"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Datos de contacto */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">
                  {t('contactData')}
                </h3>
              </div>

              <div>
                <label htmlFor="nombre" className="label-field">
                  {t('name')} <span className="text-cmyk-magenta">*</span>
                </label>
                <input
                  {...register('nombre')}
                  type="text"
                  id="nombre"
                  className="input-field"
                  placeholder={t('namePlaceholder')}
                  disabled={formStatus === 'submitting'}
                />
                {errors.nombre && (
                  <p className="error-message">{errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label-field">
                  {t('email')} <span className="text-cmyk-magenta">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="input-field"
                  placeholder={t('emailPlaceholder')}
                  disabled={formStatus === 'submitting'}
                />
                {errors.email && (
                  <p className="error-message">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="telefono" className="label-field">
                  {t('phone')} <span className="text-cmyk-magenta">*</span>
                </label>
                <input
                  {...register('telefono')}
                  type="tel"
                  id="telefono"
                  className="input-field"
                  placeholder={t('phonePlaceholder')}
                  disabled={formStatus === 'submitting'}
                />
                {errors.telefono && (
                  <p className="error-message">{errors.telefono.message}</p>
                )}
              </div>

              {/* Ocultar método de entrega para servicios que no aplican */}
              {servicioValue !== 'vallas-moviles' && (
                <div>
                  <label htmlFor="entrega" className="label-field">
                    {t('deliveryMethod')} <span className="text-cmyk-magenta">*</span>
                  </label>
                  <select
                    {...register('entrega')}
                    id="entrega"
                    className="input-field"
                    disabled={formStatus === 'submitting'}
                  >
                    <option value="envio">{t('deliveryOptions.shipping')}</option>
                    <option value="recolección">{t('deliveryOptions.pickup')}</option>
                    <option value="no-se">{t('deliveryOptions.notSure')}</option>
                  </select>
                  {errors.entrega && (
                    <p className="error-message">{errors.entrega.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Detalles del proyecto */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">
                  {t('projectDetails')}
                </h3>
              </div>

              <div>
                <label htmlFor="tipoSolicitud" className="label-field">
                  {t('requestType')} <span className="text-cmyk-magenta">*</span>
                </label>
                <select
                  {...register('tipoSolicitud')}
                  id="tipoSolicitud"
                  className="input-field"
                  disabled={formStatus === 'submitting'}
                >
                  <option value="cotizacion">{t('requestOptions.quote')}</option>
                  <option value="contacto">{t('requestOptions.contact')}</option>
                </select>
                {errors.tipoSolicitud && (
                  <p className="error-message">{errors.tipoSolicitud.message}</p>
                )}
              </div>

              <div className={`relative transition-transform duration-500 ${highlightService ? 'scale-105' : ''}`}>
                <label htmlFor="servicio" className={`label-field transition-colors duration-300 ${highlightService ? 'text-cmyk-cyan font-bold' : ''}`}>
                  {t('service')} <span className="text-cmyk-magenta">*</span>
                </label>
                <select
                  {...register('servicio', {
                    onChange: (e) => {
                      handleServiceChange(e);
                    }
                  })}
                  id="servicio"
                  className={`input-field transition-all duration-300 ${
                    highlightService 
                      ? 'ring-4 ring-cmyk-cyan border-cmyk-cyan shadow-xl shadow-cmyk-cyan/40 bg-cmyk-cyan/10' 
                      : ''
                  }`}
                  style={highlightService ? { animation: 'pulse-glow 0.8s ease-in-out infinite' } : {}}
                  disabled={formStatus === 'submitting'}
                >
                  <option value="">{t('selectService')}</option>
                  {SERVICE_IDS.map((serviceId) => (
                    <option key={serviceId} value={serviceId}>
                      {tServices(`items.${serviceId}.title`)}
                    </option>
                  ))}
                </select>
                {highlightService && (
                  <div className="absolute -top-3 -right-3 bg-cmyk-cyan text-cmyk-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
                    ✓ {t('selected')}
                  </div>
                )}
                {errors.servicio && (
                  <p className="error-message">{errors.servicio.message}</p>
                )}
              </div>

              {/* Selector de rutas para Vallas Móviles */}
              {servicioValue === 'vallas-moviles' && (
                <RouteSelector
                  onChange={setRouteInfo}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="medidaAncho" className="label-field">
                    {t('width')}
                  </label>
                  <input
                    {...register('medidaAncho')}
                    type="text"
                    id="medidaAncho"
                    className="input-field"
                    placeholder={t('widthPlaceholder')}
                    disabled={formStatus === 'submitting'}
                  />
                </div>
                <div>
                  <label htmlFor="medidaAlto" className="label-field">
                    {t('height')}
                  </label>
                  <input
                    {...register('medidaAlto')}
                    type="text"
                    id="medidaAlto"
                    className="input-field"
                    placeholder={t('heightPlaceholder')}
                    disabled={formStatus === 'submitting'}
                  />
                </div>
              </div>

              {/* Ocultar uso para servicios que no aplican */}
              {servicioValue !== 'vallas-moviles' && (
                <div>
                  <label htmlFor="uso" className="label-field">
                    {t('usage')}
                  </label>
                  <select
                    {...register('uso')}
                    id="uso"
                    className="input-field"
                    disabled={formStatus === 'submitting'}
                  >
                    <option value="">{t('usageOptions.select')}</option>
                    <option value="interior">{t('usageOptions.indoor')}</option>
                    <option value="exterior">{t('usageOptions.outdoor')}</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="fechaObjetivo" className="label-field">
                  {t('targetDate')}
                </label>
                <input
                  {...register('fechaObjetivo')}
                  type="date"
                  id="fechaObjetivo"
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  disabled={formStatus === 'submitting'}
                />
              </div>
            </div>
          </div>

          {/* Full width fields */}
          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="comentarios" className="label-field">
                {t('comments')}
              </label>
              <textarea
                {...register('comentarios')}
                id="comentarios"
                rows={4}
                className="input-field resize-none"
                placeholder={t('commentsPlaceholder')}
                disabled={formStatus === 'submitting'}
              />
              {errors.comentarios && (
                <p className="error-message">{errors.comentarios.message}</p>
              )}
            </div>

            {/* File upload section */}
            <div>
              <label className="label-field">
                {t('attachFile')}
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-3 sm:p-4 text-center transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-cmyk-magenta bg-cmyk-magenta/10' 
                    : 'border-gray-300 hover:border-cmyk-magenta hover:bg-cmyk-magenta/5'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      alert(t('fileTooLarge'));
                      return;
                    }
                    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      'application/zip', 'image/jpg'];
                    if (!allowedTypes.includes(file.type)) {
                      alert(t('fileTypeNotAllowed'));
                      return;
                    }
                    setSelectedFile(file);
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert(t('fileTooLarge'));
                        e.target.value = '';
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                  disabled={formStatus === 'submitting'}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip"
                />
                
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-cmyk-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-xs">
                        <strong className="text-cmyk-cyan">{selectedFile.name}</strong>
                      </p>
                      <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)}MB</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs text-cmyk-cyan hover:underline mt-0.5"
                      >
                        {t('changeFile')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-white font-medium mb-0.5 text-sm">{t('dragOrClick')}</p>
                    <p className="text-gray-300 text-xs">
                      {t('fileTypes')}
                    </p>
                    <p className="text-gray-300 text-xs mt-1 italic">
                      {t('fileLater')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Honeypot field (hidden) */}
            <input
              {...register('website')}
              type="text"
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Privacy checkbox */}
            <div className="flex items-start">
              <input
                {...register('privacidad')}
                type="checkbox"
                id="privacidad"
                className="mt-1 w-4 h-4 text-cmyk-magenta border-cmyk-cyan/30 rounded focus:ring-cmyk-magenta"
                disabled={formStatus === 'submitting'}
              />
              <label htmlFor="privacidad" className="ml-3 text-sm text-gray-300">
                {t('privacy')}{' '}
                <a href="#" className="text-cmyk-magenta hover:underline">
                  {t('privacyLink')}
                </a>
                . <span className="text-cmyk-magenta">*</span>
              </label>
            </div>
            {errors.privacidad && (
              <p className="error-message">{errors.privacidad.message}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={formStatus === 'submitting'}
              className="btn-primary w-full text-lg py-4"
            >
              {formStatus === 'submitting' ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t('sending')}
                </span>
              ) : (
                t('submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
