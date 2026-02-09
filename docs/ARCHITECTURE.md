# Arquitectura y Despliegue — MCD-Agencia

## Visión General

MCD-Agencia es una plataforma de e-commerce y cotizaciones para medios impresos y publicidad exterior. Combina venta directa de productos con un sistema de solicitud y gestión de cotizaciones (RFQ).

```
                    ┌─────────────┐
                    │   Cliente    │
                    │  (Browser)  │
                    └──────┬──────┘
                           │ HTTPS
              ┌────────────┴────────────┐
              │                         │
      ┌───────▼───────┐       ┌────────▼────────┐
      │    Vercel      │       │     Render       │
      │   Frontend     │──────▶│   Backend API    │
      │   Next.js 14   │ REST  │   Django 5       │
      │   TypeScript   │       │   Gunicorn       │
      └───────────────┘       └───────┬──────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    │                 │                   │
           ┌────────▼──────┐  ┌──────▼──────┐  ┌────────▼───────┐
           │  PostgreSQL   │  │ Cloudflare  │  │   Brevo API    │
           │  (Render)     │  │ R2 Storage  │  │   (Email)      │
           │  Base datos   │  │ Media files │  │   300/día free │
           └───────────────┘  └─────────────┘  └────────────────┘
```

---

## Stack Tecnológico

### Backend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.11+ | Lenguaje base |
| Django | 5.0 | Framework web |
| Django REST Framework | 3.14 | API REST |
| SimpleJWT | 5.3 | Autenticación JWT |
| django-allauth | 0.60 | OAuth (Google) |
| Celery | 5.3 | Tasks asíncronos (modo eager en cloud) |
| ReportLab | 4.0 | Generación de PDF |
| django-anymail | 10.2 | Email vía API HTTP (Brevo) |
| django-storages + boto3 | 1.14 / 1.34 | Almacenamiento en Cloudflare R2 |
| Gunicorn | 21.2 | Servidor WSGI de producción |
| WhiteNoise | 6.6 | Archivos estáticos |
| psycopg2 | 2.9 | Driver PostgreSQL |

### Frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 14.1.0 | Framework React (App Router) |
| React | 18.2 | UI library |
| TypeScript | 5.3 | Type safety |
| Tailwind CSS | 3.4 | Estilos utility-first |
| React Query | 5.17 | Data fetching y cache |
| Zustand | 4.4 | Estado global |
| React Hook Form | 7.49 | Formularios |
| Zod | 3.22 | Validación de schemas |
| next-intl | 3.4 | Internacionalización (ES/EN) |
| Framer Motion | 10.18 | Animaciones |
| Embla Carousel | 8.0 | Carruseles |
| Lucide React | 0.562 | Iconos |

---

## Estructura del Backend

### Apps Django

```
backend/apps/
├── core/           # Modelos base, excepciones, paginación
├── users/          # Usuarios, roles, OAuth, verificación email
├── catalog/        # Categorías (MPTT), productos, variantes
├── orders/         # Pedidos con FSM de estados
├── quotes/         # Cotizaciones, PDF, tokens públicos, cambios
├── inventory/      # Stock, movimientos, alertas
├── payments/       # Mercado Pago, PayPal
├── audit/          # Bitácora completa con middleware
├── content/        # CMS: servicios, portafolio, videos
├── notifications/  # Notificaciones in-app
└── chatbot/        # Chatbot y leads
```

### Modelos Clave

#### Users
- `User` — Email auth, JWT, Google OAuth, verificación de email
- `Role` — RBAC: SuperAdmin, Admin, Ventas, Operaciones, Cliente
- `FiscalData` — Datos fiscales para CFDI
- `UserConsent` — Consentimientos legales (GDPR/LFPDPPP)

#### Quotes (sistema principal)
- `QuoteRequest` — Solicitud de cotización del cliente
- `Quote` — Cotización con versiones, token público, PDF bilingüe
- `QuoteLine` — Líneas de cotización (concepto, cantidad, precio)
- `QuoteAttachment` — Archivos adjuntos
- `QuoteChangeRequest` — Solicitudes de cambio del cliente

#### Catalog
- `Category` — Jerárquicas con MPTT (servicios de impresión)
- `CatalogItem` — Producto o servicio unificado
- `ProductVariant` — SKU con atributos específicos

#### Content (CMS)
- `Service` — Servicios mostrados en landing
- `ServiceImage` — Imágenes por subtipo de servicio
- `PortfolioItem` — Trabajos realizados
- `Video` — Videos de YouTube embebidos

### Autenticación y Seguridad

```
Registro → Verificación Email → Login → JWT Access + Refresh
              │
              ├── Token: Django signing framework (24h expiry)
              ├── Email: Brevo HTTP API
              └── Página: /[locale]/verificar-email?token=...

Login → JWT → Access Token (30min) + Refresh Token (3 días)
  │
  ├── Email + Password (SimpleJWT)
  └── Google OAuth (django-allauth → JWT)
```

### Email

Cascada de backends (cloud.py):
1. **Brevo** (`BREVO_API_KEY`) — HTTP API, 300/día gratis ✅ Activo
2. Resend (`RESEND_API_KEY`) — HTTP API
3. SendGrid (`SENDGRID_API_KEY`) — HTTP API
4. Gmail SMTP (`EMAIL_HOST_USER`) — Bloqueado en Render (puertos 587/465/25)
5. Console — Solo imprime en logs (fallback)

### Generación de PDF

