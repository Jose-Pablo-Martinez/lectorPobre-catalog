/**
 * @file sitemap.xml.ts
 * @description Ruta de servidor Nitro para la generación estática y dinámica del sitemap XML.
 * Consulta los slugs de productos activos desde Sanity para indexación en motores de búsqueda.
 * @satisfies RF-20 (SEO y metadatos), RNF-02 (Rendimiento Jamstack)
 */

export interface ProductSitemapItem {
    slug?: string;
    _updatedAt?: string;
}

/**
 * Escapa caracteres reservados de XML (&, <, >, ", ') para prevenir inyección o malformación XML (M-2).
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
 * Construye el documento XML para el sitemap cumpliendo el protocolo sitemaps.org.
 *
 * @param productos Lista de productos activos con su slug y fecha de modificación.
 * @param baseUrl URL base canónica del sitio web (por defecto https://lectorpobre.vercel.app o NUXT_PUBLIC_SITE_URL).
 * @param currentDate Fecha ISO opcional de referencia para la raíz.
 * @returns Cadena con el XML formateado del sitemap.
 */
export function buildSitemapXml(
    productos: ProductSitemapItem[],
    baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://lectorpobre.vercel.app',
    currentDate?: string
): string {
    const nowIso = currentDate ?? new Date().toISOString().split('T')[0];
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const safeRootLoc = escapeXml(`${cleanBaseUrl}/`);
    const safeNowIso = escapeXml(nowIso);

    const xmlUrls = [
        `    <url>\n        <loc>${safeRootLoc}</loc>\n        <lastmod>${safeNowIso}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>1.0</priority>\n    </url>`,
    ];

    for (const prod of productos) {
        const cleanSlug = prod.slug?.trim();
        if (cleanSlug) {
            const safeSlug = encodeURIComponent(cleanSlug);
            const rawLastmod = prod._updatedAt ? prod._updatedAt.split('T')[0] : nowIso;
            const safeLoc = escapeXml(`${cleanBaseUrl}/product/${safeSlug}`);
            const safeLastmod = escapeXml(rawLastmod);
            xmlUrls.push(
                `    <url>\n        <loc>${safeLoc}</loc>\n        <lastmod>${safeLastmod}</lastmod>\n        <changefreq>weekly</changefreq>\n        <priority>0.8</priority>\n    </url>`
            );
        }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls.join('\n')}
</urlset>`;
}

/**
 * Consulta la lista de productos activos desde el endpoint público de Sanity.
 *
 * @param projectId Identificador del proyecto Sanity.
 * @param dataset Dataset público ('staging' | 'production').
 * @returns Lista de productos con slugs activos.
 */
export async function fetchProductsForSitemap(
    projectId = process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || 'rbrk7xv9',
    dataset = process.env.NUXT_PUBLIC_SANITY_DATASET || 'staging'
): Promise<ProductSitemapItem[]> {
    try {
        const query = encodeURIComponent(
            '*[_type == "producto" && activo == true]{ "slug": slug.current, _updatedAt }'
        );
        const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`;
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
        });
        if (response.ok) {
            const data = (await response.json()) as { result?: ProductSitemapItem[] };
            if (Array.isArray(data.result)) {
                return data.result;
            }
        }
    } catch {
        // En ausencia de red retorna arreglo vacío
    }
    return [];
}

const sitemapRouteHandler = async (event: any) => {
    if (typeof setHeader === 'function') {
        setHeader(event, 'content-type', 'application/xml; charset=utf-8');
    }
    const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : undefined;
    const baseUrl =
        config?.public?.siteUrl ||
        process.env.NUXT_PUBLIC_SITE_URL ||
        'https://lectorpobre.vercel.app';
    const productos = await fetchProductsForSitemap();
    return buildSitemapXml(productos, baseUrl);
};

export default typeof defineEventHandler === 'function'
    ? defineEventHandler(sitemapRouteHandler)
    : sitemapRouteHandler;
