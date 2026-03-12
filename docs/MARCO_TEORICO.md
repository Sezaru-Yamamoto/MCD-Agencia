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

Una base de datos es una colección organizada de datos estructurados que permite su almacenamiento, manipulación y recuperación eficiente. Según Silberschatz et al. (2020), un sistema de gestión de bases de datos (SGBD) proporciona un entorno tanto conveniente como eficiente para almacenar y recuperar información, constituyendo la columna vertebral de cualquier sistema de información moderno. En el contexto de aplicaciones web, Elmasri y Navathe (2016) señalan que la correcta selección del modelo de datos y del motor de base de datos impacta directamente en el rendimiento, la escalabilidad y la integridad de la información del sistema.

Para el presente proyecto se emplea un esquema de múltiples motores de almacenamiento, combinando una base de datos relacional como almacén principal, un almacén en memoria para caché y colas de mensajes, y un motor ligero para desarrollo local. Esta arquitectura poliglota de persistencia permite optimizar cada capa del sistema según sus requerimientos particulares de velocidad, consistencia y volumen de datos (Sadalage & Fowler, 2013).

### 1.1 PostgreSQL (Base de datos principal)

PostgreSQL es un sistema de gestión de bases de datos objeto-relacional de código abierto (ORDBMS) con más de 35 años de desarrollo activo. Fue originalmente concebido en la Universidad de California, Berkeley, como sucesor del proyecto Ingres, con el objetivo de resolver las limitaciones de los sistemas relacionales de la época al incorporar soporte para tipos de datos complejos y extensibilidad (Stonebraker & Rowe, 1986). Según The PostgreSQL Global Development Group (2024), PostgreSQL se distingue por su conformidad con los estándares SQL (ISO/IEC 9075), su robusta integridad transaccional ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad) y su arquitectura extensible que permite la definición de tipos de datos, operadores e índices personalizados.

Obe y Hsu (2017) destacan que PostgreSQL ofrece capacidades avanzadas que lo posicionan como la opción preferida para aplicaciones empresariales: soporte nativo para JSON/JSONB, búsqueda de texto completo (*full-text search*), índices especializados (GIN, GiST, BRIN), triggers, funciones almacenadas y vistas materializadas. En el ámbito del comercio electrónico, Momjian (2001) argumenta que la capacidad de PostgreSQL para manejar consultas concurrentes complejas mediante su sistema de control de concurrencia multiversión (MVCC) lo hace especialmente adecuado para escenarios donde las operaciones de lectura y escritura ocurren simultáneamente, como en catálogos de productos, carritos de compras y procesamiento de pedidos.

| Aspecto | Detalle |
|---|---|
| **Versión** | PostgreSQL 16+ |
| **Proveedor** | Render Managed PostgreSQL (Oregon, US) |
| **Uso en el proyecto** | Almacenamiento de catálogo de productos, usuarios, cotizaciones, pedidos, pagos, conversaciones del chatbot, analíticas y contenido CMS |
| **Driver Python** | `psycopg2-binary` — adaptador de alto rendimiento para conexiones Django↔PostgreSQL |
| **Ventajas** | Soporte JSON nativo, full-text search, índices GIN/GiST, triggers, vistas materializadas |

**Justificación:** Se eligió PostgreSQL sobre otros motores relacionales por su soporte nativo de tipos JSONB —utilizado para metadata de eventos analíticos, datos de pago y configuración del chatbot—, sus índices parciales que optimizan consultas frecuentes sobre subconjuntos de datos, y su superior manejo de consultas concurrentes en escenarios de lectura/escritura mixta propios del comercio electrónico (Juba & Volkov, 2019).

### 1.2 Redis (Caché y cola de mensajes)

Redis (*Remote Dictionary Server*) es un almacén de estructuras de datos en memoria de código abierto que funciona como base de datos, caché y broker de mensajes. Carlson (2013) lo define como un servidor de estructuras de datos que almacena pares clave-valor en memoria RAM, ofreciendo latencia sub-milisegundo que lo hace ideal para escenarios donde el rendimiento es crítico. A diferencia de los sistemas de caché simples, Redis soporta estructuras de datos complejas como listas, conjuntos, conjuntos ordenados y hashes, lo que amplía significativamente sus casos de uso (DaCosta, 2015).

En el contexto de aplicaciones web modernas, Redis desempeña un papel dual: como capa de caché para reducir la carga sobre la base de datos principal, y como broker de mensajes para el procesamiento asíncrono de tareas (Macedo & Oliveira, 2020). Según Seguin (2012), la capacidad de Redis para configurar tiempos de expiración (TTL) por clave permite implementar estrategias de invalidación de caché adaptadas a la frecuencia de cambio de cada tipo de dato.

| Aspecto | Detalle |
|---|---|
| **Uso en el proyecto** | 1) Caché de respuestas frecuentes (catálogo, contexto del chatbot) vía `django-redis` — 2) Broker de tareas asíncronas con Celery (envío de emails, generación de PDFs, procesamiento de imágenes) |
| **TTL del caché** | 3600 s (contexto chatbot), configurable por tipo de dato |
| **Ventajas** | Latencia sub-milisegundo, soporte pub/sub, estructuras de datos ricas |

### 1.3 SQLite (Desarrollo local)

SQLite es un motor de base de datos relacional embebido que almacena toda la base de datos en un único archivo de disco. A diferencia de los SGBD cliente-servidor como PostgreSQL, SQLite no requiere un proceso servidor independiente, lo que lo convierte en la opción ideal para desarrollo local, prototipado y testing (Owens & Allen, 2010). Según Kreibich (2010), su diseño *serverless* y su configuración cero lo hacen particularmente útil en entornos de desarrollo donde la simplicidad operativa es prioritaria sobre la escalabilidad.

En el presente proyecto, SQLite se utiliza exclusivamente en el entorno de desarrollo local (`db.sqlite3`), mientras que PostgreSQL se emplea en producción. Django facilita esta transición mediante su capa de abstracción de base de datos (ORM), que permite cambiar el motor subyacente sin modificar el código de la aplicación (Django Software Foundation, 2024).

---

## 2. Frameworks

Un framework de desarrollo web es una estructura de software reutilizable que proporciona una arquitectura predefinida y un conjunto de herramientas para la construcción de aplicaciones. Según Sommerville (2016), los frameworks aceleran el desarrollo al ofrecer soluciones probadas para problemas recurrentes como el enrutamiento de solicitudes, la gestión de sesiones, el acceso a bases de datos y la seguridad. Pressman y Maxim (2020) añaden que la selección apropiada de un framework reduce significativamente el tiempo de desarrollo y mejora la mantenibilidad del código al imponer convenciones y patrones de diseño consistentes.

El presente proyecto emplea una arquitectura de frameworks separados para frontend y backend, conectados mediante una API REST. Este enfoque, conocido como *decoupled architecture* o arquitectura desacoplada, permite que cada capa evolucione independientemente, facilitando la escalabilidad horizontal y la especialización de los equipos de desarrollo (Fowler, 2015).

### 2.1 Django 5.x (Backend)

