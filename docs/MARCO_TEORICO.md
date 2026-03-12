# Marco Teórico — Plataforma Digital para la Agencia MCD

> **Estructura conceptual de la información utilizada en el proyecto**
>
> Período: 12 de enero – 24 de abril de 2026

---

## Índice

1. [Bases de Datos](#1-bases-de-datos)
2. [Frameworks](#2-frameworks)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Librerías](#5-librerías)
6. [APIs](#6-apis)
7. [Chatbot](#7-chatbot)
8. [Publicidad](#8-publicidad)

---

## 1. Bases de Datos

### 1.1 PostgreSQL (Base de datos principal)

PostgreSQL es un sistema de gestión de bases de datos relacional de código abierto (ORDBMS) que soporta tipos avanzados de datos y consultas complejas. Es reconocido por su conformidad con los estándares SQL, integridad transaccional (ACID) y extensibilidad (Stonebraker & Rowe, 1986).

| Aspecto | Detalle |
|---|---|
| **Versión** | PostgreSQL 16+ |
| **Proveedor** | Render Managed PostgreSQL (Oregon, US) |
| **Uso en el proyecto** | Almacenamiento de catálogo de productos, usuarios, cotizaciones, pedidos, pagos, conversaciones del chatbot, analíticas y contenido CMS |
| **Driver Python** | `psycopg2-binary` — adaptador de alto rendimiento para conexiones Django↔PostgreSQL |
| **Ventajas** | Soporte JSON nativo, full-text search, índices GIN/GiST, triggers, vistas materializadas |

**Justificación:** Se eligió PostgreSQL sobre MySQL por su soporte nativo de tipos JSON (usado para metadata de eventos analíticos, datos de pago y configuración de chatbot), sus índices parciales y su mejor manejo de consultas concurrentes en escenarios de lectura/escritura mixta propios del e-commerce.

### 1.2 Redis (Caché y cola de mensajes)

Redis es un almacén de estructuras de datos en memoria, usado como caché, broker de mensajes y base de datos auxiliar (Carlson, 2013).

| Aspecto | Detalle |
|---|---|
| **Uso en el proyecto** | 1) Caché de respuestas frecuentes (catálogo, contexto del chatbot) vía `django-redis` — 2) Broker de tareas asíncronas con Celery (envío de emails, generación de PDFs, procesamiento de imágenes) |
| **TTL del caché** | 3600 s (contexto chatbot), configurable por tipo de dato |
| **Ventajas** | Latencia sub-milisegundo, soporte pub/sub, estructuras de datos ricas |

### 1.3 SQLite (Desarrollo local)

SQLite es un motor de base de datos ligero que almacena toda la base en un solo archivo (`db.sqlite3`). Se utiliza exclusivamente en el entorno de desarrollo local para prototipado rápido.

---

## 2. Frameworks

### 2.1 Django 5.x (Backend)

Django es un framework web de alto nivel para Python que fomenta el desarrollo rápido y el diseño limpio y pragmático, siguiendo el patrón **MTV** (Model-Template-View) (Django Software Foundation, 2024).

| Aspecto | Detalle |
|---|---|
| **Versión** | Django ≥ 5.0, < 6.0 |
| **Arquitectura** | MTV (Model-Template-View) |
| **Módulos del proyecto** | `users`, `catalog`, `quotes`, `orders`, `payments`, `chatbot`, `content`, `analytics`, `audit`, `notifications`, `inventory`, `core` (12 apps Django) |
| **ORM** | Django ORM con migraciones automáticas |
| **Administración** | Django Admin integrado para gestión de back-office |

**Justificación:** Django fue seleccionado por: a) su ORM maduro que simplifica las migraciones de esquema, b) su ecosistema de paquetes (DRF, allauth, storages), c) su panel de administración built-in que elimina la necesidad de construir un CMS desde cero, y d) sus mecanismos de seguridad integrados (CSRF, XSS, SQL injection protection).

### 2.2 Django REST Framework (DRF)

