# Planificación de Sprints — MCD-Agencia

**Proyecto**: Sistema Web para Agencia de Publicidad MCD  
**Metodología**: Scrum (adaptado)  
**Duración del Sprint**: 2 semanas (excepto Sprint 7: ~3 semanas)  
**Total de Sprints**: 7  
**Periodo**: 12 de enero – 24 de abril de 2026 (15 semanas)  
**Product Owner**: Agencia MCD  
**Scrum Master / Developer**: César Alejandro Yamamoto Herrera  

---

## Resumen de Sprints

| Sprint | Periodo | Semanas | Objetivo | Estado | Story Points |
|--------|---------|---------|----------|--------|:------------:|
| Sprint 1 | 12 – 25 Ene | S1–S2 | Análisis y Requerimientos | ✅ Completado | 21 |
| Sprint 2 | 26 Ene – 8 Feb | S3–S4 | Arquitectura y Diseño Técnico | ✅ Completado | 26 |
| Sprint 3 | 9 – 22 Feb | S5–S6 | UI/UX y Sitio Público | ✅ Completado | 34 |
| Sprint 4 | 23 Feb – 8 Mar | S7–S8 | Cotizaciones y Catálogo | ✅ Completado | 34 |
| Sprint 5 | 9 – 22 Mar | S9–S10 | E-Commerce y Módulos Complementarios | 🔄 En progreso | 34 |
| Sprint 6 | 23 Mar – 5 Abr | S11–S12 | Documentación y Pruebas | 📋 Pendiente | 26 |
| Sprint 7 | 6 – 24 Abr | S13–S15 | Despliegue, Entrega y Capacitación | 📋 Pendiente | 21 |
| | | | **Total** | | **196** |

---

## Product Backlog (Épicas)

| ID | Épica | Sprints |
|----|-------|---------|
| EP-01 | Análisis de procesos y requerimientos | 1 |
| EP-02 | Arquitectura, herramientas y diseño técnico | 2 |
| EP-03 | Diseño UI/UX e interfaces | 2–3 |
| EP-04 | Landing page y sitio público | 3 |
| EP-05 | Autenticación y gestión de usuarios | 3 |
| EP-06 | Sistema de cotizaciones y PDF | 4 |
| EP-07 | Catálogo de productos e inventario | 4 |
| EP-08 | Carrito, pedidos y pagos | 5 |
| EP-09 | CMS, chatbot y notificaciones | 5 |
| EP-10 | Documentación técnica y funcional | 6 |
| EP-11 | Pruebas y QA | 6 |
| EP-12 | Despliegue en producción | 7 |
| EP-13 | Entrega y capacitación | 7 |

---

## Sprint 1 — Análisis y Requerimientos

**Periodo**: 12 – 25 de enero de 2026 (S1–S2)  
**Sprint Goal**: Comprender los procesos actuales de la agencia MCD y definir los requerimientos del sistema para establecer un alcance claro del proyecto.  
**Estado**: ✅ Completado  
**Velocidad**: 21 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-1 | 📖 Story | Como PO, quiero un diagnóstico de los procesos manuales actuales para identificar qué digitalizar | 5 | ✅ Done |
| MCD-2 | 📋 Task | Entrevistar al equipo de ventas sobre flujo de cotizaciones actual | 3 | ✅ Done |
| MCD-3 | 📋 Task | Documentar proceso de control de inventario manual | 2 | ✅ Done |
| MCD-4 | 📋 Task | Mapear proceso de atención a clientes y prospectos | 2 | ✅ Done |
| MCD-5 | 📖 Story | Como PO, quiero un documento de requerimientos funcionales y no funcionales para alinear expectativas | 5 | ✅ Done |
| MCD-6 | 📋 Task | Definir casos de uso principales del sistema | 2 | ✅ Done |
| MCD-7 | 📋 Task | Documentar reglas de negocio por módulo | 2 | ✅ Done |

### Definition of Done
- [x] Documento de diagnóstico entregado y revisado
- [x] Especificación de requerimientos aprobada por el Product Owner
- [x] Alcance del proyecto definido y acordado

### Sprint Review
**Fecha**: 25 de enero de 2026  
**Resultado**: Se completaron todas las historias planificadas. Se identificaron 11 módulos necesarios y se documentaron los requerimientos funcionales y no funcionales del sistema completo.

---

