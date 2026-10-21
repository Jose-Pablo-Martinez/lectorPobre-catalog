# PROYECTO: LECTOR POBRE CATALOG — FRONTEND DESIGN SYSTEM & UI PROTOTYPING
## REFERENCIA PRINCIPAL DE DISEÑO: VOGRACE.COM (E-COMMERCE MODERNO DE MERCH & ARTIST-ALLEY) ADAPTADO A IDENTIDAD MEXICANA JUVENIL DE BARRIO

> **IDENTIDAD Y DOMINIO DEL PRODUCTO:**
> **"Lector Pobre" NO ES UNA LIBRERÍA NI VENDE LIBROS.**
> Es el catálogo web de una marca independiente de **arte, manualidades urbanas y artículos semiartesanales** (especializada en **llaveros de diseño propio en acrílico, resina epóxica, glitter, prints de ilustración, stickers de vinil, pines metálicos y accesorios hechos a mano**).
>
> **ESTILO VISUAL GENERAL (INSPIRACIÓN VOGRACE + VIBRA JUVENIL DE BARRIO):**
> Se adopta la estructura moderna, limpia, altamente visual y enfocada en producto de **Vograce.com** (plataforma líder en llaveros y mercancía para artistas), enriquecida con la calidez, frescura y energía de la **cultura pop y juvenil mexicana**:
> - **Grid de productos limpio y profesional** con fotos de alta definición en fondo neutro/pastel para destacar transparencias, brillos epóxicos y herrajes metálicos de los llaveros.
> - **Hero Banner ilustrado** protagonizado por la mascota oficial con insignias de valor (*"Hecho a mano"*, *"Sin pedido mínimo"*, *"Acrílico premium"*).
> - **Badges flotantes en tarjetas** (*"NUEVO"*, *"MÁS VENDIDO"*, *"DESCUENTO"*).
> - **Barra lateral de filtros por materiales y acabados** (acrílico transparente, holográfico, glitter, resina).
> - **Microinteracciones y animaciones sutiles:** Elevación suave al hover (`hover:-translate-y-1 hover:shadow-lg`), badges flotantes con pulso y carruseles fluidos.
> - **Conversión directa sin pasarela bancaria:** Ficha con botón directo a WhatsApp y Carrito de Cotización tipo Steam (Slide-over drawer) para enviar listas consolidadas.

---

## 1. REGLA ESTRICTA DE ICONOGRAFÍA: CERO EMOJIS EN LA INTERFAZ

> **PROHIBICIÓN TOTAL DE EMOJIS DE SISTEMA:**
> **Queda estrictamente prohibido utilizar emojis de sistema (como caritas, carritos emoji, estrellas emoji, diamantes o destellos) en botones, tarjetas, badges, títulos o textos de la interfaz.**
> Los emojis se renderizan de manera inconsistente y deformada entre dispositivos (iOS, Android, Windows, Smart TVs) y restan seriedad visual al diseño.

### Paquetes Gratuitos de Iconos Vectoriales SVG Obligatorios:
Todo elemento visual debe emplear **iconos vectoriales SVG limpios, consistentes y profesionales** de librerías gratuitas y de código abierto:
- **Librerías recomendadas:** **Lucide Icons** (estándar moderno en Vue/Nuxt), **Heroicons** o **Phosphor Icons**.
- **Iconos específicos requeridos en la interfaz:**
  - Bolsa / Carrito de compras: `LucideShoppingBag` o `LucideShoppingCart` en formato SVG.
  - Lista de deseos / Favoritos: `LucideHeart` (outline y filled) en formato SVG.
  - Búsqueda: `LucideSearch` en formato SVG.
  - Calificación: `LucideStar` en formato SVG vectorial con relleno dorado.
  - WhatsApp: Logotipo vectorial oficial SVG de WhatsApp.
  - Controles de cantidad: `LucideMinus` y `LucidePlus` en formato SVG.
  - Basura / Eliminar: `LucideTrash2` en formato SVG.
  - Filtros y ordenamiento: `LucideSlidersHorizontal` y `LucideArrowUpDown` en formato SVG.
  - Redes sociales: Iconos vectoriales SVG oficiales de Instagram y TikTok.

---

## 2. PALETA DE COLOR Y ARMONÍA VISUAL

