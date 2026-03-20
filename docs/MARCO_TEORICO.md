# CAPÍTULO III. MARCO TEÓRICO

**Proyecto:** Plataforma digital para la Agencia MCD  
**Período del proyecto:** 12 de enero – 24 de abril de 2026

---

## 1. Introducción del marco teórico

El marco teórico de esta investigación define los conceptos centrales, revisa enfoques previos aplicables y justifica la selección tecnológica del sistema desarrollado para la Agencia MCD. Su función no es solo reunir citas, sino explicar por qué determinadas decisiones técnicas y de negocio son coherentes con el problema planteado: digitalizar una agencia de publicidad e impresión, mejorar la captación de clientes y optimizar la operación comercial mediante una plataforma web.

Siguiendo el enfoque metodológico de Hernández-Sampieri y Mendoza (2018), el capítulo integra tres dimensiones: (a) **definición conceptual del fenómeno**, (b) **comparación con alternativas similares**, y (c) **marco legal aplicable en México**. En consecuencia, se presentan fundamentos sobre arquitectura web moderna, comercio electrónico, analítica digital y automatización conversacional, vinculándolos con herramientas concretas implementadas en el proyecto.

---

## 2. Definición conceptual del fenómeno en estudio

### 2.1 Transformación digital en pymes de servicios

La transformación digital implica integrar tecnologías digitales en procesos operativos, comerciales y de relación con clientes para generar nuevo valor (Porter & Heppelmann, 2014). En una agencia de publicidad, esto se traduce en pasar de una operación predominantemente presencial (ventas por recomendación, cotización manual, seguimiento por mensajería) a un modelo híbrido u omnicanal con catálogo en línea, formularios de cotización, trazabilidad de pedidos y atención automatizada.

Desde la perspectiva de marketing digital, el valor principal de la digitalización está en la capacidad de medir y optimizar el embudo comercial en tiempo real (Chaffey & Ellis-Chadwick, 2019; Kaushik, 2010). Por ello, el fenómeno estudiado no es únicamente “crear una web”, sino construir una plataforma que conecte captación, conversión, operación y análisis.

### 2.2 Arquitectura web desacoplada

El sistema adopta una arquitectura desacoplada: backend API (Django + DRF) y frontend web (Next.js + React). Este enfoque permite evolución independiente de capas, escalabilidad y mejor mantenibilidad (Fowler, 2015). Además, favorece la internacionalización, el SEO técnico y la integración con servicios externos.

En términos de persistencia, se aplica un modelo de **polyglot persistence** (Sadalage & Fowler, 2013):
- **PostgreSQL** para datos transaccionales y de negocio.
- **Redis** para caché y mensajería asíncrona.
- **SQLite** para desarrollo local.

Esta combinación responde a necesidades distintas de consistencia, velocidad y simplicidad operativa.

### 2.3 Modelo conceptual de la solución

Para delimitar el fenómeno de estudio, la plataforma puede entenderse como un **sistema sociotécnico de conversión comercial digital**. Esto significa que la tecnología no actúa de forma aislada, sino en interacción con procesos de negocio, decisiones de marketing y experiencia del cliente. En términos operativos, el modelo conceptual integra cinco bloques funcionales:

1. **Atracción:** visibilidad en buscadores, contenido optimizado y canales de contacto.
2. **Interacción:** navegación de catálogo, consultas por chatbot y CTAs.
3. **Conversión:** formulario de cotización, validación de datos, seguimiento de estado.
4. **Operación:** gestión interna de cotizaciones, pedidos, inventario y notificaciones.
5. **Aprendizaje:** analítica de eventos para mejora continua de campañas y UX.

Este encadenamiento es coherente con la literatura de marketing digital orientada a métricas, donde cada etapa del embudo debe tener indicadores observables y acciones de optimización (Chaffey & Ellis-Chadwick, 2019; Kaushik, 2010).

### 2.4 Variables conceptuales y criterios de calidad

Desde ingeniería de software, la calidad del sistema no se evalúa solo por “funcionar”, sino por atributos como mantenibilidad, seguridad, rendimiento y escalabilidad (Fowler, 2015). En la investigación, estos atributos se traducen en criterios medibles:

- **Rendimiento percibido:** tiempos de respuesta en vistas críticas y reducción de consultas repetitivas mediante caché.
- **Confiabilidad operativa:** estabilidad de APIs, control de errores y trazabilidad de eventos.
- **Seguridad aplicada:** autenticación, validación de entradas, controles antiabuso y manejo de sesiones.
- **Evolutividad:** capacidad de incorporar nuevos módulos sin reescribir la arquitectura.
- **Usabilidad comercial:** facilidad para que un visitante pase de interés a cotización.

Estos criterios conectan directamente con el objetivo del proyecto: aumentar eficiencia comercial sin comprometer calidad técnica.

### 2.5 Relación entre teoría y problema de investigación

El problema de investigación se centra en cómo una agencia tradicional puede mejorar resultados comerciales mediante una plataforma digital integrada. La teoría revisada justifica que la respuesta no es una sola tecnología, sino la **orquestación de arquitectura, datos, automatización y medición**.

Por ello, el marco teórico no se limita a describir herramientas; establece una cadena causal: una arquitectura modular permite integrar APIs y automatizar tareas; la automatización reduce tiempos operativos; y la analítica convierte interacciones en decisiones de negocio más precisas. Esta lógica de trazabilidad entre teoría y práctica fortalece la validez del estudio (Hernández-Sampieri & Mendoza, 2018).

---

## 3. Fundamentos tecnológicos del proyecto

### 3.1 Backend: Django, DRF y Celery

Django se utiliza como núcleo del backend por su madurez, seguridad integrada y ecosistema (Django Software Foundation, 2024; Vincent, 2022). Su ORM y sistema de migraciones facilitan la evolución del esquema de datos; además, el panel administrativo acelera la gestión interna de contenidos y operaciones.

DRF implementa la capa API REST para exponer recursos de catálogo, cotizaciones, pagos, chatbot, analítica y contenidos (Christie, 2024; Fielding, 2000). Este diseño promueve separación de responsabilidades entre cliente y servidor.

Celery se usa para tareas asíncronas como envíos de correo, generación de documentos y procesos diferidos, reduciendo latencia en la experiencia de usuario (Ask Solem, 2024).

### 3.2 Frontend: Next.js, React, TypeScript y Tailwind

Next.js se eligió por su soporte híbrido de renderizado (SSR/SSG/CSR), aspecto clave para SEO y rendimiento (Vercel, 2024; Wieruch, 2023). React aporta componentes reutilizables y un modelo declarativo de UI (Meta Platforms, 2024).

TypeScript mejora robustez del código al detectar errores de tipo antes de ejecución, especialmente útil en integración frontend-backend (Microsoft, 2024). Tailwind CSS facilita consistencia visual y velocidad de implementación mediante utilidades de diseño (Tailwind Labs, 2024).

### 3.3 Datos, caché y rendimiento

PostgreSQL funciona como base principal por su confiabilidad transaccional y capacidades avanzadas (The PostgreSQL Global Development Group, 2024). Redis se usa como capa de alto rendimiento para:
- caché de información consultada con frecuencia,
- soporte de sesiones según entorno,
- broker/result backend para tareas Celery cuando aplica.

En el chatbot, el contexto de negocio se cachea con TTL para evitar recalcular y consultar base de datos en cada mensaje, reduciendo latencia y consumo de recursos.

### 3.4 Integraciones API

La plataforma integra APIs para capacidades especializadas:
- **Gemini** para respuestas conversacionales contextualizadas.
- **MercadoPago y PayPal** para pagos.
- **reCAPTCHA v3** para mitigación de abuso automatizado.
- **S3/R2** para almacenamiento de archivos.
- **OpenStreetMap/Leaflet** para geolocalización.

La literatura sobre arquitectura de APIs respalda este enfoque de composición con servicios externos cuando acelera entrega de valor y reduce complejidad de implementación propia (Jacobson et al., 2012; Lauret, 2019).

### 3.5 Seguridad, gobernanza de datos y continuidad operativa

En sistemas de comercio digital, la seguridad debe diseñarse desde arquitectura y no añadirse al final. El backend API debe contemplar autenticación robusta, autorización por roles, validación de entrada y control de abuso por tasa de peticiones. Estas prácticas reducen superficies de ataque y protegen tanto a usuarios como a la organización.