## Sprint 2 — Arquitectura y Diseño Técnico

**Periodo**: 26 de enero – 8 de febrero de 2026 (S3–S4)  
**Sprint Goal**: Definir la arquitectura técnica, seleccionar las herramientas de desarrollo y diseñar la base de datos y las integraciones con servicios externos.  
**Estado**: ✅ Completado  
**Velocidad**: 26 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-8 | 📖 Story | Como desarrollador, quiero un stack tecnológico definido y justificado para iniciar la implementación | 5 | ✅ Done |
| MCD-9 | 📋 Task | Evaluar frameworks frontend (Next.js vs Nuxt vs Remix) | 2 | ✅ Done |
| MCD-10 | 📋 Task | Evaluar frameworks backend (Django vs FastAPI vs Express) | 2 | ✅ Done |
| MCD-11 | 📋 Task | Documentar stack seleccionado con justificación | 1 | ✅ Done |
| MCD-12 | 📖 Story | Como desarrollador, quiero la arquitectura del sistema definida para estructurar el código correctamente | 8 | ✅ Done |
| MCD-13 | 📋 Task | Diseñar modelo entidad-relación de la base de datos | 3 | ✅ Done |
| MCD-14 | 📋 Task | Definir endpoints RESTful por módulo | 2 | ✅ Done |
| MCD-15 | 📋 Task | Diseñar esquema de autenticación JWT + OAuth2 | 2 | ✅ Done |
| MCD-16 | 📖 Story | Como desarrollador, quiero un plan de integraciones externas para implementarlas de forma ordenada | 5 | ✅ Done |
| MCD-17 | 📋 Task | Diseñar integración con Brevo (email transaccional) | 1 | ✅ Done |
| MCD-18 | 📋 Task | Diseñar integración con Cloudflare R2 (almacenamiento) | 1 | ✅ Done |
| MCD-19 | 📋 Task | Diseñar integración con MercadoPago y PayPal | 2 | ✅ Done |
| MCD-20 | 📋 Task | Diseñar integración con Google OAuth | 1 | ✅ Done |
| MCD-21 | 📋 Task | Configurar repositorio Git, Docker y entornos dev/prod | 3 | ✅ Done |

### Definition of Done
- [x] Documento de arquitectura (ARCHITECTURE.md) creado
- [x] Modelo E-R diseñado y validado
- [x] Repositorio configurado con estructura de proyecto
- [x] Docker Compose funcional para desarrollo local
- [x] Entornos de despliegue configurados (Render + Vercel)

### Sprint Review
**Fecha**: 8 de febrero de 2026  
**Resultado**: Arquitectura completa definida. Stack seleccionado: Next.js 14 + Django 5 + PostgreSQL. 11 apps Django modeladas. Repositorio funcional con Docker, CI/CD configurado en Render y Vercel. Integraciones documentadas con diagramas de secuencia.

---

## Sprint 3 — UI/UX y Sitio Público

**Periodo**: 9 – 22 de febrero de 2026 (S5–S6)  
**Sprint Goal**: Diseñar las interfaces de usuario del sistema e implementar el sitio web público (landing page) y el sistema de autenticación con roles.  
**Estado**: ✅ Completado  
**Velocidad**: 34 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-22 | 📖 Story | Como visitante, quiero ver una landing page profesional para conocer los servicios de la agencia | 8 | ✅ Done |
| MCD-23 | 📋 Task | Diseñar wireframes de interfaces principales | 3 | ✅ Done |
| MCD-24 | 📋 Task | Implementar Hero section con carrusel de servicios | 3 | ✅ Done |
| MCD-25 | 📋 Task | Implementar sección de portafolio (coverflow) | 2 | ✅ Done |
| MCD-26 | 📋 Task | Implementar sección de clientes y testimonios | 2 | ✅ Done |
| MCD-27 | 📋 Task | Implementar formulario de cotización en landing | 2 | ✅ Done |
| MCD-28 | 📋 Task | Implementar mapa de ubicaciones y footer | 1 | ✅ Done |
| MCD-29 | 📋 Task | Implementar header flotante con glass morphism | 2 | ✅ Done |
| MCD-30 | 📋 Task | Agregar animaciones de scroll (parallax, reveal) | 2 | ✅ Done |
| MCD-31 | 📋 Task | Implementar botones sticky (Cotizar, WhatsApp, Chat) | 1 | ✅ Done |
| MCD-32 | 📖 Story | Como visitante, quiero registrarme y verificar mi correo para acceder al sistema | 5 | ✅ Done |
| MCD-33 | 📋 Task | Implementar registro con validación y verificación email | 3 | ✅ Done |
| MCD-34 | 📋 Task | Implementar login JWT con refresh + Google OAuth | 3 | ✅ Done |
| MCD-35 | 📖 Story | Como admin, quiero gestionar roles (admin/vendedor/cliente) para controlar accesos | 3 | ✅ Done |
| MCD-36 | 📋 Task | Implementar RBAC con permisos por endpoint | 2 | ✅ Done |
| MCD-37 | 📋 Task | Implementar perfil de usuario editable | 1 | ✅ Done |
| MCD-38 | 📋 Task | Soporte de internacionalización español/inglés | 2 | ✅ Done |

