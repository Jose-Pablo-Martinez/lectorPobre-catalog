# Especificación de Requisitos de Software (ERS)
## Proyecto: Plataforma Web "LectorPobre"

**Versión:** 1.1
**Basado en:** `Requisitos_LectorPobre_Final.pdf`, `Arquitectura_Detallada_LectorPobre.pdf`, `Stack_Tecnologico_LectorPobre.pdf`
**Plantilla de redacción de requisitos:** "El [Sistema / Actor] debe [Acción] [Condición o Complemento]"
**Principio de atomicidad:** cada requisito describe una única acción, sin detalles de implementación técnica.

---

## 1. Introducción

### 1.1 Propósito

Este documento constituye la Especificación de Requisitos de Software (ERS) de la plataforma web **LectorPobre**, un catálogo de productos en línea. Su propósito es establecer, de forma clara, atómica y sin ambigüedad, el conjunto de requisitos funcionales y no funcionales que el sistema debe satisfacer, sirviendo como contrato de entendimiento entre la empresa (parte interesada / cliente) y el equipo de desarrollo.

Este documento se apoya y es consistente con la **Arquitectura Técnica Detallada** del proyecto (patrón Jamstack desacoplado) y con el **Stack Tecnológico** definido (Nuxt.js, Go serverless, Sanity.io, Vercel), de modo que cada requisito pueda trazarse hacia el componente del sistema responsable de satisfacerlo.

### 1.2 Alcance del Sistema

LectorPobre es una plataforma web de **catálogo de productos** que permite:

- A **usuarios generales** (visitantes públicos, sin necesidad de registro) navegar, buscar y consultar el catálogo de productos, ver el stock disponible, interactuar socialmente (calificaciones y comentarios), armar una lista de artículos deseados (carrito de referencia) con exportación a PDF/PNG, e iniciar un contacto de compra vía WhatsApp.
- A un **administrador** autenticado gestionar el contenido del catálogo (productos, imágenes, stock) y la personalización visual del sitio (paletas de colores predefinidas y personalizadas, patrones decorativos y elementos gráficos) mediante un panel de control.

El sistema **no** incluye, salvo que se indique lo contrario en futuras iteraciones: pasarela de pago en línea, gestión de pedidos, ni registro/autenticación de usuarios generales. El carrito funciona exclusivamente como **lista de referencia** — no tiene función de pago. La conversión de venta se delega a un canal externo (WhatsApp).

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

### 1.5 Visión General del Documento

La Sección 2 describe el producto de forma general (perspectiva, actores, restricciones y supuestos). La Sección 3 detalla cada requisito funcional y no funcional de forma atómica, con criterios de aceptación sugeridos, prioridad y trazabilidad arquitectónica. La Sección 4 presenta la matriz de trazabilidad RF/RNF → Componente. La Sección 5 resume los casos de uso principales. La Sección 6 contiene el glosario y la Sección 7 los supuestos, restricciones y temas abiertos.

> **Nota metodológica:** los identificadores RF-01 a RF-20 y RNF-01 a RNF-06, junto con su redacción literal, provienen directamente del documento fuente `Requisitos_LectorPobre_Final.pdf`. Los campos de **Actor**, **Prioridad**, **Criterios de aceptación** y **Trazabilidad arquitectónica** son una elaboración técnica adicional para dar mayor detalle y trazabilidad al ERS; se recomienda validarlos con la parte interesada antes de congelar el alcance.

---

## 2. Descripción General

### 2.1 Perspectiva del Producto

LectorPobre se construye sobre una arquitectura **Jamstack desacoplada**, que separa completamente el cliente (frontend pre-renderizado) de la base de datos, comunicándose únicamente vía APIs cuando es estrictamente necesario. Esto tiene implicaciones directas sobre cómo deben interpretarse los requisitos:

- Los requisitos de **lectura** (ver catálogo, ver producto, ver stock) se satisfacen mayormente con contenido **pre-renderizado en tiempo de build**, salvo el stock, que exige una consulta en tiempo real (ver RNF-03).
- Los requisitos de **escritura** (calificaciones, comentarios, panel de administración) se satisfacen mediante funciones **serverless** que actúan como proxy seguro hacia el CMS.

### 2.2 Funciones del Producto (Resumen)

1. **Catálogo público**: exploración, búsqueda, categorización y detalle de productos con stock en tiempo real.
2. **Interacción social**: calificaciones por estrellas y comentarios de texto (opcionales).
3. **Lista de artículos (carrito de referencia)**: lista de productos deseados con exportación a PDF/PNG y vinculación con WhatsApp.
4. **Conversión a venta**: enlace directo a WhatsApp desde la ficha de producto o desde la lista de artículos.
5. **Panel de administración**: autenticación, gestión de catálogo (CRUD parcial), gestión de stock, personalización visual avanzada (paletas predefinidas/personalizadas, patrones decorativos).
6. **Optimización y alcance**: SEO mediante metadatos dinámicos, integración con redes sociales, analítica de tráfico.

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
- **Componente arquitectónico:** Frontend Nuxt.js (búsqueda client-side sobre el dataset pre-renderizado/hidratado).

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
- **Descripción:** El sistema debe habilitar una vía de comunicación directa hacia WhatsApp desde la vista detallada del producto y desde la lista de artículos (RF-23) para que el usuario general inicie el proceso de compra.
- **Actor:** Usuario General
- **Prioridad:** Must (mecanismo principal de conversión, dado que no hay pago en línea)
- **Criterios de aceptación sugeridos:**
  - Existe un botón/enlace "Comprar por WhatsApp" (o equivalente) en la ficha de producto.
  - El enlace utiliza el esquema `wa.me` o API de WhatsApp Business con un mensaje prellenado que referencia el producto.
  - La lista de artículos (RF-23) también ofrece un botón para enviar el resumen completo a WhatsApp.
- **Componente arquitectónico:** Frontend Nuxt.js (enlace estático generado con datos del producto o de la lista).

**RF-21**
- **Descripción:** El sistema debe permitir a los usuarios generales agregar productos a una lista de artículos deseados (carrito de referencia) accesible durante la sesión de navegación, con la posibilidad de ajustar cantidades y eliminar artículos.
- **Actor:** Usuario General
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Existe un botón "Agregar a la lista" en cada tarjeta de producto y en la ficha de detalle.
  - La lista muestra nombre, precio, cantidad y subtotal de cada artículo, además del total general.
  - La lista se persiste en `localStorage` del navegador (no requiere cuenta ni backend).
  - El carrito **no incluye función de pago**; es exclusivamente una lista de referencia.
- **Componente arquitectónico:** Frontend Nuxt.js (estado client-side con `localStorage`). Inspiración funcional: carrito de Steam.

**RF-22**
- **Descripción:** El sistema debe permitir a los usuarios generales y al administrador generar un documento resumen de la lista de artículos en formato PDF o imagen (PNG), que incluya nombre, precio y cantidad de cada artículo seleccionado, así como el total general.
- **Actor:** Usuario General, Administrador
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Existe un botón "Descargar resumen" visible en la vista de la lista de artículos.
  - El documento generado incluye: nombre del sitio, fecha, lista itemizada con precios y total.
  - El formato es seleccionable: PDF o PNG (imagen).
  - La generación ocurre enteramente en el navegador (client-side, sin servidor).
- **Componente arquitectónico:** Frontend Nuxt.js (generación client-side con librería de PDF/canvas, p. ej. `jsPDF` + `html2canvas`).

**RF-23**
- **Descripción:** El sistema debe permitir al usuario general enviar la lista de artículos completa como mensaje a WhatsApp, con un resumen textual de los productos seleccionados, sus cantidades y precios.
- **Actor:** Usuario General
- **Prioridad:** Must
- **Criterios de aceptación sugeridos:**
  - Existe un botón "Enviar lista por WhatsApp" en la vista de la lista de artículos.
  - El enlace utiliza el esquema `wa.me` con un mensaje prellenado que resume todos los artículos de la lista.
  - El proceso de compra y pago sigue ocurriendo por WhatsApp; el sistema solo facilita el envío del resumen.