Adicionalmente, la gobernanza de datos exige definir qué información se captura, cuánto tiempo se conserva y quién puede acceder a ella. En el contexto del proyecto, esta gobernanza se vincula especialmente con datos de contacto de leads, historial de cotizaciones y eventos de interacción del chatbot. Un principio central es minimizar la captura a lo necesario para el proceso comercial.

La continuidad operativa también depende de decisiones de entorno: separación entre desarrollo y producción, uso de variables de entorno para secretos, y estrategias de fallback cuando algún servicio externo no esté disponible. En este sentido, el diseño híbrido del chatbot (IA + fallback) aporta resiliencia funcional en escenarios de degradación.

### 3.6 Escalabilidad y observabilidad

La escalabilidad del sistema puede analizarse en tres planos:

- **Escalabilidad horizontal de servicios web:** frontend y backend pueden evolucionar de forma independiente.
- **Escalabilidad de carga operativa:** uso de tareas asíncronas para trabajos costosos.
- **Escalabilidad de lectura:** caché para disminuir presión sobre base de datos.

No obstante, escalar sin observabilidad produce “crecimiento ciego”. Por eso, la analítica propia, el registro de eventos y la trazabilidad de errores son componentes críticos. La observabilidad no solo sirve para depuración técnica; también permite validar hipótesis de negocio (por ejemplo, qué canal de entrada genera más cotizaciones efectivas).

### 3.7 Justificación de stack frente a objetivos del estudio

La selección tecnológica se justifica por alineación con objetivos y restricciones del caso:

- **Django + DRF:** rapidez de desarrollo empresarial con seguridad y API madura.
- **Next.js + React:** combinación de rendimiento, SEO e interactividad.
- **PostgreSQL + Redis:** equilibrio entre consistencia transaccional y velocidad de acceso.
- **Celery:** desacoplo de procesos no inmediatos para proteger la experiencia de usuario.

Esta coherencia entre stack y objetivo investigativo fortalece la pertinencia del proyecto como intervención tecnológica contextualizada.

---

## 4. Chatbot como componente de negocio

Los chatbots actuales evolucionaron desde sistemas basados en reglas hacia modelos híbridos con NLP/LLM (Adamopoulou & Moussiades, 2020; Jurafsky & Martin, 2023). Para este proyecto, el chatbot se concibe como herramienta **task-oriented**: su objetivo principal es resolver dudas comerciales, guiar la cotización y captar leads.

La arquitectura implementa un enfoque híbrido:
- respuestas con IA (Gemini) para consultas abiertas,
- fallback basado en reglas para continuidad del servicio,
- construcción de contexto desde base de datos (servicios, FAQs, sucursales),
- control de uso por throttling.

Este diseño se alinea con evidencia que sugiere que chatbots en e-commerce incrementan disponibilidad de atención y reducen fricción inicial de contacto (Dale, 2016).

### 4.1 Función del chatbot en el embudo comercial

En este proyecto, el chatbot no se plantea como un sustituto total del equipo comercial, sino como un mecanismo de preatención y calificación inicial. Su aporte principal está en tres niveles:

1. **Disponibilidad continua:** respuesta inmediata fuera del horario humano.
2. **Filtrado de intención:** identifica si el usuario está explorando, comparando o listo para cotizar.
3. **Derivación inteligente:** cuando detecta necesidad de cierre, redirige a WhatsApp o formulario.

Este enfoque reduce fricción en etapas tempranas del embudo y mejora la probabilidad de conversión, especialmente en usuarios que requieren respuestas rápidas antes de dejar datos.

### 4.2 Arquitectura conversacional aplicada

La arquitectura conversacional combina componentes de procesamiento y negocio:

- **Entrada:** mensaje de usuario y metadatos de sesión.
- **Control:** throttling para proteger recursos y evitar abuso.
- **Contexto:** recuperación de información empresarial (servicios, FAQs, sucursales).
- **Generación:** respuesta vía modelo principal o fallback.
- **Acción:** sugerencia de siguiente paso (cotizar, contactar, navegar).

