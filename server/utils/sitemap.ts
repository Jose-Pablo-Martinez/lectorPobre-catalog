/**
 * @file server/utils/sitemap.ts
 * @description Utilidades puras y cliente ligero de Sanity compartidos entre el
 * hook de prerenderización SSG de Nuxt (`nuxt.config.ts`) y la ruta Nitro `/sitemap.xml`.
 * Garantiza una única fuente de verdad (DRY) para rutas de productos, normalización de
 * URLs, escape XML y fechas `<lastmod>` basadas en modificaciones reales del catálogo.
 * @satisfies RF-20 (SEO y metadatos), RNF-02 (Rendimiento Jamstack), M-2 (Sanitización XML)
 */

export interface ProductSitemapItem {
    slug?: string;
    _updatedAt?: string;
}

export interface FetchProductsOptions {
    projectId?: string;
    dataset?: string;
    fetcher?: typeof fetch;
}

export const DEFAULT_SANITY_PROJECT_ID = 'rbrk7xv9';
export const DEFAULT_SANITY_DATASET = 'staging';
export const DEFAULT_SITE_URL = 'https://lectorpobre.vercel.app';

const ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Escapa caracteres reservados de XML (`&`, `<`, `>`, `"`, `'`) para prevenir
 * inyección o malformación XML (`M-2`).
 */
export function escapeXml(valor: string): string {
    return valor
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

/**
 * Normaliza una URL base eliminando espacios laterales y diagonales finales
 * en tiempo lineal sin expresiones regulares (previene backtracking S5852).
 */
export function normalizeBaseUrl(baseUrl: string): string {
    let clean = baseUrl.trim();
    while (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }
    return clean;
}

/**
 * Extrae y valida la porción de fecha ISO (`YYYY-MM-DD`) de un timestamp.
 * Retorna `fallbackDate` si el timestamp no inicia con una fecha ISO válida.
 */
export function formatIsoDate(
    isoTimestamp: string | undefined,
    fallbackDate: string
): string {
    if (!isoTimestamp) return fallbackDate;
    const datePrefix = isoTimestamp.trim().slice(0, 10);
    return ISO_DATE_PREFIX_RE.test(datePrefix) ? datePrefix : fallbackDate;
}

/**
 * Obtiene la fecha `YYYY-MM-DD` más reciente entre los productos activos
 * para que `<lastmod>` de la raíz refleje cambios reales del catálogo.
 */
export function extractLatestLastmod(
    productos: readonly ProductSitemapItem[],
    fallbackDate: string
): string {
    let latest = '';
    for (const prod of productos) {
        const candidate = formatIsoDate(prod._updatedAt, '');
        if (candidate && candidate > latest) {
            latest = candidate;
        }
    }
    return latest || fallbackDate;
}

/**
 * Construye las rutas relativas `/product/<slug>` deduplicadas y codificadas
 * para prerenderización SSG en Nitro.
 */
export function buildProductPrerenderRoutes(
    productos: readonly ProductSitemapItem[]
): string[] {
    const routes = new Set<string>();
    for (const prod of productos) {
        const cleanSlug = prod.slug?.trim();
        if (cleanSlug) {
            routes.add(`/product/${encodeURIComponent(cleanSlug)}`);
        }
    }
    return Array.from(routes);
}

/**
 * Construye el documento XML del sitemap siguiendo las directrices actuales de
 * Google Search Central (solo `<loc>` y `<lastmod>`, omitiendo `<changefreq>` y
 * `<priority>` obsoletos, y deduplicando slugs).
 */
export function buildSitemapXml(
    productos: readonly ProductSitemapItem[],
    baseUrl?: string,
    currentDate?: string
): string {
    const fallbackDate = currentDate ?? new Date().toISOString().slice(0, 10);
    const rawBaseUrl =
        baseUrl && baseUrl.trim().length > 0
            ? baseUrl
            : (process.env.NUXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
    const cleanBaseUrl = normalizeBaseUrl(rawBaseUrl);
    const rootLastmod = extractLatestLastmod(productos, fallbackDate);
    const safeRootLoc = escapeXml(`${cleanBaseUrl}/`);
    const safeRootLastmod = escapeXml(rootLastmod);

    const xmlUrls: string[] = [
        `    <url>\n        <loc>${safeRootLoc}</loc>\n        <lastmod>${safeRootLastmod}</lastmod>\n    </url>`,
    ];

    const seenSlugs = new Set<string>();
    for (const prod of productos) {
        const cleanSlug = prod.slug?.trim();
        if (!cleanSlug || seenSlugs.has(cleanSlug)) continue;
        seenSlugs.add(cleanSlug);

        const safeLoc = escapeXml(`${cleanBaseUrl}/product/${encodeURIComponent(cleanSlug)}`);
        const safeLastmod = escapeXml(formatIsoDate(prod._updatedAt, fallbackDate));
        xmlUrls.push(
            `    <url>\n        <loc>${safeLoc}</loc>\n        <lastmod>${safeLastmod}</lastmod>\n    </url>`
        );
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls.join('\n')}
</urlset>`;
}

/**
 * Consulta la lista de productos activos con slug definido desde Sanity.
 * Retorna `[]` de forma segura ante fallos de red o respuestas no válidas.
 */
export async function fetchActiveProductSlugs(
    options: FetchProductsOptions = {}
): Promise<ProductSitemapItem[]> {
    const projectId =
        options.projectId || process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || DEFAULT_SANITY_PROJECT_ID;
    const dataset =
        options.dataset || process.env.NUXT_PUBLIC_SANITY_DATASET || DEFAULT_SANITY_DATASET;
    const fetchFn = options.fetcher ?? globalThis.fetch;

    if (typeof fetchFn !== 'function') {
        return [];
    }

    try {
        const query = encodeURIComponent(
            '*[_type == "producto" && activo == true && defined(slug.current)] | order(_updatedAt desc){ "slug": slug.current, _updatedAt }'
        );
        const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;
        const response = await fetchFn(url, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
            return [];
        }
        const data = (await response.json()) as { result?: unknown };
        return Array.isArray(data.result) ? (data.result as ProductSitemapItem[]) : [];
    } catch {
        return [];
    }
}

/**
 * Registra en el `Set` de prerenderización de Nitro todas las rutas activas `/product/<slug>`
 * evitando que páginas de producto fuera de la primera página devuelvan 404 en SSG.
 */
export async function registerProductPrerenderRoutes(
    routes: Set<string>,
    options: FetchProductsOptions = {}
): Promise<void> {
    const productos = await fetchActiveProductSlugs(options);
    for (const route of buildProductPrerenderRoutes(productos)) {
        routes.add(route);
    }
}
