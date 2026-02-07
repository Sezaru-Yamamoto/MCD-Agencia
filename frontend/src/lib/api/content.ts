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
}

export interface LandingPageData {
  carousel: CarouselSlide[];
  services: Service[];
  testimonials: Testimonial[];
  clients: ClientLogo[];
  faqs: FAQ[];
  branches: Branch[];
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
