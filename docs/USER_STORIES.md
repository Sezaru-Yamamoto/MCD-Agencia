# Historias de Usuario — MCD-Agencia

**Proyecto**: Sistema Web para Agencia de Publicidad MCD  
**Versión**: 1.0  
**Fecha**: 11 de marzo de 2026  
**Autor**: César Alejandro Yamamoto Herrera  
**Metodología**: Scrum  
**Total de Historias**: 27 User Stories + 72 Tareas técnicas  

---

## Índice

1. [EP-01: Análisis de Procesos y Requerimientos](#ep-01-análisis-de-procesos-y-requerimientos)
2. [EP-02: Arquitectura y Diseño Técnico](#ep-02-arquitectura-y-diseño-técnico)
3. [EP-03: Diseño UI/UX](#ep-03-diseño-uiux)
4. [EP-04: Landing Page y Sitio Público](#ep-04-landing-page-y-sitio-público)
5. [EP-05: Autenticación y Gestión de Usuarios](#ep-05-autenticación-y-gestión-de-usuarios)
6. [EP-06: Sistema de Cotizaciones y PDF](#ep-06-sistema-de-cotizaciones-y-pdf)
7. [EP-07: Catálogo de Productos e Inventario](#ep-07-catálogo-de-productos-e-inventario)
8. [EP-08: Carrito, Pedidos y Pagos](#ep-08-carrito-pedidos-y-pagos)
9. [EP-09: CMS y Gestión de Contenido](#ep-09-cms-y-gestión-de-contenido)
10. [EP-10: Chatbot e Inteligencia Artificial](#ep-10-chatbot-e-inteligencia-artificial)
11. [EP-11: Notificaciones y Analytics](#ep-11-notificaciones-y-analytics)
12. [EP-12: Documentación Técnica](#ep-12-documentación-técnica)
13. [EP-13: Pruebas y QA](#ep-13-pruebas-y-qa)
14. [EP-14: Despliegue en Producción](#ep-14-despliegue-en-producción)
15. [EP-15: Entrega y Capacitación](#ep-15-entrega-y-capacitación)

---

## Convenciones

| Abreviatura | Significado |
|-------------|-------------|
| **SP** | Story Points (Fibonacci: 1, 2, 3, 5, 8, 13) |
| **MoSCoW** | Must / Should / Could / Won't |
| **DoD** | Definition of Done |
| **AC** | Criterio de Aceptación (Acceptance Criteria) |

### Escala de Story Points

| SP | Complejidad | Ejemplo |
|:--:|-------------|---------|
| 1 | Trivial | Cambio de texto, ajuste de estilo |
| 2 | Simple | CRUD básico, componente pequeño |
| 3 | Moderado | Feature con lógica de negocio simple |
| 5 | Complejo | Integración con servicio externo, flujo multi-paso |
| 8 | Muy complejo | Módulo completo con múltiples dependencias |
| 13 | Épico | Sistema end-to-end con integraciones |

### Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| **Visitante** | Usuario no autenticado que navega el sitio público |
| **Cliente** | Usuario registrado que solicita cotizaciones y realiza compras |
| **Vendedor** | Empleado de la agencia que gestiona cotizaciones y pedidos |
| **Administrador** | Gestión completa del sistema, usuarios, inventario y reportes |
| **Product Owner** | Dueño del producto (Agencia MCD) |
| **Desarrollador** | Equipo de desarrollo técnico |

---

## EP-01: Análisis de Procesos y Requerimientos

### US-001: Diagnóstico de Procesos Actuales

| Campo | Valor |
|-------|-------|
| **ID** | MCD-1 |
| **Épica** | EP-01 — Análisis de Procesos |
| **Sprint** | Sprint 1 (12 – 25 Ene) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | Ninguna |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero un diagnóstico de los procesos manuales actuales de la agencia para identificar qué áreas digitalizar y justificar el desarrollo del sistema.

**Descripción:**

Analizar los procesos operativos actuales de la Agencia de Publicidad MCD: gestión de clientes, generación de cotizaciones manuales, control de inventario en hojas de cálculo y comunicación con prospectos por WhatsApp/teléfono. Se deben identificar los cuellos de botella, tiempos muertos y áreas de oportunidad donde la solución digital aportará valor.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se entrevistó al equipo de ventas sobre el flujo actual de cotizaciones | ✅ |
| AC-2 | Se documentó el proceso de control de inventario manual (hojas de cálculo) | ✅ |
| AC-3 | Se mapeó el proceso de atención a clientes y prospectos | ✅ |
| AC-4 | Se identificaron al menos 5 áreas de oportunidad para digitalización | ✅ |
| AC-5 | Se generó un documento de diagnóstico con hallazgos y recomendaciones | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-2 | Entrevistar al equipo de ventas sobre flujo de cotizaciones actual | 3 | ✅ |
| MCD-3 | Documentar proceso de control de inventario manual | 2 | ✅ |
| MCD-4 | Mapear proceso de atención a clientes y prospectos | 2 | ✅ |

**Entregable:** Documento de diagnóstico con procesos manuales identificados y áreas de mejora.

---

### US-002: Especificación de Requerimientos

| Campo | Valor |
|-------|-------|
| **ID** | MCD-5 |
| **Épica** | EP-01 — Análisis de Procesos |
| **Sprint** | Sprint 1 (12 – 25 Ene) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-001 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero un documento de requerimientos funcionales y no funcionales para alinear expectativas del sistema y definir el alcance del proyecto antes de iniciar el desarrollo.

**Descripción:**

A partir del diagnóstico (US-001), definir de manera clara y estructurada los requerimientos del sistema. Se documentan los casos de uso principales: registro de usuarios, solicitud y gestión de cotizaciones, catálogo de productos, carrito de compras, pagos en línea, gestión de inventario, CMS para contenido dinámico, chatbot para captación de leads, y panel de administración con control de acceso basado en roles (RBAC).

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se definieron los requerimientos funcionales por módulo (mínimo 11 módulos) | ✅ |
| AC-2 | Se documentaron los requerimientos no funcionales (rendimiento, seguridad, escalabilidad) | ✅ |
| AC-3 | Se definieron los casos de uso principales con actores y flujos | ✅ |
| AC-4 | Se documentaron las reglas de negocio por módulo | ✅ |
| AC-5 | El documento fue revisado y aprobado por el Product Owner | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-6 | Definir casos de uso principales del sistema | 2 | ✅ |
| MCD-7 | Documentar reglas de negocio por módulo | 2 | ✅ |

**Entregable:** Especificación de requerimientos del sistema (funcionales, no funcionales, reglas de negocio).

---

## EP-02: Arquitectura y Diseño Técnico

### US-003: Selección del Stack Tecnológico

| Campo | Valor |
|-------|-------|
| **ID** | MCD-8 |
| **Épica** | EP-02 — Arquitectura |
| **Sprint** | Sprint 2 (26 Ene – 8 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-002 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Desarrollador**, quiero un stack tecnológico definido y justificado para iniciar la implementación del sistema con las herramientas más adecuadas para el proyecto.

**Descripción:**

Evaluar y seleccionar las tecnologías para frontend, backend, base de datos, almacenamiento de archivos, servicio de email, pasarelas de pago y plataformas de despliegue. La selección debe considerar: escalabilidad, costos, comunidad de soporte, compatibilidad entre tecnologías y experiencia del equipo.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se evaluaron al menos 3 opciones de framework frontend (Next.js, Nuxt, Remix) | ✅ |
| AC-2 | Se evaluaron al menos 3 opciones de framework backend (Django, FastAPI, Express) | ✅ |
| AC-3 | Se seleccionó base de datos con justificación (PostgreSQL vs MySQL vs MongoDB) | ✅ |
| AC-4 | Se documentó la justificación técnica de cada elección | ✅ |
| AC-5 | El stack completo fue definido y aprobado | ✅ |

**Stack Seleccionado:**

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS | SSR/SSG, App Router, Server Components, tipado fuerte |
| Backend | Django 5.0 + DRF | ORM robusto, admin built-in, ecosystem maduro |
| Base de datos | PostgreSQL (prod) / SQLite (dev) | ACID, índices avanzados, JSON support |
| Almacenamiento | Cloudflare R2 | Compatible S3, sin egress fees, CDN global |
| Email | Brevo (API HTTP) | 300 emails/día gratis, templates HTML |
| Pagos | MercadoPago + PayPal | Cobertura LATAM + global |
| Deploy | Render (backend) + Vercel (frontend) | Free tier, Git integration, auto-deploy |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-9 | Evaluar frameworks frontend (Next.js vs Nuxt vs Remix) | 2 | ✅ |
| MCD-10 | Evaluar frameworks backend (Django vs FastAPI vs Express) | 2 | ✅ |
| MCD-11 | Documentar stack seleccionado con justificación | 1 | ✅ |

---

### US-004: Arquitectura del Sistema

| Campo | Valor |
|-------|-------|
| **ID** | MCD-12 |
| **Épica** | EP-02 — Arquitectura |
| **Sprint** | Sprint 2 (26 Ene – 8 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-003 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Desarrollador**, quiero la arquitectura del sistema definida (módulos, BD, API, autenticación) para estructurar el código correctamente desde el inicio y evitar refactorizaciones costosas.

**Descripción:**

Diseñar la arquitectura general del sistema: estructura cliente-servidor con API REST, modelado de base de datos con 11 apps Django, diseño de endpoints RESTful con versionado, esquema de autenticación JWT con soporte OAuth2, sistema RBAC con roles (admin, vendedor, cliente) y estrategia de almacenamiento de archivos en la nube.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se diseñó el diagrama de arquitectura del sistema (cliente-servidor, capas) | ✅ |
| AC-2 | Se creó el modelo entidad-relación con todas las tablas y relaciones | ✅ |
| AC-3 | Se definieron los endpoints RESTful organizados por módulo | ✅ |
| AC-4 | Se diseñó el esquema de autenticación JWT (access + refresh + OAuth2) | ✅ |
| AC-5 | Se definieron los roles y permisos RBAC por endpoint | ✅ |
| AC-6 | Se documentó la estrategia de almacenamiento de archivos (R2) | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-13 | Diseñar modelo entidad-relación de la base de datos | 3 | ✅ |
| MCD-14 | Definir endpoints RESTful por módulo | 2 | ✅ |
| MCD-15 | Diseñar esquema de autenticación JWT + OAuth2 | 2 | ✅ |

**Entregable:** Diagrama de arquitectura, modelo entidad-relación, diseño de API (ARCHITECTURE.md).

---

### US-005: Plan de Integraciones Externas

| Campo | Valor |
|-------|-------|
| **ID** | MCD-16 |
| **Épica** | EP-02 — Arquitectura |
| **Sprint** | Sprint 2 (26 Ene – 8 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-003 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Desarrollador**, quiero un plan de integraciones con servicios externos (Brevo, R2, MercadoPago, PayPal, Google OAuth) para implementarlas de forma ordenada con flujos, credenciales y mecanismos de respaldo definidos.

**Descripción:**

Planificar y documentar cada integración externa con diagramas de secuencia, configuración de credenciales, manejo de errores y mecanismos de fallback. Incluye: Brevo para email transaccional, Cloudflare R2 para almacenamiento de archivos, MercadoPago y PayPal para pagos, y Google OAuth para autenticación social.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se documentó la integración con Brevo (templates, eventos, API keys) | ✅ |
| AC-2 | Se documentó la integración con Cloudflare R2 (buckets, CORS, presigned URLs) | ✅ |
| AC-3 | Se documentó la integración con MercadoPago (preferencias, webhooks, sandbox) | ✅ |
| AC-4 | Se documentó la integración con PayPal (orders API, IPN, sandbox) | ✅ |
| AC-5 | Se documentó la integración con Google OAuth (flujo, client ID, callback) | ✅ |
| AC-6 | Se crearon diagramas de secuencia por integración | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-17 | Diseñar integración con Brevo (email transaccional) | 1 | ✅ |
| MCD-18 | Diseñar integración con Cloudflare R2 (almacenamiento) | 1 | ✅ |
| MCD-19 | Diseñar integración con MercadoPago y PayPal | 2 | ✅ |
| MCD-20 | Diseñar integración con Google OAuth | 1 | ✅ |
| MCD-21 | Configurar repositorio Git, Docker y entornos dev/prod | 3 | ✅ |

---

## EP-03: Diseño UI/UX

### US-006: Diseño de Interfaces de Usuario

| Campo | Valor |
|-------|-------|
| **ID** | MCD-22a |
| **Épica** | EP-03 — Diseño UI/UX |
| **Sprint** | Sprint 3 (9 – 22 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-004 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero wireframes y mockups de las interfaces principales del sistema para validar la experiencia de usuario antes de la implementación y asegurar que cumple con la identidad visual de la agencia MCD.

**Descripción:**

Diseñar las interfaces del sistema siguiendo los lineamientos de marca de la agencia MCD (colores CMYK: Cyan #0DA3EF, Magenta #EC2D8D, Yellow #FFE884, Black #0D0D0D). Diseño responsivo mobile-first con Tailwind CSS, sistema de componentes reutilizables y soporte de internacionalización (es/en).

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se diseñaron wireframes para: landing, catálogo, checkout, login, dashboard admin | ✅ |
| AC-2 | El diseño respeta la paleta CMYK de la agencia MCD | ✅ |
| AC-3 | Todas las interfaces son responsivas (mobile, tablet, desktop) | ✅ |
| AC-4 | Se definió un sistema de componentes reutilizables | ✅ |
| AC-5 | Se integró soporte de internacionalización (español/inglés) con next-intl | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-23 | Diseñar wireframes de interfaces principales | 3 | ✅ |
| MCD-38 | Soporte de internacionalización español/inglés | 2 | ✅ |

---

## EP-04: Landing Page y Sitio Público

### US-007: Landing Page Profesional

| Campo | Valor |
|-------|-------|
| **ID** | MCD-22 |
| **Épica** | EP-04 — Landing Page |
| **Sprint** | Sprint 3 (9 – 22 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-006 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Visitante**, quiero ver una landing page profesional y atractiva al ingresar al sitio web para conocer los servicios de la agencia, ver su portafolio de trabajos y tener una forma fácil de contactarlos o solicitar una cotización.

**Descripción:**

Implementar una landing page single-page con las siguientes secciones: Hero con carrusel de servicios y efecto Ken Burns, portafolio de trabajos realizados con efecto coverflow, logotipos de clientes, formulario de cotización rápida, mapa de ubicaciones y footer con información de contacto. Incluye header flotante con glass morphism, animaciones de scroll (parallax shift, scroll reveal con clip-path), y botones sticky flotantes (Cotizar con spinner cyan, WhatsApp, Chat).

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | La landing carga en menos de 3 segundos (LCP < 2.5s) | ✅ |
| AC-2 | El Hero muestra un carrusel auto-rotativo con los servicios de la agencia | ✅ |
| AC-3 | La sección de portafolio muestra trabajos con efecto visual atractivo (coverflow) | ✅ |
| AC-4 | Los logos de clientes se muestran en un slider animado | ✅ |
| AC-5 | El formulario de cotización funciona y envía los datos al backend | ✅ |
| AC-6 | El mapa muestra las ubicaciones reales de la agencia | ✅ |
| AC-7 | El header es flotante, transparente al inicio y opaco al hacer scroll | ✅ |
| AC-8 | Las animaciones de scroll son suaves y no causan jank (60fps) | ✅ |
| AC-9 | Los botones sticky (Cotizar, WhatsApp, Chat) son visibles y funcionales | ✅ |
| AC-10 | La página es 100% responsiva en móvil, tablet y desktop | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-24 | Implementar Hero section con carrusel de servicios | 3 | ✅ |
| MCD-25 | Implementar sección de portafolio (coverflow) | 2 | ✅ |
| MCD-26 | Implementar sección de clientes y testimonios | 2 | ✅ |
| MCD-27 | Implementar formulario de cotización en landing | 2 | ✅ |
| MCD-28 | Implementar mapa de ubicaciones y footer | 1 | ✅ |
| MCD-29 | Implementar header flotante con glass morphism | 2 | ✅ |
| MCD-30 | Agregar animaciones de scroll (parallax, reveal) | 2 | ✅ |
| MCD-31 | Implementar botones sticky (Cotizar, WhatsApp, Chat) | 1 | ✅ |

---

## EP-05: Autenticación y Gestión de Usuarios

### US-008: Registro y Verificación de Cuenta

| Campo | Valor |
|-------|-------|
| **ID** | MCD-32 |
| **Épica** | EP-05 — Autenticación |
| **Sprint** | Sprint 3 (9 – 22 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-004, US-005 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Visitante**, quiero registrarme en el sistema con mi correo electrónico y verificar mi cuenta para acceder a las funcionalidades de cliente como solicitar cotizaciones y realizar compras.

**Descripción:**

Implementar un flujo de registro completo: formulario con validación en tiempo real (nombre, email, contraseña con requisitos de seguridad, teléfono opcional), envío de email de verificación con token firmado (24h de expiración) vía Brevo, y activación de cuenta al hacer click en el enlace. Login con autenticación JWT (access token 15min + refresh token 7 días) y opción de inicio de sesión con Google OAuth.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El formulario de registro valida: email único, contraseña (min 8 chars, mayúscula, número), nombre requerido | ✅ |
| AC-2 | Al registrarse se envía un email de verificación con enlace que expira en 24h | ✅ |
| AC-3 | El usuario no puede iniciar sesión hasta verificar su correo | ✅ |
| AC-4 | El login genera tokens JWT (access 15min + refresh 7 días) | ✅ |
| AC-5 | El login con Google OAuth funciona y crea/vincula la cuenta correctamente | ✅ |
| AC-6 | Los tokens se refrescan automáticamente sin intervención del usuario | ✅ |
| AC-7 | Existe opción de "Olvidé mi contraseña" con flujo de recuperación por email | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-33 | Implementar registro con validación y verificación email | 3 | ✅ |
| MCD-34 | Implementar login JWT con refresh + Google OAuth | 3 | ✅ |

---

### US-009: Gestión de Roles y Permisos

| Campo | Valor |
|-------|-------|
| **ID** | MCD-35 |
| **Épica** | EP-05 — Autenticación |
| **Sprint** | Sprint 3 (9 – 22 Feb) |
| **Prioridad** | Must Have |
| **Story Points** | 3 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-008 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Administrador**, quiero gestionar roles de usuario (administrador, vendedor, cliente) para controlar qué funcionalidades puede acceder cada persona según su responsabilidad en la operación.

**Descripción:**

Implementar RBAC (Role-Based Access Control) con tres roles principales: administrador (acceso total), vendedor (gestión de cotizaciones, pedidos, clientes) y cliente (solicitar cotizaciones, carrito, pedidos propios). Los permisos se verifican por endpoint en el backend y por ruta en el frontend. El administrador puede asignar/cambiar roles desde el panel.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Existen 3 roles diferenciados: Administrador, Vendedor, Cliente | ✅ |
| AC-2 | Cada endpoint de la API verifica el rol del usuario antes de procesar | ✅ |
| AC-3 | El frontend muestra/oculta opciones del menú según el rol | ✅ |
| AC-4 | El admin puede cambiar el rol de cualquier usuario | ✅ |
| AC-5 | Un usuario sin rol válido recibe error 403 Forbidden | ✅ |
| AC-6 | El middleware de auditoría registra cada acción con IP, usuario, método y endpoint | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-36 | Implementar RBAC con permisos por endpoint | 2 | ✅ |
| MCD-37 | Implementar perfil de usuario editable | 1 | ✅ |

---

## EP-06: Sistema de Cotizaciones y PDF

### US-010: Solicitud de Cotización en Línea

| Campo | Valor |
|-------|-------|
| **ID** | MCD-39 |
| **Épica** | EP-06 — Cotizaciones |
| **Sprint** | Sprint 4 (23 Feb – 8 Mar) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-008, US-009 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Cliente**, quiero solicitar una cotización en línea describiendo mi proyecto, tipo de servicio y adjuntando archivos de referencia para recibir una propuesta detallada del equipo de la agencia sin necesidad de ir a la sucursal.

**Descripción:**

Implementar el flujo completo de cotizaciones (RFQ — Request for Quote): formulario de solicitud para el cliente (descripción del proyecto, tipo de servicio, cantidad, fecha deseada, archivos adjuntos), panel de gestión para vendedor/admin (crear cotización con ítems detallados, precio unitario, descuento, condiciones), versionamiento de cotizaciones, solicitudes de cambio por parte del cliente, generación de PDF profesional con ReportLab, URL pública firmada para vista/aprobación sin login, y notificaciones por email en cada cambio de estado.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El cliente puede llenar un formulario de solicitud con: descripción, tipo de servicio, cantidad, fecha deseada | ✅ |
| AC-2 | El cliente puede adjuntar archivos de referencia (imágenes, PDFs, máx 10MB c/u) | ✅ |
| AC-3 | El vendedor recibe una notificación de nueva solicitud y puede crear una cotización con ítems detallados | ✅ |
| AC-4 | La cotización incluye: ítems con descripción, cantidad, precio unitario, descuento, subtotal, IVA, total | ✅ |
| AC-5 | Se genera un PDF profesional con: logo de la agencia, datos del cliente, tabla de ítems, totales, condiciones, vigencia | ✅ |
| AC-6 | Existe una URL pública firmada que permite al cliente ver y aprobar/rechazar la cotización sin autenticarse | ✅ |
| AC-7 | El sistema mantiene un historial de versiones de cada cotización | ✅ |
| AC-8 | El cliente puede solicitar cambios y el vendedor responde con una nueva versión | ✅ |
| AC-9 | Se envían emails automáticos al: crear, enviar, aceptar, rechazar, solicitar cambios | ✅ |
| AC-10 | Los estados posibles son: borrador, enviada, aceptada, rechazada, expirada, cambio solicitado | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-40 | Formulario de solicitud con adjuntos y tipo de servicio | 3 | ✅ |
| MCD-41 | Panel de gestión de cotizaciones para vendedor/admin | 3 | ✅ |
| MCD-42 | Versionamiento de cotizaciones y solicitudes de cambio | 3 | ✅ |
| MCD-43 | Generación de PDF profesional con ReportLab | 3 | ✅ |
| MCD-44 | URL pública firmada para vista/aprobación sin login | 2 | ✅ |
| MCD-45 | Notificaciones email en cada cambio de estado | 1 | ✅ |

---

## EP-07: Catálogo de Productos e Inventario

### US-011: Catálogo de Productos en Línea

| Campo | Valor |
|-------|-------|
| **ID** | MCD-46 |
| **Épica** | EP-07 — Catálogo |
| **Sprint** | Sprint 4 (23 Feb – 8 Mar) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-004 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Visitante**, quiero explorar un catálogo de productos en línea con filtros, búsqueda y categorías para encontrar fácilmente el material publicitario que necesito y ver sus detalles, variantes y precios.

**Descripción:**

Implementar el catálogo de productos de la agencia con: CRUD completo para el admin (productos con categorías jerárquicas, variantes por talla/color/material, imágenes múltiples), procesamiento automático de imágenes (conversión a WebP, thumbnails, almacenamiento en Cloudflare R2), y vista pública con grid de productos, filtros avanzados (categoría, precio, disponibilidad), búsqueda por texto y paginación.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El admin puede crear/editar/eliminar productos con: nombre, descripción, categoría, precio, variantes, imágenes | ✅ |
| AC-2 | Las categorías son jerárquicas (categoría padre → subcategoría) | ✅ |
| AC-3 | Los productos pueden tener variantes (talla, color, material) cada una con precio y stock propio | ✅ |
| AC-4 | Las imágenes se convierten automáticamente a WebP y se generan thumbnails | ✅ |
| AC-5 | Las imágenes se almacenan en Cloudflare R2 con URL optimizada | ✅ |
| AC-6 | La vista pública muestra un grid responsive de productos con imagen, nombre, precio | ✅ |
| AC-7 | Se puede filtrar por: categoría, rango de precio, disponibilidad | ✅ |
| AC-8 | La búsqueda por texto funciona sobre nombre y descripción | ✅ |
| AC-9 | La paginación carga máximo 20 productos por página | ✅ |
| AC-10 | La página de detalle muestra: imágenes, descripción, variantes, precio, botón de agregar al carrito | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-47 | CRUD de productos con categorías, variantes e imágenes | 3 | ✅ |
| MCD-48 | Procesamiento de imágenes (WebP, thumbnails, R2) | 2 | ✅ |
| MCD-49 | Vista pública con filtros, búsqueda y paginación | 2 | ✅ |

---

### US-012: Gestión de Inventario

| Campo | Valor |
|-------|-------|
| **ID** | MCD-50 |
| **Épica** | EP-07 — Inventario |
| **Sprint** | Sprint 4 (23 Feb – 8 Mar) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-011 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Administrador**, quiero controlar el inventario de material publicitario con movimientos de stock, trazabilidad y alertas automáticas de stock bajo para evitar vender productos sin existencia.

**Descripción:**

Implementar el módulo de inventario con: registro de movimientos de stock (entrada, salida, ajuste, devolución) con trazabilidad por usuario, umbrales de stock bajo configurables por producto, notificaciones automáticas a administradores cuando un producto alcanza el umbral, gestión de proveedores asociados a productos, y dashboard con tabla de movimientos filtrable.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se pueden registrar movimientos: entrada (compra), salida (venta), ajuste (corrección), devolución | ✅ |
| AC-2 | Cada movimiento registra: producto, cantidad, tipo, usuario, fecha, notas | ✅ |
| AC-3 | El stock se actualiza automáticamente al registrar un movimiento | ✅ |
| AC-4 | Se puede configurar un umbral de stock bajo por producto | ✅ |
| AC-5 | Se envía notificación al admin cuando un producto alcanza su umbral | ✅ |
| AC-6 | El dashboard de inventario muestra movimientos filtrables por tipo, producto y fecha | ✅ |
| AC-7 | Se pueden gestionar proveedores con datos de contacto y lead time | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-51 | Movimientos de stock (entrada/salida/ajuste/devolución) | 2 | ✅ |
| MCD-52 | Alertas de stock bajo con umbrales configurables | 1 | ✅ |
| MCD-53 | Dashboard de inventario con filtros | 1 | ✅ |

---

## EP-08: Carrito, Pedidos y Pagos

### US-013: Carrito de Compras y Checkout

| Campo | Valor |
|-------|-------|
| **ID** | MCD-54 |
| **Épica** | EP-08 — E-Commerce |
| **Sprint** | Sprint 5 (9 – 22 Mar) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | 🔄 En progreso |
| **Dependencias** | US-011, US-008 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Cliente**, quiero agregar productos al carrito, revisar mi selección, ingresar mi dirección de envío y completar la compra pagando con MercadoPago o PayPal para adquirir material publicitario de forma rápida y segura.

**Descripción:**

Implementar el flujo completo de e-commerce: carrito de compras persistente (por sesión para visitantes, por cuenta para clientes), modificación de cantidades, checkout con dirección de envío y resumen del pedido, integración con MercadoPago (API de preferencias + webhooks de confirmación) y PayPal (Orders API + IPN), gestión de pedidos con estados (pendiente, pagado, en preparación, enviado, entregado, cancelado), deducción automática de inventario al confirmar, y emails transaccionales de confirmación.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El usuario puede agregar productos al carrito desde el catálogo | ✅ |
| AC-2 | El carrito persiste por sesión (visitante) o por cuenta (cliente autenticado) | ✅ |
| AC-3 | Se puede modificar la cantidad o eliminar productos del carrito | ✅ |
| AC-4 | El checkout solicita dirección de envío y muestra resumen con subtotal, envío, IVA, total | ✅ |
| AC-5 | Se puede pagar con MercadoPago (redirect a checkout de MP) | ✅ |
| AC-6 | Se puede pagar con PayPal (botón de PayPal integrado) | ✅ |
| AC-7 | Al confirmar el pago, se crea un pedido automáticamente con estado "pagado" | 🔄 |
| AC-8 | El inventario se deduce automáticamente al confirmar el pedido | 🔄 |
| AC-9 | Se envía email de confirmación de pedido y de pago | ✅ |
| AC-10 | El cliente puede ver el historial y detalle de sus pedidos | ✅ |
| AC-11 | Los estados del pedido son: pendiente, pagado, en preparación, enviado, entregado, cancelado | 🔄 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-55 | Carrito de compras persistente por usuario/sesión | 2 | ✅ |
| MCD-56 | Checkout con dirección de envío y resumen | 2 | ✅ |
| MCD-57 | Integración MercadoPago (preferencias + webhooks) | 3 | ✅ |
| MCD-58 | Integración PayPal (órdenes + captura + IPN) | 3 | ✅ |
| MCD-59 | Gestión de pedidos con estados y deducción de inventario | 2 | 🔄 |
| MCD-60 | Emails transaccionales de confirmación | 1 | ✅ |

---

## EP-09: CMS y Gestión de Contenido

### US-014: Gestor de Contenido Dinámico

| Campo | Valor |
|-------|-------|
| **ID** | MCD-61 |
| **Épica** | EP-09 — CMS |
| **Sprint** | Sprint 5 (9 – 22 Mar) |
| **Prioridad** | Should Have |
| **Story Points** | 5 |
| **Estado** | 🔄 En progreso |
| **Dependencias** | US-007, US-009 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Administrador**, quiero gestionar el contenido dinámico del sitio web (hero, servicios, FAQ, testimonios) desde un panel sin necesidad de intervención técnica para mantener el sitio actualizado con información vigente.

**Descripción:**

Implementar un CMS que permita al administrador editar las secciones dinámicas del sitio: imágenes y textos del Hero, lista de servicios, preguntas frecuentes (FAQ), testimonios de clientes, y datos de contacto. Incluye editor de contenido con soporte de imágenes, preview en tiempo real y control de versiones.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El admin puede editar textos e imágenes del Hero carousel | 🔄 |
| AC-2 | El admin puede agregar/editar/eliminar servicios con ícono, título y descripción | 🔄 |
| AC-3 | El admin puede gestionar FAQs (pregunta + respuesta) | 🔄 |
| AC-4 | Los cambios se reflejan en el sitio público sin necesidad de re-deploy | 📋 |
| AC-5 | Existe preview del contenido antes de publicar | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-62 | CMS para secciones dinámicas (hero, servicios, FAQ) | 3 | 🔄 |

---

## EP-10: Chatbot e Inteligencia Artificial

### US-015: Chatbot de Atención Automatizada

| Campo | Valor |
|-------|-------|
| **ID** | MCD-63 |
| **Épica** | EP-10 — Chatbot |
| **Sprint** | Sprint 5 (9 – 22 Mar) |
| **Prioridad** | Should Have |
| **Story Points** | 5 |
| **Estado** | ✅ Completada |
| **Dependencias** | US-007 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Visitante**, quiero interactuar con un chatbot en el sitio web que responda automáticamente mis preguntas sobre servicios, precios y horarios para obtener información inmediata sin esperar a un vendedor.

**Descripción:**

Implementar un chatbot con interfaz de chat integrado en la landing page: motor de respuestas basado en intents y reglas, detección de palabras clave, respuestas contextuales sobre servicios, precios y horarios de la agencia MCD, preguntas frecuentes rápidas (FAQ quick actions), captura de datos del prospecto (nombre, email, teléfono, interés) para generar leads, y diseño responsivo con botón flotante.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El chatbot aparece como botón flotante en la esquina inferior derecha | ✅ |
| AC-2 | Al abrirlo muestra un saludo y opciones rápidas (FAQ) | ✅ |
| AC-3 | El chatbot responde preguntas sobre: servicios, precios, horarios, ubicación, contacto | ✅ |
| AC-4 | Si el chatbot no puede responder, ofrece conectar con un vendedor por WhatsApp | ✅ |
| AC-5 | El chatbot puede capturar datos del prospecto (nombre, email, interés) | ✅ |
| AC-6 | Los leads capturados se almacenan y son visibles en el panel de admin | ✅ |
| AC-7 | El chat persiste la conversación durante la sesión del navegador | ✅ |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-64 | Motor de chatbot con intents y respuestas contextuales | 3 | ✅ |
| MCD-65 | Captura de leads desde chatbot | 1 | ✅ |

---

## EP-11: Notificaciones y Analytics

### US-016: Sistema de Notificaciones

| Campo | Valor |
|-------|-------|
| **ID** | MCD-66 |
| **Épica** | EP-11 — Notificaciones |
| **Sprint** | Sprint 5 (9 – 22 Mar) |
| **Prioridad** | Should Have |
| **Story Points** | 3 |
| **Estado** | 🔄 En progreso |
| **Dependencias** | US-008 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Usuario** (cliente, vendedor o admin), quiero recibir notificaciones dentro de la aplicación y por correo electrónico sobre eventos importantes (nuevas cotizaciones, pagos, cambios de estado de pedidos) para estar siempre informado sin tener que revisar manualmente.

**Descripción:**

Implementar sistema dual de notificaciones: emails transaccionales vía Brevo (templates HTML responsivos con soporte bilingüe para cada evento del sistema) y notificaciones in-app (icono de campana en el header con badge de no leídas, panel desplegable con lista de notificaciones, marca de leído/no leído, polling periódico). Además, dashboard de analytics con métricas clave: cotizaciones por periodo, pedidos, ingresos, usuarios activos y productos más vistos.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se envían emails para: verificación, cotización creada/enviada/aceptada/rechazada, pedido confirmado, pago recibido | ✅ |
| AC-2 | Los emails usan templates HTML responsivos y son bilingües (es/en) | ✅ |
| AC-3 | Existe un icono de campana en el header que muestra badge con número de no leídas | ✅ |
| AC-4 | Al click en la campana se despliega un panel con las notificaciones recientes | ✅ |
| AC-5 | Se pueden marcar notificaciones como leídas individual y masivamente | 🔄 |
| AC-6 | El dashboard de analytics muestra: cotizaciones, pedidos, ingresos, usuarios activos | 🔄 |
| AC-7 | Las métricas se pueden filtrar por rango de fechas | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-67 | Notificaciones in-app con lectura/no leído | 2 | ✅ |
| MCD-68 | Dashboard de analytics (cotizaciones, pedidos, ingresos) | 3 | 🔄 |

---

## EP-12: Documentación Técnica

### US-017: Documentación del Sistema

| Campo | Valor |
|-------|-------|
| **ID** | MCD-69 |
| **Épica** | EP-12 — Documentación |
| **Sprint** | Sprint 6 (23 Mar – 5 Abr) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | 📋 Pendiente |
| **Dependencias** | US-010 a US-016 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Desarrollador**, quiero documentación técnica completa del sistema (arquitectura, API, código, despliegue) para facilitar el mantenimiento futuro, la incorporación de nuevos desarrolladores y la resolución de problemas.

**Descripción:**

Elaborar la documentación técnica y funcional completa: docstrings en modelos, serializers y views de Django, comentarios en componentes React/Next.js clave, actualización de ARCHITECTURE.md con diagramas de infraestructura actualizados, CHANGELOG.md con todas las fases, documentación de API (endpoints, parámetros, respuestas esperadas, códigos de error), y guía de despliegue con variables de entorno.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Todos los modelos de Django tienen docstrings descriptivos | 📋 |
| AC-2 | Las views y serializers principales tienen documentación de parámetros y respuestas | 📋 |
| AC-3 | Los componentes React clave tienen comentarios JSDoc | 📋 |
| AC-4 | ARCHITECTURE.md está actualizado con el estado final del sistema | 📋 |
| AC-5 | CHANGELOG.md refleja todas las fases de desarrollo | 📋 |
| AC-6 | Existe documentación de API con todos los endpoints | 📋 |
| AC-7 | Existe guía de despliegue reproducible (Render + Vercel) con todas las variables de entorno | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-70 | Docstrings en modelos, serializers y views de Django | 2 | 📋 |
| MCD-71 | Comentarios en componentes React/Next.js clave | 2 | 📋 |
| MCD-72 | Actualizar ARCHITECTURE.md y CHANGELOG.md | 2 | 📋 |
| MCD-73 | Documentación de API (endpoints, parámetros, respuestas) | 2 | 📋 |
| MCD-74 | Guía de despliegue con variables de entorno | 1 | 📋 |

---

## EP-13: Pruebas y QA

### US-018: Pruebas del Sistema

| Campo | Valor |
|-------|-------|
| **ID** | MCD-75 |
| **Épica** | EP-13 — QA |
| **Sprint** | Sprint 6 (23 Mar – 5 Abr) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | 📋 Pendiente |
| **Dependencias** | US-010 a US-016 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero que el sistema esté completamente probado (unitarias, integración, seguridad, rendimiento) para garantizar que funciona correctamente, es seguro y ofrece buena experiencia a los usuarios.

**Descripción:**

Ejecutar una estrategia completa de pruebas: unitarias en backend (pytest-django) y frontend (Jest + RTL), de integración E2E para flujos completos (registro → compra → pago, solicitud → cotización → aprobación), de seguridad (permisos RBAC, CSRF/XSS, validación JWT, rate limiting), de rendimiento (Lighthouse), y responsive (iOS Safari, Android Chrome, tablets).

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Cobertura de pruebas unitarias backend ≥ 70% | 📋 |
| AC-2 | Cobertura de pruebas unitarias frontend ≥ 70% | 📋 |
| AC-3 | Pruebas E2E pasan para flujos: registro, login, catálogo, carrito, pago, cotización | 📋 |
| AC-4 | Ningún rol puede acceder a recursos que no le corresponden (verified by test) | 📋 |
| AC-5 | Lighthouse Performance ≥ 80 | 📋 |
| AC-6 | Lighthouse Accessibility ≥ 90 | 📋 |
| AC-7 | El sitio es funcional en: Chrome, Firefox, Safari, Edge (desktop + mobile) | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-76 | Pruebas unitarias backend (pytest-django) | 3 | 📋 |
| MCD-77 | Pruebas unitarias frontend (Jest + RTL) | 3 | 📋 |
| MCD-78 | Pruebas de integración E2E (flujos completos) | 3 | 📋 |
| MCD-79 | Pruebas de seguridad (permisos, CSRF, XSS, JWT) | 2 | 📋 |
| MCD-80 | Auditoría Lighthouse (Performance, A11y, SEO) | 1 | 📋 |
| MCD-81 | Pruebas responsive (móvil, tablet, desktop) | 1 | 📋 |

---

### US-019: Retroalimentación y Ajustes

| Campo | Valor |
|-------|-------|
| **ID** | MCD-82 |
| **Épica** | EP-13 — QA |
| **Sprint** | Sprint 6 (23 Mar – 5 Abr) |
| **Prioridad** | Must Have |
| **Story Points** | 3 |
| **Estado** | 📋 Pendiente |
| **Dependencias** | US-018 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero revisar el sistema completo con mi equipo de ventas, dar retroalimentación sobre la usabilidad y flujos, y ver las correcciones aplicadas antes del lanzamiento oficial.

**Descripción:**

Realizar presentación del sistema al equipo de ventas y gerencia de la agencia MCD. Recopilar observaciones sobre usabilidad, flujos de trabajo y sugerencias de mejora. Aplicar correcciones de bugs y ajustes de interfaz. Validar que los cambios fueron implementados correctamente.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se realizó presentación presencial al equipo de ventas | 📋 |
| AC-2 | Se documentaron todas las observaciones y sugerencias | 📋 |
| AC-3 | Se priorizaron y aplicaron las correcciones críticas | 📋 |
| AC-4 | El equipo dio su visto bueno para proceder al despliegue | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-83 | Presentación al equipo de ventas y recopilación de feedback | 2 | 📋 |
| MCD-84 | Corrección de bugs y ajustes de usabilidad | 2 | 📋 |

---

## EP-14: Despliegue en Producción

### US-020: Puesta en Producción

| Campo | Valor |
|-------|-------|
| **ID** | MCD-85 |
| **Épica** | EP-14 — Despliegue |
| **Sprint** | Sprint 7 (6 – 24 Abr) |
| **Prioridad** | Must Have |
| **Story Points** | 8 |
| **Estado** | 📋 Pendiente |
| **Dependencias** | US-018, US-019 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero el sistema completamente funcional en producción con dominio propio, SSL, base de datos, almacenamiento en la nube, pasarelas de pago reales y monitoreo para operar el negocio digitalmente.

**Descripción:**

Desplegar el sistema completo en producción: backend en Render (Docker, PostgreSQL administrado, variables de producción), frontend en Vercel (dominio agenciamcd.mx, optimización automática), Cloudflare para DNS y SSL, bucket R2 en producción, Brevo con dominio autenticado, pasarelas de pago con credenciales reales (transacción de prueba), monitoreo con health checks y alertas, y carga del contenido real (catálogo con precios e imágenes definitivas).

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | El backend responde en `api.agenciamcd.mx` con HTTPS | 📋 |
| AC-2 | El frontend sirve en `agenciamcd.mx` con HTTPS | 📋 |
| AC-3 | La base de datos PostgreSQL está en servicio administrado con backups | 📋 |
| AC-4 | Las imágenes se sirven desde Cloudflare R2 | 📋 |
| AC-5 | Los emails se envían desde `noreply@agenciamcd.mx` con DKIM/SPF | 📋 |
| AC-6 | MercadoPago procesa un pago real de prueba exitosamente | 📋 |
| AC-7 | PayPal procesa un pago real de prueba exitosamente | 📋 |
| AC-8 | Los health checks verifican la salud del sistema cada 5 minutos | 📋 |
| AC-9 | El catálogo tiene productos reales con precios e imágenes definitivas | 📋 |
| AC-10 | El tiempo de respuesta promedio de la API es < 500ms | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-86 | Despliegue backend en Render (Docker + PostgreSQL) | 2 | 📋 |
| MCD-87 | Despliegue frontend en Vercel con dominio agenciamcd.mx | 2 | 📋 |
| MCD-88 | Configurar DNS, SSL y Cloudflare | 1 | 📋 |
| MCD-89 | Activar Cloudflare R2, Brevo y pasarelas en producción | 2 | 📋 |
| MCD-90 | Cargar catálogo real con precios e imágenes definitivas | 2 | 📋 |
| MCD-91 | Configurar monitoreo, health checks y alertas | 1 | 📋 |

---

## EP-15: Entrega y Capacitación

### US-021: Capacitación al Equipo de Ventas

| Campo | Valor |
|-------|-------|
| **ID** | MCD-92 |
| **Épica** | EP-15 — Entrega |
| **Sprint** | Sprint 7 (6 – 24 Abr) |
| **Prioridad** | Must Have |
| **Story Points** | 5 |
| **Estado** | 📋 Pendiente |
| **Dependencias** | US-020 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Vendedor** de la agencia, quiero recibir capacitación sobre cómo usar el sistema para gestionar cotizaciones, pedidos, clientes y leads de forma autónoma sin depender del equipo de desarrollo.

**Descripción:**

Sesiones de capacitación presenciales/virtuales para el equipo de la agencia, separadas por rol: vendedores (gestión de cotizaciones, seguimiento de pedidos, atención a clientes, visualización de leads del chatbot) y administradores (catálogo, inventario, CMS, gestión de usuarios, roles, reportes, auditoría). Se entrega manual de usuario con capturas de pantalla y flujos paso a paso.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se realizó sesión de capacitación para vendedores (≥ 1 hora) | 📋 |
| AC-2 | Se realizó sesión de capacitación para administradores (≥ 1 hora) | 📋 |
| AC-3 | Los vendedores pueden crear y gestionar cotizaciones de forma autónoma | 📋 |
| AC-4 | Los administradores pueden gestionar catálogo, inventario y usuarios | 📋 |
| AC-5 | Se entregó manual de usuario digital con capturas y flujos | 📋 |
| AC-6 | Las dudas del equipo fueron resueltas durante o después de la capacitación | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-93 | Sesión de capacitación a vendedores (cotizaciones, pedidos, leads) | 2 | 📋 |
| MCD-94 | Sesión de capacitación a administradores (catálogo, inventario, CMS, reportes) | 2 | 📋 |
| MCD-95 | Elaborar manual de usuario final | 2 | 📋 |

---

### US-022: Entrega Formal del Proyecto

| Campo | Valor |
|-------|-------|
| **ID** | MCD-96 |
| **Épica** | EP-15 — Entrega |
| **Sprint** | Sprint 7 (6 – 24 Abr) |
| **Prioridad** | Must Have |
| **Story Points** | 3 |
| **Estado** | 📋 Pendiente |
| **Dependencias** | US-020, US-021 |
| **Asignado a** | César Yamamoto |

**Historia de Usuario:**

> Como **Product Owner**, quiero la entrega formal del proyecto con toda la documentación, credenciales y soporte post-lanzamiento para operar el sistema de manera autónoma y tener respaldo técnico.

**Descripción:**

Cierre formal del proyecto: entrega de credenciales de todas las plataformas (Render, Vercel, Cloudflare, Brevo, MercadoPago, PayPal, PostgreSQL), documentación técnica completa, manual de usuario, verificación final del sistema con datos reales en producción, y definición de un periodo de soporte post-lanzamiento para resolución de dudas e incidencias.

**Criterios de Aceptación:**

| # | Criterio | Verificación |
|:-:|----------|:------------:|
| AC-1 | Se entregaron credenciales de: Render, Vercel, Cloudflare, Brevo, MercadoPago, PayPal, PostgreSQL | 📋 |
| AC-2 | Se entregó documentación técnica completa (ARCHITECTURE.md, CHANGELOG.md, API docs) | 📋 |
| AC-3 | Se entregó manual de usuario | 📋 |
| AC-4 | Se realizó verificación final del sistema con datos reales | 📋 |
| AC-5 | Se definió periodo de soporte post-lanzamiento | 📋 |
| AC-6 | Se firmó acta de cierre y entrega formal | 📋 |

**Tareas Técnicas:**

| ID | Tarea | SP | Estado |
|----|-------|----|--------|
| MCD-97 | Entrega de credenciales y documentación de plataformas | 1 | 📋 |
| MCD-98 | Verificación final del sistema con datos reales | 1 | 📋 |
| MCD-99 | Acta de cierre y entrega formal | 1 | 📋 |

---

## Resumen de User Stories por Sprint

| Sprint | Periodo | US | SP Total | Estado |
|--------|---------|:--:|:--------:|--------|
| Sprint 1 | 12 – 25 Ene | US-001, US-002 | 21 | ✅ |
| Sprint 2 | 26 Ene – 8 Feb | US-003, US-004, US-005 | 26 | ✅ |
| Sprint 3 | 9 – 22 Feb | US-006, US-007, US-008, US-009 | 34 | ✅ |
| Sprint 4 | 23 Feb – 8 Mar | US-010, US-011, US-012 | 34 | ✅ |
| Sprint 5 | 9 – 22 Mar | US-013, US-014, US-015, US-016 | 34 | 🔄 |
| Sprint 6 | 23 Mar – 5 Abr | US-017, US-018, US-019 | 26 | 📋 |
| Sprint 7 | 6 – 24 Abr | US-020, US-021, US-022 | 21 | 📋 |
| **Total** | | **22 User Stories** | **196 SP** | |

---

## Matriz de Trazabilidad: User Stories → Requerimientos

| User Story | Requerimiento Funcional | Módulo Django |
|------------|------------------------|---------------|
| US-001 | RF-00: Diagnóstico de procesos | — |
| US-002 | RF-00: Especificación de requerimientos | — |
| US-003 | RNF-01: Stack tecnológico | — |
| US-004 | RNF-02: Arquitectura del sistema | core |
| US-005 | RNF-03: Integraciones externas | core |
| US-006 | RF-01: Diseño de interfaces UI/UX | — |
| US-007 | RF-02: Landing page pública | content |
| US-008 | RF-03: Registro y autenticación | users |
| US-009 | RF-04: Gestión de roles RBAC | users, audit |
| US-010 | RF-05: Sistema de cotizaciones + PDF | quotes |
| US-011 | RF-06: Catálogo de productos | catalog |
| US-012 | RF-07: Gestión de inventario | inventory |
| US-013 | RF-08: Carrito, pedidos y pagos | orders, payments |
| US-014 | RF-09: CMS dinámico | content |
| US-015 | RF-10: Chatbot IA | chatbot |
| US-016 | RF-11: Notificaciones + Analytics | notifications, analytics |
| US-017 | RNF-04: Documentación técnica | — |
| US-018 | RNF-05: Pruebas y QA | — |
| US-019 | RNF-06: Retroalimentación del equipo | — |
| US-020 | RNF-07: Despliegue en producción | — |
| US-021 | RF-12: Capacitación | — |
| US-022 | RF-13: Entrega formal | — |

---

## Glosario

| Término | Definición |
|---------|-----------|
| **RBAC** | Role-Based Access Control — Control de acceso basado en roles |
| **JWT** | JSON Web Token — Token de autenticación firmado |
| **OAuth2** | Protocolo de autorización para login con terceros (Google) |
| **RFQ** | Request for Quote — Solicitud de cotización |
| **CMS** | Content Management System — Sistema de gestión de contenido |
| **API REST** | Interfaz de programación con operaciones HTTP estándar |
| **WebP** | Formato de imagen de Google con compresión superior |
| **IPN** | Instant Payment Notification — Notificación instantánea de pago (PayPal) |
| **E2E** | End-to-End — Pruebas que simulan flujos completos del usuario |
| **SP** | Story Points — Unidad de estimación de esfuerzo en Scrum |
| **MoSCoW** | Must/Should/Could/Won't — Método de priorización |
| **DoD** | Definition of Done — Criterios para considerar una tarea terminada |
