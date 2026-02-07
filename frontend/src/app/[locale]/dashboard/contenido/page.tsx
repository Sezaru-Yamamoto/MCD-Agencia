'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon,
  PlayIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';

import {
  // Carousel
  getAdminCarouselSlides,
  createCarouselSlideWithFile,
  updateCarouselSlideWithFile,
  updateCarouselSlide,
  deleteCarouselSlide,
  CarouselSlideAdmin,
  // Services
  getAdminServices,
  createService,
  updateService,
  deleteService,
  ServiceAdmin,
  // Service Images
  getAdminServiceImages,
  createServiceImage,
  deleteServiceImage,
  ServiceImageAdmin,
  // Portfolio Videos
  getAdminPortfolioVideos,
  createPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
  PortfolioVideoAdmin,
} from '@/lib/api/content';
import { Card, Button, Input, Textarea, Modal, Badge, LoadingPage } from '@/components/ui';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const MAX_HERO_SLIDES = 10;
const MAX_SERVICE_IMAGES = 5;
const MAX_PORTFOLIO_VIDEOS = 8;
const MAX_IMAGE_SIZE_MB = 5;

const HERO_DIMENSIONS = '1920 × 800 px';
const SERVICE_DIMENSIONS = '800 × 600 px (4:3)';

type ContentTab = 'carousel' | 'services' | 'videos';

// ═══════════════════════════════════════════════════════════════════════════
// File Input Helper
// ═══════════════════════════════════════════════════════════════════════════