Es una extensión de Django para construir APIs RESTful robustas y documentadas. Proporciona serializers, viewsets, routers, autenticación por tokens y documentación automática (Christie, 2024).

| Aspecto | Detalle |
|---|---|
| **Versión** | ≥ 3.14 |
| **Uso** | Todas las APIs del backend (catálogo, cotizaciones, pagos, chatbot, analytics) |
| **Documentación** | Generada automáticamente via `drf-spectacular` (OpenAPI 3.0 / Swagger) |
| **Autenticación** | JWT via `djangorestframework-simplejwt` |
| **Paginación** | `StandardPagination` personalizada (cursor + offset) |

### 2.3 Next.js 14 (Frontend)

Next.js es un framework de React que habilita renderizado del lado del servidor (SSR), generación estática (SSG) y rutas API, creado por Vercel (Vercel, 2024).

| Aspecto | Detalle |
|---|---|
| **Versión** | 14.1.0 |
| **Routing** | App Router (file-system based) con `[locale]` para i18n |
| **Renderizado** | Hybrid: SSR para SEO, CSR para interactividad |
| **Deploy** | Vercel (CDN global, edge functions) |
| **Optimización** | Image optimization vía `next/image` + `sharp`, code splitting automático |

**Justificación:** Next.js fue elegido sobre Create React App por: a) SSR/SSG nativo que mejora SEO (crítico para una agencia de publicidad), b) optimización automática de imágenes del catálogo, c) rutas internacionalizadas (`/es/`, `/en/`) built-in con `next-intl`, y d) deploy con zero-config en Vercel.

### 2.4 React 18

Biblioteca de JavaScript para construir interfaces de usuario mediante componentes declarativos y un DOM virtual (Meta Platforms, 2024).

| Aspecto | Detalle |
|---|---|
| **Versión** | 18.2.0 |
| **Paradigma** | Funcional con Hooks (`useState`, `useEffect`, `useRef`, custom hooks) |
| **Concurrent features** | Suspense, Transitions (React 18) |
| **Uso** | Base de todos los componentes del frontend |

### 2.5 Celery (Task Queue)

Framework de procesamiento distribuido de tareas para Python, basado en mensajería asíncrona (Ask Solem, 2024).

| Aspecto | Detalle |
|---|---|
| **Versión** | ≥ 5.3 |
| **Broker** | Redis |
| **Scheduler** | `django-celery-beat` (tareas periódicas) |
| **Tareas** | Envío de emails de confirmación, generación de PDFs de cotización, procesamiento de imágenes de catálogo, alertas de inventario bajo |

---

## 3. Frontend

### 3.1 Lenguaje: TypeScript / JavaScript

TypeScript es un superconjunto tipado de JavaScript que compila a JavaScript plano. Añade tipado estático opcional y características de orientación a objetos (Microsoft, 2024).

| Aspecto | Detalle |
|---|---|
| **Versión TS** | ≥ 5.3.3 |
| **Strict mode** | Habilitado (`tsconfig.json`) |
| **Target** | ES2017+ |
| **Uso** | Todo el código fuente del frontend (`.tsx`, `.ts`) |

**Ventajas en el proyecto:**
- **Detección temprana de errores** en las interfaces de datos (catálogo, cotizaciones, pagos)
- **Autocompletado y documentación** en VS Code para >50 componentes
- **Tipado de API responses** con interfaces TypeScript que reflejan los serializers de Django

### 3.2 Tecnologías CSS / Estilos

| Tecnología | Versión | Uso |
|---|---|---|
| **Tailwind CSS** | ≥ 3.4.1 | Framework utility-first para todo el estilizado |
| **PostCSS** | ≥ 8.4.33 | Procesador CSS (requerido por Tailwind) |
| **Autoprefixer** | ≥ 10.4.17 | Prefijos de vendor automáticos |
| **clsx + tailwind-merge** | 2.1.0 / 2.2.0 | Merge condicional de clases CSS |

