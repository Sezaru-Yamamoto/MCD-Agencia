'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

import {
  getAdminCarouselSlides,
  getAdminServices,
  createCarouselSlide,
  updateCarouselSlide,
  deleteCarouselSlide,
  createService,
  updateService,
  deleteService,
  CarouselSlideAdmin,
  ServiceAdmin,
} from '@/lib/api/content';
import { Card, Button, Input, Textarea, Modal, Badge, LoadingPage } from '@/components/ui';
import { cn } from '@/lib/utils';

type ContentTab = 'carousel' | 'services';

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentTab>('carousel');

  // Carousel state
  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CarouselSlideAdmin | null>(null);
  const [slideForm, setSlideForm] = useState({
    title: '',
    title_en: '',
    subtitle: '',
    subtitle_en: '',
    image: '',
    mobile_image: '',
    cta_text: '',
    cta_text_en: '',
    cta_url: '',
    position: 0,
    is_active: true,
  });

  // Services state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceAdmin | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    icon: '',
    image: '',
    price_from: '',
    cta_text: 'Cotizar',
    cta_text_en: 'Quote',
    cta_url: '#cotizar',
    is_featured: false,
    position: 0,
    is_active: true,
  });

  // Queries
  const { data: slides = [], isLoading: loadingSlides } = useQuery({
    queryKey: ['admin-carousel'],
    queryFn: getAdminCarouselSlides,
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['admin-services'],
    queryFn: getAdminServices,
  });

  // Carousel mutations
  const createSlideMutation = useMutation({
    mutationFn: createCarouselSlide,
    onSuccess: () => {
      toast.success('Slide creado');
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
      closeCarouselModal();
    },
    onError: () => toast.error('Error al crear slide'),
  });

  const updateSlideMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CarouselSlideAdmin> }) =>
      updateCarouselSlide(id, data),
    onSuccess: () => {
      toast.success('Slide actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
      closeCarouselModal();
    },
    onError: () => toast.error('Error al actualizar slide'),
  });

  const deleteSlideMutation = useMutation({
    mutationFn: deleteCarouselSlide,
    onSuccess: () => {
      toast.success('Slide eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] });
    },
    onError: () => toast.error('Error al eliminar slide'),
  });

  // Service mutations
  const createServiceMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      toast.success('Servicio creado');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      closeServiceModal();
    },
    onError: () => toast.error('Error al crear servicio'),
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceAdmin> }) =>
      updateService(id, data),
    onSuccess: () => {
      toast.success('Servicio actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      closeServiceModal();
    },
    onError: () => toast.error('Error al actualizar servicio'),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast.success('Servicio eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: () => toast.error('Error al eliminar servicio'),
  });

  // Carousel handlers
  const openCreateSlideModal = () => {
    setEditingSlide(null);
    setSlideForm({
      title: '',
      title_en: '',
      subtitle: '',
      subtitle_en: '',
      image: '',
      mobile_image: '',
      cta_text: '',
      cta_text_en: '',
      cta_url: '',
      position: slides.length,
      is_active: true,
    });
    setShowCarouselModal(true);
  };

  const openEditSlideModal = (slide: CarouselSlideAdmin) => {
    setEditingSlide(slide);
    setSlideForm({
      title: slide.title,
      title_en: slide.title_en,
      subtitle: slide.subtitle,
      subtitle_en: slide.subtitle_en,
      image: slide.image,
      mobile_image: slide.mobile_image || '',
      cta_text: slide.cta_text,
      cta_text_en: slide.cta_text_en,
      cta_url: slide.cta_url,
      position: slide.position,
      is_active: slide.is_active,
    });
    setShowCarouselModal(true);
  };

  const closeCarouselModal = () => {
    setShowCarouselModal(false);
    setEditingSlide(null);
  };

  const handleSlideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...slideForm,
      mobile_image: slideForm.mobile_image || undefined,
    };

    if (editingSlide) {
      updateSlideMutation.mutate({ id: editingSlide.id, data });
    } else {
      createSlideMutation.mutate(data as Omit<CarouselSlideAdmin, 'id'>);
    }
  };

  const toggleSlideActive = (slide: CarouselSlideAdmin) => {
    updateSlideMutation.mutate({
      id: slide.id,
      data: { is_active: !slide.is_active },
    });
  };

  // Service handlers
  const openCreateServiceModal = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      name_en: '',
      description: '',
      description_en: '',
      icon: '',
      image: '',
      price_from: '',
      cta_text: 'Cotizar',
      cta_text_en: 'Quote',
      cta_url: '#cotizar',
      is_featured: false,
      position: services.length,
      is_active: true,
    });
    setShowServiceModal(true);
  };

  const openEditServiceModal = (service: ServiceAdmin) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      name_en: service.name_en,
      description: service.description,
      description_en: service.description_en,
      icon: service.icon,
      image: service.image || '',
      price_from: service.price_from?.toString() || '',
      cta_text: service.cta_text,
      cta_text_en: service.cta_text_en,
      cta_url: service.cta_url,
      is_featured: service.is_featured,
      position: service.position,
      is_active: service.is_active,
    });
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...serviceForm,
      image: serviceForm.image || undefined,
      price_from: serviceForm.price_from ? parseFloat(serviceForm.price_from) : undefined,
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data as unknown as Omit<ServiceAdmin, 'id'>);
    }
  };

  const toggleServiceActive = (service: ServiceAdmin) => {
    updateServiceMutation.mutate({
      id: service.id,
      data: { is_active: !service.is_active },
    });
  };

  const toggleServiceFeatured = (service: ServiceAdmin) => {
    updateServiceMutation.mutate({
      id: service.id,
      data: { is_featured: !service.is_featured },
    });
  };

  const isLoading = loadingSlides || loadingServices;

  if (isLoading) {
    return <LoadingPage message="Cargando contenido..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Contenido</h1>
        <p className="text-neutral-400">Gestiona el contenido del landing page</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('carousel')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            activeTab === 'carousel'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          )}
        >
          Carrusel ({slides.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            activeTab === 'services'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          )}
        >
          Servicios ({services.length})
        </button>
      </div>

      {/* Carousel Tab */}
      {activeTab === 'carousel' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-neutral-400">
              Slides del carrusel principal
            </p>
            <Button onClick={openCreateSlideModal}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Nuevo Slide
            </Button>
          </div>

          {slides.length === 0 ? (
            <Card className="text-center py-12">
              <PhotoIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
              <p className="text-neutral-400">No hay slides en el carrusel</p>
              <Button variant="outline" className="mt-4" onClick={openCreateSlideModal}>
                Agregar primer slide
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {slides
                .sort((a, b) => a.position - b.position)
                .map((slide) => (
                  <Card key={slide.id} className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Preview */}
                      <div className="w-32 h-20 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0">
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PhotoIcon className="h-8 w-8 text-neutral-600" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            {slide.title || 'Sin título'}
                          </h3>
                          <Badge variant={slide.is_active ? 'success' : 'default'}>
                            {slide.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-400 truncate">
                          {slide.subtitle || 'Sin subtítulo'}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          Posición: {slide.position + 1}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSlideActive(slide)}
                          title={slide.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {slide.is_active ? (
                            <EyeIcon className="h-5 w-5" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSlideModal(slide)}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Eliminar este slide?')) {
                              deleteSlideMutation.mutate(slide.id);
                            }
                          }}
                        >
                          <TrashIcon className="h-5 w-5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-neutral-400">
              Servicios mostrados en el landing
            </p>
            <Button onClick={openCreateServiceModal}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Nuevo Servicio
            </Button>
          </div>

          {services.length === 0 ? (
            <Card className="text-center py-12">
              <PhotoIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
              <p className="text-neutral-400">No hay servicios configurados</p>
              <Button variant="outline" className="mt-4" onClick={openCreateServiceModal}>
                Agregar primer servicio
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {services
                .sort((a, b) => a.position - b.position)
                .map((service) => (
                  <Card key={service.id} className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon/Image */}
                      <div className="w-16 h-16 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {service.image ? (
                          <img
                            src={service.image}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : service.icon ? (
                          <span className="text-2xl">{service.icon}</span>
                        ) : (
                          <PhotoIcon className="h-8 w-8 text-neutral-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            {service.name}
                          </h3>
                          <Badge variant={service.is_active ? 'success' : 'default'}>
                            {service.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {service.is_featured && (
                            <Badge variant="cyan">Destacado</Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 truncate">
                          {service.description}
                        </p>
                        {service.price_from && (
                          <p className="text-xs text-cyan-400 mt-1">
                            Desde ${service.price_from}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleServiceFeatured(service)}
                          title={service.is_featured ? 'Quitar destacado' : 'Destacar'}
                        >
                          <span className={service.is_featured ? 'text-yellow-400' : ''}>
                            ★
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleServiceActive(service)}
                          title={service.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {service.is_active ? (
                            <EyeIcon className="h-5 w-5" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditServiceModal(service)}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Eliminar este servicio?')) {
                              deleteServiceMutation.mutate(service.id);
                            }
                          }}
                        >
                          <TrashIcon className="h-5 w-5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Carousel Modal */}
      <Modal
        isOpen={showCarouselModal}
        onClose={closeCarouselModal}
        title={editingSlide ? 'Editar Slide' : 'Nuevo Slide'}
        size="lg"
      >
        <form onSubmit={handleSlideSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Título (Español)"
              value={slideForm.title}
              onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
              required
            />
            <Input
              label="Título (Inglés)"
              value={slideForm.title_en}
              onChange={(e) => setSlideForm({ ...slideForm, title_en: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subtítulo (Español)"
              value={slideForm.subtitle}
              onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
            />
            <Input
              label="Subtítulo (Inglés)"
              value={slideForm.subtitle_en}
              onChange={(e) => setSlideForm({ ...slideForm, subtitle_en: e.target.value })}
            />
          </div>

          <Input
            label="URL de Imagen"
            value={slideForm.image}
            onChange={(e) => setSlideForm({ ...slideForm, image: e.target.value })}
            placeholder="https://..."
            required
          />

          <Input
            label="URL de Imagen Móvil (opcional)"
            value={slideForm.mobile_image}
            onChange={(e) => setSlideForm({ ...slideForm, mobile_image: e.target.value })}
            placeholder="https://..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Texto del Botón (Español)"
              value={slideForm.cta_text}
              onChange={(e) => setSlideForm({ ...slideForm, cta_text: e.target.value })}
            />
            <Input
              label="Texto del Botón (Inglés)"
              value={slideForm.cta_text_en}
              onChange={(e) => setSlideForm({ ...slideForm, cta_text_en: e.target.value })}
            />
          </div>

          <Input
            label="URL del Botón"
            value={slideForm.cta_url}
            onChange={(e) => setSlideForm({ ...slideForm, cta_url: e.target.value })}
            placeholder="/catalogo"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Posición"
              value={slideForm.position.toString()}
              onChange={(e) => setSlideForm({ ...slideForm, position: parseInt(e.target.value) || 0 })}
            />
            <div className="flex items-center gap-2 pt-8">
              <input
                type="checkbox"
                id="slide-active"
                checked={slideForm.is_active}
                onChange={(e) => setSlideForm({ ...slideForm, is_active: e.target.checked })}
                className="rounded border-neutral-700 bg-neutral-800 text-cyan-500"
              />
              <label htmlFor="slide-active" className="text-sm text-white">
                Activo
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeCarouselModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createSlideMutation.isPending || updateSlideMutation.isPending}
            >
              {editingSlide ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Service Modal */}
      <Modal
        isOpen={showServiceModal}
        onClose={closeServiceModal}
        title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
        size="lg"
      >
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre (Español)"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              required
            />
            <Input
              label="Nombre (Inglés)"
              value={serviceForm.name_en}
              onChange={(e) => setServiceForm({ ...serviceForm, name_en: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Textarea
              label="Descripción (Español)"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              rows={3}
              required
            />
            <Textarea
              label="Descripción (Inglés)"
              value={serviceForm.description_en}
              onChange={(e) => setServiceForm({ ...serviceForm, description_en: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icono (emoji o código)"
              value={serviceForm.icon}
              onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
              placeholder="🖨️"
            />
            <Input
              label="URL de Imagen (opcional)"
              value={serviceForm.image}
              onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <Input
            label="Precio desde (opcional)"
            type="number"
            step="0.01"
            value={serviceForm.price_from}
            onChange={(e) => setServiceForm({ ...serviceForm, price_from: e.target.value })}
            placeholder="99.00"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Texto del Botón (Español)"
              value={serviceForm.cta_text}
              onChange={(e) => setServiceForm({ ...serviceForm, cta_text: e.target.value })}
            />
            <Input
              label="Texto del Botón (Inglés)"
              value={serviceForm.cta_text_en}
              onChange={(e) => setServiceForm({ ...serviceForm, cta_text_en: e.target.value })}
            />
          </div>

          <Input
            label="URL del Botón"
            value={serviceForm.cta_url}
            onChange={(e) => setServiceForm({ ...serviceForm, cta_url: e.target.value })}
            placeholder="#cotizar"
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              type="number"
              label="Posición"
              value={serviceForm.position.toString()}
              onChange={(e) => setServiceForm({ ...serviceForm, position: parseInt(e.target.value) || 0 })}
            />
            <div className="flex items-center gap-2 pt-8">
              <input
                type="checkbox"
                id="service-active"
                checked={serviceForm.is_active}
                onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                className="rounded border-neutral-700 bg-neutral-800 text-cyan-500"
              />
              <label htmlFor="service-active" className="text-sm text-white">
                Activo
              </label>
            </div>
            <div className="flex items-center gap-2 pt-8">
              <input
                type="checkbox"
                id="service-featured"
                checked={serviceForm.is_featured}
                onChange={(e) => setServiceForm({ ...serviceForm, is_featured: e.target.checked })}
                className="rounded border-neutral-700 bg-neutral-800 text-cyan-500"
              />
              <label htmlFor="service-featured" className="text-sm text-white">
                Destacado
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeServiceModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
            >
              {editingService ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
