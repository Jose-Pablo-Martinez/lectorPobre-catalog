/**
 * @file useStructuredData.ts
 * @description Generador de datos estructurados Schema.org (JSON-LD) para optimizar
 * el posicionamiento en Google (Rich Snippets, Breadcrumbs y Schema de Producto/Comercio).
 * @satisfies RF-20 (SEO y metadatos)
 */

import type { Comentario, Producto } from '~/types/sanity';

export interface WebsiteSchemaOptions {
    siteUrl: string;
    siteName?: string;
    description?: string;
    logoUrl?: string;
}

export interface ProductSchemaOptions {
    producto: Producto;
    siteUrl: string;
    imageUrl?: string | null;
    stockActual?: number;
    comentarios?: Comentario[];
}

/**
 * Remueve diagonales finales de una URL de forma segura sin usar expresiones regulares
 * para evitar problemas de backtracking y rendimiento superlineal (SonarQube S5852).
 */
export function removeTrailingSlash(url: string): string {
    let clean = url;
    while (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }
    return clean;
}

/**
 * Genera el JSON-LD de WebSite y Store (Organización) para la página principal.
 */
export function buildWebsiteJsonLd(options: WebsiteSchemaOptions): Record<string, any> {
    const siteUrl = removeTrailingSlash(options.siteUrl);
    const siteName = options.siteName || 'Lector Pobre';
    const description =
        options.description ||
        'Catálogo de arte, llaveros, pines y stickers ilustrados del taller Lector Pobre.';
    const logoUrl = options.logoUrl || `${siteUrl}/logo.png`;

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: siteUrl,
                name: siteName,
                description,
                inLanguage: 'es',
            },
            {
                '@type': 'Store',
                '@id': `${siteUrl}/#store`,
                name: siteName,
                url: siteUrl,
                logo: logoUrl,
                image: logoUrl,
                description,
                priceRange: '$$',
            },
        ],
    };
}

/**
 * Genera el JSON-LD para la ficha de producto y su ruta de navegación (BreadcrumbList),
 * permitiendo a Google mostrar precio, disponibilidad, estrellas y reseñas en los resultados.
 */
export function buildProductJsonLd(options: ProductSchemaOptions): Record<string, any> {
    const siteUrl = removeTrailingSlash(options.siteUrl);
    const prod = options.producto;
    const slug = prod.slug?.current ?? prod._id;
    const currentUrl = `${siteUrl}/product/${encodeURIComponent(slug)}`;
    const mainImage = options.imageUrl || `${siteUrl}/logo.png`;
    const stock = typeof options.stockActual === 'number' ? options.stockActual : prod.stock;

    const breadcrumbs = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Catálogo',
            item: `${siteUrl}/`,
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: prod.nombre,
            item: currentUrl,
        },
    ];

    const productNode: Record<string, any> = {
        '@type': 'Product',
        '@id': `${currentUrl}#product`,
        name: prod.nombre,
        description:
            prod.descripcion ||
            `Pieza artesanal ${prod.nombre} de diseño original en el taller Lector Pobre.`,
        image: mainImage ? [mainImage] : [],
        sku: prod._id,
        category: prod.categoria?.nombre || 'Arte y Artesanías',
        brand: {
            '@type': 'Brand',
            name: 'Lector Pobre',
        },
        offers: {
            '@type': 'Offer',
            url: currentUrl,
            priceCurrency: 'MXN',
            price: prod.precio ?? 0,
            availability:
                stock > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: {
                '@type': 'Organization',
                name: 'Lector Pobre',
            },
        },
    };

    if (
        typeof prod.ratingCount === 'number' &&
        prod.ratingCount > 0 &&
        typeof prod.calificacionPromedio === 'number' &&
        prod.calificacionPromedio > 0
    ) {
        productNode.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: prod.calificacionPromedio,
            reviewCount: prod.ratingCount,
            bestRating: 5,
            worstRating: 1,
        };
    }

    const approvedReviews = (options.comentarios || [])
        .filter((c) => typeof c.calificacion === 'number' && c.texto)
        .map((c) => ({
            '@type': 'Review',
            reviewRating: {
                '@type': 'Rating',
                ratingValue: c.calificacion,
                bestRating: 5,
                worstRating: 1,
            },
            reviewBody: c.texto,
            datePublished: c.fechaCreacion ?? c._createdAt,
            author: {
                '@type': 'Person',
                name: 'Cliente verificado',
            },
        }));

    if (approvedReviews.length > 0) {
        productNode.review = approvedReviews;
    }

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: breadcrumbs,
            },
            productNode,
        ],
    };
}