**Paleta CMYK personalizada:** Se definió un sistema de color basado en CMYK (`cmyk-cyan: #0DA3EF`, `cmyk-magenta: #EC2D8D`, `cmyk-yellow: #FFE884`, `cmyk-black: #0D0D0D`) que refleja la identidad de la agencia de publicidad e impresión.

### 3.3 Internacionalización (i18n)

| Aspecto | Detalle |
|---|---|
| **Librería** | `next-intl` ≥ 3.4.0 |
| **Idiomas** | Español (es) e Inglés (en) |
| **Archivos** | `messages/es.json`, `messages/en.json` |
| **Routing** | `/es/catálogo`, `/en/catalog` (path-based) |

---

## 4. Backend

### 4.1 Lenguaje: Python

Python es un lenguaje de programación de alto nivel, interpretado, de tipado dinámico y multiparadigma. Su filosofía enfatiza la legibilidad del código y su sintaxis permite expresar conceptos en menos líneas que lenguajes como Java o C++ (Van Rossum & Drake, 2009).

| Aspecto | Detalle |
|---|---|
| **Versión** | Python 3.11+ |
| **Gestor de paquetes** | pip + requirements.txt |
| **Entorno virtual** | venv (`.venv/`) |
| **Servidor WSGI** | Gunicorn ≥ 21.2 (producción) |
| **Servidor estático** | WhiteNoise ≥ 6.6 (archivos estáticos en producción) |

### 4.2 Arquitectura del Backend

```
config/              → Configuración Django (settings, URLs, WSGI, Celery)
apps/
├── core/            → Modelos base, paginación, excepciones, reCAPTCHA
├── users/           → Autenticación, registro, perfiles (JWT + allauth)
├── catalog/         → Categorías, productos, imágenes (CRUD + S3)
├── quotes/          → Cotizaciones multi-línea (formulario landing)
├── orders/          → Gestión de pedidos y estados
├── payments/        → MercadoPago, PayPal (webhooks)
├── inventory/       → Control de stock, alertas de bajo inventario
├── chatbot/         → IA conversacional (Gemini), leads, conversaciones
├── content/         → CMS: carrusel, testimonios, FAQs, sucursales
├── analytics/       → Tracking de eventos, page views, dashboard stats
├── audit/           → Logs de auditoría (middleware)
├── notifications/   → Emails transaccionales (django-anymail)
```

### 4.3 Seguridad

| Mecanismo | Implementación |
|---|---|
| **Autenticación** | JWT (access + refresh tokens) vía `djangorestframework-simplejwt` |
| **Registro social** | `django-allauth` + `dj-rest-auth` |
| **Cifrado** | `cryptography` ≥ 42.0 (tokens firmados, datos sensibles) |
| **Anti-bot** | Google reCAPTCHA v3 (formularios de cotización, registro, contacto) |
| **CORS** | `django-cors-headers` (whitelist de dominios del frontend) |
| **Auditoría** | Middleware personalizado que registra cada acción en `AuditLog` |

---

## 5. Librerías

### 5.1 Librerías Frontend (JavaScript/TypeScript)