function ImageUploadInput({
  label,
  required,
  hint,
  currentUrl,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  currentUrl?: string;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast.error(`Imagen muy grande. Máximo ${MAX_IMAGE_SIZE_MB} MB.`);
          return;
        }
        setPreview(URL.createObjectURL(file));
        setFileName(file.name);
      } else {
        setPreview(null);
        setFileName('');
      }
      onChange(file);
    },
    [onChange]
  );

  const displayUrl = preview || currentUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-14 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-neutral-700">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <PhotoIcon className="h-6 w-6 text-neutral-600" />
          )}
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-200 rounded-lg border border-neutral-700 transition-colors"
          >
            {fileName || 'Seleccionar imagen…'}
          </button>
          {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} className="hidden" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentTab>('carousel');

  const { data: slides = [], isLoading: loadingSlides } = useQuery({
    queryKey: ['admin-carousel'],
    queryFn: getAdminCarouselSlides,
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['admin-services'],
    queryFn: getAdminServices,
  });

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ['admin-portfolio-videos'],
    queryFn: getAdminPortfolioVideos,
  });

  const isLoading = loadingSlides || loadingServices || loadingVideos;

  if (isLoading) {
    return <LoadingPage message="Cargando contenido..." />;
  }

  const tabs: { id: ContentTab; label: string; count: number }[] = [
    { id: 'carousel', label: '🖼️ Hero Carrusel', count: slides.length },
    { id: 'services', label: '🔧 Servicios', count: services.length },
    { id: 'videos', label: '🎬 Videos Portafolio', count: videos.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contenido del Landing</h1>
        <p className="text-neutral-400">
          Gestiona imágenes del carrusel, servicios y videos del portafolio
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm',
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === 'carousel' && <CarouselTab slides={slides} queryClient={queryClient} />}
      {activeTab === 'services' && <ServicesTab services={services} queryClient={queryClient} />}
      {activeTab === 'videos' && <VideosTab videos={videos} queryClient={queryClient} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAROUSEL TAB
// ═══════════════════════════════════════════════════════════════════════════

function CarouselTab({ slides, queryClient }: { slides: CarouselSlideAdmin[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CarouselSlideAdmin | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', title_en: '', subtitle: '', subtitle_en: '', cta_text: '', cta_text_en: '', cta_url: '', position: 0, is_active: true });

  const createMut = useMutation({
    mutationFn: createCarouselSlideWithFile,
    onSuccess: () => { toast.success('Slide creado'); queryClient.invalidateQueries({ queryKey: ['admin-carousel'] }); closeModal(); },
    onError: () => toast.error('Error al crear slide'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: Record<string, unknown>; file?: File }) => updateCarouselSlideWithFile(id, data, file),
    onSuccess: () => { toast.success('Slide actualizado'); queryClient.invalidateQueries({ queryKey: ['admin-carousel'] }); closeModal(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCarouselSlide,
    onSuccess: () => { toast.success('Slide eliminado'); queryClient.invalidateQueries({ queryKey: ['admin-carousel'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  const toggleActive = (slide: CarouselSlideAdmin) => {
    updateCarouselSlide(slide.id, { is_active: !slide.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ['admin-carousel'] }));
  };

  const openCreate = () => { setEditing(null); setImageFile(null); setForm({ title: '', title_en: '', subtitle: '', subtitle_en: '', cta_text: '', cta_text_en: '', cta_url: '', position: slides.length, is_active: true }); setShowModal(true); };
  const openEdit = (s: CarouselSlideAdmin) => { setEditing(s); setImageFile(null); setForm({ title: s.title, title_en: s.title_en, subtitle: s.subtitle, subtitle_en: s.subtitle_en, cta_text: s.cta_text, cta_text_en: s.cta_text_en, cta_url: s.cta_url, position: s.position, is_active: s.is_active }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setImageFile(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form, file: imageFile || undefined });
    } else {
      if (!imageFile) { toast.error('Selecciona una imagen'); return; }
      createMut.mutate({ ...form, image: imageFile });
    }
  };

  const sorted = [...slides].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-neutral-400">Slides del carrusel Hero. Recomendado: <strong>{HERO_DIMENSIONS}</strong>.</p>
          <p className="text-xs text-neutral-500 mt-1">Máximo {MAX_HERO_SLIDES} slides · JPEG, PNG o WebP · Máx {MAX_IMAGE_SIZE_MB} MB</p>
        </div>
        <Button onClick={openCreate} disabled={slides.length >= MAX_HERO_SLIDES}><PlusIcon className="h-5 w-5 mr-1" /> Nuevo Slide</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="text-center py-12">
          <PhotoIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No hay slides</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Agregar primer slide</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sorted.map((slide) => (
            <Card key={slide.id} className="p-3">
              <div className="flex items-center gap-4">
                <div className="w-36 h-20 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {slide.image ? <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PhotoIcon className="h-8 w-8 text-neutral-600" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{slide.title || 'Sin título'}</h3>
                    <Badge variant={slide.is_active ? 'success' : 'default'}>{slide.is_active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <p className="text-sm text-neutral-400 truncate">{slide.subtitle || '—'}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Pos: {slide.position + 1}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(slide)}>{slide.is_active ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(slide)}><PencilIcon className="h-5 w-5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm('¿Eliminar?')) deleteMut.mutate(slide.id); }}><TrashIcon className="h-5 w-5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Editar Slide' : 'Nuevo Slide'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploadInput label="Imagen" required={!editing} hint={`Recomendado: ${HERO_DIMENSIONS}. Máx ${MAX_IMAGE_SIZE_MB} MB.`} currentUrl={editing?.image} onChange={setImageFile} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Título (ES)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Input label="Título (EN)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Subtítulo (ES)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <Input label="Subtítulo (EN)" value={form.subtitle_en} onChange={(e) => setForm({ ...form, subtitle_en: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Texto botón (ES)" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
            <Input label="Texto botón (EN)" value={form.cta_text_en} onChange={(e) => setForm({ ...form, cta_text_en: e.target.value })} />
          </div>
          <Input label="URL del botón" value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="#cotizar" />
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Posición" value={form.position.toString()} onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })} />
            <div className="flex items-center gap-2 pt-8">
              <input type="checkbox" id="slide-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-neutral-700 bg-neutral-800 text-cyan-500" />
              <label htmlFor="slide-active" className="text-sm text-white">Activo</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES TAB
// ═══════════════════════════════════════════════════════════════════════════

function ServicesTab({ services, queryClient }: { services: ServiceAdmin[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [showModal, setShowModal] = useState(false);
  const [editingSvc, setEditingSvc] = useState<ServiceAdmin | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', name_en: '', description: '', description_en: '', icon: '', cta_text: 'Cotizar', cta_text_en: 'Quote', cta_url: '#cotizar', is_featured: false, position: 0, is_active: true });

  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => { toast.success('Servicio creado'); queryClient.invalidateQueries({ queryKey: ['admin-services'] }); setShowModal(false); },
    onError: () => toast.error('Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceAdmin> }) => updateService(id, data),
    onSuccess: () => { toast.success('Servicio actualizado'); queryClient.invalidateQueries({ queryKey: ['admin-services'] }); setShowModal(false); },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteService,
    onSuccess: () => { toast.success('Servicio eliminado'); queryClient.invalidateQueries({ queryKey: ['admin-services'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  const openCreate = () => {
    setEditingSvc(null);
    setForm({ name: '', name_en: '', description: '', description_en: '', icon: '', cta_text: 'Cotizar', cta_text_en: 'Quote', cta_url: '#cotizar', is_featured: false, position: services.length, is_active: true });
    setShowModal(true);
  };

  const openEdit = (s: ServiceAdmin) => {
    setEditingSvc(s);
    setForm({ name: s.name, name_en: s.name_en, description: s.description, description_en: s.description_en, icon: s.icon, cta_text: s.cta_text, cta_text_en: s.cta_text_en, cta_url: s.cta_url, is_featured: s.is_featured, position: s.position, is_active: s.is_active });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSvc) { updateMut.mutate({ id: editingSvc.id, data: form }); }
    else { createMut.mutate(form as unknown as Omit<ServiceAdmin, 'id'>); }
  };

  const sorted = [...services].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-neutral-400">Servicios del landing. Clic en un servicio para gestionar sus <strong>imágenes del carrusel</strong>.</p>
          <p className="text-xs text-neutral-500 mt-1">Máx {MAX_SERVICE_IMAGES} imágenes por servicio · Recomendado: <strong>{SERVICE_DIMENSIONS}</strong></p>
        </div>
        <Button onClick={openCreate}><PlusIcon className="h-5 w-5 mr-1" /> Nuevo Servicio</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="text-center py-12"><PhotoIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" /><p className="text-neutral-400">No hay servicios</p></Card>
      ) : (
        <div className="grid gap-3">
          {sorted.map((svc) => (
            <div key={svc.id}>
              <Card className="p-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">{svc.icon || '📋'}</div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === svc.id ? null : svc.id)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-white truncate">{svc.name}</h3>
                      <Badge variant={svc.is_active ? 'success' : 'default'}>{svc.is_active ? 'Activo' : 'Inactivo'}</Badge>
                      {svc.is_featured && <Badge variant="cyan">Destacado</Badge>}
                    </div>
                    <p className="text-sm text-neutral-400 truncate">{svc.description}</p>
                    <p className="text-xs text-cyan-400 mt-0.5 flex items-center gap-1"><PhotoIcon className="h-3.5 w-3.5" /> Clic para gestionar imágenes</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => updateMut.mutate({ id: svc.id, data: { is_active: !svc.is_active } })}>
                      {svc.is_active ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(svc)}><PencilIcon className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('¿Eliminar servicio y sus imágenes?')) deleteMut.mutate(svc.id); }}><TrashIcon className="h-5 w-5 text-red-400" /></Button>
                  </div>
                </div>
              </Card>
              {expandedId === svc.id && (
                <div className="ml-6 mt-2 mb-4">
                  <ServiceImagesPanel serviceId={svc.id} serviceName={svc.name} queryClient={queryClient} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSvc ? 'Editar Servicio' : 'Nuevo Servicio'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre (ES)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Nombre (EN)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Descripción (ES)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
            <Textarea label="Descripción (EN)" value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Icono (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🖨️" />
            <Input label="Texto CTA" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
            <Input label="URL CTA" value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input type="number" label="Posición" value={form.position.toString()} onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })} />
            <div className="flex items-center gap-2 pt-8">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-neutral-700 bg-neutral-800 text-cyan-500" />
              <label className="text-sm text-white">Activo</label>
            </div>
            <div className="flex items-center gap-2 pt-8">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-neutral-700 bg-neutral-800 text-cyan-500" />
              <label className="text-sm text-white">Destacado</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{editingSvc ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Service Images Sub-Panel ───────────────────────────────────────────

function ServiceImagesPanel({ serviceId, serviceName, queryClient }: { serviceId: string; serviceName: string; queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['admin-service-images', serviceId],
    queryFn: () => getAdminServiceImages(serviceId),
  });

  const uploadMut = useMutation({
    mutationFn: createServiceImage,
    onSuccess: () => { toast.success('Imagen subida'); queryClient.invalidateQueries({ queryKey: ['admin-service-images', serviceId] }); },
    onError: () => toast.error('Error al subir imagen'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteServiceImage,
    onSuccess: () => { toast.success('Imagen eliminada'); queryClient.invalidateQueries({ queryKey: ['admin-service-images', serviceId] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) { toast.error(`Máximo ${MAX_IMAGE_SIZE_MB} MB`); return; }
    uploadMut.mutate({ service: serviceId, image: file, alt_text: serviceName, position: images.length });
    if (fileRef.current) fileRef.current.value = '';
  }, [serviceId, serviceName, images.length, uploadMut]);

  if (isLoading) return <p className="text-sm text-neutral-500 py-2">Cargando imágenes…</p>;

  const sorted = [...images].sort((a, b) => a.position - b.position);
  const canAdd = images.length < MAX_SERVICE_IMAGES;

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-200">Imágenes del carrusel ({images.length}/{MAX_SERVICE_IMAGES})</h4>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!canAdd || uploadMut.isPending}
          className={cn('flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors', canAdd ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed')}
        >
          <PlusIcon className="h-4 w-4" /> {uploadMut.isPending ? 'Subiendo…' : 'Subir imagen'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4 text-center">Sin imágenes. Sube la primera ({SERVICE_DIMENSIONS}).</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sorted.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-neutral-700 aspect-[4/3] bg-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image} alt={img.alt_text} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => { if (confirm('¿Eliminar?')) deleteMut.mutate(img.id); }} className="p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">#{img.position + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIDEOS TAB
// ═══════════════════════════════════════════════════════════════════════════

function VideosTab({ videos, queryClient }: { videos: PortfolioVideoAdmin[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PortfolioVideoAdmin | null>(null);
  const [form, setForm] = useState({ youtube_id: '', title: '', title_en: '', orientation: 'vertical' as 'vertical' | 'horizontal', position: 0, is_active: true });

  const createMut = useMutation({
    mutationFn: createPortfolioVideo,
    onSuccess: () => { toast.success('Video agregado'); queryClient.invalidateQueries({ queryKey: ['admin-portfolio-videos'] }); closeModal(); },
    onError: () => toast.error('Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PortfolioVideoAdmin> }) => updatePortfolioVideo(id, data),
    onSuccess: () => { toast.success('Video actualizado'); queryClient.invalidateQueries({ queryKey: ['admin-portfolio-videos'] }); closeModal(); },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: deletePortfolioVideo,
    onSuccess: () => { toast.success('Video eliminado'); queryClient.invalidateQueries({ queryKey: ['admin-portfolio-videos'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  const openCreate = () => { setEditing(null); setForm({ youtube_id: '', title: '', title_en: '', orientation: 'vertical', position: videos.length, is_active: true }); setShowModal(true); };
  const openEdit = (v: PortfolioVideoAdmin) => { setEditing(v); setForm({ youtube_id: v.youtube_id, title: v.title, title_en: v.title_en, orientation: v.orientation, position: v.position, is_active: v.is_active }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) { updateMut.mutate({ id: editing.id, data: form }); }
    else { createMut.mutate(form as Omit<PortfolioVideoAdmin, 'id' | 'thumbnail_url'>); }
  };

  const sorted = [...videos].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-neutral-400">Videos de YouTube para &quot;Trabajos que hablan por nosotros&quot;.</p>
          <p className="text-xs text-neutral-500 mt-1">Máximo {MAX_PORTFOLIO_VIDEOS} videos · Pega URL o solo el ID</p>
        </div>
        <Button onClick={openCreate} disabled={videos.length >= MAX_PORTFOLIO_VIDEOS}><PlusIcon className="h-5 w-5 mr-1" /> Nuevo Video</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="text-center py-12"><FilmIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" /><p className="text-neutral-400">No hay videos</p><Button variant="outline" className="mt-4" onClick={openCreate}>Agregar primer video</Button></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className={cn('relative bg-neutral-800 overflow-hidden', v.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center"><PlayIcon className="h-6 w-6 text-white ml-0.5" /></div></div>
                <Badge variant="default" className="absolute top-2 right-2 text-[10px]">{v.orientation === 'vertical' ? '9:16' : '16:9'}</Badge>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate flex-1">{v.title || v.youtube_id}</p>
                  <Badge variant={v.is_active ? 'success' : 'default'} className="text-[10px]">{v.is_active ? 'Activo' : 'Oculto'}</Badge>
                </div>
                <p className="text-xs text-neutral-500">ID: {v.youtube_id}</p>
                <div className="flex gap-1 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(v)}><PencilIcon className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => updateMut.mutate({ id: v.id, data: { is_active: !v.is_active } })}>{v.is_active ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}</Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm('¿Eliminar?')) deleteMut.mutate(v.id); }}><TrashIcon className="h-4 w-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Editar Video' : 'Nuevo Video'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="URL o ID de YouTube" value={form.youtube_id} onChange={(e) => setForm({ ...form, youtube_id: e.target.value })} placeholder="https://youtube.com/shorts/sqOb-gSSQq8" required />
          {form.youtube_id.length >= 5 && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${form.youtube_id.length === 11 ? form.youtube_id : 'placeholder'}/hq720.jpg`} alt="Preview" className="w-32 h-auto rounded-lg border border-neutral-700" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Título (ES)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Título (EN)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Orientación</label>
              <select value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value as 'vertical' | 'horizontal' })} className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-3 py-2 text-sm">
                <option value="vertical">Vertical (9:16) — Shorts</option>
                <option value="horizontal">Horizontal (16:9) — Estándar</option>
              </select>
            </div>
            <Input type="number" label="Posición" value={form.position.toString()} onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-neutral-700 bg-neutral-800 text-cyan-500" />
            <label className="text-sm text-white">Activo (visible en el landing)</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Guardar' : 'Agregar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
