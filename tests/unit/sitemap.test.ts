/**
 * @file sitemap.test.ts
 * @description Pruebas unitarias para la generación de sitemap XML y registro
 * de rutas dinámicas de producto para prerenderización SSG (RF-20, RNF-02).
 * @satisfies RF-20, RNF-02, M-2
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemapHandler, {
    buildSitemapXml,
    fetchProductsForSitemap,
} from '~/server/routes/sitemap.xml';
import {
    buildProductPrerenderRoutes,
    DEFAULT_SITE_URL,
    escapeXml,
    extractLatestLastmod,
    fetchActiveProductSlugs,
    formatIsoDate,
    normalizeBaseUrl,
    registerProductPrerenderRoutes,
} from '~/server/utils/sitemap';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Utilidades de Sitemap y Prerender SSG (RF-20, RNF-02)', () => {
    it('normalizeBaseUrl elimina espacios y múltiples diagonales finales', () => {
        expect(normalizeBaseUrl(' https://lectorpobre.vercel.app/// ')).toBe(
            'https://lectorpobre.vercel.app'
        );
        expect(normalizeBaseUrl('https://lectorpobre.com')).toBe('https://lectorpobre.com');
    });

    it('formatIsoDate extrae fechas YYYY-MM-DD válidas y aplica fallback en entradas inválidas', () => {
        expect(formatIsoDate('2026-11-23T18:30:00Z', '2026-01-01')).toBe('2026-11-23');
        expect(formatIsoDate('invalid-date', '2026-01-01')).toBe('2026-01-01');
        expect(formatIsoDate(undefined, '2026-01-01')).toBe('2026-01-01');
    });

    it('extractLatestLastmod selecciona el _updatedAt más reciente del catálogo', () => {
        expect(
            extractLatestLastmod(
                [
                    { slug: 'a', _updatedAt: '2026-10-15T12:00:00Z' },
                    { slug: 'b', _updatedAt: '2026-11-24T01:00:00Z' },
                    { slug: 'c', _updatedAt: '2026-11-01T00:00:00Z' },
                    { slug: 'd', _updatedAt: 'no-date' },
                ],
                '2026-01-01'
            )
        ).toBe('2026-11-24');
        expect(extractLatestLastmod([], '2026-01-01')).toBe('2026-01-01');
    });

    it('escapeXml escapa todos los caracteres reservados XML', () => {
        expect(escapeXml(`a & b < c > d " e ' f`)).toBe(
            'a &amp; b &lt; c &gt; d &quot; e &apos; f'
        );
    });

    it('buildProductPrerenderRoutes deduplica, omite vacíos y codifica slugs', () => {
        const routes = buildProductPrerenderRoutes([
            { slug: 'llavero-del-mistico' },
            { slug: 'llavero-del-mistico' },
            { slug: '   ' },
            { slug: undefined },
            { slug: 'pin edición especial' },
        ]);

        expect(routes).toEqual([
            '/product/llavero-del-mistico',
            '/product/pin%20edici%C3%B3n%20especial',
        ]);
    });

    it('buildSitemapXml genera XML limpio sin changefreq/priority y con lastmod real en raíz', () => {
        const mockProductos = [
            { slug: 'llavero-ajolote', _updatedAt: '2026-10-31T12:00:00Z' },
            { slug: 'sticker-neon', _updatedAt: '2026-11-20T10:00:00Z' },
            { slug: 'llavero-ajolote', _updatedAt: '2026-10-01T00:00:00Z' },
        ];

        const xml = buildSitemapXml(mockProductos, 'https://lectorpobre.com/', '2026-10-01');

        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(xml).toContain(
            '<url>\n        <loc>https://lectorpobre.com/</loc>\n        <lastmod>2026-11-20</lastmod>\n    </url>'
        );
        expect(xml).toContain('<loc>https://lectorpobre.com/product/llavero-ajolote</loc>');
        expect(xml).toContain('<loc>https://lectorpobre.com/product/sticker-neon</loc>');
        expect(xml).not.toContain('<changefreq>');
        expect(xml).not.toContain('<priority>');
        expect(xml.match(/llavero-ajolote/g)).toHaveLength(1);
    });

    it('buildSitemapXml usa URL por defecto cuando baseUrl viene vacía', () => {
        const xml = buildSitemapXml([], '   ', '2026-11-23');
        expect(xml).toContain(`<loc>${DEFAULT_SITE_URL}/</loc>`);
        expect(xml).toContain('<lastmod>2026-11-23</lastmod>');
    });

    it('M-2: buildSitemapXml codifica slugs y escapa caracteres especiales XML', () => {
        const xml = buildSitemapXml(
            [
                { slug: 'pin & sticker <edición>', _updatedAt: '2026-10-31T00:00:00Z' },
                { slug: '   ' },
            ],
            'https://lectorpobre.com/',
            '2026-10-31'
        );

        expect(xml).toContain(
            '<loc>https://lectorpobre.com/product/pin%20%26%20sticker%20%3Cedici%C3%B3n%3E</loc>'
        );
        expect(xml).not.toContain('<edición>');
    });

    it('fetchActiveProductSlugs y fetchProductsForSitemap procesan respuestas válidas e inválidas', async () => {
        const okFetcher = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                result: [{ slug: 'pieza-arte-1', _updatedAt: '2026-10-25T00:00:00Z' }],
            }),
        });
        const items = await fetchActiveProductSlugs({
            projectId: 'proj-test',
            dataset: 'staging',
            fetcher: okFetcher as any,
        });
        expect(items).toHaveLength(1);
        expect(items[0].slug).toBe('pieza-arte-1');

        const errFetcher = vi.fn().mockResolvedValue({ ok: false, status: 500 });
        expect(await fetchActiveProductSlugs({ fetcher: errFetcher as any })).toEqual([]);

        const malformedFetcher = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: null }),
        });
        expect(await fetchActiveProductSlugs({ fetcher: malformedFetcher as any })).toEqual([]);

        const noFetcher = await fetchActiveProductSlugs({ fetcher: undefined });
        expect(Array.isArray(noFetcher)).toBe(true);

        vi.stubGlobal('fetch', okFetcher);
        const legacyItems = await fetchProductsForSitemap('proj-test', 'staging');
        expect(legacyItems).toHaveLength(1);
    });

    it('fetchActiveProductSlugs retorna [] cuando globalThis.fetch no está disponible', async () => {
        vi.stubGlobal('fetch', undefined);
        expect(await fetchActiveProductSlugs()).toEqual([]);
    });

    it('registerProductPrerenderRoutes agrega rutas únicas al Set de Nitro y tolera fallos', async () => {
        const routes = new Set<string>(['/']);
        const mockFetcher = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                result: [
                    { slug: 'llavero-mistico' },
                    { slug: 'sticker-g-de-penta' },
                ],
            }),
        });

        await registerProductPrerenderRoutes(routes, { fetcher: mockFetcher as any });
        expect(Array.from(routes)).toEqual([
            '/',
            '/product/llavero-mistico',
            '/product/sticker-g-de-penta',
        ]);

        const failingFetcher = vi.fn().mockRejectedValue(new Error('Timeout'));
        await registerProductPrerenderRoutes(routes, { fetcher: failingFetcher as any });
        expect(routes.size).toBe(3);
    });

    it('sitemapHandler maneja fallos de fetch y configura cabeceras cuando setHeader existe', async () => {
        const setHeaderSpy = vi.fn();
        vi.stubGlobal('setHeader', setHeaderSpy);
        vi.stubGlobal('useRuntimeConfig', () => ({
            public: { siteUrl: 'https://custom.lectorpobre.app/' },
        }));
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

        const xml = await sitemapHandler({} as any);
        expect(setHeaderSpy).toHaveBeenCalledWith(
            {},
            'content-type',
            'application/xml; charset=utf-8'
        );
        expect(xml).toContain('<loc>https://custom.lectorpobre.app/</loc>');
        expect(xml).toContain('</urlset>');
    });

    it('sitemapHandler aplica fallbacks de URL (env y DEFAULT_SITE_URL) sin setHeader y soporta defineEventHandler', async () => {
        vi.stubGlobal('setHeader', undefined);
        vi.stubGlobal('useRuntimeConfig', undefined);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: [{ slug: 'llavero-test', _updatedAt: '2026-11-23' }] }),
        }));

        const originalSiteUrl = process.env.NUXT_PUBLIC_SITE_URL;
        try {
            process.env.NUXT_PUBLIC_SITE_URL = 'https://env.lectorpobre.app/';
            const xmlEnv = await sitemapHandler({} as any);
            expect(xmlEnv).toContain('<loc>https://env.lectorpobre.app/product/llavero-test</loc>');

            process.env.NUXT_PUBLIC_SITE_URL = '';
            vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }));
            const xmlDefault = await sitemapHandler({} as any);
            expect(xmlDefault).toContain(`<loc>${DEFAULT_SITE_URL}/product/llavero-test</loc>`);

            vi.resetModules();
            const defineSpy = vi.fn((fn: unknown) => fn);
            vi.stubGlobal('defineEventHandler', defineSpy);
            const mod = await import('~/server/routes/sitemap.xml');
            expect(defineSpy).toHaveBeenCalledTimes(1);
            expect(typeof mod.default).toBe('function');
        } finally {
            if (originalSiteUrl === undefined) {
                delete process.env.NUXT_PUBLIC_SITE_URL;
            } else {
                process.env.NUXT_PUBLIC_SITE_URL = originalSiteUrl;
            }
        }
    });
});