Django es un framework web de alto nivel para Python que fomenta el desarrollo rápido y el diseño limpio y pragmático, siguiendo el patrón arquitectónico **MTV** (Model-Template-View), una variación del patrón MVC (Model-View-Controller) descrito por Gamma et al. (1994). Según Holovaty y Kaplan-Moss (2009), Django fue diseñado originalmente en un entorno periodístico donde la velocidad de desarrollo era crítica, lo que resultó en un framework que enfatiza la convención sobre la configuración, el principio DRY (*Don't Repeat Yourself*) y la reutilización de componentes.

La Django Software Foundation (2024) describe como características distintivas del framework su ORM (*Object-Relational Mapping*) integrado para el acceso a datos, su sistema de migraciones automáticas, su panel de administración generado automáticamente, y sus mecanismos de seguridad incorporados contra las vulnerabilidades web más comunes identificadas por la OWASP (2021): inyección SQL, cross-site scripting (XSS), cross-site request forgery (CSRF) y clickjacking. Según Vincent (2022), Django ha madurado como una de las opciones más robustas para el desarrollo de APIs empresariales cuando se combina con Django REST Framework.

| Aspecto | Detalle |
|---|---|
| **Versión** | Django ≥ 5.0, < 6.0 |
| **Arquitectura** | MTV (Model-Template-View) |
| **Módulos del proyecto** | `users`, `catalog`, `quotes`, `orders`, `payments`, `chatbot`, `content`, `analytics`, `audit`, `notifications`, `inventory`, `core` (12 apps Django) |
| **ORM** | Django ORM con migraciones automáticas |
| **Administración** | Django Admin integrado para gestión de back-office |

**Justificación:** Django fue seleccionado por: a) su ORM maduro que simplifica las migraciones de esquema (Greenfeld & Greenfeld, 2020), b) su ecosistema de paquetes (DRF, allauth, storages), c) su panel de administración built-in que elimina la necesidad de construir un CMS desde cero, y d) sus mecanismos de seguridad integrados contra las vulnerabilidades identificadas por la OWASP (2021).

### 2.2 Django REST Framework (DRF)

Django REST Framework es una extensión de Django para construir APIs Web robustas y bien documentadas. Christie (2024) lo describe como un toolkit poderoso y flexible que simplifica la construcción de APIs RESTful al proporcionar serializers para la transformación bidireccional de datos, viewsets que encapsulan la lógica CRUD, y routers que generan automáticamente las URLs de la API. Según Hillar (2019), DRF implementa los principios REST (*Representational State Transfer*) propuestos originalmente por Fielding (2000) en su tesis doctoral, donde define un estilo arquitectónico basado en recursos, representaciones y transferencias de estado sin estado (*stateless*).

| Aspecto | Detalle |
|---|---|
| **Versión** | ≥ 3.14 |
| **Uso** | Todas las APIs del backend (catálogo, cotizaciones, pagos, chatbot, analytics) |
| **Documentación** | Generada automáticamente via `drf-spectacular` (OpenAPI 3.0 / Swagger) |
| **Autenticación** | JWT via `djangorestframework-simplejwt` |
| **Paginación** | `StandardPagination` personalizada (cursor + offset) |

### 2.3 Next.js 14 (Frontend)

Next.js es un framework de React que habilita renderizado del lado del servidor (SSR), generación estática (SSG) y rutas API. Desarrollado por Vercel (2024), Next.js extiende las capacidades de React al ofrecer una solución completa para la construcción de aplicaciones web modernas. Según Wieruch (2023), Next.js resuelve problemas fundamentales del desarrollo con React como el enrutamiento, la optimización del rendimiento y el SEO mediante su sistema de renderizado híbrido que permite elegir entre SSR, SSG e ISR (*Incremental Static Regeneration*) por cada ruta.

La versión 14 introdujo el *App Router*, un nuevo sistema de enrutamiento basado en el sistema de archivos que aprovecha los React Server Components propuestos por Abramov y Cataldo (2023) para ejecutar componentes en el servidor, reduciendo la cantidad de JavaScript enviada al cliente. Según Vercel (2024), esta arquitectura permite que las páginas se rendericen más rápidamente y con menor consumo de recursos en el navegador del usuario.

| Aspecto | Detalle |
|---|---|
| **Versión** | 14.1.0 |
| **Routing** | App Router (file-system based) con `[locale]` para i18n |
| **Renderizado** | Hybrid: SSR para SEO, CSR para interactividad |
| **Deploy** | Vercel (CDN global, edge functions) |
| **Optimización** | Image optimization vía `next/image` + `sharp`, code splitting automático |

**Justificación:** Next.js fue elegido sobre Create React App por: a) SSR/SSG nativo que mejora el SEO —factor crítico para una agencia de publicidad cuya presencia en motores de búsqueda es esencial (Enge et al., 2015)—, b) optimización automática de imágenes del catálogo que reduce los tiempos de carga (Google Developers, 2024), c) rutas internacionalizadas (`/es/`, `/en/`) built-in con `next-intl`, y d) deploy con zero-config en Vercel.

### 2.4 React 18

React es una biblioteca de JavaScript para la construcción de interfaces de usuario mediante componentes declarativos y un DOM virtual. Desarrollada originalmente por Facebook (Meta Platforms, 2024), React introdujo un paradigma de programación de interfaces donde la UI se describe como una función del estado de la aplicación (Gackenheimer, 2015). Según Banks y Porcello (2020), el modelo de componentes de React promueve la reutilización, la composibilidad y la separación de responsabilidades.

La versión 18 introdujo características de renderizado concurrente (*Concurrent Rendering*), incluyendo Suspense para la carga diferida de componentes y Transitions para distinguir entre actualizaciones urgentes y no urgentes de la interfaz (Meta Platforms, 2024). Según Dodds (2021), el paradigma de Hooks introducido en React 16.8 transformó fundamentalmente la forma de manejar el estado y los efectos secundarios, reemplazando los componentes de clase por funciones más simples y componibles.

| Aspecto | Detalle |
|---|---|
| **Versión** | 18.2.0 |
| **Paradigma** | Funcional con Hooks (`useState`, `useEffect`, `useRef`, custom hooks) |
| **Concurrent features** | Suspense, Transitions (React 18) |
| **Uso** | Base de todos los componentes del frontend |

### 2.5 Celery (Task Queue)

Celery es un framework de procesamiento distribuido de tareas para Python, basado en mensajería asíncrona. Según Ask Solem (2024), Celery permite ejecutar tareas de forma asíncrona y distribuida, desacoplando las operaciones costosas en tiempo del ciclo solicitud-respuesta HTTP. Fowler (2015) argumenta que este patrón de *message-driven architecture* es fundamental para la escalabilidad de aplicaciones web, ya que permite procesar operaciones como envío de correos, generación de reportes y procesamiento de imágenes sin bloquear al usuario.

| Aspecto | Detalle |
|---|---|
| **Versión** | ≥ 5.3 |
| **Broker** | Redis |
| **Scheduler** | `django-celery-beat` (tareas periódicas) |
| **Tareas** | Envío de emails de confirmación, generación de PDFs de cotización, procesamiento de imágenes de catálogo, alertas de inventario bajo |

---

## 3. Frontend

El frontend, o capa de presentación, es la parte de una aplicación web con la que el usuario interactúa directamente. Según Flanagan (2020), el desarrollo frontend moderno se basa en tres pilares tecnológicos: HTML para la estructura, CSS para la presentación y JavaScript para la interactividad. Sin embargo, la complejidad creciente de las aplicaciones web ha impulsado la adopción de lenguajes tipados como TypeScript, frameworks de estilos utilitarios como Tailwind CSS, y soluciones de internacionalización que permiten servir contenido en múltiples idiomas (Freeman, 2022).

Duckett (2014) señala que una interfaz de usuario bien diseñada no solo presenta información de manera atractiva, sino que guía al usuario a través de flujos de trabajo complejos —como formularios de cotización, procesos de compra y paneles de administración— de manera intuitiva y eficiente.

### 3.1 Lenguaje: TypeScript / JavaScript

TypeScript es un superconjunto tipado de JavaScript desarrollado por Microsoft que compila a JavaScript estándar. Según Cherny (2019), TypeScript añade un sistema de tipos estáticos opcional que permite detectar errores en tiempo de compilación, antes de que el código llegue a producción. Microsoft (2024) describe TypeScript como un lenguaje que escala la productividad del desarrollador al proporcionar autocompletado inteligente, navegación del código y refactorización segura en entornos de desarrollo integrado (IDE).

Según Freeman (2022), la adopción de TypeScript en proyectos empresariales se justifica por tres factores principales: la detección temprana de errores de tipo, la documentación implícita del código a través de las interfaces y tipos definidos, y la mejora en la colaboración entre equipos al establecer contratos claros entre módulos.