| Librería | Versión | Propósito |
|---|---|---|
| **@tanstack/react-query** | ≥ 5.17.0 | Gestión de estado del servidor, caché de peticiones API, sincronización automática. Reemplaza patrones manuales de `useEffect + fetch`. |
| **zustand** | ≥ 4.4.7 | Estado global ligero (carrito, UI state). Alternativa minimalista a Redux con ~1KB. |
| **react-hook-form** | ≥ 7.49.3 | Formularios de alto rendimiento con validación. Maneja el formulario de cotización multi-paso (~15 campos). |
| **zod** | ≥ 3.22.4 | Validación de esquemas TypeScript-first. Define y valida la estructura de datos de cotizaciones en frontend. |
| **@hookform/resolvers** | ≥ 3.3.3 | Bridge entre react-hook-form y zod para validación declarativa. |
| **framer-motion** | ≥ 10.18.0 | Animaciones declarativas (transiciones de página, scroll reveal, parallax shifts). |
| **next-auth** | ≥ 4.24.5 | Autenticación en Next.js (sesiones, JWT, providers OAuth). |
| **next-intl** | ≥ 3.4.0 | Internacionalización: routing por locale, traducción de mensajes, formateo de fechas/números. |
| **axios** | ≥ 1.6.5 | Cliente HTTP con interceptores (attach JWT, refresh automático, manejo global de errores). |
| **leaflet** | ≥ 1.9.4 | Mapas interactivos (selección de rutas de entrega, ubicación de sucursales). Usa tiles de OpenStreetMap. |
| **embla-carousel-react** | ≥ 8.0.0 | Carrusel del hero (slides de portafolio, testimonios). Lightweight, touch-friendly. |
| **date-fns** | ≥ 3.2.0 | Manipulación de fechas (formato de fechas de cotización, pedidos, entregas). |
| **sharp** | ≥ 0.33.2 | Optimización de imágenes en build-time (WebP, resize). Usado por `next/image`. |
| **react-hot-toast** | ≥ 2.4.1 | Notificaciones toast (confirmación de cotización, errores, éxito de pago). |
| **lucide-react** | ≥ 0.562.0 | Biblioteca de íconos SVG (800+ íconos consistentes en todo el UI). |
| **@headlessui/react** | ≥ 1.7.18 | Componentes UI accesibles e unstyled (modals, dropdowns, tabs). |
| **@heroicons/react** | ≥ 2.1.1 | Íconos SVG de Tailwind Labs (complemento a Lucide). |

### 5.2 Librerías Backend (Python)

| Librería | Versión | Propósito |
|---|---|---|
| **psycopg2-binary** | ≥ 2.9 | Driver PostgreSQL de alto rendimiento para Django ORM. |
| **dj-database-url** | ≥ 2.1 | Parseo de URLs de base de datos desde variables de entorno (`DATABASE_URL`). |
| **django-redis** | ≥ 5.4 | Backend de caché Redis para Django (sesiones, caché de consultas, contexto chatbot). |
| **boto3 + django-storages** | ≥ 1.34 / ≥ 1.14 | Almacenamiento de archivos en S3/Spaces (imágenes de catálogo, PDFs de cotización). |
| **weasyprint** | ≥ 60.0 | Generación de PDFs desde HTML/CSS (cotizaciones formales con diseño corporativo). |
| **reportlab** | ≥ 4.0 | Generación programática de PDFs (reportes, facturas). |
| **openpyxl** | ≥ 3.1 | Exportación de datos a Excel (reportes de ventas, inventario, analytics). |
| **Pillow** | ≥ 10.2 | Procesamiento de imágenes (resize, thumbnails, optimización de catálogo). |
| **django-anymail** | ≥ 10.2 | Envío de emails transaccionales vía proveedores (SendGrid/Mailgun). |
| **drf-spectacular** | ≥ 0.27 | Documentación OpenAPI 3.0 automática (Swagger UI + ReDoc). |
| **django-mptt** | ≥ 0.16 | Árboles jerárquicos eficientes (categorías de catálogo anidadas). |
| **django-import-export** | ≥ 3.3 | Import/export masivo de datos vía Django Admin (Excel/CSV). |
| **django-filter** | ≥ 23.5 | Filtros declarativos para vistas DRF (búsqueda, ordenamiento, facetas). |
| **python-slugify** | ≥ 8.0 | Generación de slugs URL-friendly para productos y categorías. |
| **sentry-sdk** | ≥ 1.39 | Monitoreo de errores en producción (captura excepciones, traza performance). |
| **python-json-logger** | ≥ 2.0 | Logs estructurados en JSON (integración con servicios de monitoreo). |
| **google-genai** | ≥ 1.0 | SDK oficial de Google Generative AI (integración con Gemini). |

### 5.3 Librerías de Testing

| Librería | Propósito |
|---|---|
| **pytest + pytest-django** | Framework de testing del backend |
| **pytest-cov** | Cobertura de código |
| **factory-boy** | Generación de datos de prueba (fixtures) |
| **Jest + @testing-library/react** | Testing del frontend (unit + integration) |

