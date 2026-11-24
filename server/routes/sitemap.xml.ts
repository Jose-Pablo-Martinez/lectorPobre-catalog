/**
 * @file sitemap.xml.ts
 * @description Ruta de servidor Nitro para la generación estática y dinámica del sitemap XML.
 * Delega la lógica compartida a `server/utils/sitemap.ts` cumpliendo DRY y SRP.
 * @satisfies RF-20 (SEO y metadatos), RNF-02 (Rendimiento Jamstack)
 */

import {
    buildSitemapXml,
    DEFAULT_SITE_URL,
    fetchActiveProductSlugs,
    type ProductSitemapItem,
} from '../utils/sitemap';

export { buildSitemapXml, escapeXml, type ProductSitemapItem } from '../utils/sitemap';

/**
 * Consulta la lista de productos activos desde el endpoint público de Sanity.
 * Mantiene la firma histórica delegando a `fetchActiveProductSlugs`.
 */
export async function fetchProductsForSitemap(
    projectId?: string,
    dataset?: string
): Promise<ProductSitemapItem[]> {
    return fetchActiveProductSlugs({ projectId, dataset });
}

const sitemapRouteHandler = async (event: unknown) => {
    if (typeof setHeader === 'function') {
        setHeader(event as any, 'content-type', 'application/xml; charset=utf-8');
    }
    const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : undefined;
    const baseUrl =
        config?.public?.siteUrl ||
        process.env.NUXT_PUBLIC_SITE_URL ||
        DEFAULT_SITE_URL;
    const productos = await fetchActiveProductSlugs();
    return buildSitemapXml(productos, baseUrl);
};

export default typeof defineEventHandler === 'function'
    ? defineEventHandler(sitemapRouteHandler)
    : sitemapRouteHandler;