| Aspecto | Detalle |
|---|---|
| **Versión TS** | ≥ 5.3.3 |
| **Strict mode** | Habilitado (`tsconfig.json`) |
| **Target** | ES2017+ |
| **Uso** | Todo el código fuente del frontend (`.tsx`, `.ts`) |

**Ventajas en el proyecto:**
- **Detección temprana de errores** en las interfaces de datos del catálogo, cotizaciones y pagos (Cherny, 2019)
- **Autocompletado y documentación** en VS Code para >50 componentes, mejorando la productividad del desarrollador
- **Tipado de API responses** con interfaces TypeScript que reflejan los serializers de Django, creando un contrato explícito entre frontend y backend

### 3.2 Tecnologías CSS / Estilos

Tailwind CSS es un framework de utilidades CSS (*utility-first*) que permite construir interfaces mediante la composición de clases predefinidas directamente en el HTML. Según Tailwind Labs (2024), este enfoque elimina la necesidad de escribir CSS personalizado para la mayoría de los casos, reduciendo la complejidad del código y facilitando el mantenimiento. Wathan (2023) argumenta que el paradigma *utility-first* promueve la consistencia visual al limitar las opciones de estilo a un sistema de diseño predefinido, en contraste con el CSS tradicional donde cada desarrollador puede crear estilos arbitrarios.

| Tecnología | Versión | Uso |
|---|---|---|
| **Tailwind CSS** | ≥ 3.4.1 | Framework utility-first para todo el estilizado |
| **PostCSS** | ≥ 8.4.33 | Procesador CSS (requerido por Tailwind) |
| **Autoprefixer** | ≥ 10.4.17 | Prefijos de vendor automáticos |
| **clsx + tailwind-merge** | 2.1.0 / 2.2.0 | Merge condicional de clases CSS |

**Paleta CMYK personalizada:** Se definió un sistema de color basado en CMYK (`cmyk-cyan: #0DA3EF`, `cmyk-magenta: #EC2D8D`, `cmyk-yellow: #FFE884`, `cmyk-black: #0D0D0D`) que refleja la identidad visual de la agencia de publicidad e impresión, alineándose con las recomendaciones de Lupton y Phillips (2015) sobre la coherencia entre la identidad gráfica corporativa y las interfaces digitales.

### 3.3 Internacionalización (i18n)

La internacionalización (i18n) es el proceso de diseñar una aplicación para que pueda adaptarse a diferentes idiomas y regiones sin modificaciones en el código fuente. Según Esselink (2000), la internacionalización efectiva requiere la externalización de todos los textos visibles al usuario, el manejo adecuado de formatos de fecha, número y moneda, y el soporte para diferentes sistemas de escritura. En el proyecto, se implementa internacionalización bilingüe (español e inglés) mediante `next-intl`, que proporciona enrutamiento por idioma y traducción de mensajes basada en archivos JSON.

| Aspecto | Detalle |
|---|---|
| **Librería** | `next-intl` ≥ 3.4.0 |
| **Idiomas** | Español (es) e Inglés (en) |
| **Archivos** | `messages/es.json`, `messages/en.json` |
| **Routing** | `/es/catálogo`, `/en/catalog` (path-based) |

---

## 4. Backend

El backend, o capa del servidor, es el componente de una aplicación web responsable de la lógica de negocio, el acceso a datos, la autenticación y la comunicación con servicios externos. Según Holovaty y Kaplan-Moss (2009), un backend bien diseñado actúa como intermediario seguro entre el cliente (frontend) y los recursos del sistema (base de datos, servicios de terceros), implementando validaciones, autorizaciones y transformaciones de datos.

### 4.1 Lenguaje: Python

Python es un lenguaje de programación de alto nivel, interpretado, de tipado dinámico y multiparadigma. Su filosofía de diseño, expresada en el *Zen of Python* (PEP 20), enfatiza la legibilidad del código, la simplicidad y la praticidad (Van Rossum & Drake, 2009). Según Lutz (2013), Python permite expresar conceptos en significativamente menos líneas de código que lenguajes como Java o C++, lo que acelera el desarrollo y reduce la probabilidad de errores.

En el contexto del desarrollo web, Forcier et al. (2009) señalan que Python se ha consolidado como uno de los lenguajes más utilizados para el desarrollo de APIs y servicios backend, respaldado por un ecosistema maduro de frameworks (Django, Flask, FastAPI), bibliotecas científicas y herramientas de procesamiento de datos. La Python Software Foundation (2024) destaca que la comunidad de Python mantiene más de 400,000 paquetes disponibles en PyPI (*Python Package Index*), lo que facilita la integración con prácticamente cualquier servicio o tecnología externa.

| Aspecto | Detalle |
|---|---|
| **Versión** | Python 3.11+ |
| **Gestor de paquetes** | pip + requirements.txt |
| **Entorno virtual** | venv (`.venv/`) |
| **Servidor WSGI** | Gunicorn ≥ 21.2 (producción) |
| **Servidor estático** | WhiteNoise ≥ 6.6 (archivos estáticos en producción) |

### 4.2 Arquitectura del Backend

La arquitectura del backend sigue el patrón de diseño modular propuesto por Django, donde cada funcionalidad del sistema se encapsula en una "app" independiente con sus propios modelos, vistas, serializers y URLs. Según Greenfeld y Greenfeld (2020), esta organización promueve la separación de responsabilidades, la reutilización de código y la escalabilidad del proyecto.

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

La seguridad en aplicaciones web es un aspecto crítico que debe abordarse en múltiples capas. La OWASP (2021) identifica las diez vulnerabilidades más comunes en aplicaciones web, incluyendo inyección SQL, ruptura de autenticación, exposición de datos sensibles y cross-site scripting (XSS). Según Stuttard y Pinto (2018), una estrategia de seguridad efectiva combina mecanismos de defensa en profundidad: autenticación robusta, autorización granular, cifrado de datos sensibles, validación de entradas y monitoreo de actividad.

En el presente proyecto, se implementan las siguientes medidas de seguridad alineadas con las recomendaciones de la OWASP:

| Mecanismo | Implementación |
|---|---|
| **Autenticación** | JWT (access + refresh tokens) vía `djangorestframework-simplejwt`, siguiendo el estándar RFC 7519 (Jones et al., 2015) |
| **Registro social** | `django-allauth` + `dj-rest-auth` para OAuth 2.0 (Hardt, 2012) |
| **Cifrado** | `cryptography` ≥ 42.0 (tokens firmados, datos sensibles) |
| **Anti-bot** | Google reCAPTCHA v3 (formularios de cotización, registro, contacto) |
| **CORS** | `django-cors-headers` (whitelist de dominios del frontend) |
| **Auditoría** | Middleware personalizado que registra cada acción en `AuditLog`, siguiendo las prácticas de trazabilidad recomendadas por Stuttard y Pinto (2018) |

---

## 5. Librerías

En el desarrollo de software moderno, las librerías de código abierto constituyen un componente fundamental que permite reutilizar soluciones probadas en lugar de implementar cada funcionalidad desde cero. Según Sommerville (2016), la reutilización de software a través de bibliotecas reduce significativamente el tiempo de desarrollo, disminuye la tasa de defectos —al emplear código ya probado por una comunidad amplia— y permite concentrar los esfuerzos en la lógica de negocio específica del proyecto. Pressman y Maxim (2020) añaden que la selección cuidadosa de dependencias es esencial para garantizar la seguridad, el rendimiento y la mantenibilidad a largo plazo de un sistema.

El presente proyecto emplea librerías organizadas en cuatro categorías: frontend (interfaz de usuario e interactividad), backend (lógica de negocio y servicios), testing (aseguramiento de calidad) y calidad de código (estándares y consistencia).

### 5.1 Librerías Frontend (JavaScript/TypeScript)