### 5.4 Librerías de Calidad de Código

| Librería | Propósito |
|---|---|
| **ESLint + eslint-config-next** | Linting del frontend |
| **Prettier** | Formateo de código frontend |
| **Black** | Formateo de código Python |
| **Flake8** | Linting de Python |
| **isort** | Ordenamiento de imports Python |
| **mypy + django-stubs** | Tipado estático de Python |

---

## 6. APIs

### 6.1 APIs Propias (Backend Django REST)

El backend expone una API RESTful completa bajo el prefijo `/api/v1/`:

| Módulo | Endpoints principales | Métodos |
|---|---|---|
| **Auth** (`/api/v1/auth/`) | Login, registro, refresh token, perfil | POST, GET |
| **Catálogo** (`/api/v1/catalog/`) | Categorías (MPTT), productos, imágenes | GET, POST, PUT, DELETE |
| **Cotizaciones** (`/api/v1/quotes/`) | Crear cotización, listar, detalle, actualizar estado, generar PDF | GET, POST, PATCH |
| **Pedidos** (`/api/v1/orders/`) | Crear pedido desde cotización, historial de estados | GET, POST, PATCH |
| **Pagos** (`/api/v1/payments/`) | Crear preferencia MercadoPago/PayPal, webhooks | POST |
| **Chatbot** (`/api/v1/chatbot/`) | Leads, conversaciones, mensajes, config del widget | GET, POST, PATCH |
| **Contenido** (`/api/v1/content/`) | Carrusel, testimonios, FAQs, sucursales, config | GET |
| **Analytics** (`/api/v1/analytics/`) | Batch de eventos, resumen para dashboard | POST, GET |
| **Notificaciones** (`/api/v1/notifications/`) | Listar, marcar leída | GET, PATCH |
| **Inventario** (`/api/v1/inventory/`) | Stock, alertas | GET, PATCH |

**Documentación:** Swagger UI disponible en `/api/v1/docs/` (generada con `drf-spectacular`).

### 6.2 APIs Externas Consumidas

#### 6.2.1 Google Gemini API (Inteligencia Artificial)

| Aspecto | Detalle |
|---|---|
| **Servicio** | Google Generative AI — Gemini 2.0 Flash |
| **SDK** | `google-genai` ≥ 1.0 (Python) |
| **Límite gratuito** | 1,500 solicitudes/día |
| **Uso** | Motor de IA del chatbot: genera respuestas contextualizadas sobre productos, precios, servicios y sucursales de la agencia |
| **Información contextual** | El chatbot recibe contexto dinámico construido desde la base de datos (catálogo, FAQs, sucursales) actualizado cada hora |

#### 6.2.2 MercadoPago API (Pagos - Latinoamérica)

| Aspecto | Detalle |
|---|---|
| **Tipo** | REST API + Webhooks |
| **Funcionalidad** | Procesamiento de pagos con tarjetas de crédito/débito, OXXO (efectivo), transferencia bancaria |
| **Flujo** | Backend crea "preferencia de pago" → usuario redirigido a checkout → webhook notifica resultado |
| **Seguridad** | Webhooks verificados con firma HMAC |

#### 6.2.3 PayPal API (Pagos - Internacional)

| Aspecto | Detalle |
|---|---|
| **Tipo** | REST API v2 + Webhooks |
| **Funcionalidad** | Pagos internacionales con cuenta PayPal o tarjeta |
| **Flujo** | Crear orden → aprobar en PayPal → capturar pago → webhook de confirmación |

#### 6.2.4 Google reCAPTCHA v3 API (Seguridad)

| Aspecto | Detalle |
|---|---|
| **Tipo** | JavaScript API (frontend) + REST API (verificación backend) |
| **Versión** | v3 (invisible, basada en score) |
| **Uso** | Protección anti-bot en: formulario de cotización, registro de usuario, contacto |
| **Flujo** | Frontend ejecuta `grecaptcha.execute()` → obtiene token → lo envía al backend → backend verifica con Google y obtiene score (0.0–1.0) |