### Definition of Done
- [x] Landing page desplegada y responsiva en todos los dispositivos
- [x] Sistema de registro + verificación de correo funcional
- [x] Login con JWT y Google OAuth operativo
- [x] Roles admin/vendedor/cliente con permisos correctos
- [x] Middleware de auditoría registrando acciones

### Sprint Review
**Fecha**: 22 de febrero de 2026  
**Resultado**: Landing page completa con hero carousel, portafolio, clientes, formulario de cotización, ubicaciones, footer, header flotante, animaciones de scroll y botones sticky. Sistema de autenticación JWT + Google OAuth funcional con roles RBAC. Internacionalización es/en implementada.

---

## Sprint 4 — Cotizaciones y Catálogo

**Periodo**: 23 de febrero – 8 de marzo de 2026 (S7–S8)  
**Sprint Goal**: Implementar el sistema completo de cotizaciones con generación de PDF y el catálogo de productos con gestión de inventario.  
**Estado**: ✅ Completado  
**Velocidad**: 34 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-39 | 📖 Story | Como cliente, quiero solicitar una cotización en línea para recibir una propuesta de servicios | 8 | ✅ Done |
| MCD-40 | 📋 Task | Formulario de solicitud con adjuntos y tipo de servicio | 3 | ✅ Done |
| MCD-41 | 📋 Task | Panel de gestión de cotizaciones para vendedor/admin | 3 | ✅ Done |
| MCD-42 | 📋 Task | Versionamiento de cotizaciones y solicitudes de cambio | 3 | ✅ Done |
| MCD-43 | 📋 Task | Generación de PDF profesional con ReportLab | 3 | ✅ Done |
| MCD-44 | 📋 Task | URL pública firmada para vista/aprobación sin login | 2 | ✅ Done |
| MCD-45 | 📋 Task | Notificaciones email en cada cambio de estado | 1 | ✅ Done |
| MCD-46 | 📖 Story | Como visitante, quiero explorar un catálogo de productos con filtros para encontrar lo que necesito | 8 | ✅ Done |
| MCD-47 | 📋 Task | CRUD de productos con categorías, variantes e imágenes | 3 | ✅ Done |
| MCD-48 | 📋 Task | Procesamiento de imágenes (WebP, thumbnails, R2) | 2 | ✅ Done |
| MCD-49 | 📋 Task | Vista pública con filtros, búsqueda y paginación | 2 | ✅ Done |
| MCD-50 | 📖 Story | Como admin, quiero controlar el inventario para evitar vender productos sin stock | 5 | ✅ Done |
| MCD-51 | 📋 Task | Movimientos de stock (entrada/salida/ajuste/devolución) | 2 | ✅ Done |
| MCD-52 | 📋 Task | Alertas de stock bajo con umbrales configurables | 1 | ✅ Done |
| MCD-53 | 📋 Task | Dashboard de inventario con filtros | 1 | ✅ Done |

### Definition of Done
- [x] Cotizaciones: flujo completo solicitud → creación → aprobación/rechazo
- [x] PDF generado correctamente con datos de la cotización
- [x] Catálogo público con filtros y búsqueda funcional
- [x] Inventario con trazabilidad de movimientos
- [x] Alertas de stock bajo enviadas correctamente

### Sprint Review
**Fecha**: 8 de marzo de 2026  
**Resultado**: Sistema de cotizaciones completo con versionamiento, solicitudes de cambio, generación de PDF y URL pública firmada. Catálogo con imágenes optimizadas en WebP, filtros y búsqueda. Inventario con movimientos de stock y alertas configurables.