Las librerías del frontend abordan cuatro áreas clave identificadas por Wieruch (2023): gestión de estado, formularios y validación, experiencia de usuario (animaciones, notificaciones) y comunicación con el servidor.

| Librería | Versión | Propósito |
|---|---|---|
| **@tanstack/react-query** | ≥ 5.17.0 | Gestión de estado del servidor, caché de peticiones API, sincronización automática. Implementa el patrón *stale-while-revalidate* para optimizar la percepción de velocidad (Dodds, 2021). |
| **zustand** | ≥ 4.4.7 | Estado global ligero (carrito, UI state). Alternativa minimalista a Redux con ~1KB, siguiendo el principio de mínima complejidad necesaria. |
| **react-hook-form** | ≥ 7.49.3 | Formularios de alto rendimiento con validación. Maneja el formulario de cotización multi-paso (~15 campos) sin rerenders innecesarios. |
| **zod** | ≥ 3.22.4 | Validación de esquemas *TypeScript-first*. Define y valida la estructura de datos de cotizaciones, implementando validación defensiva tanto en cliente como servidor (Cherny, 2019). |
| **@hookform/resolvers** | ≥ 3.3.3 | Bridge entre react-hook-form y zod para validación declarativa. |
| **framer-motion** | ≥ 10.18.0 | Animaciones declarativas (transiciones de página, scroll reveal, parallax shifts). |
| **next-auth** | ≥ 4.24.5 | Autenticación en Next.js (sesiones, JWT, providers OAuth). Implementa los flujos de autorización definidos en OAuth 2.0 (Hardt, 2012). |
| **next-intl** | ≥ 3.4.0 | Internacionalización: routing por locale, traducción de mensajes, formateo de fechas/números (Esselink, 2000). |
| **axios** | ≥ 1.6.5 | Cliente HTTP con interceptores (attach JWT, refresh automático, manejo global de errores). |
| **leaflet** | ≥ 1.9.4 | Mapas interactivos (ubicación de sucursales). Usa tiles de OpenStreetMap como alternativa gratuita a Google Maps. |
| **embla-carousel-react** | ≥ 8.0.0 | Carrusel del hero (slides de portafolio, testimonios). Lightweight, touch-friendly. |
| **date-fns** | ≥ 3.2.0 | Manipulación de fechas (formato de fechas de cotización, pedidos, entregas). |
| **sharp** | ≥ 0.33.2 | Optimización de imágenes en build-time (WebP, resize). Usado por `next/image` para cumplir las métricas Core Web Vitals (Google Developers, 2024). |
| **react-hot-toast** | ≥ 2.4.1 | Notificaciones toast (confirmación de cotización, errores, éxito de pago). |
| **lucide-react** | ≥ 0.562.0 | Biblioteca de íconos SVG (800+ íconos consistentes en todo el UI). |
| **@headlessui/react** | ≥ 1.7.18 | Componentes UI accesibles e *unstyled* (modals, dropdowns, tabs). Implementa las directrices WCAG 2.1 de accesibilidad (W3C, 2018). |
| **@heroicons/react** | ≥ 2.1.1 | Íconos SVG de Tailwind Labs (complemento a Lucide). |

### 5.2 Librerías Backend (Python)

Las librerías del backend cubren las capas de acceso a datos, almacenamiento, generación de documentos, comunicación externa y monitoreo, siguiendo las recomendaciones de arquitectura en capas de Greenfeld y Greenfeld (2020).

| Librería | Versión | Propósito |
|---|---|---|
| **psycopg2-binary** | ≥ 2.9 | Driver PostgreSQL de alto rendimiento para Django ORM. Implementa el protocolo nativo de PostgreSQL para máxima eficiencia (Obe & Hsu, 2017). |
| **dj-database-url** | ≥ 2.1 | Parseo de URLs de base de datos desde variables de entorno (`DATABASE_URL`). Facilita la portabilidad entre entornos siguiendo los principios de *twelve-factor app* (Wiggins, 2017). |
| **django-redis** | ≥ 5.4 | Backend de caché Redis para Django (sesiones, caché de consultas, contexto chatbot). |
| **boto3 + django-storages** | ≥ 1.34 / ≥ 1.14 | Almacenamiento de archivos en S3/R2 (imágenes de catálogo, PDFs de cotización). |
| **weasyprint** | ≥ 60.0 | Generación de PDFs desde HTML/CSS (cotizaciones formales con diseño corporativo). |
| **reportlab** | ≥ 4.0 | Generación programática de PDFs (reportes, facturas). |
| **openpyxl** | ≥ 3.1 | Exportación de datos a Excel (reportes de ventas, inventario, analytics). |
| **Pillow** | ≥ 10.2 | Procesamiento de imágenes (resize, thumbnails, optimización de catálogo). |
| **django-anymail** | ≥ 10.2 | Envío de emails transaccionales vía proveedores (SendGrid/Mailgun). Abstrae la complejidad de múltiples APIs de correo. |
| **drf-spectacular** | ≥ 0.27 | Documentación OpenAPI 3.0 automática (Swagger UI + ReDoc). Implementa la especificación OpenAPI Initiative (2024). |
| **django-mptt** | ≥ 0.16 | Árboles jerárquicos eficientes (categorías de catálogo anidadas). Implementa el algoritmo *Modified Preorder Tree Traversal* (Celko, 2012). |
| **django-import-export** | ≥ 3.3 | Import/export masivo de datos vía Django Admin (Excel/CSV). |
| **django-filter** | ≥ 23.5 | Filtros declarativos para vistas DRF (búsqueda, ordenamiento, facetas). |
| **python-slugify** | ≥ 8.0 | Generación de slugs URL-friendly para productos y categorías. |
| **sentry-sdk** | ≥ 1.39 | Monitoreo de errores en producción (captura excepciones, traza performance). |
| **python-json-logger** | ≥ 2.0 | Logs estructurados en JSON (integración con servicios de monitoreo). |
| **google-genai** | ≥ 1.0 | SDK oficial de Google Generative AI (integración con Gemini). |

### 5.3 Librerías de Testing

Las pruebas de software son esenciales para garantizar la calidad y prevenir regresiones. Según Myers et al. (2011), las pruebas deben organizarse en múltiples niveles: unitarias, de integración y de sistema. El uso de frameworks de testing automatizado permite ejecutar estas pruebas de forma continua y repetible.

| Librería | Propósito |
|---|---|
| **pytest + pytest-django** | Framework de testing del backend. Según Okken (2022), pytest simplifica la escritura de pruebas mediante fixtures, parametrización y plugins. |
| **pytest-cov** | Cobertura de código — permite medir qué porcentaje del código es ejercitado por las pruebas |
| **factory-boy** | Generación de datos de prueba (fixtures) mediante el patrón Factory, evitando la creación manual de objetos de prueba |
| **Jest + @testing-library/react** | Testing del frontend (unit + integration). Según Dodds (2021), Testing Library promueve pruebas que simulan la interacción real del usuario |

### 5.4 Librerías de Calidad de Código

Según Martin (2009), el código limpio no solo funciona correctamente sino que es legible, mantenible y sigue convenciones consistentes. Las herramientas de linting y formateo automatizado garantizan la adherencia a estándares de codificación en todo el proyecto.

| Librería | Propósito |
|---|---|
| **ESLint + eslint-config-next** | Linting del frontend — análisis estático que detecta patrones problemáticos en JavaScript/TypeScript |
| **Prettier** | Formateo automático de código frontend — garantiza estilo consistente sin debates sobre formato |
| **Black** | Formateo de código Python — "el formateador sin opiniones" que elimina discusiones de estilo (Python Software Foundation, 2024) |
| **Flake8** | Linting de Python — verifica conformidad con PEP 8 (guía de estilo oficial de Python) |
| **isort** | Ordenamiento de imports Python — organización automática siguiendo convenciones estándar |
| **mypy + django-stubs** | Tipado estático de Python — verificación de tipos en tiempo de desarrollo similar a TypeScript |

