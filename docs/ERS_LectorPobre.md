# Especificación de Requisitos de Software (ERS)
## Proyecto: Plataforma Web "LectorPobre"

**Versión:** 1.2 (división de alcance en dos releases: Release 1 tienda pública con gestión vía Sanity Studio; Release 2 Panel de Control propio — ver `panelControlImplementacion.md`). Incluye la ampliación v1.1: búsqueda avanzada y recomendaciones basadas en contenido (§7.4 y §7.5)
**Basado en:** `Requisitos_LectorPobre_Final.pdf`, `Arquitectura_Detallada_LectorPobre.pdf`, `Stack_Tecnologico_LectorPobre.pdf`
**Plantilla de redacción de requisitos:** "El [Sistema / Actor] debe [Acción] [Condición o Complemento]"
**Principio de atomicidad:** cada requisito describe una única acción, sin detalles de implementación técnica.

---

## 1. Introducción

### 1.1 Propósito

Este documento constituye la Especificación de Requisitos de Software (ERS) de la plataforma web **LectorPobre**, un catálogo de productos en línea. Su propósito es establecer, de forma clara, atómica y sin ambigüedad, el conjunto de requisitos funcionales y no funcionales que el sistema debe satisfacer, sirviendo como contrato de entendimiento entre la empresa (parte interesada / cliente) y el equipo de desarrollo.

Este documento se apoya y es consistente con la **Arquitectura Técnica Detallada** del proyecto (patrón Jamstack desacoplado) y con el **Stack Tecnológico** definido (Nuxt.js, Go serverless, Sanity.io, Vercel), de modo que cada requisito pueda trazarse hacia el componente del sistema responsable de satisfacerlo.

### 1.2 Alcance del Sistema

LectorPobre es una plataforma web de **catálogo de productos de arte y manualidades** (dedicada a la exhibición y venta de creaciones de una artista independiente: llaveros semiartesanales en acrílico/resina, prints de ilustración, stickers, pines y accesorios de diseño propio; **no es una librería ni una tienda de libros**). El sistema permite:

- A **usuarios generales** (visitantes públicos, sin necesidad de registro) navegar, buscar y consultar el catálogo de creaciones artísticas, ver el stock disponible de piezas hechas a mano, interactuar socialmente (calificaciones y comentarios) e iniciar un contacto directo de compra vía WhatsApp.
- A un **administrador** (la dueña y artista principal) gestionar el contenido del catálogo (piezas, imágenes, stock limitado) y la personalización visual del sitio (paleta de colores y elementos gráficos) mediante un panel de control.

El sistema **no** incluye, salvo que se indique lo contrario en futuras iteraciones: pasarela de pago en línea, carrito de compras, gestión de pedidos, ni registro/autenticación de usuarios generales. La conversión de venta se delega a un canal externo (WhatsApp).

> **Alcance por releases (v1.2):** el desarrollo se entrega en dos releases. **Release 1:** tienda pública (plan `implementationPlan.md`); la gestión de contenido del administrador se realiza con **Sanity Studio**. **Release 2:** **Panel de Control propio**, alojado en un dominio distinto al de la tienda, con todas las funcionalidades de gestión y métricas (plan `panelControlImplementacion.md`). Los requisitos del módulo de administración (RF-08 a RF-16) conservan su redacción; cambia únicamente el momento y el medio de su entrega.

### 1.3 Definiciones, Acrónimos y Abreviaturas

| Término | Definición |
|---|---|
| RF | Requisito Funcional |
| RNF | Requisito No Funcional |
| ERS | Especificación de Requisitos de Software |
| Jamstack | Arquitectura desacoplada basada en JavaScript, APIs y Markup pre-renderizado |
| SSG | Static Site Generation (Generación de Sitios Estáticos) |
| CMS Headless | Sistema Gestor de Contenidos sin capa de presentación acoplada |
| Serverless | Modelo de ejecución de código bajo demanda, sin servidor persistente |
| GROQ | Graph-Relational Object Queries, lenguaje de consulta de Sanity.io |
| CDN | Content Delivery Network |
| SEO | Search Engine Optimization |
| Stock | Cantidad de inventario disponible de un producto |
| Usuario General | Actor público que navega el catálogo sin autenticarse |
| Administrador | Actor autenticado con privilegios de gestión de contenido |

### 1.4 Referencias

- `Requisitos_LectorPobre_Final.pdf` — Fuente primaria de los RF-01 a RF-20 y RNF-01 a RNF-06.
- `Arquitectura_Detallada_LectorPobre.pdf` — Arquitectura Jamstack, capas del sistema y flujos de datos.
- `Stack_Tecnologico_LectorPobre.pdf` — Stack tecnológico (Nuxt.js, Vue.js, Tailwind CSS, Go, Sanity.io, Vercel).
- Documento complementario: `Stack_Tecnologico_LectorPobre.md` (generado junto con este ERS).
- Documento de decisión: `Analisis_Busqueda_Recomendacion_LectorPobre.md` — análisis de factibilidad y decisión de diseño (ADR) sobre búsqueda avanzada y recomendaciones (RF-18 ampliado, RF-21 a RF-23, RNF-07, RNF-08).

### 1.5 Visión General del Documento

La Sección 2 describe el producto de forma general (perspectiva, actores, restricciones y supuestos). La Sección 3 detalla cada requisito funcional y no funcional de forma atómica, con criterios de aceptación sugeridos, prioridad y trazabilidad arquitectónica. La Sección 4 presenta la matriz de trazabilidad RF/RNF → Componente. La Sección 5 resume los casos de uso principales. La Sección 6 contiene el glosario y la Sección 7 los supuestos, restricciones y temas abiertos.