Desde la teoría de sistemas de diálogo, este enfoque corresponde a un modelo híbrido orientado a tareas, donde la calidad de respuesta depende tanto del modelo lingüístico como de la calidad del contexto inyectado (Jurafsky & Martin, 2023).

### 4.3 Limitaciones y riesgos del componente IA

Toda integración de LLM conlleva riesgos: alucinación de respuestas, variabilidad semántica y sensibilidad a prompt. Por ello, el diseño técnico debe incorporar mitigaciones, entre ellas:

- contexto estructurado y actualizado desde base de datos,
- reglas de salida (tono, brevedad y restricción a información verificable),
- fallback deterministic cuando el proveedor IA no esté disponible,
- escalación a canal humano en casos ambiguos.

Estas salvaguardas son consistentes con prácticas recientes de despliegue responsable de asistentes conversacionales en dominios transaccionales.

### 4.4 Indicadores de evaluación del chatbot

Para evaluar su aporte real, no basta medir “cantidad de mensajes”. Se proponen indicadores más útiles:

- tasa de conversaciones que terminan en acción comercial,
- proporción de escalaciones a canal humano,
- tiempo medio de primera respuesta,
- satisfacción implícita (continuidad de interacción, no abandono temprano).

La medición de estos indicadores permite distinguir entre uso superficial y valor comercial efectivo.

---

## 5. Publicidad digital y analítica aplicada

La digitalización de la Agencia MCD se vincula con prácticas de marketing de desempeño. A diferencia de medios tradicionales, el canal digital permite medir de forma continua indicadores de tráfico, interacción y conversión (Kaushik, 2010; Chaffey & Ellis-Chadwick, 2019).

En esta plataforma, el modelo de captación combina:
- formulario de cotización,
- chatbot,
- enlaces de contacto directo (WhatsApp),
- CTAs distribuidos estratégicamente.

Asimismo, la solución incorpora gestión de contenidos (CMS) para que el equipo no técnico actualice carrusel, portafolio y contenido institucional sin intervención de desarrollo, lo cual reduce tiempos operativos y mejora capacidad de campaña.

Desde SEO, la elección de Next.js responde a la necesidad de indexabilidad y rendimiento, relevantes para visibilidad orgánica (Enge et al., 2015; Google Developers, 2024).

### 5.1 Publicidad tradicional vs. digital: implicaciones estratégicas

La publicidad tradicional mantiene valor en cobertura local y recordación de marca; sin embargo, su principal limitación es la dificultad de atribuir resultados con precisión. En contraste, la publicidad digital permite trazabilidad casi completa del recorrido del usuario: origen, comportamiento, interacción y conversión (Chaffey & Ellis-Chadwick, 2019).

Para una agencia como MCD, la ventaja competitiva surge al combinar ambos mundos: experiencia en producción gráfica tradicional y una capa digital que cuantifica impacto y acelera respuesta comercial.

### 5.2 SEO técnico y contenido como activo de adquisición

El SEO se aborda desde una perspectiva integral:

- **SEO técnico:** rendimiento, estructura semántica, indexabilidad.
- **SEO on-page:** contenido útil y alineado a intención de búsqueda.
- **SEO local:** consistencia de información comercial y geográfica.

La arquitectura SSR/SSG fortalece indexación y tiempos de carga, factores asociados con mejor visibilidad y experiencia de usuario (Enge et al., 2015; Google Developers, 2024).

### 5.3 Analítica orientada a decisiones

La analítica no debe limitarse a reportar números descriptivos; su función es soportar decisiones. Por ejemplo, identificar qué canal genera leads de mayor calidad o en qué paso del formulario se concentra el abandono. Esta visión coincide con el enfoque de analítica accionable propuesto por Kaushik (2010).

En el proyecto, la captura de eventos permite construir hipótesis de mejora continua, como ajuste de CTAs, simplificación de pasos y redistribución de inversión en canales de adquisición.

### 5.4 Gestión de contenidos y autonomía operativa

Un CMS funcional reduce dependencia del equipo técnico en cambios de comunicación comercial. Esta autonomía es crítica en campañas con ventanas cortas, donde el tiempo de publicación impacta resultados. Desde gestión digital, la agilidad de contenido es un factor de competitividad operativa (Chaffey & Ellis-Chadwick, 2019).