- **Componente arquitectónico:** Frontend Nuxt.js (enlace generado dinámicamente con el contenido de la lista).

#### 3.1.3 Módulo: Panel de Administración

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
- **Descripción:** El administrador debe poder cambiar la paleta de colores de la página web desde el panel de control, eligiendo entre paletas predefinidas o definiendo una paleta personalizada.
- **Actor:** Administrador
- **Prioridad:** Could
- **Criterios de aceptación sugeridos:**
  - Existen al menos 4 paletas predefinidas: **modo claro**, **modo oscuro**, y al menos 2 paletas temáticas adicionales.
  - El administrador puede crear una **paleta personalizada** proporcionando valores de color hexadecimales desde Sanity Studio.
  - Cuando se selecciona una paleta personalizada, los valores custom tienen prioridad sobre los predefinidos.
  - El cambio de paleta se refleja en el sitio tras la siguiente reconstrucción (dado el modelo SSG).
- **Componente arquitectónico:** Esquema de configuración global en Sanity.io (campo de selección + campos de color custom) + Tailwind CSS (tokens de diseño dinámicos via CSS custom properties) + Frontend Nuxt.js.

**RF-16**
- **Descripción:** El administrador debe poder intercambiar los elementos visuales de la página web por otras opciones predefinidas desde el panel de control, incluyendo la aplicación de patrones decorativos temáticos (p. ej. Halloween, Navidad, etc.) almacenados como imágenes en Sanity.
- **Actor:** Administrador
- **Prioridad:** Could
- **Criterios de aceptación sugeridos:**
  - Existe un conjunto cerrado de variantes visuales predefinidas (layout/estilo de tarjetas).
  - El administrador puede subir **imágenes de patrón decorativo** a Sanity Studio que se aplican como overlay/fondo repetible en el catálogo (p. ej. murciélagos para Halloween, copos para Navidad).
  - El administrador puede activar o desactivar el patrón decorativo activo sin necesidad de modificar código.
  - El administrador puede seleccionar y aplicar una variante visual desde Sanity Studio.
- **Componente arquitectónico:** Esquema de configuración global en Sanity.io (campo de selección de variante + array de imágenes de patrón) + Frontend Nuxt.js (renderizado condicional de variantes y overlay de patrón via CSS `background-image`).

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
| RF-15 | ✔ (render) | | ✔ (config + paletas custom) | ✔ (rebuild) |
| RF-16 | ✔ (render + overlay) | | ✔ (config + imágenes patrón) | ✔ (rebuild) |
| RF-17 | ✔ | | | |
| RF-18 | ✔ (client-side) | | | |
| RF-19 | ✔ | | | |
| RF-20 | ✔ (SSG metadata) | | ✔ (fuente) | |
| RF-21 | ✔ (client-side, localStorage) | | | |
| RF-22 | ✔ (client-side, jsPDF/canvas) | | | |
| RF-23 | ✔ (client-side, wa.me) | | | |
| RNF-01 | ✔ | | | |
| RNF-02 | ✔ | | | |
| RNF-03 | ✔ (consulta) | (posible proxy) | ✔ | |
| RNF-04 | | ✔ | | ✔ (env vars) |
| RNF-05 | ✔ | | | |
| RNF-06 | ✔ (script) | | | (servicio externo) |

---

## 5. Resumen de Casos de Uso Principales

