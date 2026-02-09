# Cronograma de Desarrollo — MCD-Agencia

**Periodo**: 12 de febrero – 24 de abril de 2026 (10 semanas)  
**Metodología**: Sprints semanales con entregables definidos  
**Equipo**: Desarrollo full-stack (1 desarrollador + IA asistente)

---

## Estado Actual del Proyecto (al 9 de febrero 2026)

| Módulo | Avance | Estado |
|--------|--------|--------|
| Landing page / Sitio público | 95% | ✅ Producción |
| Autenticación / Usuarios / Roles | 95% | ✅ Producción |
| Sistema de cotizaciones (RFQ) | 95% | ✅ Producción |
| Catálogo de productos | 90% | ✅ Producción |
| CMS / Gestión de contenido | 90% | ✅ Producción |
| Sistema de notificaciones | 85% | ✅ Producción (polling) |
| Auditoría | 90% | ✅ Producción |
| Analytics | 85% | ✅ Producción |
| Carrito + Pedidos | 85% | ⚠️ Frontend listo, falta integrar pagos |
| Pagos (MercadoPago + PayPal) | 80% | ⚠️ Servicios codificados, no conectados |
| Inventario | 70% | ⚠️ Backend completo, sin dashboard frontend |
| Chatbot / Leads | 60% | ⚠️ Reglas básicas, sin IA |
| Testing automatizado | 0% | ❌ Sin tests |
| CI/CD | 0% | ❌ Sin pipeline |
| Dashboard de pagos (admin) | 0% | ❌ Sin iniciar |
| i18n completo | 70% | ⚠️ Strings hardcodeados en español |

---

## Diagrama General (10 semanas)

```
SEMANA    1     2     3     4     5     6     7     8     9    10
        Feb12 Feb19 Feb26 Mar05 Mar12 Mar19 Mar26 Apr02 Apr09 Apr16  Apr24
        ──────────────────────────────────────────────────────────────────
SPRINT 1 ████████████                                              Pagos + Carrito
SPRINT 2             ████████████                                  Inventario + Pagos Admin
SPRINT 3                          ████████████                     Testing + CI/CD
SPRINT 4                                       ████████████        Chatbot + i18n + Polish
SPRINT 5                                                    ██████ QA Final + Lanzamiento
        ──────────────────────────────────────────────────────────────────
```

---

## Sprint 1 — Pagos y Flujo de Compra (12 – 25 Feb)

> **Objetivo**: Completar el flujo e-commerce de punta a punta (carrito → checkout → pago → confirmación).

### Semana 1 (12 – 18 Feb)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Mi 12 | Conectar servicios de pago al ViewSet | Reemplazar stubs en `PaymentViewSet.create()` con llamadas reales a `MercadoPagoService` y `PayPalService` | 🔴 Alta |
| Ju 13 | MercadoPago sandbox end-to-end | Crear preferencia → redirect → webhook → confirmar pago. Probar con tarjetas de prueba de MP | 🔴 Alta |
| Vi 14 | PayPal sandbox end-to-end | Crear orden → redirect → capturar → webhook → confirmar. Probar con cuenta sandbox PayPal | 🔴 Alta |
| Sá 15 | Webhooks robustos | Verificar firmas HMAC (MP) y certificados (PayPal). Retry logic. Logging. | 🔴 Alta |
| Do 16 | Frontend checkout integración | Conectar `checkout/page.tsx` con endpoints reales. Probar flujo completo con ambos proveedores | 🔴 Alta |

### Semana 2 (19 – 25 Feb)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 19 | Carrito → Pedido → Pago | Flujo completo: agregar al carrito, checkout, seleccionar dirección, pagar, recibir confirmación por email | 🔴 Alta |
| Ma 20 | Reembolsos | Conectar `RefundViewSet` con `MercadoPagoService.refund()` y `PayPalService.refund()`. UI de admin para gestionar | 🟡 Media |
| Mi 21 | Emails transaccionales de pedidos | Verificar/mejorar templates: `order_confirmation.html`, `payment_confirmation.html`. Probar envío vía Brevo | 🟡 Media |
| Ju 22 | Deducción de inventario | Verificar que al completar pedido se descuenta stock automáticamente (signal `post_save` en Order) | 🟡 Media |
| Vi 23 | Edge cases de pago | Pagos fallidos, timeout, doble pago, cancelación. Manejo de errores en frontend | 🟡 Media |
| Sá-Do 24-25 | Buffer / Testing manual | Pruebas manuales del flujo completo en staging. Fix de bugs encontrados | 🟢 Baja |