### 5.5 Métricas clave para seguimiento del modelo

Para sostener la mejora continua, el proyecto debe monitorear métricas por niveles:

- **Adquisición:** visitas, fuentes, CTR de entrada.
- **Comportamiento:** tiempo en sitio, profundidad de navegación, interacción con elementos clave.
- **Conversión:** ratio de cotización, tasa de contacto efectivo, costo por lead.

Este marco de métricas permite evaluar impacto real de la plataforma sobre resultados comerciales, no solo actividad digital superficial.

---

## 6. Comparativo con alternativas similares

En cumplimiento del requisito metodológico, se compara la solución adoptada (desarrollo a medida) con opciones comunes.

| Criterio | Arquitectura MCD (Django + Next.js) | WordPress + WooCommerce | Shopify |
|---|---|---|---|
| Control funcional | Alto (código propio) | Medio (plugins) | Bajo-medio (SaaS) |
| Personalización de lógica (chatbot, flujos) | Alta | Media | Baja-media |
| Escalabilidad técnica | Alta (capas separadas) | Media | Alta (administrada por proveedor) |
| Dependencia de proveedor | Baja | Media | Alta |
| Velocidad inicial de salida | Media | Alta | Alta |
| Ajuste a procesos específicos de agencia | Muy alto | Medio | Medio |

**Síntesis del comparativo:**
Si el objetivo fuera solo publicar catálogo rápidamente, una solución SaaS podría ser suficiente. Sin embargo, para integrar cotización avanzada, analítica propia, chatbot contextual y control de datos, la arquitectura a medida ofrece mejor alineación estratégica, aunque exige mayor esfuerzo inicial.

### 6.1 Discusión del costo total de propiedad

Un análisis comparativo más riguroso requiere mirar el costo total de propiedad (TCO): no solo licencias iniciales, sino también personalización, mantenimiento, dependencia de terceros, límites de plataforma y crecimiento de transacciones. En soluciones cerradas, el costo puede escalar por módulos adicionales o comisiones; en soluciones a medida, el costo principal se concentra en desarrollo y operación técnica.

Para el caso MCD, donde los flujos comerciales y de contenido requieren personalización progresiva, la inversión en arquitectura propia se justifica por su mayor capacidad de adaptación.

### 6.2 Riesgos de cada enfoque

- **SaaS cerrado:** menor complejidad técnica inicial, pero mayor dependencia de roadmap de proveedor.
- **CMS con plugins:** rápida implementación, pero riesgo de deuda técnica por dependencia de extensiones heterogéneas.
- **Desarrollo a medida:** mayor control y extensibilidad, con exigencia de disciplina de ingeniería y documentación.

La elección final debe alinearse con estrategia de mediano plazo y no únicamente con velocidad de implementación inicial.

### 6.3 Criterios de decisión aplicados al proyecto

La decisión arquitectónica del proyecto prioriza: (a) control funcional, (b) trazabilidad de datos, (c) posibilidad de integrar lógica comercial propia y (d) escalabilidad del modelo omnicanal. Estos criterios responden directamente al problema investigado y a la necesidad de evolucionar el sistema después de su primera versión.

---

## 7. Marco legal aplicable (México)

### 7.1 Protección de datos personales

La **Ley Federal de Protección de Datos Personales en Posesión de los Particulares** (LFPDPPP) y su reglamento establecen principios de tratamiento, consentimiento y derechos ARCO (Cámara de Diputados del H. Congreso de la Unión, 2010, 2011). Para el proyecto, esto se refleja en la captura de datos mínimos, aviso de privacidad y controles de acceso en panel administrativo.

En términos de cumplimiento práctico, el tratamiento de datos en formularios de cotización y chatbot debe declarar finalidades explícitas, limitar transferencia no autorizada y facilitar mecanismos de atención a solicitudes de titulares. La evidencia de cumplimiento requiere también trazabilidad administrativa y técnica.

### 7.2 Comercio electrónico y evidencia digital