---

## 6. APIs

Una API (*Application Programming Interface*) es un conjunto de protocolos y herramientas que permite la comunicación entre componentes de software. Según Fielding (2000), la arquitectura REST (*Representational State Transfer*) define un estilo arquitectónico para sistemas distribuidos basado en recursos identificados por URIs, representaciones en formatos estándar (JSON, XML) y operaciones uniformes (GET, POST, PUT, DELETE). Richardson y Ruby (2007) complementan esta definición señalando que una API RESTful bien diseñada debe ser autodescriptiva, sin estado (*stateless*) y navegable mediante hipervínculos (*HATEOAS*).

En el contexto del proyecto, las APIs cumplen dos funciones: las **APIs propias** exponen la funcionalidad del backend al frontend, mientras que las **APIs externas** integran servicios de terceros como pagos, inteligencia artificial y almacenamiento en la nube. Según Lauret (2019), el diseño de APIs debe priorizar la consistencia, la seguridad y la documentación clara.

### 6.1 APIs Propias (Backend Django REST)

El backend expone una API RESTful completa bajo el prefijo `/api/v1/`, siguiendo las convenciones de versionado de API recomendadas por Massé (2012) para garantizar la compatibilidad hacia atrás cuando se introducen cambios:

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

**Documentación:** Swagger UI disponible en `/api/v1/docs/` (generada con `drf-spectacular`), cumpliendo con la especificación OpenAPI 3.0 (OpenAPI Initiative, 2024).

### 6.2 APIs Externas Consumidas

La integración con servicios externos es una práctica fundamental en el desarrollo de aplicaciones web modernas. Según Jacobson et al. (2012), las APIs permiten componer funcionalidades complejas a partir de servicios especializados, evitando la necesidad de implementar cada capacidad desde cero. A continuación se describen las APIs externas integradas en la plataforma.

#### 6.2.1 Google Gemini API (Inteligencia Artificial)

Los modelos de lenguaje grande (LLM) representan un avance significativo en el procesamiento del lenguaje natural. Según Vaswani et al. (2017), la arquitectura Transformer que subyace a estos modelos revolucionó el campo al introducir mecanismos de atención que permiten procesar secuencias de texto de forma paralela y capturar dependencias a larga distancia. Google DeepMind (2024) describe Gemini como una familia de modelos multimodales que pueden comprender y generar texto, código, imágenes y audio.

| Aspecto | Detalle |
|---|---|
| **Servicio** | Google Generative AI — Gemini 2.0 Flash |
| **SDK** | `google-genai` ≥ 1.0 (Python) |
| **Límite gratuito** | 1,500 solicitudes/día |
| **Uso** | Motor de IA del chatbot: genera respuestas contextualizadas sobre productos, precios, servicios y sucursales de la agencia |
| **Información contextual** | El chatbot recibe contexto dinámico construido desde la base de datos (catálogo, FAQs, sucursales) actualizado cada hora |

#### 6.2.2 MercadoPago API (Pagos - Latinoamérica)

El comercio electrónico requiere pasarelas de pago que procesen transacciones de forma segura y confiable. Según Laudon y Traver (2021), una pasarela de pago actúa como intermediario entre el comerciante y las instituciones financieras, encriptando la información sensible y gestionando el flujo de autorización y liquidación.

| Aspecto | Detalle |
|---|---|
| **Tipo** | REST API + Webhooks |
| **Funcionalidad** | Procesamiento de pagos con tarjetas de crédito/débito, OXXO (efectivo), transferencia bancaria |
| **Flujo** | Backend crea "preferencia de pago" → usuario redirigido a checkout → webhook notifica resultado |
| **Seguridad** | Webhooks verificados con firma HMAC, cumpliendo estándares PCI DSS (PCI Security Standards Council, 2022) |

#### 6.2.3 PayPal API (Pagos - Internacional)

PayPal proporciona una plataforma de pagos internacionales ampliamente reconocida que facilita transacciones transfronterizas. Según Laudon y Traver (2021), la inclusión de múltiples métodos de pago incrementa las tasas de conversión al ofrecer al usuario su método preferido.

| Aspecto | Detalle |
|---|---|
| **Tipo** | REST API v2 + Webhooks |
| **Funcionalidad** | Pagos internacionales con cuenta PayPal o tarjeta |
| **Flujo** | Crear orden → aprobar en PayPal → capturar pago → webhook de confirmación |

#### 6.2.4 Google reCAPTCHA v3 API (Seguridad)

La protección contra bots y spam es esencial para mantener la integridad de los formularios web. Según la OWASP (2021), los mecanismos CAPTCHA constituyen una capa de defensa contra ataques automatizados como el *credential stuffing* y el envío masivo de formularios.

| Aspecto | Detalle |
|---|---|
| **Tipo** | JavaScript API (frontend) + REST API (verificación backend) |
| **Versión** | v3 (invisible, basada en score) |
| **Uso** | Protección anti-bot en: formulario de cotización, registro de usuario, contacto |
| **Flujo** | Frontend ejecuta `grecaptcha.execute()` → obtiene token → lo envía al backend → backend verifica con Google y obtiene score (0.0–1.0) |

#### 6.2.5 OpenStreetMap / Leaflet API (Mapas)

OpenStreetMap (OSM) es un proyecto colaborativo para crear un mapa editable y libre del mundo. Según Haklay y Weber (2008), OSM constituye el ejemplo más exitoso de *geographic information volunteered*, proporcionando datos cartográficos de calidad comparable a fuentes comerciales.

| Aspecto | Detalle |
|---|---|
| **Tipo** | Tile server (mapas) + JavaScript API (Leaflet) |
| **Uso** | 1) Mapa interactivo para selección de rutas de entrega, 2) Visualización de ubicación de sucursales |
| **Tiles** | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| **Ventaja** | Gratuito y sin límite de uso (a diferencia de Google Maps) |

#### 6.2.6 WhatsApp Business (Comunicación directa)

WhatsApp Business es una herramienta de comunicación empresarial que permite a las organizaciones interactuar con sus clientes de forma directa. Según Kaplan y Haenlein (2010), las plataformas de mensajería instantánea se han convertido en un canal fundamental para la atención al cliente y la generación de leads en el comercio electrónico.

| Aspecto | Detalle |
|---|---|
| **Tipo** | Deep links (`https://wa.me/527446887382`) |
| **Uso** | Escalación del chatbot a atención humana, botón flotante de contacto en landing page |
| **Sucursales** | Acapulco: +52 744 688 7382 / Tecoanapa: +52 745 114 7727 |

#### 6.2.7 Amazon S3 / Cloudflare R2 API (Almacenamiento)

El almacenamiento de objetos en la nube es el estándar para la gestión de archivos en aplicaciones web modernas. Según Velte et al. (2010), los servicios de almacenamiento en la nube ofrecen durabilidad, disponibilidad y escalabilidad que superan significativamente a las soluciones de almacenamiento local, eliminando la necesidad de gestionar infraestructura de almacenamiento propia.

| Aspecto | Detalle |
|---|---|
| **SDK** | `boto3` (Python) + `django-storages` |
| **Uso** | Almacenamiento de imágenes de catálogo, PDFs generados de cotizaciones, archivos adjuntos |
| **Operaciones** | Upload, download, presigned URLs, lifecycle policies |

#### 6.2.8 Email Service API (Transaccional)

El correo electrónico transaccional se refiere a mensajes automatizados disparados por acciones específicas del usuario. Según Chaffey y Ellis-Chadwick (2019), los emails transaccionales tienen tasas de apertura significativamente superiores a los emails de marketing (>60% vs. ~20%), lo que los convierte en un canal de comunicación crítico para la experiencia del usuario.

