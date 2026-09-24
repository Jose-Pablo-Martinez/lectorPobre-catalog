/**
 * @file sanity.ts
 * @description TypeScript interfaces derived from the Sanity schemas defined in sanity/schemaTypes/.
 * These types represent the shape of data AS RETURNED BY GROQ QUERIES to the Nuxt frontend,
 * not necessarily what is stored verbatim in Sanity (e.g. references are dereferenced,
 * computed fields like calificacionPromedio appear here but not in the schema).
 *
 * Maintenance: when a schema field is added or removed, update this file accordingly.
 * Future automation: run `pnpm exec sanity typegen generate` (from sanity/) to regenerate
 * this file automatically once schemas are stable. Pair with the CI check in ci.yml (IT-SANITY-01).
 *
 * @satisfies RF-01, RF-02, RF-04, RF-05, RF-06, RF-07, RF-14, RF-15, RF-16, RF-17, RF-19, RF-21, RF-22, RF-23
 */

// ── Sanity system fields present on every document ────────────────────────────

/**
 * Fields automatically managed by Sanity on every document.
 * Never declare these manually in a schema — Sanity injects them.
 */
interface SanityDocument {
    /** Auto-generated unique identifier (equivalent to a primary key). */
    _id: string;
    /** ISO-8601 creation timestamp, managed by Sanity. */
    _createdAt: string;
    /** ISO-8601 last-update timestamp, managed by Sanity. */
    _updatedAt: string;
    /** Internal revision number used by Sanity for optimistic concurrency. */
    _rev: string;
}

// ── Image type ────────────────────────────────────────────────────────────────

/**
 * Represents a Sanity image asset as stored in the document.
 * The hotspot/crop fields control smart-cropping on the Sanity CDN —
 * they have no effect on how the image is displayed in Vue components;
 * layout and carousel behavior is controlled entirely by CSS/Vue.
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
 * Shape of a product document as returned by GROQ queries to the Nuxt frontend.
 *
 * Key differences from the raw Sanity document:
 * - `categoria` is the dereferenced object (nombre + slug), not the raw `{_ref}` pointer.
 *   This requires `categoria->{nombre, slug}` in every GROQ query.
 * - `calificacionPromedio` does NOT exist as a stored field. It is computed inline
 *   in GROQ as `round(ratingSum / ratingCount, 1)` and only present if ratingCount > 0.
 * - `ratingSum` and `ratingCount` are internal atomic counters updated by the Go handler.
 *   They are never exposed to the frontend and are not included in this interface.
 *
 * @satisfies RF-01 - Catalog listing.
 * @satisfies RF-02 - Product detail page.
 * @satisfies RF-14 - Stock management; use umbralStockBajo from ConfiguracionGlobal to evaluate.
 */
export interface Producto extends SanityDocument {
    _type: 'producto';
    /** Product display name. Required. Max 120 characters. */
    nombre: string;
    /** URL-friendly slug derived from nombre. Base for pages/producto/[slug].vue routing. */
    slug: { _type: 'slug'; current: string };
    /** Optional long-form description shown on the detail page. */
    descripcion?: string;
    /** Main product image shown on catalog cards and at the top of the detail page. */
    imagenPrincipal?: SanityImage;
    /** Additional images for the detail page gallery/carousel (Vue component, Fase 3). */
    imagenes?: SanityImage[];
    /**
     * Dereferenced category. Requires `categoria->{nombre, slug}` in the GROQ query.
     * The raw `{_type: 'reference', _ref: string}` shape is never used in the frontend.
     */
    categoria: {
        nombre: string;
        slug: { _type: 'slug'; current: string };
    };
    /** Available units. 0 = contact button disabled. RF-14. */
    stock: number;
    /** Optional price used only in the WhatsApp message template. Not an e-commerce price. RF-17. */
    precio?: number;
    /** When false, the product is hidden from all public catalog GROQ queries. RF-13. */
    activo: boolean;
    /**
     * Average star rating (1.0–5.0), computed in GROQ as round(ratingSum / ratingCount, 1).
     * null when the product has no ratings yet (ratingCount === 0).
     * Never stored in Sanity — appears in query results only when projected explicitly.
     */
    calificacionPromedio?: number | null;
}

// ── Categoria ─────────────────────────────────────────────────────────────────

/**
 * Product category used for filtering in the catalog.
 * @satisfies RF-04 - Category filtering and navigation.
 */
export interface Categoria extends SanityDocument {
    _type: 'categoria';
    nombre: string;
    slug?: { _type: 'slug'; current: string };
    descripcion?: string;
    /** Controls display order in the category filter UI. Lower = first. */
    orden?: number;
}