#### 6.2.5 OpenStreetMap / Leaflet API (Mapas)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Tile server (mapas) + JavaScript API (Leaflet) |
| **Uso** | 1) Mapa interactivo para selección de rutas de entrega, 2) Visualización de ubicación de sucursales |
| **Tiles** | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| **Ventaja** | Gratuito y sin límite de uso (a diferencia de Google Maps) |

#### 6.2.6 WhatsApp Business (Comunicación directa)

| Aspecto | Detalle |
|---|---|
| **Tipo** | Deep links (`https://wa.me/527446887382`) |
| **Uso** | Escalación del chatbot a atención humana, botón flotante de contacto en landing page |
| **Sucursales** | Acapulco: +52 744 688 7382 / Tecoanapa: +52 745 114 7727 |

#### 6.2.7 Amazon S3 / Spaces API (Almacenamiento)

| Aspecto | Detalle |
|---|---|
| **SDK** | `boto3` (Python) + `django-storages` |
| **Uso** | Almacenamiento de imágenes de catálogo, PDFs generados de cotizaciones, archivos adjuntos |
| **Operaciones** | Upload, download, presigned URLs, lifecycle policies |

#### 6.2.8 Email Service API (Transaccional)

| Aspecto | Detalle |
|---|---|
| **Librería** | `django-anymail` (abstracción multi-proveedor) |
| **Proveedores compatibles** | SendGrid, Mailgun, Amazon SES |
| **Uso** | Emails de confirmación de cotización, notificación de pago, bienvenida, recuperación de contraseña |
| **Templates** | HTML con Django templates (`templates/emails/`) |

---

## 7. Chatbot

### 7.1 Definición y Contexto

Un chatbot es un programa informático diseñado para simular conversación humana mediante texto o voz. Los chatbots modernos basados en IA utilizan modelos de lenguaje grande (LLM) para generar respuestas contextualizadas que van más allá de los patrones predefinidos de los sistemas basados en reglas (Adamopoulou & Moussiades, 2020).

### 7.2 Arquitectura del Chatbot MCD

El chatbot de la plataforma MCD implementa una **arquitectura de servicio pluggable** con patrón Strategy:

```
┌─────────────────────────────────────────────────┐
│              Frontend (React Widget)             │
│  • Burbuja flotante con badge de estado          │
│  • Acciones rápidas (Servicios, Cotización,      │
│    Ubicación, Catálogo)                          │
│  • Historial de conversación por sesión          │
└──────────────────┬──────────────────────────────┘
                   │ POST /api/v1/chatbot/web/message/
                   ▼
┌─────────────────────────────────────────────────┐
│            Backend (Django Views)                 │
│  • Rate limiting: ChatMessageThrottle             │
│  • Gestión de leads y conversaciones              │
│  • Feedback de mensajes (útil/no útil)           │
└──────────────────┬──────────────────────────────┘
                   │ get_ai_service() → Factory
                   ▼
┌─────────────────────────────────────────────────┐
│         AI Service Layer (Strategy Pattern)       │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ GeminiService│  │FallbackService│             │
│  │ (Gemini 2.0) │  │ (Keywords)    │             │
│  └──────┬───────┘  └──────┬───────┘              │
│         │ Auto-detect      │ Si no hay API key    │
│         ▼                  ▼                      │
│  ┌──────────────────────────────┐                │
│  │     Context Builder          │                │
│  │  • Catálogo (DB)             │                │
│  │  • Sucursales (DB)           │                │
│  │  • FAQs (DB)                 │                │
│  │  • Servicios (hardcoded)     │                │
│  │  Cache: Redis (1h TTL)       │                │
│  └──────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

### 7.3 Proveedor Principal: Google Gemini 2.0 Flash

- **Modelo:** `gemini-2.0-flash` — modelo optimizado para velocidad con capacidades multimodales
- **System prompt:** Instruido como asistente de la agencia MCD, con reglas de tono profesional, límite de 2-3 oraciones por respuesta, prohibición de inventar información
- **Contexto dinámico:** Cada 1 hora se reconstruye desde la base de datos el contexto del negocio (categorías, productos con precio, sucursales con horarios, FAQs)
- **Escalación:** Si el chatbot detecta baja confianza o el usuario solicita atención humana, sugiere contactar por WhatsApp

### 7.4 Gestión de Leads

El chatbot funciona como canal de captación de leads:

| Campo | Descripción |
|---|---|
| **Datos capturados** | Nombre, email, teléfono, empresa, fuente (orgánico, WhatsApp, web) |
| **Estados del lead** | `new` → `contacted` → `qualified` → `proposal` → `won` / `lost` |
| **UTM tracking** | Captura parámetros UTM (source, medium, campaign) para atribución de marketing |
| **Scoring** | Prioridad basada en interacciones y datos proporcionados |

### 7.5 Tipos de Chatbot (Marco Teórico)

| Tipo | Descripción | Ejemplo en MCD |
|---|---|---|
| **Basado en reglas** | Responde con patrones if/then predefinidos | `FallbackService` (greeting, quote keywords) |
| **Basado en IA/NLP** | Usa modelos de lenguaje para entender intención | `GeminiService` (comprensión semántica) |
| **Híbrido** | Combina reglas para acciones rápidas + IA para consultas complejas | Arquitectura actual: acciones rápidas predefinidas + Gemini para diálogo libre |

---

## 8. Publicidad

### 8.1 Contexto: Agencia de Publicidad Digital

La Agencia MCD es una agencia de publicidad e impresión ubicada en Guerrero, México, con sucursales en Acapulco y Tecoanapa. La plataforma digital se desarrolla como herramienta de transformación digital para complementar y potenciar sus operaciones publicitarias tradicionales.

### 8.2 Marketing Digital Implementado en la Plataforma

#### 8.2.1 SEO (Search Engine Optimization)

| Estrategia | Implementación |
|---|---|
| **Server-Side Rendering** | Next.js SSR/SSG genera HTML completo que los crawlers pueden indexar |
| **SEO Models** | Modelo base `SEOModel` en Django que agrega `meta_title`, `meta_description`, `meta_keywords` a contenido CMS |
| **Rutas semánticas** | URLs con slugs descriptivos (`/es/catalogo/impresion-gran-formato`) |
| **Internacionalización** | Contenido en español e inglés con `hreflang` tags |
| **Open Graph** | Metadatos para compartir en redes sociales |

#### 8.2.2 Analítica Web (Analytics Propio)

La plataforma implementa un **sistema de analítica propio** (sin dependencia de Google Analytics):

| Componente | Detalle |
|---|---|
| **PageView tracking** | Cada visita registra: URL, referrer, UTM params, dispositivo, IP, duración |
| **Event tracking** | Eventos personalizados: clics en CTA, pasos del formulario de cotización, scroll depth |
| **Session tracking** | Sesiones anónimas por cookie, vinculación con usuario autenticado |
| **Dashboard** | Endpoint `GET /api/v1/analytics/summary/` con estadísticas agregadas |
| **Device detection** | Clasificación automática: desktop / tablet / mobile |
| **UTM Attribution** | Captura source, medium, campaign para medir ROI de campañas |

#### 8.2.3 Lead Generation (Generación de Prospectos)

| Canal | Mecanismo |
|---|---|
| **Formulario de cotización** | Formulario multi-paso en landing page con selección de productos, cantidades, archivos adjuntos, selección de ruta de entrega |
| **Chatbot** | Captura datos de contacto durante la conversación, integrado con modelo `Lead` |
| **WhatsApp** | Botones de contacto directo con enlaces preformateados |
| **CTAs estratégicos** | Botones "Cotiza ya" y "Comprar" posicionados en header y barra flotante |

#### 8.2.4 CMS (Content Management System)

El backend incluye un CMS administrable sin código para el equipo de marketing:

| Contenido | Gestión |
|---|---|
| **Carrusel hero** | Slides con imagen, título, subtítulo, CTA configurable |
| **Portafolio** | Trabajos destacados con imágenes y descripciones |
| **Testimonios** | Reseñas de clientes con nombre, empresa, logo |
| **FAQs** | Preguntas frecuentes editables (bilingüe) |
| **Sucursales** | Ubicaciones con mapa, horarios, teléfono |
| **Configuración del sitio** | Datos globales (nombre, logo, redes sociales) |

#### 8.2.5 Email Marketing Transaccional

| Tipo de email | Trigger |
|---|---|
| **Confirmación de cotización** | Al enviar formulario de cotización |
| **Actualización de estado** | Cambio de estado de cotización/pedido |
| **Confirmación de pago** | Pago exitoso vía MercadoPago/PayPal |
| **Bienvenida** | Registro de nuevo usuario |
| **Recuperación de contraseña** | Solicitud de reset |

### 8.3 Publicidad Tradicional vs. Digital (Marco Conceptual)

| Aspecto | Publicidad Tradicional | Publicidad Digital |
|---|---|---|
| **Alcance** | Geográfico limitado | Global, segmentado |
| **Medición** | Difícil de cuantificar | Métricas en tiempo real (CTR, conversiones) |
| **Costo** | Alto costo fijo (impresión, distribución) | Costo variable, escalable |
| **Interactividad** | Unidireccional | Bidireccional (chatbot, formularios, redes) |
| **Personalización** | Masiva, genérica | Segmentada por comportamiento y demographics |
| **Tiempo** | Semanas de producción | Cambios en minutos (CMS) |

**Relevancia para la agencia MCD:** La plataforma digital permite a la agencia ofrecer a sus clientes no solo servicios de impresión tradicional, sino también presencia digital, catálogo en línea, cotización instantánea y seguimiento de pedidos — transformando un negocio presencial en un modelo omnicanal.

### 8.4 Métricas de Publicidad Digital

| Métrica | Fuente en MCD | Descripción |
|---|---|---|
| **Page Views** | `analytics.PageView` | Visitas por página, tendencias temporales |
| **Session Duration** | `duration_ms` | Tiempo promedio en la plataforma |
| **Bounce Rate** | Sesiones con 1 sola pageview | Porcentaje de visitas que abandonan inmediatamente |
| **Conversion Rate** | Cotizaciones / Visitas totales | Efectividad del embudo de ventas |
| **Lead Sources** | `Lead.source`, UTM params | Canal de adquisición de cada prospecto |
| **CTA Click Rate** | `TrackEvent` (event_name=cta_click) | Efectividad de botones de llamada a la acción |
| **Chat Engagement** | Mensajes/sesión, escalaciones | Uso y utilidad del chatbot |

---

## Referencias Bibliográficas

- Adamopoulou, E., & Moussiades, L. (2020). An Overview of Chatbot Technology. *IFIP International Conference on Artificial Intelligence Applications and Innovations*, 373-383.
- Ask Solem. (2024). Celery: Distributed Task Queue. https://docs.celeryq.dev/
- Carlson, J. L. (2013). *Redis in Action*. Manning Publications.
- Christie, T. (2024). Django REST Framework. https://www.django-rest-framework.org/
- Django Software Foundation. (2024). Django Documentation. https://docs.djangoproject.com/
- Meta Platforms. (2024). React — A JavaScript library for building user interfaces. https://react.dev/
- Microsoft. (2024). TypeScript Documentation. https://www.typescriptlang.org/docs/
- Stonebraker, M., & Rowe, L. A. (1986). The Design of POSTGRES. *ACM SIGMOD Record*, 15(2), 340-355.
- Van Rossum, G., & Drake, F. L. (2009). *Python 3 Reference Manual*. CreateSpace.
- Vercel. (2024). Next.js Documentation. https://nextjs.org/docs

---

> **Nota:** Este documento sirve como base para el capítulo de Marco Teórico del documento académico.
> Cada sección corresponde a un nodo del mapa conceptual del proyecto.
> Para exportar a Word: `pandoc MARCO_TEORICO.md -o MARCO_TEORICO.docx --reference-doc=plantilla.docx`
