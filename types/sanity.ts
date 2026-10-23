/**
 * @file sanity.ts
 * @description Interfaces TypeScript derivadas de los esquemas de Sanity definidos en sanity/schemaTypes/.
 * Estos tipos representan la estructura de los datos TAL COMO SON RETORNADOS POR LAS CONSULTAS GROQ
 * al frontend Nuxt, no necesariamente como se almacenan literalmente en Sanity (por ejemplo, las referencias
 * están desreferenciadas y los campos computados como calificacionPromedio aparecen aquí pero no en el esquema).
 *
 * Mantenimiento: cuando se agregue o elimine un campo del esquema, actualizar este archivo en consecuencia.
 * Automatización futura: ejecutar `pnpm exec sanity typegen generate` (desde sanity/) para regenerar
 * este archivo automáticamente una vez que los esquemas estén estables. Acompañar con la verificación en ci.yml (IT-SANITY-01).
 *
 * @satisfies RF-01, RF-02, RF-04, RF-05, RF-06, RF-07, RF-14, RF-15, RF-16, RF-17, RF-19, RF-21, RF-22, RF-23
 */

// ── Campos de sistema presentes en todo documento de Sanity ───────────────────

/**
 * Campos gestionados automáticamente por Sanity en cada documento.
 * Nunca deben declararse manualmente en un esquema; Sanity los inyecta de forma nativa.
 */
interface SanityDocument {
    /** Identificador único autogenerado (equivalente a una clave primaria). */
    _id: string;
    /** Marca de tiempo ISO-8601 de creación, gestionada por Sanity. */
    _createdAt: string;
    /** Marca de tiempo ISO-8601 de última actualización, gestionada por Sanity. */
    _updatedAt: string;
    /** Número de revisión interna utilizado por Sanity para concurrencia optimista. */
    _rev: string;
}

// ── Tipo de Imagen ────────────────────────────────────────────────────────────

/**
 * Representa un recurso de imagen de Sanity tal como se almacena en el documento.
 * Los campos hotspot y crop controlan el recorte inteligente en la CDN de Sanity;
 * no alteran la lógica de los componentes Vue, donde el diseño se controla mediante CSS.
 */
export interface SanityImage {
    _type: 'image';
    asset: {
        _type: 'reference';
        _ref: string;
    };
    hotspot?: {
        x: number;
        y: number;
        height: number;
        width: number;
    };
    crop?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
}

// ── Producto ──────────────────────────────────────────────────────────────────

/**
 * Estructura de un documento de producto retornado por consultas GROQ al frontend Nuxt.
 *
 * Diferencias clave respecto al documento crudo en Sanity:
 * - `categoria` es el objeto desreferenciado (nombre + slug), no el puntero crudo `{_ref}`.
 *   Requiere la proyección `categoria->{nombre, slug}` en cada consulta GROQ.
 * - `calificacionPromedio` NO existe como campo persistido. Se calcula al vuelo
 *   en GROQ como `round(ratingSum / ratingCount, 1)` y solo está presente si ratingCount > 0.
 * - `ratingSum` es un contador interno y NO se expone en esta interfaz pública.
 * - `ratingCount` y `rating1Count`–`rating5Count` SÍ se exponen al frontend para alimentar
 *   el contador de reseñas ("150 reseñas") y el desglose detallado por estrellas (RF-06).
 *
 * @satisfies RF-01 - Listado en catálogo.
 * @satisfies RF-02 - Vista de detalle de producto.
 * @satisfies RF-06 - Calificación por estrellas: promedio, total y desglose por nivel.
 * @satisfies RF-14 - Gestión de stock; usar umbralStockBajo de ConfiguracionGlobal para evaluar.
 */