| Aspecto | Detalle |
|---|---|
| **Librería** | `django-anymail` (abstracción multi-proveedor) |
| **Proveedores compatibles** | Brevo, SendGrid, Mailgun, Amazon SES |
| **Uso** | Emails de confirmación de cotización, notificación de pago, bienvenida, recuperación de contraseña |
| **Templates** | HTML con Django templates (`templates/emails/`) |

---

## 7. Chatbot

### 7.1 Definición y Contexto

Un chatbot es un programa informático diseñado para simular conversación humana mediante texto o voz. Según Adamopoulou y Moussiades (2020), los chatbots han evolucionado desde sistemas basados en reglas simples —como ELIZA, desarrollado por Weizenbaum (1966) en el MIT— hasta agentes conversacionales impulsados por modelos de lenguaje grande (LLM) capaces de generar respuestas contextualizadas que van más allá de los patrones predefinidos.

Jurafsky y Martin (2023) clasifican los sistemas de diálogo en dos categorías principales: *task-oriented* (orientados a tareas), diseñados para ayudar al usuario a cumplir un objetivo específico como reservar un vuelo o solicitar una cotización, y *open-domain* (dominio abierto), capaces de mantener conversaciones sobre cualquier tema. El chatbot del presente proyecto se clasifica como un sistema *task-oriented* con capacidades de dominio abierto limitado, ya que su función principal es asistir al usuario en la consulta de servicios, precios y la captación de datos de contacto.

Dale (2016) señala que la integración de chatbots en plataformas de comercio electrónico ofrece múltiples beneficios: disponibilidad 24/7, reducción de costos operativos de atención al cliente, captación automatizada de leads y mejora en la experiencia del usuario al proporcionar respuestas inmediatas.

### 7.2 Arquitectura del Chatbot MCD

El chatbot de la plataforma MCD implementa una **arquitectura de servicio pluggable** basada en el patrón Strategy descrito por Gamma et al. (1994), donde la selección del motor de respuestas (IA o reglas) se realiza en tiempo de ejecución según la disponibilidad de recursos:

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

El modelo Gemini 2.0 Flash, desarrollado por Google DeepMind (2024), pertenece a la familia de modelos multimodales basados en la arquitectura Transformer (Vaswani et al., 2017). Según Google DeepMind (2024), la variante Flash está optimizada para velocidad de inferencia manteniendo capacidades de razonamiento avanzadas, lo que lo hace adecuado para aplicaciones de chatbot donde la latencia de respuesta impacta directamente en la experiencia del usuario.

- **Modelo:** `gemini-2.0-flash` — modelo optimizado para velocidad con capacidades multimodales
- **System prompt:** Instruido como asistente de la agencia MCD, con reglas de tono profesional, límite de 2-3 oraciones por respuesta, prohibición de inventar información. Según Brown et al. (2020), el *prompt engineering* es una técnica fundamental para dirigir el comportamiento de los LLM
- **Contexto dinámico:** Cada 1 hora se reconstruye desde la base de datos el contexto del negocio (categorías, productos con precio, sucursales con horarios, FAQs), implementando el patrón *Retrieval-Augmented Generation* (RAG) descrito por Lewis et al. (2020)
- **Escalación:** Si el chatbot detecta baja confianza o el usuario solicita atención humana, sugiere contactar por WhatsApp

### 7.4 Gestión de Leads

El chatbot funciona como canal de captación de leads. Según Kotler y Keller (2016), un lead es un prospecto que ha expresado interés en los productos o servicios de una empresa y ha proporcionado datos de contacto. La gestión automatizada de leads a través de chatbots permite cualificar prospectos en tiempo real y priorizarlos según su nivel de interés.

| Campo | Descripción |
|---|---|
| **Datos capturados** | Nombre, email, teléfono, empresa, fuente (orgánico, WhatsApp, web) |
| **Estados del lead** | `new` → `contacted` → `qualified` → `proposal` → `won` / `lost` |
| **UTM tracking** | Captura parámetros UTM (source, medium, campaign) para atribución de marketing (Chaffey & Ellis-Chadwick, 2019) |
| **Scoring** | Prioridad basada en interacciones y datos proporcionados |

### 7.5 Tipos de Chatbot (Marco Teórico)

Según Adamopoulou y Moussiades (2020), los chatbots pueden clasificarse según su mecanismo de generación de respuestas:

| Tipo | Descripción | Ejemplo en MCD |
|---|---|---|
| **Basado en reglas** | Responde con patrones if/then predefinidos. Limitado a escenarios anticipados (Weizenbaum, 1966) | `FallbackService` (greeting, quote keywords) |
| **Basado en IA/NLP** | Usa modelos de lenguaje para comprender la intención del usuario y generar respuestas naturales (Jurafsky & Martin, 2023) | `GeminiService` (comprensión semántica) |
| **Híbrido** | Combina reglas para acciones rápidas + IA para consultas complejas. Según Dale (2016), este enfoque maximiza la confiabilidad para tareas conocidas sin sacrificar la flexibilidad | Arquitectura actual: acciones rápidas predefinidas + Gemini para diálogo libre |

---

## 8. Publicidad

### 8.1 Contexto: Agencia de Publicidad Digital

La Agencia MCD es una agencia de publicidad e impresión ubicada en Guerrero, México, con sucursales en Acapulco (Diamante y Costa Azul) y Tecoanapa. La plataforma digital se desarrolla como herramienta de **transformación digital** para complementar y potenciar sus operaciones publicitarias tradicionales.

Según Porter y Heppelmann (2014), la transformación digital implica la integración de tecnología digital en todas las áreas de un negocio, cambiando fundamentalmente la forma en que opera y entrega valor a sus clientes. En el caso de una agencia de publicidad, Chaffey y Ellis-Chadwick (2019) señalan que la transición hacia canales digitales no reemplaza los servicios tradicionales, sino que los complementa creando un modelo de negocio omnicanal que amplía el alcance y mejora la eficiencia operativa.

### 8.2 Marketing Digital Implementado en la Plataforma

#### 8.2.1 SEO (Search Engine Optimization)

La optimización para motores de búsqueda (SEO) es el proceso de mejorar la visibilidad de un sitio web en los resultados orgánicos de los buscadores. Según Enge et al. (2015), el SEO moderno se fundamenta en tres pilares: SEO técnico (velocidad, estructura, crawleabilidad), SEO on-page (contenido, keywords, metadatos) y SEO off-page (backlinks, autoridad de dominio).

Google Developers (2024) define las métricas Core Web Vitals —Largest Contentful Paint (LCP), First Input Delay (FID) y Cumulative Layout Shift (CLS)— como factores de ranking que miden la experiencia real del usuario. La arquitectura SSR/SSG de Next.js contribuye directamente a estas métricas al generar HTML completo en el servidor.

| Estrategia | Implementación |
|---|---|
| **Server-Side Rendering** | Next.js SSR/SSG genera HTML completo que los crawlers pueden indexar (Wieruch, 2023) |
| **SEO Models** | Modelo base `SEOModel` en Django que agrega `meta_title`, `meta_description`, `meta_keywords` a contenido CMS |
| **Rutas semánticas** | URLs con slugs descriptivos (`/es/catalogo/impresion-gran-formato`), siguiendo las recomendaciones de Enge et al. (2015) |
| **Internacionalización** | Contenido en español e inglés con `hreflang` tags |
| **Open Graph** | Metadatos para compartir en redes sociales, optimizando la visibilidad social (Chaffey & Ellis-Chadwick, 2019) |

#### 8.2.2 Analítica Web (Analytics Propio)

La analítica web es la medición, recopilación, análisis y reporte de datos de internet con el propósito de entender y optimizar el uso de un sitio web. Según Kaushik (2010), la analítica web efectiva no solo mide el tráfico, sino que proporciona insights accionables sobre el comportamiento del usuario, la efectividad de las campañas y las oportunidades de mejora.

La plataforma implementa un **sistema de analítica propio** (sin dependencia de Google Analytics), lo que garantiza el control total sobre los datos y el cumplimiento de regulaciones de privacidad:

| Componente | Detalle |
|---|---|
| **PageView tracking** | Cada visita registra: URL, referrer, UTM params, dispositivo, IP, duración |
| **Event tracking** | Eventos personalizados: clics en CTA, pasos del formulario de cotización, scroll depth |
| **Session tracking** | Sesiones anónimas por cookie, vinculación con usuario autenticado |
| **Dashboard** | Endpoint `GET /api/v1/analytics/summary/` con estadísticas agregadas |
| **Device detection** | Clasificación automática: desktop / tablet / mobile |
| **UTM Attribution** | Captura source, medium, campaign para medir ROI de campañas (Chaffey & Ellis-Chadwick, 2019) |

#### 8.2.3 Lead Generation (Generación de Prospectos)

La generación de leads es el proceso de atraer y convertir visitantes en prospectos interesados en los productos o servicios de una empresa. Según Kotler y Keller (2016), un embudo de conversión efectivo debe ofrecer múltiples puntos de contacto y reducir la fricción en cada etapa del viaje del cliente.

| Canal | Mecanismo |
|---|---|
| **Formulario de cotización** | Formulario multi-paso en landing page con selección de productos, cantidades, archivos adjuntos, selección de ruta de entrega |
| **Chatbot** | Captura datos de contacto durante la conversación, integrado con modelo `Lead` (Dale, 2016) |
| **WhatsApp** | Botones de contacto directo con enlaces preformateados (Kaplan & Haenlein, 2010) |
| **CTAs estratégicos** | Botones "Cotiza ya" y "Comprar" posicionados en header y barra flotante, siguiendo principios de diseño persuasivo (Cialdini, 2007) |

#### 8.2.4 CMS (Content Management System)

Un sistema de gestión de contenidos (CMS) permite crear, gestionar y modificar contenido digital sin necesidad de conocimientos técnicos especializados. Según Barker (2016), un CMS efectivo democratiza la gestión del contenido web, permitiendo que el equipo de marketing actualice el sitio sin intervención del equipo de desarrollo.

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

El email transaccional se distingue del email de marketing masivo en que es disparado por una acción específica del usuario y contiene información personalizada y relevante. Según Chaffey y Ellis-Chadwick (2019), los emails transaccionales generan hasta 8 veces más apertura y 6 veces más clics que los emails promocionales, representando una oportunidad clave para reforzar la relación con el cliente.

| Tipo de email | Trigger |
|---|---|
| **Confirmación de cotización** | Al enviar formulario de cotización |
| **Actualización de estado** | Cambio de estado de cotización/pedido |
| **Confirmación de pago** | Pago exitoso vía MercadoPago/PayPal |
| **Bienvenida** | Registro de nuevo usuario |
| **Recuperación de contraseña** | Solicitud de reset |

### 8.3 Publicidad Tradicional vs. Digital (Marco Conceptual)

Según Kotler y Keller (2016), la publicidad ha experimentado una transformación fundamental con la migración hacia canales digitales, aunque los medios tradicionales siguen siendo relevantes para ciertos segmentos y contextos. Chaffey y Ellis-Chadwick (2019) argumentan que la ventaja principal de la publicidad digital radica en su mensurabilidad: cada interacción puede ser rastreada, medida y optimizada en tiempo real.

| Aspecto | Publicidad Tradicional | Publicidad Digital |
|---|---|---|
| **Alcance** | Geográfico limitado | Global, segmentado |
| **Medición** | Difícil de cuantificar | Métricas en tiempo real (CTR, conversiones) (Kaushik, 2010) |
| **Costo** | Alto costo fijo (impresión, distribución) | Costo variable, escalable |
| **Interactividad** | Unidireccional | Bidireccional (chatbot, formularios, redes) |
| **Personalización** | Masiva, genérica | Segmentada por comportamiento y demographics |
| **Tiempo** | Semanas de producción | Cambios en minutos (CMS) (Barker, 2016) |

**Relevancia para la agencia MCD:** La plataforma digital permite a la agencia ofrecer a sus clientes no solo servicios de impresión tradicional, sino también presencia digital, catálogo en línea, cotización instantánea y seguimiento de pedidos — transformando un negocio presencial en un modelo omnicanal. Según Porter y Heppelmann (2014), esta combinación de canales físicos y digitales crea ventajas competitivas difíciles de replicar.

### 8.4 Métricas de Publicidad Digital

Según Kaushik (2010), la medición efectiva del rendimiento digital requiere métricas alineadas con los objetivos del negocio. Las métricas implementadas en la plataforma MCD cubren las tres fases del embudo de conversión: adquisición (atraer visitantes), comportamiento (interacción con el sitio) y conversión (generación de leads y ventas).

| Métrica | Fuente en MCD | Descripción |
|---|---|---|
| **Page Views** | `analytics.PageView` | Visitas por página, tendencias temporales |
| **Session Duration** | `duration_ms` | Tiempo promedio en la plataforma |
| **Bounce Rate** | Sesiones con 1 sola pageview | Porcentaje de visitas que abandonan inmediatamente |
| **Conversion Rate** | Cotizaciones / Visitas totales | Efectividad del embudo de ventas |
| **Lead Sources** | `Lead.source`, UTM params | Canal de adquisición de cada prospecto (Chaffey & Ellis-Chadwick, 2019) |
| **CTA Click Rate** | `TrackEvent` (event_name=cta_click) | Efectividad de botones de llamada a la acción |
| **Chat Engagement** | Mensajes/sesión, escalaciones | Uso y utilidad del chatbot |

---

## Referencias Bibliográficas