El **Código de Comercio** reconoce validez jurídica de mensajes de datos y actos electrónicos. Complementariamente, la **NOM-151-SCFI-2016** regula conservación de mensajes de datos y digitalización documental (Cámara de Diputados del H. Congreso de la Unión, 1889; Secretaría de Economía, 2017). Esto respalda la trazabilidad digital de cotizaciones, pedidos, cambios de estado y confirmaciones.

Desde la práctica de plataforma, esto implica preservar integridad de registros, consistencia de marcas de tiempo y capacidad de reconstrucción de eventos relevantes para atención al cliente y soporte operativo.

### 7.3 Protección al consumidor

La **Ley Federal de Protección al Consumidor** exige información clara y prácticas comerciales no engañosas (Cámara de Diputados del H. Congreso de la Unión, 1992). En términos de implementación, implica transparentar características de servicios, condiciones comerciales y canales de atención.

Además, la experiencia digital debe evitar ambigüedad en alcances de servicio, tiempos estimados y condiciones de cotización. Esta claridad reduce fricciones comerciales y riesgos de reclamación.

### 7.4 Propiedad intelectual

El manejo de piezas gráficas, diseños y contenidos digitales se vincula con la **Ley Federal del Derecho de Autor** y la **Ley Federal de Protección a la Propiedad Industrial** (Cámara de Diputados del H. Congreso de la Unión, 1996, 2020). Operativamente, se recomienda mantener control de titularidad, permisos de uso y trazabilidad de activos en CMS.

En una agencia de publicidad, esta dimensión es especialmente sensible, ya que se manipulan activos de clientes y piezas propias. Por ello, la gestión documental de autorizaciones y la separación clara de repositorios de material son prácticas recomendables para reducir riesgos legales.

### 7.5 Pagos y seguridad técnica

Aunque el procesamiento de tarjeta lo realizan pasarelas externas, el sistema debe asegurar integridad de webhooks y consistencia de estados de pago. Como referencia técnica, PCI DSS orienta buenas prácticas de seguridad en ecosistemas de pago (PCI Security Standards Council, 2022).

Esto se traduce en validar eventos de confirmación, registrar transiciones de estado y evitar decisiones de negocio basadas en datos no verificados. En términos de cumplimiento operativo, la integridad del flujo de pago es tan importante como la disponibilidad del servicio.

### 7.6 Matriz síntesis de cumplimiento (norma–proceso)

| Norma | Proceso del sistema | Evidencia esperada |
|---|---|---|
| LFPDPPP + Reglamento | Formularios, chatbot, usuarios | Aviso de privacidad, control de acceso, trazabilidad de tratamiento |
| Código de Comercio | Cotizaciones/pedidos digitales | Registros de eventos y estados con marca temporal |
| NOM-151-SCFI-2016 | Conservación de mensajes/documentos | Política de conservación y resguardo documental |
| LFPC | Información comercial al usuario | Condiciones claras y canales de atención visibles |
| LFDA / LFPPI | Gestión de creativos y contenidos | Registro de titularidad/autorización de uso |
| PCI DSS (referencial) | Integración de pagos | Verificación de webhooks y manejo seguro de estados |

---

## 8. Síntesis del capítulo

El marco teórico construido cumple las funciones académicas centrales:

1. **Evitar errores de diseño:** al basar decisiones en literatura técnica y estándares.
2. **Orientar la implementación:** al justificar arquitectura, herramientas y flujos.
3. **Delimitar el problema:** al centrar la investigación en digitalización comercial de una agencia real.
4. **Abrir líneas futuras:** analítica predictiva, automatización comercial y madurez de cumplimiento.

En suma, el capítulo articula teoría y práctica para sostener que la solución propuesta no es una suma de herramientas aisladas, sino un sistema coherente con objetivos de negocio, restricciones operativas y marco normativo.

Desde el punto de vista investigativo, el aporte de este marco teórico es doble: por un lado, organiza el conocimiento técnico y normativo que fundamenta la implementación; por otro, establece criterios para evaluar la plataforma más allá de su puesta en marcha inicial. Esto permite que la investigación mantenga rigor académico y utilidad aplicada para la organización.

En consecuencia, el capítulo sirve como puente entre problema, objetivos y decisiones de diseño, justificando por qué la arquitectura seleccionada y los componentes funcionales del sistema son adecuados para la realidad operacional de la Agencia MCD.

---

## Referencias

