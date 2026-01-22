# MCD-Agencia

Plataforma de e-commerce y cotizaciones para Agencia MCD - Medios Impresos y Publicidad Exterior.

## Descripción

Sistema integral que combina:
- **E-commerce**: Venta directa de productos con precio definido
- **Cotizaciones (RFQ)**: Sistema de solicitud y gestión de cotizaciones para servicios personalizados
- **Panel Admin**: Gestión completa con roles y permisos (RBAC)
- **Inventario**: Control de stock con alertas
- **Bitácora**: Auditoría completa de operaciones

## Stack Tecnológico

### Backend
- **Framework**: Django 5+ con Django REST Framework
- **Base de datos**: PostgreSQL 15+
- **Cache/Queue**: Redis 7+
- **Task Queue**: Celery
- **PDF Generation**: WeasyPrint
- **Autenticación**: JWT + OAuth (Google)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Estado**: React Query + Zustand
- **i18n**: next-intl (ES/EN)

### Infraestructura
- **Containerización**: Docker + Docker Compose
- **Almacenamiento**: S3-compatible (AWS S3, DigitalOcean Spaces)
- **Pagos**: Mercado Pago + PayPal

## Estructura del Proyecto

```
MCD-Agencia/
├── backend/                 # Django Backend
│   ├── apps/               # Django applications
│   │   ├── core/          # Base models and utilities
│   │   ├── users/         # User management & auth
│   │   ├── catalog/       # Products & services
│   │   ├── orders/        # E-commerce orders
│   │   ├── quotes/        # RFQ system
│   │   ├── inventory/     # Stock management
│   │   ├── audit/         # Audit logging
│   │   ├── content/       # CMS content
│   │   ├── payments/      # Payment processing
│   │   ├── notifications/ # Email notifications
│   │   └── chatbot/       # Chatbot & leads
│   ├── config/            # Django settings
│   └── requirements.txt   # Python dependencies
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities
│   │   ├── hooks/        # Custom hooks
│   │   ├── store/        # State management
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   └── messages/         # i18n translations
├── docker-compose.yml      # Docker services
└── README.md
```

## Inicio Rápido

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo local del frontend)
- Python 3.11+ (para desarrollo local del backend)

### Con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/agenciamcd/mcd-agencia.git
cd mcd-agencia

# Copiar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- API Docs: http://localhost:8000/api/docs/swagger/

### Desarrollo Local

#### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con USE_SQLITE=true para desarrollo simple

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

### Backend (`.env`)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DJANGO_SECRET_KEY` | Clave secreta de Django | Sí |
| `DB_NAME` | Nombre de la base de datos | Sí |
| `DB_USER` | Usuario de PostgreSQL | Sí |
| `DB_PASSWORD` | Contraseña de PostgreSQL | Sí |
| `REDIS_URL` | URL de Redis | Sí |
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth | No |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de Mercado Pago | Prod |
| `PAYPAL_CLIENT_ID` | ID de cliente PayPal | Prod |

Ver `backend/.env.example` para la lista completa.

## Modelos de Datos Principales

### Usuarios y Roles
- **User**: Usuario con autenticación por email
- **Role**: Roles para RBAC (SuperAdmin, Admin, Ventas, Operaciones, Cliente)
- **UserConsent**: Consentimientos legales (GDPR)
- **FiscalData**: Datos fiscales para CFDI

### Catálogo
- **Category**: Categorías jerárquicas (MPTT)
- **Tag**: Etiquetas flexibles
- **Attribute/AttributeValue**: Atributos configurables
- **CatalogItem**: Producto o servicio unificado
- **ProductVariant**: SKU con atributos específicos

### E-commerce
- **Cart/CartItem**: Carrito de compras
- **Order/OrderLine**: Pedidos con FSM de estados
- **Address**: Direcciones de envío/facturación
- **Payment**: Transacciones de pago

### Cotizaciones
- **QuoteRequest**: Solicitud de cotización
- **Quote/QuoteLine**: Cotización con líneas
- **QuoteAttachment**: Archivos adjuntos

### Inventario
- **InventoryMovement**: Movimientos de stock
- **StockAlert**: Alertas de stock bajo

## API Endpoints

### Autenticación
- `POST /api/v1/auth/login/` - Iniciar sesión
- `POST /api/v1/auth/register/` - Registrar usuario
- `POST /api/v1/auth/token/refresh/` - Refrescar token

### Catálogo
- `GET /api/v1/catalog/items/` - Listar productos
- `GET /api/v1/catalog/items/{slug}/` - Detalle de producto
- `GET /api/v1/catalog/categories/` - Categorías

### Pedidos
- `GET /api/v1/orders/` - Mis pedidos
- `POST /api/v1/orders/` - Crear pedido
- `GET /api/v1/orders/{id}/` - Detalle de pedido

### Cotizaciones
- `POST /api/v1/quotes/request/` - Solicitar cotización
- `GET /api/v1/quotes/{token}/` - Ver cotización
- `POST /api/v1/quotes/{token}/accept/` - Aceptar cotización

### Carrito
- `GET /api/v1/cart/` - Ver carrito
- `POST /api/v1/cart/add/` - Agregar item
- `DELETE /api/v1/cart/remove/{id}/` - Eliminar item

## Roles y Permisos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| SuperAdmin | Acceso total | Todo |
| Admin | Gestión operativa | Todo excepto configuración crítica |
| Ventas | Comercial | Cotizaciones, pedidos, clientes |
| Operaciones | Producción | Inventario, estados de producción |
| Cliente | Usuario final | Compras, sus pedidos/cotizaciones |

## Flujos Principales

### Compra Directa
1. Cliente navega catálogo
2. Agrega productos al carrito
3. Inicia checkout (requiere login)
4. Completa datos y paga
5. Recibe confirmación

### Cotización (RFQ)
1. Cliente envía solicitud
2. Ventas recibe y crea cotización
3. Sistema genera PDF y envía email
4. Cliente revisa y acepta
5. Se convierte en pedido

## Seguridad

- Autenticación JWT con refresh tokens
- Contraseñas hasheadas con algoritmos seguros
- CORS configurado por ambiente
- Headers de seguridad (HSTS, XSS, etc.)
- Validación de entrada en servidor
- Rate limiting en endpoints sensibles
- Auditoría completa de acciones

## Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Despliegue

### Producción

```bash
# Usar docker-compose de producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Variables de Producción
- `DJANGO_ENV=production`
- `DEBUG=false`
- Configurar `ALLOWED_HOSTS`
- Configurar `CORS_ALLOWED_ORIGINS`
- Configurar credenciales de pago en modo live

## Contribución

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Propiedad de Agencia MCD. Todos los derechos reservados.

## Soporte

Para soporte técnico, contactar a:
- Email: soporte@agenciamcd.mx
- Tel: +52 744 XXX XXXX