// ── Comentario ────────────────────────────────────────────────────────────────

/**
 * User comment on a product, with admin moderation workflow.
 * Only comments with estado === 'aprobado' are shown in the public catalog.
 * The admin approves/rejects from Sanity Studio.
 * @satisfies RF-07 - Text comments with moderation.
 */
export interface Comentario extends SanityDocument {
    _type: 'comentario';
    texto: string;
    /** Raw reference to the parent product. Dereferenced with `producto->` in GROQ when needed. */
    producto: { _type: 'reference'; _ref: string };
    fechaCreacion?: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
}

// ── Calificacion ──────────────────────────────────────────────────────────────

/**
 * Star rating (1–5) submitted by a user for a product.
 * When created by the Go handler, it also triggers a patch.inc on
 * producto.ratingSum and producto.ratingCount (atomic, no race condition).
 * @satisfies RF-06 - Star rating system.
 */
export interface Calificacion extends SanityDocument {
    _type: 'calificacion';
    /** Integer between 1 and 5, inclusive. */
    valor: number;
    /** Raw reference to the rated product. */
    producto: { _type: 'reference'; _ref: string };
    fechaCreacion?: string;
}

// ── ConfiguracionGlobal ───────────────────────────────────────────────────────

/**
 * Singleton document that controls all site-wide settings.
 * Exactly one document of this type exists per dataset.
 * Read at Nuxt build time; changes require a site rebuild (triggered by the Sanity webhook).
 *
 * @satisfies RF-05 - Social media links.
 * @satisfies RF-15 - Color palette: 4 predefined palettes (claro, oscuro, oceano, atardecer)
 *   + a fully custom palette defined via individual hex color fields.
 * @satisfies RF-16 - Visual variant (layout style) + decorative pattern image applied
 *   as a repeating semi-transparent CSS overlay on the catalog.
 * @satisfies RF-17 - WhatsApp contact and message template.
 * @satisfies RF-19 - Products per page (pagination slice size in GROQ).
 * @satisfies RF-03, RF-14 - Low-stock threshold configuration.
 */
export interface ConfiguracionGlobal extends SanityDocument {
    _type: 'configuracionGlobal';
    nombreSitio?: string;
    /** International format without the "+". Example: 5219991234567. RF-17. */
    numeroWhatsApp?: string;
    /** WhatsApp message template. Supports {{nombre}} and {{precio}} as product variables. RF-17. */
    mensajeWhatsApp?: string;
    urlInstagram?: string;
    urlFacebook?: string;
    urlTikTok?: string;

    /**
     * Active color palette. Read at build time and injected as CSS custom properties
     * in plugins/paleta.ts. When set to 'custom', the paletaCustom* fields below are used. RF-15.
     */
    paletaActiva: 'claro' | 'oscuro' | 'oceano' | 'atardecer' | 'custom';

    // RF-15: custom palette hex values — only consumed when paletaActiva === 'custom'.
    /** Primary brand color (hex). E.g. '#3b82f6'. */
    paletaCustomPrimario?: string;
    /** Secondary brand color (hex). */
    paletaCustomSecundario?: string;
    /** Accent color (hex). */
    paletaCustomAcento?: string;
    /** Page background color (hex). */
    paletaCustomFondo?: string;
    /** Primary text color (hex). */
    paletaCustomTexto?: string;

    /**
     * Visual variant that controls card layout style and density. RF-16.
     * Applied as a CSS class on the catalog container component at build time.
     */
    varianteVisual: 'clasico' | 'moderno' | 'minimalista';

    /**
     * When true, patronDecorativo is rendered as a semi-transparent repeating
     * CSS background overlay on the catalog. RF-16.
     */
    patronDecorativoActivo: boolean;
    /**
     * Small image (~200×200 px, PNG with transparent background) used as the
     * decorative overlay pattern. Only consumed when patronDecorativoActivo is true.
     * RF-16. Examples: Halloween bats, Christmas snowflakes.
     */
    patronDecorativo?: SanityImage;

    /**
     * When producto.stock <= umbralStockBajo, the frontend shows the "¡Pocas unidades!" alert.
     * Default: 5. Resolves ERS Open Issue #3. RF-03, RF-14.
     */
    umbralStockBajo: number;
    /**
     * Number of products fetched per page in the catalog GROQ query.
     * Default: 24. Resolves ERS Open Issue #2. RF-19.
     */
    productosPorPagina: number;
}