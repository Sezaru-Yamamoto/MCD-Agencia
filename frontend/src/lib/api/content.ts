/**
 * Content API Service for MCD-Agencia.
 *
 * This module provides content-related API calls:
 *   - Landing page data
 *   - FAQs
 *   - Legal pages
 *   - Site configuration
 *   - Contact form
 */

import { apiClient } from './client';

// Types
export interface CarouselSlide {
  id: string;
  title: string;
  title_en: string;
  subtitle: string;
  subtitle_en: string;
  image: string;
  mobile_image?: string;
  cta_text: string;
  cta_text_en: string;
  cta_url: string;
  service_key: string;
  position: number;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_title: string;
  author_company: string;
  content: string;
  content_en: string;
  photo?: string;
  rating?: number;
  position: number;
}

export interface ClientLogo {
  id: string;
  name: string;
  logo: string;
  website?: string;
  position: number;
}

export interface FAQ {
  id: string;
  question: string;
  question_en: string;
  answer: string;
  answer_en: string;
  category: string;
  category_display: string;
  position: number;
}

export interface Branch {
  id: string;
  name: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  email: string;
  hours: string;
  hours_en: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  image?: string;
  full_address: string;
  position: number;
}

export interface LegalPage {
  id: string;
  type: 'terms' | 'privacy' | 'cookies' | 'legal';
  type_display: string;
  title: string;
  title_en: string;
  content: string;
  content_en: string;
  version: string;
  effective_date: string;
  meta_title?: string;
  meta_description?: string;
}

export interface SiteConfig {
  id: string;
  site_name: string;
  site_name_en: string;
  tagline: string;
  tagline_en: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number?: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  logo?: string;
  logo_dark?: string;
  favicon?: string;
  about_content: string;
  about_content_en: string;
  mission: string;
  mission_en: string;
  vision: string;
  vision_en: string;
  values: string;
  values_en: string;
}

export interface Service {
  id: string;
  service_key?: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  icon: string;
  image?: string;
  price_from?: number;
  cta_text: string;
  cta_text_en: string;
  cta_url: string;
  is_featured: boolean;
  position: number;
  is_active?: boolean;
  carousel_images?: ServiceImage[];
}

export interface LandingPageData {
  carousel: CarouselSlide[];
  services: Service[];
  testimonials: Testimonial[];
  clients: ClientLogo[];
  faqs: FAQ[];
  branches: Branch[];
  portfolio_videos: PortfolioVideo[];
  config: SiteConfig;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  privacy_accepted: boolean;
}

// ── Service Image (carousel images per service) ────────────────────────
export interface ServiceImage {
  id: string;
  image: string;
  alt_text: string;
  alt_text_en: string;
  subtype_key: string;
  position: number;
}

export interface ServiceImageAdmin extends ServiceImage {
  service: string; // service UUID
  is_active: boolean;
}

// ── Portfolio Video ─────────────────────────────────────────────────────
export interface PortfolioVideo {
  id: string;
  youtube_id: string;
  title: string;
  title_en: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
  thumbnail_url: string;
}

export interface PortfolioVideoAdmin extends PortfolioVideo {
  is_active: boolean;
}

// API Functions

/**
 * Get all landing page data in a single request.
 */
export async function getLandingPageData(): Promise<LandingPageData> {
  return apiClient.get<LandingPageData>('/content/landing/');
}

/**
 * Get carousel slides.
 */