Adamopoulou, E., & Moussiades, L. (2020). An overview of chatbot technology. *IFIP International Conference on Artificial Intelligence Applications and Innovations*, 373–383. https://doi.org/10.1007/978-3-030-49186-4_31

Ask Solem. (2024). *Celery documentation*. https://docs.celeryq.dev/

Cámara de Diputados del H. Congreso de la Unión. (1889). *Código de Comercio*. https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf

Cámara de Diputados del H. Congreso de la Unión. (1992). *Ley Federal de Protección al Consumidor*. https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf

Cámara de Diputados del H. Congreso de la Unión. (1996). *Ley Federal del Derecho de Autor*. https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf

Cámara de Diputados del H. Congreso de la Unión. (2010). *Ley Federal de Protección de Datos Personales en Posesión de los Particulares*. https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf

Cámara de Diputados del H. Congreso de la Unión. (2011). *Reglamento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares*. https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LFPDPPP.pdf

Cámara de Diputados del H. Congreso de la Unión. (2020). *Ley Federal de Protección a la Propiedad Industrial*. https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPPI_010720.pdf

Chaffey, D., & Ellis-Chadwick, F. (2019). *Digital marketing: Strategy, implementation and practice* (7th ed.). Pearson.

Christie, T. (2024). *Django REST Framework*. https://www.django-rest-framework.org/

Dale, R. (2016). The return of the chatbots. *Natural Language Engineering, 22*(5), 811–817. https://doi.org/10.1017/S1351324916000243

Django Software Foundation. (2024). *Django documentation*. https://docs.djangoproject.com/

Enge, E., Spencer, S., & Stricchiola, J. C. (2015). *The art of SEO* (3rd ed.). O’Reilly.

Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* (Doctoral dissertation, University of California, Irvine). https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm

Fowler, M. (2015). *Patterns of enterprise application architecture*. Addison-Wesley.

Google Developers. (2024). *Web Vitals*. https://web.dev/vitals/

Hernández-Sampieri, R., & Mendoza, C. P. (2018). *Metodología de la investigación: Las rutas cuantitativa, cualitativa y mixta*. McGraw-Hill.

Jacobson, D., Brail, G., & Woods, D. (2012). *APIs: A strategy guide*. O’Reilly.

Jurafsky, D., & Martin, J. H. (2023). *Speech and language processing* (3rd ed. draft). https://web.stanford.edu/~jurafsky/slp3/

Kaushik, A. (2010). *Web analytics 2.0*. Wiley.

Lauret, A. (2019). *The design of web APIs*. Manning.

Meta Platforms. (2024). *React documentation*. https://react.dev/

Microsoft. (2024). *TypeScript documentation*. https://www.typescriptlang.org/docs/

PCI Security Standards Council. (2022). *PCI DSS v4.0*. https://www.pcisecuritystandards.org/

Porter, M. E., & Heppelmann, J. E. (2014). How smart, connected products are transforming competition. *Harvard Business Review, 92*(11), 64–88.

Sadalage, P. J., & Fowler, M. (2013). *NoSQL distilled*. Addison-Wesley.

Secretaría de Economía. (2017). *NOM-151-SCFI-2016*. Diario Oficial de la Federación. https://www.dof.gob.mx/nota_detalle.php?codigo=5470267&fecha=30/03/2017

Tailwind Labs. (2024). *Tailwind CSS documentation*. https://tailwindcss.com/docs/

The PostgreSQL Global Development Group. (2024). *PostgreSQL 16 documentation*. https://www.postgresql.org/docs/16/

Vercel. (2024). *Next.js documentation*. https://nextjs.org/docs

Vincent, W. S. (2022). *Django for APIs* (4th ed.). Still River Press.

Wieruch, R. (2023). *The road to React*. https://www.roadtoreact.com/

---

## Nota para formato APA 7 en Word

1. Pega el texto con **Mantener solo texto**.  
2. Configura: **Times New Roman 12**, interlineado **doble**, márgenes **2.54 cm**.  
3. En “Referencias”, aplica **sangría francesa 1.27 cm** y mantén orden alfabético.  
4. Verifica que todas las citas en texto (autor, año) tengan entrada correspondiente en la lista final.