### Colores Principales:
1. **Rosa Mexicano (`#E4007C` / `#D81B60`):**
   - *Rol:* Color primario de alto impacto, vibrante, juvenil y representativo de la identidad mexicana urbana. Utilizado en badges destacados, llamadas a la acción primarias y detalles interactivos.
2. **Azul Maya (`#0091D5` / `#1E88E5` / `#0077B6`):**
   - *Rol:* Color secundario de identidad y confianza. Hace match exacto con el plumaje del **periquito azul de la mascota**, el cielo yucateco y las aguas de cenote. Utilizado en headers, estados activos de pestañas y bordes de enfoque.
3. **Amarillo Cempasúchil / Sol (`#FFD000` / `#F59E0B`):**
   - *Rol:* Acento luminoso de contraste. Utilizado para badges de *"OFERTA"*, avisos de *"ÚLTIMAS PIEZAS"*, estrellas SVG de calificación y franja promocional superior.
4. **Verde Pastel Mérida (`#EDF8F1` / `#D8F3DC` — Conservado del fondo del logo):**
   - *Rol:* Superficie de fondo relajada y balanceadora. Evita la fatiga visual del blanco hospitalario o de un fondo chillón, evocando las paredes coloniales de Mérida y permitiendo que los llaveros resalten.
5. **Negro Tinta Serigráfica (`#18181B`):**
   - *Rol:* Tipografía base, contornos nítidos y contraste de lectura según estándares WCAG AAA.

### Colores Desechados del Contexto:
- Azul corporativo tradicional (`#2563eb`): Reemplazado por el **Azul Maya**.
- Terracotas oscuros y grises asfalto pesados: Descartados para no opacar el brillo del acrílico y la resina.
- Rojos genéricos planos: Descartados e integrados con el **Rosa Mexicano** y la pañoleta de la mascota.

---

## 3. MASCOTA OFICIAL DE MARCA
- **Personaje:** Un **periquito australiano de color Azul Maya**, con una **pañoleta roja al cuello** y un **pincel en el pico**.
- **Presencia en UI:**
  - Isotipo vectorial en el Header junto al logotipo.
  - Ilustración de bienvenida en el Hero Banner principal de la tienda.
  - Ilustración en el estado vacío del carrito (*"Tu lista de pedido está vacía"*).
  - Sello vectorial de *"Diseño 100% Original de Autor"*.

---

## 4. ESQUEMA DE PALETAS DINÁMICAS (REQUISITO RF-15)
El administrador puede alternar entre 5 paletas desde Sanity Studio con rebuild instantáneo:

| Clave | Nombre de Paleta | Color Primario | Secundario / Acento | Fondo Base |
| :--- | :--- | :--- | :--- | :--- |
| `identidad` | **Bazar Lector Pobre (Default)** | Rosa Mexicano (`#E4007C`) | Azul Maya (`#0091D5`) + Amarillo Sol | Verde Pastel Mérida (`#EDF8F1`) |
| `cenote` | **Cenote & Costa Maya** | Turquesa Cenote (`#0D9488`) | Coral Neón (`#F43F5E`) + Menta | Blanco Concha (`#F0FDF4`) |
| `luchaLibre`| **Arena México (Lucha Libre)** | Azul Maya Profundo (`#1D4ED8`) | Amarillo Cempasúchil + Rosa | Crema Cartel (`#FFFBEB`) |
| `nocheFiesta`| **Noche Urbana / Dark Mode** | Rosa Neón (`#FF007F`) | Azul Maya Neón (`#00E5FF`) | Asfalto Profundo (`#0F172A`) |
| `meridaPastel`| **Paseo Montejo Colonial** | Verde Henequén (`#15803D`) | Rosa Bugambilia + Oro Colonial | Cantera Crema (`#FAF7F2`) |
| `custom` | **Personalizada (Hexadecimal)** | Configurable por la artista desde Sanity Studio | | |

---

## 5. SISTEMA DE COMPONENTES AL ESTILO VOGRACE (SIN EMOJIS, CON SVG)

### A. Top Banner de Anuncios (Promo Bar):
- Franja superior delgada en Amarillo Cempasúchil (`#FFD000`) o Rosa Mexicano con texto nítido: *"Envíos a todo México • Sin pedido mínimo • Piezas de autor hechas a mano • Pedidos directos a WhatsApp"*.