export async function getCarouselSlides(): Promise<CarouselSlide[]> {
  const response = await apiClient.get<{ results: CarouselSlide[] } | CarouselSlide[]>('/content/carousel/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get testimonials.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  const response = await apiClient.get<{ results: Testimonial[] } | Testimonial[]>('/content/testimonials/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get client logos.
 */
export async function getClientLogos(): Promise<ClientLogo[]> {
  const response = await apiClient.get<{ results: ClientLogo[] } | ClientLogo[]>('/content/clients/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get FAQs.
 */
export async function getFAQs(category?: string): Promise<FAQ[]> {
  const response = await apiClient.get<{ results: FAQ[] } | FAQ[]>('/content/faqs/', { category });
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get FAQ categories.
 */
export async function getFAQCategories(): Promise<Array<{ value: string; label: string }>> {
  return apiClient.get<Array<{ value: string; label: string }>>('/content/faqs/categories/');
}

/**
 * Get branches.
 */
export async function getBranches(): Promise<Branch[]> {
  const response = await apiClient.get<{ results: Branch[] } | Branch[]>('/content/branches/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get legal page by type.
 */
export async function getLegalPage(type: 'terms' | 'privacy' | 'cookies' | 'legal'): Promise<LegalPage> {
  return apiClient.get<LegalPage>(`/content/legal/by-type/${type}/`);
}

/**
 * Get site configuration.
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  return apiClient.get<SiteConfig>('/content/config/');
}

/**
 * Submit contact form.
 */
export async function submitContactForm(data: ContactFormData): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/content/contact/', data);
}

// Admin types with is_active field
export interface CarouselSlideAdmin extends CarouselSlide {
  is_active: boolean;
}

export interface ServiceAdmin extends Service {
  is_active: boolean;
}

// Admin API Functions

/**
 * Get all carousel slides (admin).
 */
export async function getAdminCarouselSlides(): Promise<CarouselSlideAdmin[]> {
  const response = await apiClient.get<{ results: CarouselSlideAdmin[] } | CarouselSlideAdmin[]>('/content/carousel/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Create carousel slide (admin).
 */
export async function createCarouselSlide(data: Omit<CarouselSlideAdmin, 'id'>): Promise<CarouselSlideAdmin> {
  return apiClient.post<CarouselSlideAdmin>('/content/carousel/', data);
}

/**
 * Update carousel slide (admin).
 */
export async function updateCarouselSlide(id: string, data: Partial<CarouselSlideAdmin>): Promise<CarouselSlideAdmin> {
  return apiClient.patch<CarouselSlideAdmin>(`/content/carousel/${id}/`, data);
}

/**
 * Delete carousel slide (admin).
 */
export async function deleteCarouselSlide(id: string): Promise<void> {
  return apiClient.delete(`/content/carousel/${id}/`);
}

/**
 * Get all services (admin).
 */
export async function getAdminServices(): Promise<ServiceAdmin[]> {
  const response = await apiClient.get<{ results: ServiceAdmin[] } | ServiceAdmin[]>('/content/services/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Sync services: create any missing services from the known definitions.
 * Returns the full list of services after sync.
 */
export async function syncServices(definitions: Array<{
  service_key: string;
  name: string;
  name_en?: string;
  description?: string;
  icon?: string;
  position?: number;
}>): Promise<{ created: string[]; services: ServiceAdmin[] }> {
  return apiClient.post<{ created: string[]; services: ServiceAdmin[] }>('/content/services/sync/', { services: definitions });
}

/**
 * Create service (admin).
 */
export async function createService(data: Omit<ServiceAdmin, 'id'>): Promise<ServiceAdmin> {
  return apiClient.post<ServiceAdmin>('/content/services/', data);
}

/**
 * Update service (admin).
 */
export async function updateService(id: string, data: Partial<ServiceAdmin>): Promise<ServiceAdmin> {
  return apiClient.patch<ServiceAdmin>(`/content/services/${id}/`, data);
}

/**
 * Delete service (admin).
 */
export async function deleteService(id: string): Promise<void> {
  return apiClient.delete(`/content/services/${id}/`);
}

/**
 * Get services (public).
 */
export async function getServices(): Promise<Service[]> {
  const response = await apiClient.get<{ results: Service[] } | Service[]>('/content/services/');
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get featured services.
 */
export async function getFeaturedServices(): Promise<Service[]> {
  const response = await apiClient.get<Service[]>('/content/services/featured/');
  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// Service Images API (file uploads via FormData)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get service images (admin), optionally filtered by service.
 */
export async function getAdminServiceImages(serviceId?: string): Promise<ServiceImageAdmin[]> {
  const params = serviceId ? { service: serviceId } : undefined;
  const response = await apiClient.get<{ results: ServiceImageAdmin[] } | ServiceImageAdmin[]>(
    '/content/service-images/', params
  );
  return Array.isArray(response) ? response : response.results;
}

/**
 * Upload a service image (admin). Uses FormData for file upload.
 */
export async function createServiceImage(data: {
  service: string;
  image: File;
  alt_text?: string;
  alt_text_en?: string;
  subtype_key?: string;
  position?: number;
}): Promise<ServiceImageAdmin> {
  const formData = new FormData();
  formData.append('service', data.service);
  formData.append('image', data.image);
  if (data.alt_text) formData.append('alt_text', data.alt_text);
  if (data.alt_text_en) formData.append('alt_text_en', data.alt_text_en);
  if (data.subtype_key) formData.append('subtype_key', data.subtype_key);
  formData.append('position', String(data.position ?? 0));
  formData.append('is_active', 'true');
  return apiClient.upload<ServiceImageAdmin>('/content/service-images/', formData);
}

/**
 * Update a service image (admin).
 */
export async function updateServiceImage(
  id: string,
  data: Partial<ServiceImageAdmin>
): Promise<ServiceImageAdmin> {
  return apiClient.patch<ServiceImageAdmin>(`/content/service-images/${id}/`, data);
}

/**
 * Delete a service image (admin).
 */
export async function deleteServiceImage(id: string): Promise<void> {
  return apiClient.delete(`/content/service-images/${id}/`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Portfolio Videos API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get portfolio videos (public).
 */
export async function getPortfolioVideos(): Promise<PortfolioVideo[]> {
  const response = await apiClient.get<{ results: PortfolioVideo[] } | PortfolioVideo[]>(
    '/content/portfolio-videos/'
  );
  return Array.isArray(response) ? response : response.results;
}

/**
 * Get portfolio videos (admin — includes inactive).
 */
export async function getAdminPortfolioVideos(): Promise<PortfolioVideoAdmin[]> {
  const response = await apiClient.get<{ results: PortfolioVideoAdmin[] } | PortfolioVideoAdmin[]>(
    '/content/portfolio-videos/'
  );
  return Array.isArray(response) ? response : response.results;
}

/**
 * Create portfolio video (admin).
 */
export async function createPortfolioVideo(
  data: Omit<PortfolioVideoAdmin, 'id' | 'thumbnail_url'>
): Promise<PortfolioVideoAdmin> {
  return apiClient.post<PortfolioVideoAdmin>('/content/portfolio-videos/', data);
}

/**
 * Update portfolio video (admin).
 */
export async function updatePortfolioVideo(
  id: string,
  data: Partial<PortfolioVideoAdmin>
): Promise<PortfolioVideoAdmin> {
  return apiClient.patch<PortfolioVideoAdmin>(`/content/portfolio-videos/${id}/`, data);
}

/**
 * Delete portfolio video (admin).
 */
export async function deletePortfolioVideo(id: string): Promise<void> {
  return apiClient.delete(`/content/portfolio-videos/${id}/`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Carousel Slides — file upload variant
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create carousel slide with image file upload (admin).
 */
export async function createCarouselSlideWithFile(data: {
  title: string;
  title_en?: string;
  subtitle?: string;
  subtitle_en?: string;
  image: File;
  mobile_image?: File;
  cta_text?: string;
  cta_text_en?: string;
  cta_url?: string;
  service_key?: string;
  position?: number;
  is_active?: boolean;
}): Promise<CarouselSlideAdmin> {
  const formData = new FormData();
  formData.append('title', data.title);
  if (data.title_en) formData.append('title_en', data.title_en);
  if (data.subtitle) formData.append('subtitle', data.subtitle);
  if (data.subtitle_en) formData.append('subtitle_en', data.subtitle_en);
  formData.append('image', data.image);
  if (data.mobile_image) formData.append('mobile_image', data.mobile_image);
  if (data.cta_text) formData.append('cta_text', data.cta_text);
  if (data.cta_text_en) formData.append('cta_text_en', data.cta_text_en);
  if (data.cta_url) formData.append('cta_url', data.cta_url);
  if (data.service_key) formData.append('service_key', data.service_key);
  formData.append('position', String(data.position ?? 0));
  formData.append('is_active', String(data.is_active ?? true));
  return apiClient.upload<CarouselSlideAdmin>('/content/carousel/', formData);
}

/**
 * Update carousel slide with optional image file (admin).
 */
export async function updateCarouselSlideWithFile(
  id: string,
  data: Record<string, unknown>,
  imageFile?: File,
  mobileImageFile?: File,
): Promise<CarouselSlideAdmin> {
  if (!imageFile && !mobileImageFile) {
    return apiClient.patch<CarouselSlideAdmin>(`/content/carousel/${id}/`, data);
  }
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  if (imageFile) formData.append('image', imageFile);
  if (mobileImageFile) formData.append('mobile_image', mobileImageFile);
  return apiClient.uploadPatch<CarouselSlideAdmin>(`/content/carousel/${id}/`, formData);
}
