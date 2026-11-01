/**
 * @file sitemap.test.ts
 * @description Pruebas unitarias para la generación de sitemap XML (RF-20, RNF-02).
 * @satisfies RF-20, RNF-02
 */

import { describe, expect, it, vi } from 'vitest';
import sitemapHandler, {
    buildSitemapXml,
    fetchProductsForSitemap,
} from '~/server/routes/sitemap.xml';

describe('Sitemap XML (RF-20, RNF-02)', () => {
    it('buildSitemapXml genera una estructura XML válida cumpliendo sitemaps.org', () => {
        const mockProductos = [
            { slug: 'llavero-ajolote', _updatedAt: '2026-10-31T12:00:00Z' },
            { slug: 'sticker-neon', _updatedAt: '2026-10-30T10:00:00Z' },
        ];

        const xml = buildSitemapXml(mockProductos, 'https://lectorpobre.com', '2026-10-31');

        expect(typeof xml).toBe('string');
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(xml).toContain('<loc>https://lectorpobre.com/</loc>');
        expect(xml).toContain('<loc>https://lectorpobre.com/product/llavero-ajolote</loc>');
        expect(xml).toContain('<loc>https://lectorpobre.com/product/sticker-neon</loc>');
        expect(xml).toContain('<lastmod>2026-10-31</lastmod>');
    });

    it('fetchProductsForSitemap obtiene y procesa los slugs activos de Sanity', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                result: [{ slug: 'pieza-arte-1', _updatedAt: '2026-10-25T00:00:00Z' }],
            }),
        }) as any;

        try {
            const items = await fetchProductsForSitemap('proj-test', 'staging');
            expect(items).toHaveLength(1);
            expect(items[0].slug).toBe('pieza-arte-1');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('sitemapHandler maneja fallos de fetch generando la URL raíz de respaldo', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

        try {
            const xml = await sitemapHandler({} as any);
            expect(xml).toContain('<loc>https://lectorpobre.com/</loc>');
            expect(xml).toContain('</urlset>');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