**Entregable Sprint 1**: Flujo e-commerce funcional — un usuario puede comprar un producto y pagar con MercadoPago o PayPal en sandbox.

---

## Sprint 2 — Inventario y Dashboard de Pagos (26 Feb – 11 Mar)

> **Objetivo**: Dashboards administrativos faltantes + gestión de inventario.

### Semana 3 (26 Feb – 4 Mar)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 26 | Dashboard de inventario (frontend) | Crear `dashboard/inventario/page.tsx`: tabla de movimientos, filtros, acciones rápidas (entrada/salida/ajuste) | 🔴 Alta |
| Ma 27 | Alertas de stock bajo | Panel de alertas en dashboard: activas, reconocidas, resueltas. Notificación push cuando stock < umbral | 🔴 Alta |
| Mi 28 | Reportes de inventario | Resumen de stock por producto, valor total de inventario, movimientos por periodo. Exportar CSV | 🟡 Media |
| Ju 1 | Dashboard de pagos (frontend) | Crear `dashboard/pagos/page.tsx`: tabla de transacciones, filtros por estado/proveedor/fecha, resumen | 🔴 Alta |
| Vi 2 | Gestión de reembolsos (frontend) | UI para procesar reembolsos desde el dashboard, ver historial, estados | 🟡 Media |

### Semana 4 (5 – 11 Mar)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 5 | Reportes de ventas | Dashboard con métricas: ingresos por periodo, pedidos por estado, métodos de pago, top productos | 🟡 Media |
| Ma 6 | Notificaciones de inventario | Email automático a admin cuando stock bajo. Notificación in-app cuando movimiento registrado | 🟡 Media |
| Mi 7 | Error tracking (Sentry) | Integrar Sentry en backend (Django) y frontend (Next.js). Configurar env vars en Render y Vercel | 🔴 Alta |
| Ju 8 | Monitoreo y health checks | Endpoint `/health/` robusto (DB, email, storage). Configurar alertas en Render | 🟡 Media |
| Vi 9 | Backup de base de datos | Script automático de backup de PostgreSQL. Documentar proceso de restauración | 🟡 Media |
| Sá-Do 10-11 | Buffer / Testing manual | Revisión de dashboards, pruebas de flujo, fix de bugs | 🟢 Baja |

**Entregable Sprint 2**: Dashboards de inventario y pagos funcionales. Sentry integrado. Monitoreo básico.

---

## Sprint 3 — Testing y CI/CD (12 – 25 Mar)

> **Objetivo**: Base sólida de testing automatizado y pipeline de CI/CD.

### Semana 5 (12 – 18 Mar)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 12 | Setup de testing backend | Configurar `pytest-django`, `factory-boy`, fixtures. Crear `conftest.py` con factories para User, Role, Quote, Order | 🔴 Alta |
| Ma 13 | Tests unitarios: Users + Auth | Tests para: registro, login, verificación email, refresh token, Google OAuth, permisos por rol | 🔴 Alta |
| Mi 14 | Tests unitarios: Quotes | Tests para: crear solicitud, crear cotización, enviar, aceptar, rechazar, solicitar cambios, PDF | 🔴 Alta |
| Ju 15 | Tests unitarios: Orders + Payments | Tests para: carrito, checkout, crear pedido, webhook de pago, reembolso, estados FSM | 🔴 Alta |
| Vi 16 | Tests unitarios: Catalog + Inventory | Tests para: CRUD productos, variantes, stock, movimientos, alertas | 🟡 Media |
| Sá-Do 17-18 | Tests de integración | Tests end-to-end de flujos completos: registro→compra→pago, solicitud→cotización→aceptación | 🟡 Media |