export interface Producto extends SanityDocument {
    _type: 'producto';
    /** Nombre comercial del producto. Requerido. Máximo 120 caracteres. */
    nombre: string;
    /** Slug amigable para URL derivado del nombre. Base para el enrutamiento pages/producto/[slug].vue. */
    slug: { _type: 'slug'; current: string };
    /** Descripción detallada opcional mostrada en la vista de detalle. */
    descripcion?: string;
    /** Imagen principal mostrada en tarjetas de catálogo y cabecera de la vista de detalle. */
    imagenPrincipal?: SanityImage;
    /** Imágenes complementarias para la galería o carrusel de la vista de detalle (Fase 3). */
    imagenes?: SanityImage[];
    /**
     * Categoría desreferenciada. Requiere `categoria->{nombre, slug}` en la consulta GROQ.
     * La forma cruda `{_type: 'reference', _ref: string}` nunca se utiliza en el frontend.
     */
    categoria: {
        nombre: string;
        slug: { _type: 'slug'; current: string };
    };
    /** Unidades disponibles en stock. 0 = botón de contacto deshabilitado. RF-14. */
    stock: number;
    /** Precio opcional utilizado únicamente en la plantilla del mensaje de WhatsApp. RF-17. */
    precio?: number;
    /** Si es false, el producto se oculta de todas las consultas públicas del catálogo. RF-13. */
    activo: boolean;
    /**
     * Promedio de estrellas (1.0–5.0), calculado en GROQ como round(ratingSum / ratingCount, 1).
     * null cuando el producto aún no tiene calificaciones (ratingCount === 0).
     * Nunca se almacena en Sanity; aparece solo cuando se proyecta explícitamente en la consulta.
     * RF-06.
     */
    calificacionPromedio?: number | null;
    /**
     * Total de calificaciones recibidas. Mostrado como "X reseñas" junto al promedio.
     * Actualizado atómicamente por el handler Go de calificación mediante patch.inc. RF-06.
     */
    ratingCount?: number;
    /**
     * Contadores individuales por estrella para el panel de desglose ("5★: 120 votos, 4★: 20 votos...").
     * Cada contador se incrementa de manera atómica en el backend Go con patch.inc
     * usando el nombre de campo `rating{valor}Count`. RF-06.
     */
    rating1Count?: number;
    rating2Count?: number;
    rating3Count?: number;
    rating4Count?: number;
    rating5Count?: number;
    /**
     * Palabras clave y etiquetas opcionales para búsqueda difusa y recomendaciones por contenido. RF-23.
     */
    palabrasClave?: string[];
}

// ── Categoria ─────────────────────────────────────────────────────────────────

/**
 * Categoría de producto utilizada para filtrado y navegación en el catálogo.
 * @satisfies RF-04 - Filtrado por categoría y navegación.
 */
export interface Categoria extends SanityDocument {
    _type: 'categoria';
    nombre: string;
    slug?: { _type: 'slug'; current: string };
    descripcion?: string;
    /** Controla el orden de visualización en los filtros del catálogo. Menor = primero. */
    orden?: number;
}

// ── Comentario ────────────────────────────────────────────────────────────────

/**
 * Comentario de usuario sobre un producto con flujo de moderación administrativa.
 * Solo los comentarios con estado === 'aprobado' se muestran en el catálogo público.
 * El administrador aprueba o rechaza los comentarios desde Sanity Studio.
 *
 * El listado público en la vista de detalle soporta ordenamiento por:
 * - fechaCreacion desc (más reciente primero — por defecto)
 * - fechaCreacion asc (más antiguo primero)
 * El filtrado por estrellas se realiza en el cliente asociando los documentos de Calificación.
 *
 * @satisfies RF-07 - Comentarios de texto con moderación y listado público ordenable.
 */
export interface Comentario extends SanityDocument {
    _type: 'comentario';
    texto: string;
    /** Referencia cruda al producto padre. Desreferenciada con `producto->` en GROQ cuando se requiere. */
    producto: { _type: 'reference'; _ref: string };
    fechaCreacion?: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
}

// ── Calificacion ──────────────────────────────────────────────────────────────

/**
 * Calificación por estrellas (1–5) enviada por un usuario para un producto.
 * Al crearse mediante el handler de Go, se ejecutan tres mutaciones atómicas patch.inc
 * en el producto correspondiente:
 *   - ratingSum          += valor
 *   - ratingCount        += 1
 *   - rating{valor}Count += 1 (ej. rating4Count para una calificación de 4 estrellas)
 * Esto permite calcular promedios y desgloses sin condiciones de carrera.
 *
 * Los documentos de este tipo son de solo lectura en Sanity Studio (RF-06).
 * Funcionan como registro de auditoría inmutable.
 *
 * @satisfies RF-06 - Sistema de calificación por estrellas con contador y desglose.
 */