- Abramov, D., & Cataldo, J. (2023). React Server Components. *React RFC*. https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md
- Adamopoulou, E., & Moussiades, L. (2020). An Overview of Chatbot Technology. *IFIP International Conference on Artificial Intelligence Applications and Innovations*, 373-383. https://doi.org/10.1007/978-3-030-49186-4_31
- Ask Solem. (2024). *Celery: Distributed Task Queue*. https://docs.celeryq.dev/
- Banks, A., & Porcello, E. (2020). *Learning React: Modern Patterns for Developing React Apps* (2a ed.). O'Reilly Media.
- Barker, D. (2016). *Web Content Management: Systems, Features, and Best Practices*. O'Reilly Media.
- Brown, T. B., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., ... & Amodei, D. (2020). Language Models are Few-Shot Learners. *Advances in Neural Information Processing Systems*, 33, 1877-1901.
- Carlson, J. L. (2013). *Redis in Action*. Manning Publications.
- Celko, J. (2012). *Joe Celko's Trees and Hierarchies in SQL for Smarties* (2a ed.). Morgan Kaufmann.
- Chaffey, D., & Ellis-Chadwick, F. (2019). *Digital Marketing: Strategy, Implementation and Practice* (7a ed.). Pearson Education.
- Cherny, B. (2019). *Programming TypeScript: Making Your JavaScript Applications Scale*. O'Reilly Media.
- Christie, T. (2024). *Django REST Framework*. https://www.django-rest-framework.org/
- Cialdini, R. B. (2007). *Influence: The Psychology of Persuasion* (ed. revisada). Harper Business.
- DaCosta, M. (2015). *Redis Essentials*. Packt Publishing.
- Dale, R. (2016). The Return of the Chatbots. *Natural Language Engineering*, 22(5), 811-817. https://doi.org/10.1017/S1351324916000243
- Django Software Foundation. (2024). *Django Documentation*. https://docs.djangoproject.com/
- Dodds, K. C. (2021). *Testing JavaScript Applications*. Manning Publications.
- Duckett, J. (2014). *HTML and CSS: Design and Build Websites*. John Wiley & Sons.
- Elmasri, R., & Navathe, S. B. (2016). *Fundamentals of Database Systems* (7a ed.). Pearson Education.
- Enge, E., Spencer, S., & Stricchiola, J. C. (2015). *The Art of SEO: Mastering Search Engine Optimization* (3a ed.). O'Reilly Media.
- Esselink, B. (2000). *A Practical Guide to Localization*. John Benjamins Publishing.
- Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* [Tesis doctoral, University of California, Irvine]. https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
- Flanagan, D. (2020). *JavaScript: The Definitive Guide* (7a ed.). O'Reilly Media.
- Forcier, J., Bissex, P., & Chun, W. J. (2009). *Python Web Development with Django*. Addison-Wesley.
- Fowler, M. (2015). *Patterns of Enterprise Application Architecture*. Addison-Wesley.
- Freeman, A. (2022). *Essential TypeScript 5* (3a ed.). Apress.
- Gackenheimer, C. (2015). *Introduction to React*. Apress.
- Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley.
- Google DeepMind. (2024). *Gemini: A Family of Highly Capable Multimodal Models*. https://deepmind.google/technologies/gemini/
- Google Developers. (2024). *Web Vitals*. https://web.dev/vitals/
- Greenfeld, D. R., & Greenfeld, A. R. (2020). *Two Scoops of Django 3.x: Best Practices for the Django Web Framework*. Two Scoops Press.
- Haklay, M., & Weber, P. (2008). OpenStreetMap: User-Generated Street Maps. *IEEE Pervasive Computing*, 7(4), 12-18. https://doi.org/10.1109/MPRV.2008.80
- Hardt, D. (2012). *The OAuth 2.0 Authorization Framework*. RFC 6749. Internet Engineering Task Force. https://tools.ietf.org/html/rfc6749
- Hillar, G. C. (2019). *Django RESTful Web Services*. Packt Publishing.
- Holovaty, A., & Kaplan-Moss, J. (2009). *The Definitive Guide to Django: Web Development Done Right* (2a ed.). Apress.
- Jacobson, D., Brail, G., & Woods, D. (2012). *APIs: A Strategy Guide*. O'Reilly Media.
- Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)*. RFC 7519. Internet Engineering Task Force. https://tools.ietf.org/html/rfc7519
- Juba, S., & Volkov, A. (2019). *Learning PostgreSQL 12* (4a ed.). Packt Publishing.
- Jurafsky, D., & Martin, J. H. (2023). *Speech and Language Processing* (3a ed., borrador en línea). Stanford University. https://web.stanford.edu/~jurafsky/slp3/
- Kaplan, A. M., & Haenlein, M. (2010). Users of the World, Unite! The Challenges and Opportunities of Social Media. *Business Horizons*, 53(1), 59-68. https://doi.org/10.1016/j.bushor.2009.09.003
- Kaushik, A. (2010). *Web Analytics 2.0: The Art of Online Accountability and Science of Customer Centricity*. Sybex (Wiley).
- Kotler, P., & Keller, K. L. (2016). *Marketing Management* (15a ed.). Pearson Education.
- Kreibich, J. A. (2010). *Using SQLite*. O'Reilly Media.
- Laudon, K. C., & Traver, C. G. (2021). *E-Commerce 2021-2022: Business, Technology and Society* (17a ed.). Pearson Education.
- Lauret, A. (2019). *The Design of Web APIs*. Manning Publications.
- Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., ... & Kiela, D. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems*, 33, 9459-9474.
- Lupton, E., & Phillips, J. C. (2015). *Graphic Design: The New Basics* (2a ed.). Princeton Architectural Press.
- Lutz, M. (2013). *Learning Python* (5a ed.). O'Reilly Media.
- Macedo, T., & Oliveira, R. (2020). Redis Architecture and Design Patterns. En *Handbook of Research on Software Engineering Innovation*. IGI Global.
- Martin, R. C. (2009). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall.
- Massé, M. (2012). *REST API Design Rulebook*. O'Reilly Media.
- Meta Platforms. (2024). *React — A JavaScript library for building user interfaces*. https://react.dev/
- Microsoft. (2024). *TypeScript Documentation*. https://www.typescriptlang.org/docs/
- Momjian, B. (2001). *PostgreSQL: Introduction and Concepts*. Addison-Wesley.
- Myers, G. J., Sandler, C., & Badgett, T. (2011). *The Art of Software Testing* (3a ed.). John Wiley & Sons.
- Obe, R. O., & Hsu, L. S. (2017). *PostgreSQL: Up and Running* (3a ed.). O'Reilly Media.
- Okken, B. (2022). *Python Testing with pytest* (2a ed.). Pragmatic Bookshelf.
- OpenAPI Initiative. (2024). *OpenAPI Specification v3.1.0*. https://spec.openapis.org/oas/v3.1.0
- OWASP. (2021). *OWASP Top Ten Web Application Security Risks*. https://owasp.org/www-project-top-ten/
- Owens, M., & Allen, G. (2010). *The Definitive Guide to SQLite* (2a ed.). Apress.
- PCI Security Standards Council. (2022). *Payment Card Industry Data Security Standard (PCI DSS) v4.0*. https://www.pcisecuritystandards.org/
- Porter, M. E., & Heppelmann, J. E. (2014). How Smart, Connected Products Are Transforming Competition. *Harvard Business Review*, 92(11), 64-88.
- Pressman, R. S., & Maxim, B. R. (2020). *Software Engineering: A Practitioner's Approach* (9a ed.). McGraw-Hill Education.
- Python Software Foundation. (2024). *Python 3 Documentation*. https://docs.python.org/3/
- Richardson, L., & Ruby, S. (2007). *RESTful Web Services*. O'Reilly Media.
- Sadalage, P. J., & Fowler, M. (2013). *NoSQL Distilled: A Brief Guide to the Emerging World of Polyglot Persistence*. Addison-Wesley.
- Seguin, K. (2012). *The Little Redis Book*. https://openmymind.net/redis.pdf
- Silberschatz, A., Korth, H. F., & Sudarshan, S. (2020). *Database System Concepts* (7a ed.). McGraw-Hill Education.
- Sommerville, I. (2016). *Software Engineering* (10a ed.). Pearson Education.
- Stonebraker, M., & Rowe, L. A. (1986). The Design of POSTGRES. *ACM SIGMOD Record*, 15(2), 340-355. https://doi.org/10.1145/16856.16888
- Stuttard, D., & Pinto, M. (2018). *The Web Application Hacker's Handbook* (2a ed.). Wiley.
- Tailwind Labs. (2024). *Tailwind CSS Documentation*. https://tailwindcss.com/docs/
- The PostgreSQL Global Development Group. (2024). *PostgreSQL 16 Documentation*. https://www.postgresql.org/docs/16/
- Van Rossum, G., & Drake, F. L. (2009). *Python 3 Reference Manual*. CreateSpace.
- Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems*, 30, 5998-6008.
- Velte, T., Velte, A., & Elsenpeter, R. (2010). *Cloud Computing: A Practical Approach*. McGraw-Hill.
- Vercel. (2024). *Next.js Documentation*. https://nextjs.org/docs
- Vincent, W. S. (2022). *Django for APIs: Build Web APIs with Python and Django* (4a ed.). Still River Press.
- W3C. (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*. https://www.w3.org/TR/WCAG21/
- Wathan, A. (2023). *Tailwind CSS: From Zero to Production*. Tailwind Labs.
- Weizenbaum, J. (1966). ELIZA — A Computer Program for the Study of Natural Language Communication Between Man and Machine. *Communications of the ACM*, 9(1), 36-45. https://doi.org/10.1145/365153.365168
- Wieruch, R. (2023). *The Road to React* (ed. 2023). https://www.roadtoreact.com/
- Wiggins, A. (2017). *The Twelve-Factor App*. https://12factor.net/

---

> **Nota:** Este documento constituye el capítulo de Marco Teórico del documento académico.
> Cada sección corresponde a un nodo del mapa conceptual del proyecto.
> Todas las referencias siguen el formato APA 7ª edición.
> Para exportar a Word: `pandoc MARCO_TEORICO.md -o MARCO_TEORICO.docx --reference-doc=plantilla.docx`