---

## Sprint 5 — E-Commerce y Módulos Complementarios

**Periodo**: 9 – 22 de marzo de 2026 (S9–S10)  
**Sprint Goal**: Implementar el flujo de compra completo (carrito → pedido → pago) con MercadoPago/PayPal, junto con el CMS, chatbot y sistema de notificaciones.  
**Estado**: 🔄 En progreso  
**Velocidad planificada**: 34 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-54 | 📖 Story | Como cliente, quiero agregar productos al carrito y completar una compra en línea | 8 | � In Progress |
| MCD-55 | 📋 Task | Carrito de compras persistente por usuario/sesión | 2 | ✅ Done |
| MCD-56 | 📋 Task | Checkout con dirección de envío y resumen | 2 | ✅ Done |
| MCD-57 | 📋 Task | Integración MercadoPago (preferencias + webhooks) | 3 | ✅ Done |
| MCD-58 | 📋 Task | Integración PayPal (órdenes + captura + IPN) | 3 | ✅ Done |
| MCD-59 | 📋 Task | Gestión de pedidos con estados y deducción de inventario | 2 | 🔄 In Progress |
| MCD-60 | 📋 Task | Emails transaccionales de confirmación | 1 | ✅ Done |
| MCD-61 | 📖 Story | Como admin, quiero gestionar el contenido del sitio sin tocar código | 5 | 🔄 In Progress |
| MCD-62 | 📋 Task | CMS para secciones dinámicas (hero, servicios, FAQ) | 3 | 🔄 In Progress |
| MCD-63 | 📖 Story | Como visitante, quiero un chatbot que responda mis dudas automáticamente | 5 | ✅ Done |
| MCD-64 | 📋 Task | Motor de chatbot con intents y respuestas contextuales | 3 | ✅ Done |
| MCD-65 | 📋 Task | Captura de leads desde chatbot | 1 | ✅ Done |
| MCD-66 | 📖 Story | Como usuario, quiero recibir notificaciones de eventos importantes del sistema | 3 | 🔄 In Progress |
| MCD-67 | 📋 Task | Notificaciones in-app con lectura/no leído | 2 | ✅ Done |
| MCD-68 | 📋 Task | Dashboard de analytics (cotizaciones, pedidos, ingresos) | 3 | 🔄 In Progress |

### Definition of Done
- [ ] Flujo carrito → checkout → pago funcional (sandbox)
- [ ] MercadoPago y PayPal procesando pagos correctamente
- [ ] CMS permitiendo editar contenido del sitio
- [ ] Chatbot respondiendo preguntas frecuentes
- [ ] Notificaciones email e in-app operativas

---

## Sprint 6 — Documentación y Pruebas

**Periodo**: 23 de marzo – 5 de abril de 2026 (S11–S12)  
**Sprint Goal**: Completar la documentación técnica/funcional del sistema y ejecutar pruebas unitarias, de integración, seguridad y rendimiento.  
**Estado**: 📋 Pendiente  
**Velocidad planificada**: 26 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-69 | 📖 Story | Como desarrollador, quiero documentación técnica completa para facilitar el mantenimiento | 8 | 📋 To Do |
| MCD-70 | 📋 Task | Docstrings en modelos, serializers y views de Django | 2 | 📋 To Do |
| MCD-71 | 📋 Task | Comentarios en componentes React/Next.js clave | 2 | 📋 To Do |
| MCD-72 | 📋 Task | Actualizar ARCHITECTURE.md y CHANGELOG.md | 2 | 📋 To Do |
| MCD-73 | 📋 Task | Documentación de API (endpoints, parámetros, respuestas) | 2 | 📋 To Do |
| MCD-74 | 📋 Task | Guía de despliegue con variables de entorno | 1 | 📋 To Do |
| MCD-75 | 📖 Story | Como PO, quiero que el sistema esté probado para garantizar calidad | 8 | 📋 To Do |
| MCD-76 | 📋 Task | Pruebas unitarias backend (pytest-django) | 3 | 📋 To Do |
| MCD-77 | 📋 Task | Pruebas unitarias frontend (Jest + RTL) | 3 | 📋 To Do |
| MCD-78 | 📋 Task | Pruebas de integración E2E (flujos completos) | 3 | 📋 To Do |
| MCD-79 | 📋 Task | Pruebas de seguridad (permisos, CSRF, XSS, JWT) | 2 | 📋 To Do |
| MCD-80 | 📋 Task | Auditoría Lighthouse (Performance, A11y, SEO) | 1 | 📋 To Do |
| MCD-81 | 📋 Task | Pruebas responsive (móvil, tablet, desktop) | 1 | 📋 To Do |
| MCD-82 | 📖 Story | Como PO, quiero revisar el sistema y dar retroalimentación antes del lanzamiento | 3 | 📋 To Do |
| MCD-83 | 📋 Task | Presentación al equipo de ventas y recopilación de feedback | 2 | 📋 To Do |
| MCD-84 | 📋 Task | Corrección de bugs y ajustes de usabilidad | 2 | 📋 To Do |