export interface Calificacion extends SanityDocument {
    _type: 'calificacion';
    /** Valor entero entre 1 y 5, inclusive. */
    valor: number;
    /** Referencia cruda al producto calificado. */
    producto: { _type: 'reference'; _ref: string };
    fechaCreacion?: string;
}

// ── ConfiguracionGlobal ───────────────────────────────────────────────────────

/**
 * Documento singleton que gestiona la configuración general del sitio.
 * Existe exactamente un único documento de este tipo por dataset.
 * Se lee durante el build de Nuxt; los cambios requieren un rebuild del sitio (vía webhook de Sanity).
 *
 * @satisfies RF-05 - Enlaces a redes sociales.
 * @satisfies RF-15 - Paleta de colores: 5 paletas predefinidas (identidad, cenote, luchaLibre,
 *   nocheFiesta, meridaPastel) + paleta personalizada mediante campos hex individuales.
 * @satisfies RF-16 - Variante visual de diseño + patrón decorativo aplicado
 *   como capa semitransparente repetida sobre el catálogo.
 * @satisfies RF-17 - Contacto y plantilla de mensaje de WhatsApp.
 * @satisfies RF-19 - Productos por página (tamaño del bloque de paginación en GROQ).
 * @satisfies RF-03, RF-14 - Configuración del umbral de stock bajo.
 * @satisfies RF-23 - Definición global de grupos de sinónimos para búsqueda.
 */
export interface ConfiguracionGlobal extends SanityDocument {
    _type: 'configuracionGlobal';
    nombreSitio?: string;
    /** Formato internacional sin el símbolo "+". Ejemplo: 5219991234567. RF-17. */
    numeroWhatsApp?: string;
    /** Plantilla de mensaje de WhatsApp. Soporta variables como {{nombre}} y {{precio}}. RF-17. */
    mensajeWhatsApp?: string;
    urlInstagram?: string;
    urlFacebook?: string;
    urlTikTok?: string;
    urlYouTube?: string;

    /**
     * Paleta de colores activa. Leída en build time e inyectada como variables CSS
     * en plugins/paleta.ts. Si se selecciona 'custom', se usan los campos paletaCustom*. RF-15.
     */
    paletaActiva: 'identidad' | 'cenote' | 'luchaLibre' | 'nocheFiesta' | 'meridaPastel' | 'custom';

    // RF-15: valores hexadecimales para paleta personalizada — solo se usan si paletaActiva === 'custom'.
    /** Color de marca primario (hex). Ej. '#e4007c'. */
    paletaCustomPrimario?: string;
    /** Color de marca secundario (hex). */
    paletaCustomSecundario?: string;
    /** Color de acento (hex). */
    paletaCustomAcento?: string;
    /** Color de fondo del sitio (hex). */
    paletaCustomFondo?: string;
    /** Color de texto principal (hex). */
    paletaCustomTexto?: string;

    /**
     * Variante visual que controla la densidad y estilo de las tarjetas del catálogo. RF-16.
     * Se aplica como clase CSS en el contenedor del catálogo en tiempo de compilación.
     */
    varianteVisual: 'clasico' | 'moderno' | 'minimalista';

    /**
     * Si es true, patronDecorativo se renderiza como una capa de fondo semitransparente
     * repetida mediante CSS sobre el catálogo. RF-16.
     */
    patronDecorativoActivo: boolean;
    /**
     * Imagen ligera (~200×200 px, PNG con fondo transparente) usada como patrón decorativo.
     * Solo se consume cuando patronDecorativoActivo es true. RF-16.
     */
    patronDecorativo?: SanityImage;

    /**
     * Cuando producto.stock <= umbralStockBajo, el frontend muestra la alerta "¡Pocas unidades!".
     * Valor por defecto: 5. Resuelve Tema Abierto #3 del ERS. RF-03, RF-14.
     */
    umbralStockBajo: number;
    /**
     * Cantidad de productos consultados por página en la consulta GROQ del catálogo.
     * Valor por defecto: 24. Resuelve Tema Abierto #2 del ERS. RF-19.
     */
    productosPorPagina: number;

    /**
     * Grupos globales de sinónimos para expansión en búsqueda difusa y recomendaciones. RF-23.
     */
    sinonimos?: Array<{
        _key?: string;
        terminos: string[];
    }>;
}