> **Nota metodológica:** los identificadores RF-01 a RF-20 y RNF-01 a RNF-06, junto con su redacción literal, provienen directamente del documento fuente `Requisitos_LectorPobre_Final.pdf`. Los campos de **Actor**, **Prioridad**, **Criterios de aceptación** y **Trazabilidad arquitectónica** son una elaboración técnica adicional para dar mayor detalle y trazabilidad al ERS; se recomienda validarlos con la parte interesada antes de congelar el alcance.
>
> **Extensión v1.1:** los requisitos RF-21, RF-22, RF-23, RNF-07 y RNF-08, así como la ampliación de los criterios de aceptación de RF-18, **no provienen del documento fuente original**. Se incorporan por decisión conjunta con la parte interesada como valor añadido (ver §7.4). No alteran la redacción literal de los requisitos RF-01 a RF-20 originales.

---

## 2. Descripción General

### 2.1 Perspectiva del Producto

LectorPobre se construye sobre una arquitectura **Jamstack desacoplada**, que separa completamente el cliente (frontend pre-renderizado) de la base de datos, comunicándose únicamente vía APIs cuando es estrictamente necesario. Esto tiene implicaciones directas sobre cómo deben interpretarse los requisitos:

- Los requisitos de **lectura** (ver catálogo, ver producto, ver stock) se satisfacen mayormente con contenido **pre-renderizado en tiempo de build**, salvo el stock, que exige una consulta en tiempo real (ver RNF-03).
- Los requisitos de **escritura** (calificaciones, comentarios, panel de administración) se satisfacen mediante funciones **serverless** que actúan como proxy seguro hacia el CMS.

### 2.2 Funciones del Producto (Resumen)

1. **Catálogo público**: exploración, búsqueda (tolerante a errores, con autocompletado y sinónimos), categorización, detalle de productos con stock en tiempo real y descubrimiento mediante productos similares y productos vistos recientemente.
2. **Interacción social**: calificaciones por estrellas y comentarios de texto (opcionales).
3. **Conversión a venta**: enlace directo a WhatsApp desde la ficha de producto.
4. **Panel de administración** *(Release 2; en el Release 1 la gestión se realiza con Sanity Studio)*: autenticación, gestión de catálogo (CRUD parcial), gestión de stock, personalización visual (colores y elementos gráficos).
5. **Optimización y alcance**: SEO mediante metadatos dinámicos, integración con redes sociales, analítica de tráfico.

### 2.3 Características de los Usuarios / Actores

| Actor | Descripción | Nivel de acceso |
|---|---|---|
| **Usuario General** | Visitante público del sitio. No requiere registro ni autenticación (RNF-01). Puede navegar, buscar, calificar y comentar. | Público, sin privilegios administrativos |
| **Administrador** | Responsable de la gestión del negocio (dueño/operador de LectorPobre). Accede mediante usuario y contraseña. | Autenticado, acceso exclusivo al panel de control |
| **Sistema (LectorPobre)** | El conjunto de componentes (frontend, funciones serverless, CMS) actuando de forma autónoma (p. ej., generación de metadatos, paginación). | N/A |

No se contempla un tercer rol (p. ej. "editor" con permisos parciales) en el alcance actual; todo usuario autenticado en el panel se asume con privilegios de Administrador completos.

### 2.4 Restricciones Generales

- El sistema debe operar bajo el modelo arquitectónico **Jamstack** ya definido (no MVC tradicional), lo cual condiciona cómo se implementan RNF-03 y RNF-04.
- El backend dinámico debe ser **stateless** (funciones serverless en Go), lo que impacta directamente el diseño de RNF-04 (seguridad sin estado).
- El almacenamiento de datos se realiza en un **CMS Headless (Sanity.io)**, por lo que cualquier requisito de "edición de contenido" (RF-11 a RF-16) se traduce en operaciones sobre documentos NoSQL vía API/GROQ.
- El despliegue se realiza en una **plataforma unificada (Vercel)**, lo que condiciona el modelo de costos y disponibilidad.
- **No existe servidor permanente ni base de datos transaccional tradicional** (el servidor de funciones solo se activa bajo petición, por presupuesto del cliente). Por tanto, la búsqueda avanzada se ejecuta en el **cliente** y los cálculos de recomendación se ejecutan en **build time**; no se incluyen en el alcance índices en memoria de servidor, modelos de ML en línea ni servicios externos de búsqueda de pago (ver RNF-07).

### 2.5 Supuestos y Dependencias

- Se asume que existe un número de contacto de WhatsApp válido y gestionado por la empresa (RF-17).
- Se asume que la empresa cuenta con presencia en redes sociales activas para RF-05.
- Se asume que el servicio de analítica externo (RNF-06) será determinado en una fase posterior (p. ej. Google Analytics, Plausible, u otro) — no se define herramienta específica en la fuente de requisitos.
- El sistema depende de la disponibilidad de los servicios de terceros: Sanity.io (CMS) y Vercel (hosting/funciones), ya definidos en el Stack Tecnológico.

---

## 3. Requisitos Específicos

Cada requisito se presenta con: **Descripción** (texto literal de la fuente), **Actor** principal, **Prioridad** (Must/Should/Could, escala MoSCoW), **Criterios de aceptación sugeridos**, y **Componente(s) arquitectónico(s)** responsables (trazabilidad).

### 3.1 Requisitos Funcionales (RF)

#### 3.1.1 Módulo: Catálogo Público y Descubrimiento

**RF-01**
- **Descripción:** El sistema debe mostrar el catálogo de productos disponibles a los usuarios generales.
- **Actor:** Usuario General
- **Prioridad:** Must (crítico / core del producto)
- **Criterios de aceptación sugeridos:**
  - Al acceder a la página principal, se listan todos los productos activos del catálogo.
  - Cada tarjeta de producto muestra al menos: imagen, nombre y estado de disponibilidad.
- **Componente arquitectónico:** Frontend Nuxt.js (SSG) — contenido pre-renderizado en build time a partir de Sanity.io.

**RF-02**
- **Descripción:** El sistema debe mostrar la información detallada de un producto cuando el usuario general lo seleccione.
- **Actor:** Usuario General
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Al seleccionar un producto, se navega a una vista de detalle con descripción, imágenes y atributos relevantes.
  - La URL de detalle es única y compartible por producto.