- **Motor**: ReportLab (no WeasyPrint, por compatibilidad con Render)
- **Bilingüe**: Genera PDF en español e inglés
- **Logo**: Logo oscuro para visibilidad en papel blanco
- **Almacenamiento**: Cloudflare R2 (persistente)
- **Ejecución**: Síncrona (Celery eager, sin Redis)

### Celery

En producción (Render free tier):
- `CELERY_TASK_ALWAYS_EAGER = True` — Tasks se ejecutan síncronamente
- `CELERY_TASK_EAGER_PROPAGATES = True` — Errores se propagan
- Broker: `memory://` (sin Redis)
- No requiere worker separado

---

## Estructura del Frontend

```
frontend/src/
├── app/
│   └── [locale]/           # Rutas internacionalizadas (es/en)
│       ├── (auth)/         # Login, registro, verificar-email
│       ├── (public)/       # Landing, catálogo, cotización pública
│       └── dashboard/      # Panel admin/ventas/cliente
├── components/             # Componentes React reutilizables
├── contexts/               # React contexts
├── hooks/                  # Custom hooks
├── lib/
│   ├── api/               # API client y servicios (auth, quotes, etc.)
│   └── analytics.ts       # Tracking de eventos
├── services/               # Servicios adicionales
├── store/                  # Zustand stores
├── styles/                 # CSS global
└── types/                  # TypeScript interfaces
```

### API Client

El cliente API (`lib/api/client.ts`) maneja:
- Tokens JWT automáticos (access + refresh)
- Refresh automático cuando el access token expira
- **Desempaquetado de envelope de error**: El backend envuelve todos los errores en `{success, error: {code, message, details}}`. El client extrae `message` y `details` automáticamente.

### Internacionalización

- Middleware de Next.js detecta locale del browser
- Archivos de traducción en `messages/es.json` y `messages/en.json`
- Todas las rutas prefijadas con `[locale]` (`/es/...`, `/en/...`)

---

## Despliegue

### Render (Backend)

**URL**: `https://mcd-agencia-api.onrender.com`

Configurado vía `render.yaml` (Blueprint):
- **Build**: `./build.sh` (instala deps, collectstatic, migrate, crea roles)
- **Start**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 2`
- **Health check**: `/health/`
- **Auto-deploy**: Sí, en push a `main`
- **Settings**: `DJANGO_ENV=cloud` → carga `config/settings/cloud.py`

### Vercel (Frontend)

**URL**: `https://agenciamcd.mx`

- Framework: Next.js (auto-detectado)
- Build command: `next build`
- Output: `.next/`
- Variables de entorno: `NEXT_PUBLIC_API_URL` apunta a Render

### Cloudflare R2 (Storage)

- Bucket para media files (imágenes de productos, PDFs, etc.)
- URLs presignadas con expiración de 7 días
- Configurado vía `django-storages` con backend S3

### Brevo (Email)

- HTTP API (no SMTP, Render bloquea puertos SMTP)
- Plan gratuito: 300 emails/día
- Remitentes verificados en panel de Brevo
- Backend: `anymail.backends.brevo.EmailBackend`

---

## Flujos Principales

### 1. Registro de Usuario

```
1. Cliente llena formulario → POST /auth/register/
2. Backend crea User + Consents (atómico)
3. Task envía email verificación vía Brevo
4. Cliente recibe email → click enlace
5. Página /verificar-email?token=... → POST /auth/verify-email/
6. Backend verifica token → marca is_email_verified=True
7. Cliente puede hacer login
```

### 2. Solicitud de Cotización (RFQ)

```
1. Cliente envía solicitud → POST /quotes/request/
2. Notificación a admins/ventas
3. Vendedor crea cotización con líneas y precios
4. Sistema genera PDF (ReportLab) bilingüe
5. Vendedor envía → Email con PDF adjunto al cliente
6. Cliente abre enlace público → /cotizacion/{token}
7. Cliente acepta/rechaza/solicita cambios
```

### 3. Solicitud de Cambios

```
1. Cliente solicita cambios en cotización aceptada/enviada
2. Notificación al vendedor
3. Vendedor revisa y aprueba/rechaza
4. Si aprobada → nueva versión de cotización
5. Re-envío de email con PDF actualizado
```

### 4. Compra Directa (E-commerce)

```
1. Cliente navega catálogo → agrega al carrito
2. Checkout → selecciona dirección y método de pago
3. Pago vía Mercado Pago o PayPal
4. Confirmación de pedido + email
5. Admin gestiona estado del pedido
```

---

## Roles y Permisos (RBAC)

| Rol | Acceso |
|-----|--------|
| **SuperAdmin** | Todo el sistema |
| **Admin** | Dashboard completo, usuarios, configuración |
| **Ventas** | Cotizaciones, pedidos, clientes, CMS |
| **Operaciones** | Inventario, producción |
| **Cliente** | Su perfil, sus pedidos, sus cotizaciones |

---

## Monitoreo y Logging

- **Sentry** (opcional): Error tracking en producción
- **Django logging**: `INFO` nivel para apps, `WARNING` para Django core
- **Brevo logs**: Dashboard de emails enviados/entregados/abiertos
- **Render logs**: Logs del servidor en tiempo real

---

## Desarrollo Local

### Requisitos
- Python 3.11+
- Node.js 18+
- SQLite (viene con Python, no requiere PostgreSQL)

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # Editar con tus valores
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Variables locales clave (`.env`)
```env
DJANGO_ENV=development
USE_SQLITE=true
CELERY_ALWAYS_EAGER=true
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password
FRONTEND_URL=http://localhost:3000
```