### Definition of Done
- [ ] Cobertura de pruebas unitarias ≥ 70% (backend y frontend)
- [ ] Pruebas E2E pasando para flujos críticos
- [ ] Lighthouse: Performance ≥ 80, Accessibility ≥ 90
- [ ] Documentación completa y actualizada
- [ ] Feedback del equipo recopilado y aplicado

---

## Sprint 7 — Despliegue, Entrega y Capacitación

**Periodo**: 6 – 24 de abril de 2026 (S13–S15, ~3 semanas)  
**Sprint Goal**: Desplegar el sistema en producción con configuración completa, realizar la entrega formal y capacitar al equipo de la agencia.  
**Estado**: 📋 Pendiente  
**Velocidad planificada**: 21 SP

### Sprint Backlog

| ID | Tipo | Historia / Tarea | SP | Estado |
|----|------|-------------------|:--:|--------|
| MCD-85 | 📖 Story | Como PO, quiero el sistema funcionando en producción con dominio propio y pagos reales | 8 | 📋 To Do |
| MCD-86 | 📋 Task | Despliegue backend en Render (Docker + PostgreSQL) | 2 | 📋 To Do |
| MCD-87 | 📋 Task | Despliegue frontend en Vercel con dominio agenciamcd.mx | 2 | 📋 To Do |
| MCD-88 | 📋 Task | Configurar DNS, SSL y Cloudflare | 1 | 📋 To Do |
| MCD-89 | 📋 Task | Activar Cloudflare R2, Brevo y pasarelas en producción | 2 | 📋 To Do |
| MCD-90 | 📋 Task | Cargar catálogo real con precios e imágenes definitivas | 2 | 📋 To Do |
| MCD-91 | 📋 Task | Configurar monitoreo, health checks y alertas | 1 | 📋 To Do |
| MCD-92 | 📖 Story | Como equipo de ventas, quiero capacitación para operar el sistema de forma autónoma | 5 | 📋 To Do |
| MCD-93 | 📋 Task | Sesión de capacitación a vendedores (cotizaciones, pedidos, leads) | 2 | 📋 To Do |
| MCD-94 | 📋 Task | Sesión de capacitación a administradores (catálogo, inventario, CMS, reportes) | 2 | 📋 To Do |
| MCD-95 | 📋 Task | Elaborar manual de usuario final | 2 | 📋 To Do |
| MCD-96 | 📖 Story | Como PO, quiero la entrega formal del proyecto con toda la documentación | 3 | 📋 To Do |
| MCD-97 | 📋 Task | Entrega de credenciales y documentación de plataformas | 1 | 📋 To Do |
| MCD-98 | 📋 Task | Verificación final del sistema con datos reales | 1 | 📋 To Do |
| MCD-99 | 📋 Task | Acta de cierre y entrega formal | 1 | 📋 To Do |

### Definition of Done
- [ ] Sistema accesible en agenciamcd.mx con SSL
- [ ] Pagos reales procesándose correctamente
- [ ] Equipo de ventas y administración capacitado
- [ ] Manual de usuario entregado
- [ ] Acta de cierre firmada

---

## Métricas del Proyecto

### Burndown Chart (estimado)

| Sprint | SP Planificados | SP Completados | SP Restantes |
|--------|:---------------:|:--------------:|:------------:|
| Sprint 1 | 21 | 21 | 175 |
| Sprint 2 | 26 | 26 | 149 |
| Sprint 3 | 34 | 34 | 115 |
| Sprint 4 | 34 | 34 | 81 |
| Sprint 5 | 34 | — | — |
| Sprint 6 | 26 | — | — |
| Sprint 7 | 21 | — | — |