- **Componente arquitectónico:** Frontend Nuxt.js (rutas dinámicas pre-renderizadas por producto).

**RF-03**
- **Descripción:** El sistema debe mostrar el estado actual de inventario (stock) cuando el usuario general visualice los detalles del producto.
- **Actor:** Usuario General
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - El stock mostrado refleja el valor actual en la base de datos al momento de la consulta (no el valor congelado en el build).
  - Se distingue visualmente entre "disponible", "stock bajo" y "agotado" (regla de negocio a definir con el cliente).
- **Componente arquitectónico:** Consulta en tiempo real a Sanity.io (ver RNF-03) — posiblemente vía función serverless o consulta directa desde el cliente a la API de Sanity, a definir en diseño técnico.

**RF-04**
- **Descripción:** El sistema debe agrupar y mostrar los productos divididos por categorías predefinidas.
- **Actor:** Usuario General
- **Prioridad:** Should
- **Criterios de aceptación sugeridos:**
  - Existe una vista o filtro que permite navegar el catálogo por categoría.
  - Las categorías son administrables desde Sanity Studio (dato estructurado, no hardcodeado).
- **Componente arquitectónico:** Modelo de datos en Sanity.io (esquema de categorías) + Frontend Nuxt.js.

**RF-18**
- **Descripción:** El sistema debe permitir a los usuarios generales buscar productos específicos mediante el ingreso de palabras clave.
- **Actor:** Usuario General
- **Prioridad:** Should
- **Criterios de aceptación sugeridos:**
  - Existe un campo de búsqueda accesible desde el catálogo.
  - La búsqueda filtra por nombre y/o descripción del producto en tiempo real (client-side, dado que el catálogo es estático).
  - **(Ampliación v1.1)** La búsqueda es **tolerante a errores tipográficos** (búsqueda difusa/*fuzzy*): por ejemplo, "yavero" encuentra "llavero".
  - **(Ampliación v1.1)** La búsqueda **ignora mayúsculas y acentos** ("acrilico" coincide con "acrílico").
  - **(Ampliación v1.1)** Los resultados se **ordenan por relevancia** con ponderación por campo: nombre > palabras clave/sinónimos > categoría > descripción.
  - **(Ampliación v1.1)** Mientras el usuario escribe se muestran **sugerencias de autocompletado** (productos y categorías).
  - **(Ampliación v1.1)** Si no hay coincidencias, se muestra un estado vacío informativo con **productos sugeridos** (los mejor calificados o de categorías afines) en lugar de una pantalla vacía.
  - **(Ampliación v1.1)** El índice de búsqueda se carga de forma **diferida** (al enfocar el campo de búsqueda) para no afectar el rendimiento inicial (RNF-02, RNF-07).
  - **(Ampliación v1.1)** El mecanismo de búsqueda está detrás de una **interfaz desacoplada** (ver RNF-08) para poder reemplazar el motor sin cambiar la interfaz de usuario.
- **Componente arquitectónico:** Frontend Nuxt.js (búsqueda client-side sobre el dataset pre-renderizado/hidratado, con índice difuso generado en build time y cargado de forma diferida). Decisión de motor: **Fuse.js** (ver §7.4); **MiniSearch** queda como alternativa de contingencia si el catálogo crece.

**RF-19**
- **Descripción:** El sistema debe implementar paginación o carga diferida en el catálogo general cuando la cantidad de productos a mostrar supere un límite preestablecido.
- **Actor:** Usuario General / Sistema
- **Prioridad:** Should
- **Criterios de aceptación sugeridos:**
  - Se define un umbral (p. ej. N productos) a partir del cual se activa paginación o "infinite scroll" / lazy loading.
  - El mecanismo elegido no degrada el rendimiento percibido (ver RNF-02).
- **Componente arquitectónico:** Frontend Nuxt.js.

**RF-20**
- **Descripción:** El sistema debe incrustar metadatos dinámicos en la vista detallada de cada producto para generar vistas previas automáticas al compartir la URL en plataformas externas.
- **Actor:** Sistema
- **Prioridad:** Should
- **Criterios de aceptación sugeridos:**
  - Cada página de producto genera metaetiquetas Open Graph / Twitter Cards (título, imagen, descripción) específicas del producto.
  - Al compartir la URL en redes sociales o mensajería (incluido WhatsApp, ver RF-17), se muestra una vista previa correcta.
- **Componente arquitectónico:** Frontend Nuxt.js (generación de metadatos en tiempo de build, capacidad nativa de SSG/SEO del stack).

**RF-21** *(añadido en v1.1)*
- **Descripción:** El sistema debe mostrar, en la vista detallada de un producto, una lista de productos similares calculada a partir del contenido de los productos.
- **Actor:** Usuario General / Sistema
- **Prioridad:** Should
- **Criterios de aceptación sugeridos:**
  - La ficha de producto muestra una sección "Productos similares" con entre 4 y 6 productos.
  - La similitud se calcula **exclusivamente a partir del contenido** del producto (nombre, descripción, categoría, palabras clave y rango de precio); **no se utilizan datos de usuarios, historial ni comportamiento** (algoritmo basado en contenido, no colaborativo ni híbrido).
  - El cálculo se realiza en **build time** (TF-IDF + similitud coseno) y se publica como archivo estático versionado; **no requiere servidor ni base de datos** en tiempo de ejecución.
  - El producto actual nunca aparece en su propia lista; los productos agotados (stock 0) se muestran con menor prioridad o se excluyen según la regla definida en diseño.
  - Si el catálogo tiene menos de 2 productos, o el producto carece de contenido suficiente, el sistema recurre a una **regla de respaldo** (misma categoría y precio cercano, o mejor calificados) sin mostrar errores.
  - Las recomendaciones se actualizan automáticamente en cada *rebuild* disparado por el webhook de Sanity (RF-11, RF-13).
  - El resultado se genera con un contrato de datos versionado que **admite un campo opcional de agrupación (`clusterId`)** para una futura incorporación de *clustering* (ver §7.5 y RNF-08).
- **Componente arquitectónico:** Script de build (Node/TypeScript) ejecutado durante `nuxt generate` que consume Sanity y emite `recommendations.json`; Frontend Nuxt.js (componente de presentación).

**RF-22** *(añadido en v1.1)*
- **Descripción:** El sistema debe mostrar al usuario general los productos que ha visto recientemente en el sitio.
- **Actor:** Usuario General
- **Prioridad:** Could
- **Criterios de aceptación sugeridos:**
  - Se muestra una sección "Vistos recientemente" con hasta 6 productos, en el catálogo o en la ficha de producto.
  - La información se almacena **únicamente en el navegador del usuario** (`localStorage`); no se envía a ningún servidor ni se asocia a una identidad (compatible con RNF-01).
  - Los productos que dejaron de existir tras un *rebuild* se omiten sin generar errores.
  - El usuario puede limpiar su historial desde la interfaz.
- **Componente arquitectónico:** Frontend Nuxt.js (composable `useRecentlyViewed` + `localStorage`).

**RF-23** *(añadido en v1.1)*
- **Descripción:** El administrador debe poder definir palabras clave y sinónimos de búsqueda para los productos desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Could
- **Criterios de aceptación sugeridos:**
  - Cada producto dispone de un campo opcional de palabras clave en Sanity Studio.
  - Existe una lista global de sinónimos (p. ej. "llavero" = "keychain", "sticker" = "calcomanía") editable desde `configuracionGlobal`.
  - Los cambios se reflejan en la búsqueda (RF-18) y en las recomendaciones (RF-21) tras el siguiente *rebuild*.
- **Componente arquitectónico:** Esquemas de Sanity.io (`producto`, `configuracionGlobal`) + índice de búsqueda y script de recomendaciones en build time.

#### 3.1.2 Módulo: Interacción Social y Conversión

**RF-05**
- **Descripción:** El sistema debe incluir iconos visuales que redirijan a las redes sociales oficiales de la empresa.
- **Actor:** Usuario General
- **Prioridad:** Should
- **Criterios de aceptación sugeridos:**
  - Los iconos son visibles de forma consistente (p. ej. header o footer) en todas las páginas.
  - Cada icono enlaza a la red social correcta y se abre en una nueva pestaña.
- **Componente arquitectónico:** Frontend Nuxt.js (configuración estática o gestionada desde Sanity Studio).

**RF-06**
- **Descripción:** El sistema debe permitir a los usuarios generales asignar una calificación basada en un sistema de estrellas al producto (Requisito Opcional).
- **Actor:** Usuario General
- **Prioridad:** Could (marcado como opcional en la fuente)
- **Criterios de aceptación sugeridos:**
  - El usuario puede seleccionar de 1 a 5 estrellas en la vista de detalle del producto.
  - La calificación se persiste y actualiza el promedio visible del producto.
  - Se aplican medidas anti-abuso (ver RNF-04 y modelo de seguridad de la arquitectura).
- **Componente arquitectónico:** Función serverless en Go (`/api/calificar` o similar) → escritura validada en Sanity.io.

**RF-07**
- **Descripción:** El sistema debe permitir a los usuarios generales publicar comentarios de texto en la vista detallada del producto (Requisito Opcional).
- **Actor:** Usuario General
- **Prioridad:** Could (marcado como opcional en la fuente)
- **Criterios de aceptación sugeridos:**
  - El usuario puede escribir y enviar un comentario asociado al producto.
  - El comentario pasa por validación de entrada (longitud, sanitización) antes de persistirse.
  - Se recomienda definir con el cliente si los comentarios requieren moderación previa del administrador.
- **Componente arquitectónico:** Función serverless en Go (`/api/comentar`) → escritura validada en Sanity.io.

**RF-17**
- **Descripción:** El sistema debe habilitar una vía de comunicación directa hacia WhatsApp desde la vista detallada del producto para que el usuario general inicie el proceso de compra.
- **Actor:** Usuario General
- **Prioridad:** Must (mecanismo principal de conversión, dado que no hay carrito/pago en línea)
- **Criterios de aceptación sugeridos:**
  - Existe un botón/enlace "Comprar por WhatsApp" (o equivalente) en la ficha de producto.
  - El enlace utiliza el esquema `wa.me` o API de WhatsApp Business con un mensaje prellenado que referencia el producto.
- **Componente arquitectónico:** Frontend Nuxt.js (enlace estático generado con datos del producto).

#### 3.1.3 Módulo: Panel de Administración

> **Nota de alcance (v1.2):** los requisitos RF-08 a RF-16 se entregan en el **Release 2** desde el Panel de Control propio (`panelControlImplementacion.md`). En el **Release 1**, RF-11 a RF-16 se cubren mediante **Sanity Studio** (con su autenticación gestionada por Sanity) y RF-08 a RF-10 no aplican a la tienda pública. La mención de "dashboard propio" en RF-14 corresponde al Release 2.

**RF-08**
- **Descripción:** El sistema debe permitir al administrador iniciar sesión ingresando un nombre de usuario y una contraseña válida.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Existe un formulario de login accesible en una ruta dedicada (no indexada públicamente).
  - Las credenciales inválidas muestran un mensaje de error genérico (sin revelar si el usuario existe).
  - Las contraseñas nunca se transmiten ni almacenan en texto plano.
- **Componente arquitectónico:** Función serverless en Go (autenticación) + mecanismo de sesión/token (ver RNF-04).

**RF-09**
- **Descripción:** El sistema debe permitir al administrador cerrar su sesión activa de forma segura.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Existe una acción explícita de "Cerrar sesión".
  - Al cerrar sesión, el token/credencial de acceso se invalida de forma efectiva (no solo se borra en cliente).
- **Componente arquitectónico:** Función serverless en Go (invalidación de sesión/token).

**RF-10**
- **Descripción:** El sistema debe proporcionar un panel de administración accesible únicamente después de una autenticación exitosa.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Cualquier intento de acceder al panel sin sesión válida redirige al login.
  - Las rutas y llamadas a funciones serverless del panel validan el token en cada solicitud (dado el backend sin estado).
- **Componente arquitectónico:** Frontend Nuxt.js (rutas protegidas) + funciones serverless en Go (validación de token en cada request).

**RF-11**
- **Descripción:** El administrador debe poder editar la información de texto descriptiva de un producto desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - El administrador puede modificar nombre, descripción y demás campos de texto de un producto existente.
  - Los cambios se reflejan en Sanity.io y disparan una reconstrucción del sitio (ver flujo de "Tiempo de Construcción" en la arquitectura).
- **Componente arquitectónico:** Sanity Studio / función serverless con permisos de escritura sobre Sanity.io + Webhook de rebuild en Vercel.

**RF-12**
- **Descripción:** El administrador debe poder modificar la imagen representativa de un producto desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - El administrador puede subir/reemplazar la imagen principal de un producto.
  - Se valida formato y tamaño del archivo antes de subirlo.
- **Componente arquitectónico:** Sanity Studio (gestión de assets) + Sanity Asset Pipeline.

**RF-13**
- **Descripción:** El administrador debe poder agregar o eliminar productos del catálogo visible desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - El administrador puede crear un nuevo documento de producto con los campos mínimos requeridos.
  - El administrador puede eliminar o despublicar un producto, y este deja de aparecer en el catálogo tras la siguiente reconstrucción.
- **Componente arquitectónico:** Sanity Studio + Webhook de rebuild en Vercel.

**RF-14**
- **Descripción:** El administrador debe poder visualizar y monitorear el stock disponible de todos los productos desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Existe una vista consolidada (tabla/listado) del stock de todos los productos.
  - El administrador puede identificar rápidamente productos con stock bajo o agotado.
- **Componente arquitectónico:** Sanity Studio (vista de documentos) o dashboard propio consultando Sanity.io.

**RF-15**
- **Descripción:** El administrador debe poder cambiar la paleta de colores de la página web desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Could
- **Criterios de aceptación sugeridos:**
  - Existe un conjunto de paletas predefinidas (o un selector de color) gestionable como dato de configuración.
  - El cambio de paleta se refleja en el sitio tras la siguiente reconstrucción (dado el modelo SSG).
- **Componente arquitectónico:** Esquema de configuración global en Sanity.io + Tailwind CSS (tokens de diseño dinámicos) + Frontend Nuxt.js.

**RF-16**
- **Descripción:** El administrador debe poder intercambiar los elementos visuales de la página web por otras opciones predefinidas desde el panel de control.
- **Actor:** Administrador
- **Prioridad:** Could
- **Criterios de aceptación sugeridos:**
  - Existe un conjunto cerrado de "temas" o variantes visuales predefinidas (no un editor visual libre).
  - El administrador puede seleccionar y aplicar una variante desde Sanity Studio.
- **Componente arquitectónico:** Esquema de configuración global en Sanity.io + Frontend Nuxt.js (renderizado condicional de variantes).

---

### 3.2 Requisitos No Funcionales (RNF)

Los RNF se clasifican según categorías de calidad de software (basadas en ISO/IEC 25010) para facilitar su verificación.

**RNF-01 — Usabilidad / Accesibilidad de acceso**
- **Descripción:** El sistema debe permitir la navegación completa por el catálogo de productos sin solicitar autenticación o registro a los usuarios generales.
- **Categoría:** Usabilidad
- **Criterio de aceptación sugerido:** Ninguna ruta pública del catálogo (listado, detalle, búsqueda) debe requerir login; solo el panel de administración está protegido.
- **Componente arquitectónico:** Frontend Nuxt.js (contenido público estático, sin middleware de autenticación).

**RNF-02 — Rendimiento de interfaz**
- **Descripción:** El sistema debe procesar y mostrar animaciones en la interfaz de usuario sin generar un impacto negativo perceptible en el rendimiento y la velocidad de carga.
- **Categoría:** Rendimiento / Eficiencia
- **Criterio de aceptación sugerido:** Las animaciones no deben degradar métricas Core Web Vitals (p. ej. LCP, CLS, INP); se recomienda validar con Lighthouse/PageSpeed Insights en cada release.
- **Componente arquitectónico:** Frontend Nuxt.js + Tailwind CSS (animaciones vía CSS/utilidades ligeras, evitando librerías pesadas de JS).

**RNF-03 — Consistencia de datos en tiempo real**
- **Descripción:** El sistema debe consultar en tiempo real el stock del producto con la base de datos principal al momento de desplegar sus detalles al usuario.
- **Categoría:** Rendimiento / Exactitud funcional
- **Criterio de aceptación sugerido:** El valor de stock mostrado no debe depender del contenido pre-renderizado en el último build; debe reflejar el estado actual en Sanity.io con una latencia aceptable (a definir, p. ej. < 1-2s).
- **Componente arquitectónico:** Excepción al modelo SSG puro — consulta dinámica (client-side fetch o función serverless) a la API de Sanity.io en el momento de la visualización del detalle.

**RNF-04 — Seguridad del backend sin estado**
- **Descripción:** El sistema debe proteger las operaciones del administrador aplicando medidas de seguridad contra vulnerabilidades asociadas a una arquitectura de backend sin estado.
- **Categoría:** Seguridad
- **Criterio de aceptación sugerido:** Las funciones serverless deben validar identidad/autorización en cada invocación (no hay sesión persistente en servidor); los tokens/secretos deben almacenarse cifrados como variables de entorno y nunca exponerse al cliente; se deben mitigar riesgos propios de serverless (p. ej. inyección GROQ, abuso económico por invocaciones excesivas, fuga de estado entre invocaciones "warm", falsificación de webhooks).
- **Componente arquitectónico:** Funciones serverless en Go + variables de entorno cifradas en Vercel + capa de autenticación/autorización del panel.

**RNF-05 — Compatibilidad / Diseño responsivo**
- **Descripción:** El sistema debe adaptar todos sus elementos visuales y estructurales para garantizar una navegación funcional en pantallas de dispositivos móviles.
- **Categoría:** Portabilidad / Compatibilidad
- **Criterio de aceptación sugerido:** El sitio debe ser completamente funcional y legible en anchos de viewport desde ~320px hasta escritorio, siguiendo un enfoque mobile-first.
- **Componente arquitectónico:** Tailwind CSS (sistema de utilidades responsivas) + Frontend Nuxt.js.

**RNF-06 — Observabilidad de tráfico**
- **Descripción:** El sistema debe registrar el tráfico de visitantes y sus interacciones en la plataforma mediante la integración de un servicio de analítica externo.
- **Categoría:** Observabilidad / Mantenibilidad
- **Criterio de aceptación sugerido:** Se integra un script/servicio de analítica (a seleccionar por el cliente, p. ej. Google Analytics 4, Plausible, Vercel Analytics) que registra visitas y eventos clave (vista de producto, clic en WhatsApp, búsquedas).
- **Componente arquitectónico:** Frontend Nuxt.js (integración de script de analítica) + servicio externo de terceros.

**RNF-07 — Rendimiento y costo de búsqueda y recomendación** *(añadido en v1.1)*
- **Descripción:** El sistema debe ejecutar la búsqueda y las recomendaciones sin requerir un servidor permanente, una base de datos adicional ni servicios externos de pago, y sin degradar el rendimiento de la interfaz.
- **Categoría:** Rendimiento / Eficiencia / Costo
- **Criterio de aceptación sugerido:** la búsqueda responde en menos de 100 ms para catálogos de hasta 2000 productos; el índice se carga de forma diferida y su peso comprimido no supera los 150 KB para 500 productos; el cálculo de recomendaciones completo añade menos de 30 s al tiempo de build para 2000 productos; Lighthouse Performance se mantiene ≥ 90 en móvil; el costo operativo adicional es $0.
- **Componente arquitectónico:** Frontend Nuxt.js (búsqueda client-side) + script de build (recomendaciones) + CDN de Vercel (archivos estáticos).

**RNF-08 — Extensibilidad de búsqueda y recomendación** *(añadido en v1.1)*
- **Descripción:** El sistema debe estructurar los módulos de búsqueda y recomendación de forma desacoplada y modular para permitir incorporar nuevos algoritmos (p. ej. *clustering*) o reemplazar el motor de búsqueda sin modificar la interfaz de usuario ni el modelo de datos de Sanity.
- **Categoría:** Mantenibilidad / Extensibilidad
- **Criterio de aceptación sugerido:** existe una interfaz `SearchEngine` (adaptador) y una interfaz `RecommendationStrategy` con implementaciones intercambiables; el pipeline de recomendación está dividido en etapas independientes (normalización, vectorización, similitud y, en el futuro, agrupación); los vectores intermedios se generan como artefacto de build reutilizable; el formato de `recommendations.json` incluye `schemaVersion` y un campo opcional `clusterId`; sustituir Fuse.js por MiniSearch o incorporar K-Means se logra añadiendo una implementación sin modificar componentes de UI; existen pruebas unitarias del contrato de cada interfaz.
- **Componente arquitectónico:** Capa `composables/search` y `scripts/recommendations` del repositorio (ver Plan de Implementación §3.12).

---

## 4. Matriz de Trazabilidad (Requisito → Componente Arquitectónico)

| Requisito | Frontend (Nuxt.js/Vue/Tailwind) | Backend Serverless (Go) | CMS (Sanity.io) | Infraestructura (Vercel) |
|---|:---:|:---:|:---:|:---:|
| RF-01 | ✔ (SSG) | | ✔ (fuente) | ✔ (CDN) |
| RF-02 | ✔ (SSG) | | ✔ (fuente) | ✔ (CDN) |
| RF-03 | ✔ (consulta) | (posible proxy) | ✔ (real time) | |
| RF-04 | ✔ | | ✔ (esquema categorías) | |
| RF-05 | ✔ | | (config opcional) | |
| RF-06 | ✔ (UI) | ✔ (validación/escritura) | ✔ (persistencia) | |
| RF-07 | ✔ (UI) | ✔ (validación/escritura) | ✔ (persistencia) | |
| RF-08 | ✔ (login UI) | ✔ (autenticación) | | |
| RF-09 | ✔ (UI) | ✔ (invalidación sesión) | | |
| RF-10 | ✔ (rutas protegidas) | ✔ (validación token) | | |
| RF-11 | (Sanity Studio) | | ✔ | ✔ (rebuild) |
| RF-12 | (Sanity Studio) | | ✔ | |
| RF-13 | (Sanity Studio) | | ✔ | ✔ (rebuild) |
| RF-14 | (Sanity Studio) | | ✔ | |
| RF-15 | ✔ (render) | | ✔ (config) | ✔ (rebuild) |
| RF-16 | ✔ (render) | | ✔ (config) | ✔ (rebuild) |
| RF-17 | ✔ | | | |
| RF-18 | ✔ (client-side, índice difuso) | | ✔ (fuente de datos y sinónimos) | ✔ (CDN del índice) |
| RF-19 | ✔ | | | |
| RF-20 | ✔ (SSG metadata) | | ✔ (fuente) | |
| RF-21 | ✔ (UI "similares") | | ✔ (fuente) | ✔ (build + CDN) |
| RF-22 | ✔ (localStorage) | | | |
| RF-23 | | | ✔ (campos de palabras clave y sinónimos) | ✔ (rebuild) |
| RNF-01 | ✔ | | | |
| RNF-02 | ✔ | | | |
| RNF-03 | ✔ (consulta) | (posible proxy) | ✔ | |
| RNF-04 | | ✔ | | ✔ (env vars) |
| RNF-05 | ✔ | | | |
| RNF-06 | ✔ (script) | | | (servicio externo) |
| RNF-07 | ✔ (búsqueda client-side) | | | ✔ (build + CDN) |
| RNF-08 | ✔ (interfaces y adaptadores) | | | ✔ (script de build) |

> **Nota (v1.2):** las filas de RF-08 a RF-16 (módulo de administración) se materializan en el Release 2 sobre el Panel de Control propio (funciones Go `/api/admin/*` + Sanity). Hasta entonces el Release 1 las cubre con Sanity Studio. Ver `panelControlImplementacion.md` §7.

---

## 5. Resumen de Casos de Uso Principales

| Caso de Uso | Actor(es) | Requisitos relacionados |
|---|---|---|
| Explorar catálogo y buscar producto | Usuario General | RF-01, RF-04, RF-18, RF-19, RF-23 |
| Descubrir productos similares y vistos recientemente | Usuario General / Sistema | RF-21, RF-22 |
| Consultar detalle y stock de un producto | Usuario General | RF-02, RF-03, RF-20 |
| Calificar y comentar un producto | Usuario General | RF-06, RF-07 |
| Iniciar compra vía WhatsApp | Usuario General | RF-17 |
| Iniciar sesión / cerrar sesión | Administrador | RF-08, RF-09 |
| Gestionar catálogo (crear/editar/eliminar productos, imágenes, stock) | Administrador | RF-10, RF-11, RF-12, RF-13, RF-14 |
| Personalizar apariencia del sitio | Administrador | RF-15, RF-16 |
| Compartir producto en redes/mensajería | Usuario General / Sistema | RF-20, RF-05 |

---

## 6. Glosario

- **Catálogo:** conjunto de productos publicados y visibles para los usuarios generales.
- **Producto:** entidad central del sistema, con atributos como nombre, descripción, imagen, categoría y stock.
- **Panel de administración:** interfaz privada para la gestión del catálogo y la configuración visual.
- **Requisito Opcional:** requisito marcado explícitamente como no crítico en la fuente (RF-06, RF-07), sujeto a priorización posterior.
- **Rebuild / Reconstrucción:** proceso por el cual Nuxt.js regenera los archivos estáticos del sitio a partir del contenido actualizado en Sanity.io.
- **Búsqueda difusa (*fuzzy search*):** búsqueda que tolera errores tipográficos y variaciones de escritura.
- **TF-IDF:** técnica que pondera la importancia de cada término de un texto según su frecuencia en el producto y su rareza en el catálogo.
- **Similitud coseno:** medida del parecido entre dos productos representados como vectores de términos.
- **Recomendación basada en contenido:** técnica que sugiere productos parecidos usando únicamente sus atributos (texto, categoría, precio), sin datos de usuarios.
- **Filtrado colaborativo / sistema híbrido:** técnicas que usan el comportamiento de usuarios; **excluidas** del alcance (ver §7.4).
- **Clustering:** agrupación automática de productos por similitud (p. ej. K-Means); **no incluido en el alcance actual**, pero previsto como evolución futura (ver §7.5).

---

## 7. Restricciones, Supuestos y Temas Abiertos

### 7.1 Restricciones
- No se contempla pasarela de pago ni carrito de compras en el alcance actual.
- El backend debe permanecer stateless por decisión arquitectónica (impacta RF-08, RF-09, RF-10, RNF-04).
- El stock debe consultarse en tiempo real, lo que introduce una excepción al modelo SSG puro (impacta RF-03, RNF-03).
- La búsqueda y las recomendaciones deben operar sin servidor permanente, sin base de datos adicional y sin servicios de pago (impacta RF-18, RF-21, RNF-07). Las recomendaciones **no utilizan datos de usuarios** (impacta RF-21, RF-22, RNF-01).

### 7.2 Supuestos
- La empresa proveerá contenido inicial del catálogo (productos, imágenes, categorías) para la carga inicial.
- Existe un único rol administrador; no se requieren permisos granulares por ahora.
- El servicio de analítica (RNF-06) y las redes sociales a enlazar (RF-05) serán confirmados por el cliente antes del desarrollo.
- **Tamaño del catálogo:** actualmente de 20 a 30 productos; se proyecta hasta ~100 productos en el siguiente año; **no se espera superar los 2000 productos** y, en cualquier caso, no en un lapso reducido. El diseño de búsqueda y recomendación (RNF-07) se dimensiona para ese rango.

### 7.3 Temas Abiertos (a validar con la parte interesada)
1. ¿Los comentarios (RF-07) requieren moderación previa por el administrador antes de publicarse?
2. ¿Cuál es el umbral exacto de productos que activa la paginación/carga diferida (RF-19)?
3. ¿Qué constituye "stock bajo" vs "agotado" para efectos de UI (RF-03, RF-14)?
4. ¿Qué servicio de analítica externo se utilizará (RNF-06)?
5. ¿Cuántas paletas de colores y variantes visuales predefinidas se ofrecerán (RF-15, RF-16)? → **Resuelto:** 5 paletas armónicas inspiradas en la mascota (Periquito azul, pañoleta roja, fondo verde pastel) y la tradición mexicana/yucateca (Identidad Lector Pobre, Cartel Lucha Libre, Cenote Sagrado, Bugambilia & Paseo Montejo, Barro Maya) más opción de paleta personalizada Hex en Sanity Studio.
6. ¿Existe un límite de longitud o política de contenido para comentarios y calificaciones (moderación anti-abuso)?
7. ¿Los productos agotados deben excluirse de la lista de similares (RF-21) o mostrarse con menor prioridad y etiqueta "Agotado"? → Por defecto se muestran con menor prioridad.
8. ¿Qué sinónimos iniciales deben cargarse en `configuracionGlobal` (RF-23)? → A proveer por el cliente.
9. ¿Se desea mostrar "Vistos recientemente" (RF-22) en el catálogo, en la ficha de producto o en ambos?
10. ¿Bajo qué dominio/subdominio se alojará el Panel de Control (Release 2) y qué protección adicional de acceso se desea (restricción por IP, Zero Trust, 2FA)? → Ver `panelControlImplementacion.md` §3.

### 7.4 Decisiones de Diseño: Búsqueda Avanzada y Recomendaciones (v1.1)

Decisión tomada tras el análisis de factibilidad documentado en `Analisis_Busqueda_Recomendacion_LectorPobre.md`. Esta funcionalidad **no estaba planificada originalmente**; se incorpora como valor añadido respetando la arquitectura Jamstack y el presupuesto del cliente.

| # | Decisión | Detalle | Requisitos |
|---|---|---|---|
| DD-01 | Búsqueda difusa en cliente con **Fuse.js** | Adecuada para el rango previsto (20–30 productos hoy, ~100 el próximo año, tope esperado de 2000). Tolerancia a errores, normalización de acentos, pesos por campo. | RF-18, RNF-07 |
| DD-02 | **MiniSearch** como motor de contingencia | Se adopta si el catálogo se acerca a ~1000+ productos o si se requiere búsqueda por prefijo / BM25. Reemplazo posible sin cambios de UI gracias al adaptador `SearchEngine`. | RF-18, RNF-08 |
| DD-03 | Autocompletado, sinónimos y estado vacío con sugerencias | Mejoras de bajo costo para la experiencia de búsqueda. Sinónimos y palabras clave administrables desde Sanity. | RF-18, RF-23 |
| DD-04 | Recomendación **basada en contenido** (TF-IDF + similitud coseno) en **build time** | Algoritmo explicable y determinista; resultado publicado como `recommendations.json` estático. Reglas de respaldo (categoría/precio/calificación). | RF-21, RNF-07 |
| DD-05 | **Sin datos de usuarios** | Quedan descartados el filtrado colaborativo y los sistemas híbridos (no existen cuentas, historial ni volumen de interacciones; además implicarían servidor/BD). | RF-21, RNF-01 |
| DD-06 | "Vistos recientemente" en `localStorage` | Sin envío de datos al servidor; no genera obligaciones de consentimiento. | RF-22 |
| DD-07 | Sin servicios de pago ni servidor persistente | Se descartan Algolia, Meilisearch Cloud, embeddings/vectores y funciones Go de búsqueda dedicadas, por costo y *cold starts*. | RNF-07 |
| DD-08 | Arquitectura **extensible por diseño** | Interfaces `SearchEngine` y `RecommendationStrategy`, pipeline por etapas, vectores como artefacto intermedio y contrato de datos versionado con `clusterId` opcional. | RNF-08 |

> **Estimación de esfuerzo acordada:** versión completa de 5 a 7 días de desarrollo (MVP funcional en 2 a 3 días), con costo operativo adicional de $0.

### 7.5 Evolución Futura (Fuera del Alcance Actual)

Las siguientes evoluciones **no forman parte del alcance actual**, pero la implementación de §7.4 debe construirse de forma que no las impida ni las encarezca (RNF-08).

**7.5.1 Incorporación futura de *clustering***

- **Estado:** puerta abierta; no implementado en esta versión. Con el tamaño actual del catálogo, el *clustering* aportaría poco frente a las categorías de Sanity (agrupaciones inestables con pocos productos).
- **Escenarios que lo justificarían:** catálogo mayor a ~500–1000 productos, necesidad de generar "colecciones sugeridas" o de descubrir agrupaciones no cubiertas por las categorías.
- **Algoritmos candidatos:** K-Means o clustering jerárquico sobre los vectores TF-IDF ya generados.
- **Preparación obligatoria en la implementación actual:**
  1. Los vectores TF-IDF se generan y persisten como **artefacto intermedio de build** independiente de la etapa de similitud.
  2. El pipeline se divide en etapas desacopladas (normalización, vectorización, similitud) a las que podrá añadirse una etapa de agrupación.
  3. `recommendations.json` incluye `schemaVersion` y un campo opcional `clusterId` (nulo en esta versión).
  4. La interfaz `RecommendationStrategy` permite componer o sustituir estrategias (p. ej. similitud dentro del mismo *cluster*).
  5. La UI consume únicamente el contrato de datos, no el algoritmo.
- **Costo estimado de adición futura:** 3 a 5 días, sin cambios de infraestructura (cálculo en build time).

**7.5.2 Migración condicional a servidor y base de datos dedicados**

- **Estado:** posibilidad abierta **únicamente en caso de ser estrictamente necesario**. No está planificada y **no debe emprenderse** mientras la arquitectura Jamstack/serverless satisfaga los requisitos.
- **Condiciones disparadoras (cualquiera de ellas, validada con mediciones):**
  - El catálogo supera de forma sostenida ~2000 productos y la búsqueda client-side o el *build* dejan de cumplir RNF-07.
  - Se requiere personalización por usuario (filtrado colaborativo o sistema híbrido), lo que exigiría cuentas de usuario y almacenamiento de comportamiento.
  - Se requiere búsqueda semántica o recomendaciones basadas en *embeddings*/vectores que no puedan ejecutarse en cliente ni en build.
  - Se requiere ranking en tiempo real con datos de interacción masivos.
- **Alcance posible de la migración:** servicio de búsqueda dedicado (p. ej. Meilisearch/Typesense), base de datos con soporte de vectores, servidor persistente o contenedores para el cálculo de recomendaciones.
- **Implicaciones a evaluar previamente:** costos recurrentes, operación y monitoreo, privacidad y consentimiento de datos de usuarios, y revisión de este ERS (RNF-01, restricciones §2.4 y §7.1).
- **Mitigación del riesgo de migración:** el desacoplamiento de RNF-08 (adaptador `SearchEngine` y `RecommendationStrategy`) permite sustituir los motores por servicios externos sin reescribir la interfaz.

---

*Documento generado a partir de la fuente oficial de requisitos del proyecto LectorPobre, enriquecido con criterios de aceptación, priorización y trazabilidad arquitectónica para su uso como ERS de referencia durante el desarrollo.*
