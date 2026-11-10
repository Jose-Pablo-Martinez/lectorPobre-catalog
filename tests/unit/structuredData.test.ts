/**
 * @file structuredData.test.ts
 * @description Pruebas unitarias para la generación de datos estructurados Schema.org JSON-LD (RF-20).
 * @satisfies RF-20 (SEO y metadatos)
 */

import { describe, expect, it } from 'vitest';
import {
    buildProductJsonLd,
    buildWebsiteJsonLd,
} from '~/composables/useStructuredData';
import type { Comentario, Producto } from '~/types/sanity';

const PRODUCTO_MOCK: Producto = {
    _id: 'prod-seo-1',
    _type: 'producto',
    _createdAt: '2026-01-01T00:00:00Z',
    _updatedAt: '2026-01-01T00:00:00Z',
    _rev: '1',
    nombre: 'Llavero Gato Mágico',
    slug: { _type: 'slug', current: 'llavero-gato-magico' },
    descripcion: 'Llavero en resina epóxica con destellos holográficos.',
    categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
    stock: 5,
    precio: 95,
    activo: true,
    calificacionPromedio: 4.8,
    ratingCount: 12,
};

const COMENTARIOS_MOCK: Comentario[] = [
    {
        _id: 'com-1',
        _type: 'comentario',
        _createdAt: '2026-02-01T00:00:00Z',
        _updatedAt: '2026-02-01T00:00:00Z',
        _rev: '1',
        texto: 'Excelente calidad, el brillo es hermoso.',
        calificacion: 5,
        producto: { _type: 'reference', _ref: 'prod-seo-1' },
        fechaCreacion: '2026-02-01T00:00:00Z',
        estado: 'aprobado',
    },
];

describe('Datos Estructurados Schema.org JSON-LD (RF-20)', () => {
    it('buildWebsiteJsonLd genera el grafo WebSite y Store con URLs canónicas', () => {
        const jsonLd = buildWebsiteJsonLd({
            siteUrl: 'https://lectorpobre.vercel.app/',
            siteName: 'Lector Pobre',
        });

        expect(jsonLd['@context']).toBe('https://schema.org');
        expect(jsonLd['@graph']).toHaveLength(2);

        const websiteNode = jsonLd['@graph'].find((n: any) => n['@type'] === 'WebSite');
        expect(websiteNode.url).toBe('https://lectorpobre.vercel.app');
        expect(websiteNode.name).toBe('Lector Pobre');

        const storeNode = jsonLd['@graph'].find((n: any) => n['@type'] === 'Store');
        expect(storeNode.url).toBe('https://lectorpobre.vercel.app');
        expect(storeNode.logo).toBe('https://lectorpobre.vercel.app/logo.png');
    });

    it('buildProductJsonLd genera Product con ofertas, stock, aggregateRating y Breadcrumbs', () => {
        const jsonLd = buildProductJsonLd({
            producto: PRODUCTO_MOCK,
            siteUrl: 'https://lectorpobre.vercel.app',
            imageUrl: 'https://cdn.sanity.io/images/prod.jpg',
            stockActual: 5,
            comentarios: COMENTARIOS_MOCK,
        });

        expect(jsonLd['@context']).toBe('https://schema.org');
        const breadcrumbNode = jsonLd['@graph'].find((n: any) => n['@type'] === 'BreadcrumbList');
        expect(breadcrumbNode).toBeDefined();
        expect(breadcrumbNode.itemListElement).toHaveLength(2);
        expect(breadcrumbNode.itemListElement[1].name).toBe('Llavero Gato Mágico');
        expect(breadcrumbNode.itemListElement[1].item).toBe(
            'https://lectorpobre.vercel.app/product/llavero-gato-magico'
        );

        const productNode = jsonLd['@graph'].find((n: any) => n['@type'] === 'Product');
        expect(productNode.name).toBe('Llavero Gato Mágico');
        expect(productNode.offers.price).toBe(95);
        expect(productNode.offers.priceCurrency).toBe('MXN');
        expect(productNode.offers.availability).toBe('https://schema.org/InStock');
        expect(productNode.aggregateRating.ratingValue).toBe(4.8);
        expect(productNode.aggregateRating.reviewCount).toBe(12);
        expect(productNode.review).toHaveLength(1);
        expect(productNode.review[0].reviewRating.ratingValue).toBe(5);
    });

    it('buildProductJsonLd maneja correctamente productos agotados y sin calificaciones', () => {
        const productoSinCalificaciones: Producto = {
            ...PRODUCTO_MOCK,
            stock: 0,
            calificacionPromedio: null,
            ratingCount: 0,
        };

        const jsonLd = buildProductJsonLd({
            producto: productoSinCalificaciones,
            siteUrl: 'https://lectorpobre.vercel.app',
            stockActual: 0,
            comentarios: [],
        });

        const productNode = jsonLd['@graph'].find((n: any) => n['@type'] === 'Product');
        expect(productNode.offers.availability).toBe('https://schema.org/OutOfStock');
        expect(productNode.aggregateRating).toBeUndefined();
        expect(productNode.review).toBeUndefined();
    });
});

