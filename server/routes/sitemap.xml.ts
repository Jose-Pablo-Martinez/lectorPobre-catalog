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
 * Construye el documento XML para el sitemap cumpliendo el protocolo sitemaps.org.
 *
 * @param productos Lista de productos activos con su slug y fecha de modificación.
 * @param baseUrl URL base canónica del sitio web.
 * @param currentDate Fecha ISO opcional de referencia para la raíz.
 * @returns Cadena con el XML formateado del sitemap.
 */
export function buildSitemapXml(
    productos: ProductSitemapItem[],
    baseUrl = 'https://lectorpobre.com',
    currentDate?: string
): string {
    const nowIso = currentDate ?? new Date().toISOString().split('T')[0];

    const xmlUrls = [
        `    <url>\n        <loc>${baseUrl}/</loc>\n        <lastmod>${nowIso}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>1.0</priority>\n    </url>`,
    ];

    for (const prod of productos) {
        if (prod.slug) {
            const lastmod = prod._updatedAt ? prod._updatedAt.split('T')[0] : nowIso;
            xmlUrls.push(
                `    <url>\n        <loc>${baseUrl}/product/${prod.slug}</loc>\n        <lastmod>${lastmod}</lastmod>\n        <changefreq>weekly</changefreq>\n        <priority>0.8</priority>\n    </url>`
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
    const productos = await fetchProductsForSitemap();
    return buildSitemapXml(productos);
};

export default typeof defineEventHandler === 'function'
    ? defineEventHandler(sitemapRouteHandler)
    : sitemapRouteHandler;