### Semana 6 (19 – 25 Mar)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 19 | Setup testing frontend | Configurar Jest + React Testing Library. Tests de componentes clave: LoginForm, RegisterForm, QuoteForm | 🟡 Media |
| Ma 20 | Tests frontend: API client | Tests del apiClient: manejo de tokens, refresh, error envelope unwrapping | 🟡 Media |
| Mi 21 | Pipeline CI/CD (GitHub Actions) | Workflow: lint → type-check → test backend → test frontend → build. Trigger en PR y push a main | 🔴 Alta |
| Ju 22 | CI/CD: Deploy automático | Workflow de deploy: push a main → tests pasan → deploy a Render + Vercel | 🟡 Media |
| Vi 23 | Cobertura de código | Configurar `pytest-cov` y coverage reports. Meta: ≥70% cobertura en módulos críticos | 🟡 Media |
| Sá-Do 24-25 | Buffer | Fix tests fallidos, mejorar cobertura, documentar proceso de testing | 🟢 Baja |

**Entregable Sprint 3**: Suite de tests automatizados (≥50 tests backend, ≥20 tests frontend). Pipeline CI/CD funcional en GitHub Actions.

---

## Sprint 4 — Chatbot, i18n y Polish (26 Mar – 8 Abr)

> **Objetivo**: Mejorar experiencia de usuario, completar i18n, mejorar chatbot.

### Semana 7 (26 Mar – 1 Abr)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 26 | Chatbot: Mejorar motor de respuestas | Ampliar intents (15+): precios, horarios, ubicaciones, servicios, estado de cotización, FAQ. Respuestas contextuales | 🟡 Media |
| Ma 27 | Chatbot: Integración con datos reales | Respuestas dinámicas: consultar catálogo, estado de pedido/cotización del usuario logueado | 🟡 Media |
| Mi 28 | Chatbot: Escalación a humano | Flujo de escalación: bot → notifica a ventas → agente toma control. UI de conversaciones en dashboard | 🟡 Media |
| Ju 29 | i18n: Auditoría de strings | Encontrar y extraer todos los strings hardcodeados en español. Agregar a `es.json` y `en.json` | 🟡 Media |
| Vi 30 | i18n: Traducciones completas | Completar `en.json` con todas las traducciones faltantes. Verificar cada página en inglés | 🟡 Media |
| Sá-Do 31-1 | Buffer | Revisión de traducciones, testing de chatbot | 🟢 Baja |

### Semana 8 (2 – 8 Abr)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 2 | Accesibilidad (a11y) | Auditoría con Lighthouse. Agregar ARIA labels, roles, keyboard navigation en componentes clave | 🟡 Media |
| Ma 3 | SEO: Sitemap + robots.txt | Generar sitemap.xml dinámico (productos, servicios, páginas). Agregar meta tags Open Graph completos | 🟡 Media |
| Mi 4 | Performance | Auditoría Lighthouse. Optimizar: lazy loading de imágenes, code splitting, prefetch de rutas críticas | 🟡 Media |
| Ju 5 | PWA mejorado | Service worker para offline básico, cache de assets estáticos, push notifications (opcional) | 🟢 Baja |
| Vi 6 | Notificaciones real-time (opcional) | Evaluar SSE (Server-Sent Events) para notificaciones en tiempo real en vez de polling | 🟢 Baja |
| Sá-Do 7-8 | Buffer | Testing general, fix de bugs acumulados | 🟢 Baja |

**Entregable Sprint 4**: Chatbot mejorado con 15+ intents. i18n 100% completo. Score Lighthouse ≥ 85 en todas las métricas.

---

## Sprint 5 — QA Final y Preparación de Lanzamiento (9 – 24 Abr)

> **Objetivo**: Estabilizar, documentar, y preparar para lanzamiento oficial.

### Semana 9 (9 – 15 Abr)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 9 | QA completo: Flujo e-commerce | Test manual exhaustivo: registro → catálogo → carrito → checkout → pago → confirmación → email | 🔴 Alta |
| Ma 10 | QA completo: Flujo de cotizaciones | Test manual: solicitud → cotización → envío → vista pública → aceptar → cambios → nueva versión | 🔴 Alta |
| Mi 11 | QA completo: Dashboard admin | Test manual de todas las secciones: usuarios, cotizaciones, pedidos, inventario, pagos, CMS, auditoría | 🔴 Alta |
| Ju 12 | QA: Mobile completo | Probar todos los flujos en dispositivos móviles (iOS Safari, Android Chrome). Fix responsive issues | 🔴 Alta |
| Vi 13 | QA: Seguridad | Revisar: CORS, CSP, rate limiting, SQL injection (ORM), XSS (React), CSRF, permisos por rol | 🔴 Alta |
| Sá-Do 14-15 | Fix de bugs críticos | Resolver todos los bugs P0/P1 encontrados en QA | 🔴 Alta |