### B. Header / Navegación:
- Logotipo tipográfico + Isotipo vectorial del periquito artista.
- Buscador centrado con icono vectorial SVG de lupa (Lucide `Search`): *"Buscar llaveros de acrílico, resina, stickers..."*.
- Iconos de utilidad en SVG: Selector de tema Claro/Oscuro, Lista de Deseos (SVG `Heart`) y Carrito/Bandeja con icono SVG `ShoppingBag` y badge numérico `3`.
- **Barra de Pestañas de Categoría:** Carrusel horizontal de chips (*"Todos"*, *"Llaveros Acrílico"*, *"Llaveros Resina & Glitter"*, *"Stickers & Prints"*, *"Pines"*, *"Ediciones Especiales"*).

### C. Hero Banner de Colección:
- Gráfica horizontal ilustrada con fondo Verde Pastel / Rosa suave, destacando al periquito artista.
- Título: *"LLAVEROS & ACCESORIOS ARTESANALES"*.
- **Píldoras de Valor con Iconos SVG:**
  - [Icono SVG `Sparkles`] *"Diseños 100% hechos por la artista"*
  - [Icono SVG `ShieldCheck`] *"Acrílico y resina de alta durabilidad"*
  - [Icono SVG `Package`] *"Sin pedido mínimo — Compra desde 1 pieza"*
  - [Icono SVG `MessageCircle`] *"Atención y pedidos inmediatos por WhatsApp"*

### D. Grilla y Tarjeta de Producto (`TarjetaProducto.vue`):
- Proporción 1:1 en fondo blanco neutro para resaltar brillos y herrajes (argolla de estrella, corazón, oro o plata).
- **Badges Flotantes de Texto Puro:** Esquina superior izquierda (*"NUEVO"*, *"OFERTA"*, *"ÚLTIMAS PIEZAS"*) en Rosa Mexicano o Amarillo Cempasúchil.
- **Botón de Favorito:** Icono SVG de corazón (Lucide `Heart`) flotante en la esquina superior derecha.
- **Información del producto:**
  - Categoría en tipografía pequeña (ej. *Llaveros de Acrílico*).
  - Título en 2 líneas legibles en tipografía moderna Outfit.
  - Indicador de stock en tiempo real: Píldora con punto indicador SVG o CSS (*"En Stock"*, *"Últimas 3 piezas"*, *"Agotado"*).
  - Calificación con iconos SVG de estrella rellena dorada (Lucide `Star`).
  - Precio actual en negrita y precio de lista tachado si tiene descuento.
  - **Acciones:** Botón *"Ver detalles"* y botón con icono SVG `Plus` para *"Agregar al pedido"*.

### E. Barra Lateral de Filtros (Filtros por Material y Acabado):
- Acordeón lateral desplegable (Desktop) o modal de filtros (Móvil):
  - **Por Tipo de Material:** Acrílico Transparente, Resina Epóxica, Glitter / Holográfico, Madera.
  - **Por Tipo de Herraje:** Argolla Estrella Dorada, Argolla Corazón, Mosquetón Plata.
  - **Por Rango de Precio y Disponibilidad en Stock.**

### F. Sección de Confianza & FAQ:
- Acordeón interactivo de Preguntas Frecuentes al estilo Vograce con iconos SVG `ChevronDown`:
  - *¿Cómo se realiza el pago?* (Transferencia bancaria directa o efectivo al entregar).
  - *¿De qué material son los llaveros?* (Acrílico importado de 4mm, doble cara con recubrimiento de resina epóxica anti-rayaduras).
  - *¿Hacen entregas locales y envíos?*

---

## 6. ADAPTABILIDAD RESPONSIVA MULTIDISPOSITIVO (RESPONSIVE RULES)

1. **Smartphones (360px – 480px / Touch First):**
   - Grilla de productos en 2 columnas compactas (formato Vograce Mobile).
   - Barra flotante inferior fija con icono SVG de bolsa: *"3 artículos en tu lista • Ver lista"*.
   - El carrito se despliega como **Bottom Sheet Modal** deslizable hacia arriba.
   - Botón flotante con icono oficial SVG de WhatsApp.