### Velocidad Promedio
- Sprint 1: 21 SP
- Sprint 2: 26 SP
- Sprint 3: 34 SP
- Sprint 4: 34 SP
- **Promedio**: 28.75 SP/sprint

---

## Ceremonias Scrum

| Ceremonia | Frecuencia | Duración | Día |
|-----------|------------|----------|-----|
| Sprint Planning | Cada 2 semanas | 1-2 horas | Primer día del sprint |
| Daily Standup | Diaria | 15 min | Lunes a viernes |
| Sprint Review | Cada 2 semanas | 1 hora | Último día del sprint |
| Sprint Retrospective | Cada 2 semanas | 30 min | Último día del sprint |
| Backlog Refinement | Semanal | 30 min | Miércoles |

---

## Guía de Configuración en Jira

### Paso 1: Crear cuenta y proyecto

1. Ve a [https://www.atlassian.com/software/jira/free](https://www.atlassian.com/software/jira/free) y crea una cuenta gratuita
2. Crea un sitio (ej. `mcd-agencia.atlassian.net`)
3. Crea un nuevo proyecto:
   - **Nombre**: MCD-Agencia
   - **Clave**: MCD
   - **Tipo**: Scrum (Software development → Scrum board)

### Paso 2: Configurar el tablero

1. Ve a **Project Settings → Board → Columns**
2. Configura las columnas:
   - **To Do** (📋)
   - **In Progress** (🔄)
   - **In Review** (🔍) — opcional
   - **Done** (✅)

### Paso 3: Crear las Épicas

1. Ve a **Backlog → + Create Epic**
2. Crea las 13 épicas listadas en la tabla "Product Backlog (Épicas)" de este documento
3. Asigna un color diferente a cada una para distinguirlas visualmente

### Paso 4: Crear los Sprints

1. En **Backlog**, haz click en **"Create sprint"** para crear los 7 sprints
2. Renómbralos: "Sprint 1 — Análisis y Requerimientos", etc.
3. Asigna fechas de inicio y fin según la tabla de este documento

### Paso 5: Crear las historias y tareas

Para cada sprint, crea las historias de usuario (`📖 Story`) y las tareas (`📋 Task`):

1. Click en **"+ Create issue"** dentro de cada sprint
2. **Tipo**: Story o Task
3. **Resumen**: El texto de la columna "Historia / Tarea"
4. **Story Points**: El número de la columna SP  
   *(Para habilitarlos: Project Settings → Features → Estimation → Story Points)*
5. **Épica**: Vincula a la épica correspondiente
6. **Labels**: Puedes usar etiquetas como `frontend`, `backend`, `diseño`, `docs`, `testing`

### Paso 6: Completar sprints pasados

Para Sprint 1 y Sprint 2 (ya completados):
1. Mueve todas sus tareas a la columna **Done**
2. Click en **"Complete sprint"** para cerrarlos
3. Esto generará los reportes de velocidad automáticamente

### Paso 7: Iniciar Sprint 3

1. Mueve las tareas completadas de Sprint 3 a **Done**
2. Las tareas pendientes déjalas en **To Do** o **In Progress**
3. Click en **"Start sprint"** con las fechas 12–25 Mar

### Paso 8: Reportes automáticos

Una vez configurado, Jira genera automáticamente:
- **Burndown Chart**: Progreso por sprint (Board → Reports → Burndown)
- **Velocity Chart**: SP completados por sprint (Board → Reports → Velocity)
- **Sprint Report**: Resumen de cada sprint completado
- **Cumulative Flow Diagram**: Flujo de tareas a lo largo del tiempo

---

## Tips para Jira

- **Descripción de Stories**: Usa el formato "Como [rol], quiero [funcionalidad] para [beneficio]"
- **Subtareas**: Las Tasks pueden ser subtareas de una Story (click en la story → Add child issue)
- **Filtros JQL**: Usa `project = MCD AND sprint = "Sprint 3" AND status = "In Progress"` para filtrar
- **Etiquetas recomendadas**: `frontend`, `backend`, `api`, `database`, `design`, `docs`, `testing`, `deploy`
- **Prioridades**: Usa Highest → Lowest para ordenar el backlog
- **Screenshots**: Adjunta capturas de pantalla a las tareas para documentar el progreso visual