### Semana 10 (16 – 24 Abr)

| Día | Tarea | Detalle | Prioridad |
|-----|-------|---------|-----------|
| Lu 16 | Pagos en modo LIVE | Cambiar de sandbox a producción en MercadoPago y PayPal. Probar con transacción real mínima | 🔴 Alta |
| Ma 17 | Dominio y SSL final | Verificar DNS, SSL, redirects. Asegurar que agenciamcd.mx y API funcionan con HTTPS | 🔴 Alta |
| Mi 18 | Documentación final | Actualizar CHANGELOG, ARCHITECTURE, README. Crear guía de usuario para el equipo de ventas | 🟡 Media |
| Ju 19 | Datos de producción | Cargar catálogo real, precios, imágenes de productos. Verificar CMS con contenido final | 🔴 Alta |
| Vi 20 | Rehearsal de lanzamiento | Simular lanzamiento: crear pedido real, cotización real, verificar emails, PDFs, pagos | 🔴 Alta |
| Sá-Do 21-22 | Buffer final | Últimos ajustes y correcciones | 🟢 Baja |
| Mi 23 | **Pre-lanzamiento** | Smoke test final en producción. Monitoreo activo | 🔴 Alta |
| Ju 24 | **🚀 Lanzamiento** | Go-live. Monitoreo intensivo las primeras 24 horas | 🔴 Alta |

**Entregable Sprint 5**: Plataforma lista para producción con pagos reales, contenido final, y monitoreo activo.

---

## Resumen de Entregables por Sprint

| Sprint | Periodo | Entregable Principal |
|--------|---------|---------------------|
| **Sprint 1** | 12 – 25 Feb | Flujo e-commerce completo (carrito → pago → confirmación) |
| **Sprint 2** | 26 Feb – 11 Mar | Dashboards de inventario y pagos + Sentry + monitoreo |
| **Sprint 3** | 12 – 25 Mar | Testing automatizado (≥70 tests) + CI/CD pipeline |
| **Sprint 4** | 26 Mar – 8 Abr | Chatbot mejorado + i18n 100% + optimización performance |
| **Sprint 5** | 9 – 24 Abr | QA final + pagos live + lanzamiento 🚀 |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Sandbox de MercadoPago con problemas | Media | Alto | Tener PayPal como alternativa. Documentar proceso de certificación MP | 
| Render free tier lento/caído | Media | Alto | Considerar upgrade a Starter ($7/mes) si performance es issue |
| Brevo llega al límite de 300 emails/día | Baja | Medio | Monitorear uso. Plan B: SendGrid free tier (100/día adicionales) |
| Base de datos Render free (256MB, 90 días) | Alta | Alto | Migrar a plan Starter antes de los 90 días. Backup semanal |
| Bugs críticos descubiertos en QA | Media | Medio | Semana 10 tiene buffer de 4 días para fixes |
| Contenido/catálogo no listo para lanzamiento | Media | Alto | Empezar a cargar contenido desde Sprint 4, no esperar al final |

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Lighthouse Performance | ≥ 85 |
| Lighthouse Accessibility | ≥ 90 |
| Lighthouse SEO | ≥ 90 |
| Test coverage (backend) | ≥ 70% en módulos críticos |
| Test coverage (frontend) | ≥ 50% en componentes clave |
| Tiempo de carga (LCP) | < 2.5 segundos |
| Uptime en producción | ≥ 99% |
| Emails entregados (Brevo) | ≥ 95% delivery rate |
| Zero errores P0 | Al momento del lanzamiento |

---

## Notas

- Los **sábados y domingos** están marcados como buffer/opcionales. El desarrollo principal es lunes a viernes.
- Las prioridades 🔴 Alta son bloqueantes para el lanzamiento. 🟡 Media son importantes pero no bloqueantes. 🟢 Baja son nice-to-have.
- El cronograma asume **1 desarrollador dedicado** con asistencia de IA. Con más recursos, los sprints pueden solaparse.
- Las fechas pueden ajustarse según descubrimientos durante el desarrollo. Se recomienda revisión semanal del cronograma.