| Caso de Uso | Actor(es) | Requisitos relacionados |
|---|---|---|
| Explorar catálogo y buscar producto | Usuario General | RF-01, RF-04, RF-18, RF-19 |
| Consultar detalle y stock de un producto | Usuario General | RF-02, RF-03, RF-20 |
| Calificar y comentar un producto | Usuario General | RF-06, RF-07 |
| Armar lista de artículos y exportar resumen | Usuario General | RF-21, RF-22, RF-23 |
| Iniciar compra vía WhatsApp (producto individual o lista) | Usuario General | RF-17, RF-23 |
| Iniciar sesión / cerrar sesión | Administrador | RF-08, RF-09 |
| Gestionar catálogo (crear/editar/eliminar productos, imágenes, stock) | Administrador | RF-10, RF-11, RF-12, RF-13, RF-14 |
| Personalizar apariencia del sitio (paletas, patrones decorativos, variantes) | Administrador | RF-15, RF-16 |
| Compartir producto en redes/mensajería | Usuario General / Sistema | RF-20, RF-05 |

---

## 6. Glosario

- **Catálogo:** conjunto de productos publicados y visibles para los usuarios generales.
- **Producto:** entidad central del sistema, con atributos como nombre, descripción, imagen, categoría y stock.
- **Lista de artículos (carrito de referencia):** lista temporal de productos que el usuario desea comprar. No tiene función de pago; sirve como referencia para la gestión de compra vía WhatsApp.
- **Patrón decorativo:** imagen almacenada en Sanity que se aplica como overlay visual repetible sobre el catálogo (p. ej. murciélagos para Halloween, copos para Navidad).
- **Panel de administración:** interfaz privada para la gestión del catálogo y la configuración visual.
- **Requisito Opcional:** requisito marcado explícitamente como no crítico en la fuente (RF-06, RF-07), sujeto a priorización posterior.
- **Rebuild / Reconstrucción:** proceso por el cual Nuxt.js regenera los archivos estáticos del sitio a partir del contenido actualizado en Sanity.io.

---

## 7. Restricciones, Supuestos y Temas Abiertos

### 7.1 Restricciones
- No se contempla pasarela de pago en línea en el alcance actual. El carrito (RF-21) funciona exclusivamente como lista de referencia.
- El backend debe permanecer stateless por decisión arquitectónica (impacta RF-08, RF-09, RF-10, RNF-04).
- El stock debe consultarse en tiempo real, lo que introduce una excepción al modelo SSG puro (impacta RF-03, RNF-03).
- La lista de artículos (RF-21) se almacena en `localStorage` del navegador; no hay persistencia server-side ni sincronización entre dispositivos.

### 7.2 Supuestos
- La empresa proveerá contenido inicial del catálogo (productos, imágenes, categorías) para la carga inicial.
- Existe un único rol administrador; no se requieren permisos granulares por ahora.
- El servicio de analítica (RNF-06) y las redes sociales a enlazar (RF-05) serán confirmados por el cliente antes del desarrollo.
- La empresa proveerá las imágenes de patrones decorativos (RF-16) para las temporadas que desee soportar.

### 7.3 Temas Abiertos (a validar con la parte interesada)
1. ¿Los comentarios (RF-07) requieren moderación previa por el administrador antes de publicarse?
2. ¿Cuál es el umbral exacto de productos que activa la paginación/carga diferida (RF-19)?
3. ¿Qué constituye "stock bajo" vs "agotado" para efectos de UI (RF-03, RF-14)?
4. ¿Qué servicio de analítica externo se utilizará (RNF-06)?
5. ~~¿Cuántas paletas de colores y variantes visuales predefinidas se ofrecerán (RF-15, RF-16)?~~ **Resuelto en v1.1:** mínimo 4 predefinidas (claro, oscuro + 2 temáticas) + paleta personalizada desde Studio.
6. ¿Existe un límite de longitud o política de contenido para comentarios y calificaciones (moderación anti-abuso)?
7. ¿La lista de artículos (RF-21) debe mostrar un indicador en el header con la cantidad de artículos, tipo badge?
8. ¿El resumen PDF/PNG (RF-22) debe incluir el logo del sitio o algún branding adicional?

---

*Documento generado a partir de la fuente oficial de requisitos del proyecto LectorPobre, enriquecido con criterios de aceptación, priorización y trazabilidad arquitectónica para su uso como ERS de referencia durante el desarrollo.*