2. **Tabletas e iPads (768px – 1024px – 1366px / Touch + Stylus):**
   - **Portrait (768px – 834px):** 2 o 3 columnas de productos con botón flotante superior *"Filtrar piezas"* (con icono SVG `SlidersHorizontal`).
   - **Landscape (1024px – 1366px):** 3 o 4 columnas con barra lateral de filtros fija. Detalle en Split Layout 50/50.
   - Targets táctiles de mínimo 44x44px y soporte de gestos swipe en galerías.

3. **Laptops y Desktop Estándar (1280px – 1920px):**
   - Grilla de 4 columnas centrada `max-w-7xl` con barra lateral izquierda de filtros y selector superior de ordenamiento.
   - Carrito lateral con animación fluida de entrada tipo Slide-over Drawer sobre fondo desenfocado.

4. **Pantallas Ultra-Wide (21:9 / 2560px – 3440px+):**
   - Contenedor centrado delimitado a `max-w-[1700px]` en 5 o 6 columnas proporcionales.

5. **Smart TVs y Pantallas de Gran Formato (1080p / 4K / 10-foot UI):**
   - Modo oscuro urbano con foco D-Pad en Amarillo Cempasúchil de 4px y escala de `1.06x`.
   - Carrito con **Código QR vectorial de alta definición en pantalla** para escanear y abrir la orden completa en WhatsApp.

---

## 7. REGLAS DE MICROCOPIA (CLARIDAD ABSOLUTA)
- Botón primario de WhatsApp: **"Comprar por WhatsApp"** (con icono SVG oficial de WhatsApp).
- Botón secundario en ficha: **"Agregar a mi lista de pedido"** (con icono SVG de bolsa de compras).
- Botón en carrito / Drawer: **"Confirmar y Enviar Pedido por WhatsApp"**.
- Estados de stock: **"En Stock"**, **"Últimas [X] unidades"**, **"Agotado"**.

---

## 8. BUSQUEDA AVANZADA, PRODUCTOS SIMILARES Y VISTOS RECIENTEMENTE (RF-18, RF-21, RF-22)

> Aplica la misma regla estricta de iconografia: **cero emojis**, solo iconos SVG (Lucide).

### A. Buscador del Header (RF-18 ampliado)
- Campo con icono SVG `Search` a la izquierda y boton SVG `X` para limpiar el texto.
- **Autocompletado:** panel desplegable bajo el campo (`role="combobox"`, navegacion con flechas y Enter) con dos grupos: *"Productos"* (miniatura 1:1 + nombre) y *"Categorias"* (chip con nombre). Maximo 6 sugerencias.
- Fondo del panel blanco con borde sutil y sombra suave; elemento activo resaltado en Verde Pastel Merida.
- La busqueda tolera errores de escritura y acentos; no mostrar mensajes de error ortograficos.
- **Estado vacio sin resultados:** ilustracion del periquito artista (mascota), titulo *"No encontramos esa pieza"*, texto de apoyo *"Revisa la escritura o prueba con otra palabra"* y debajo la grilla *"Quiza te interese"* con 4 productos sugeridos.

### B. Seccion "Productos similares" en la ficha de producto (RF-21)
- Ubicacion: debajo de la descripcion y los comentarios, antes del pie de pagina.
- Titulo: *"Productos similares"*; subtitulo opcional *"Piezas con estilo y materiales parecidos"*.
- 4 a 6 tarjetas reutilizando `TarjetaProducto` en un carrusel horizontal con scroll suave (Desktop: 4 visibles; Movil: 2 visibles con scroll-snap).
- Controles de carrusel con iconos SVG `ChevronLeft` / `ChevronRight`.
- Productos agotados: tarjeta atenuada con badge *"Agotado"* al final del carrusel.

### C. Seccion "Vistos recientemente" (RF-22)
- Fila compacta con hasta 6 miniaturas en el catalogo (bajo las categorias) y/o en la ficha de producto.
- Titulo *"Vistos recientemente"* y enlace de texto con icono SVG `Trash2`: *"Limpiar historial"*.
- Si no hay historial, la seccion no se muestra (sin espacios vacios).

### D. Microcopy de busqueda
- Placeholder: *"Buscar llaveros de acrilico, resina, stickers..."*.
- Sugerencias: *"Productos"*, *"Categorias"*; sin resultados: *"No encontramos esa pieza"*; recomendados: *"Quiza te interese"*.
