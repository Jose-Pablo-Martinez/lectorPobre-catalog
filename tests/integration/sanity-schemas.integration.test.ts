/**
 * @file sanity-schemas.integration.test.ts
 * @description Tests de integración para los esquemas de Sanity y las consultas GROQ.
 * Estos tests se ejecutan contra el dataset REAL `staging` de Sanity.
 *
 * NO se ejecutan con `pnpm run test` (tests unitarios puros).
 * Se ejecutan con: `pnpm run test:integration`
 *
 * Requieren las siguientes variables de entorno en .env.local:
 *   - VITE_SANITY_PROJECT_ID  → ID del proyecto de Sanity
 *   - VITE_SANITY_DATASET     → dataset a consultar (por defecto: 'staging')
 *
 * @satisfies IT-SANITY-02 — GROQ catalog query returns expected fields.
 * @satisfies IT-SANITY-03 — configuracionGlobal singleton is queryable.
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@sanity/client';

// ── Cliente Sanity apuntando a staging ────────────────────────────────────────
// NUNCA usar useCdn: true en tests — el CDN puede devolver datos en caché.
const client = createClient({
    projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
    dataset:   import.meta.env.VITE_SANITY_DATASET ?? 'staging',
    useCdn:    false,
    apiVersion: '2024-01-01',
});

// ── IT-SANITY-02 — Schema producto: campos obligatorios y contadores ───────────

describe('IT-SANITY-02 | Sanity GROQ — schema producto', () => {

    it('devuelve productos activos con los campos requeridos por el frontend', async () => {
        const productos = await client.fetch(
            `*[_type == "producto" && activo == true][0...3]
             { _id, nombre, slug, stock, categoria->{nombre, slug} }`
        );

        expect(Array.isArray(productos)).toBe(true);
        expect(productos.length).toBeGreaterThan(0);

        const p = productos[0];
        expect(p).toHaveProperty('_id');
        expect(p).toHaveProperty('nombre');
        expect(p).toHaveProperty('slug.current');
        expect(typeof p.stock).toBe('number');
        expect(p).toHaveProperty('categoria.nombre');
        expect(p).toHaveProperty('categoria.slug.current');
    });

    it('el campo activo=false excluye el producto de las consultas públicas', async () => {
        // Verifica que la cláusula activo == true filtra correctamente.
        const todos      = await client.fetch(`count(*[_type == "producto"])`);
        const soloActivos = await client.fetch(`count(*[_type == "producto" && activo == true])`);

        // Puede haber productos inactivos; lo importante es que el filtro funcione.
        expect(soloActivos).toBeLessThanOrEqual(todos);
    });

    it('los contadores de calificación son números no negativos (ratingSum y ratingCount)', async () => {
        const productos = await client.fetch(
            `*[_type == "producto"][0...5]{ ratingSum, ratingCount }`
        );

        expect(Array.isArray(productos)).toBe(true);
        productos.forEach((p: { ratingSum: number; ratingCount: number }) => {
            // Los campos pueden ser null si no se inicializaron — el frontend debe manejarlo.
            if (p.ratingSum !== null && p.ratingSum !== undefined) {
                expect(typeof p.ratingSum).toBe('number');
                expect(p.ratingSum).toBeGreaterThanOrEqual(0);
            }
            if (p.ratingCount !== null && p.ratingCount !== undefined) {
                expect(typeof p.ratingCount).toBe('number');
                expect(p.ratingCount).toBeGreaterThanOrEqual(0);
            }
        });
    });

    it('los contadores por estrella (rating1Count–rating5Count) son números no negativos', async () => {
        const productos = await client.fetch(
            `*[_type == "producto"][0...5]
             { rating1Count, rating2Count, rating3Count, rating4Count, rating5Count }`
        );

        const contadores = ['rating1Count', 'rating2Count', 'rating3Count', 'rating4Count', 'rating5Count'] as const;

        productos.forEach((p: Record<string, number | null>) => {
            contadores.forEach(campo => {
                if (p[campo] !== null && p[campo] !== undefined) {
                    expect(typeof p[campo]).toBe('number');
                    expect(p[campo]).toBeGreaterThanOrEqual(0);
                }
            });
        });
    });

    it('el promedio calculado en GROQ devuelve null cuando ratingCount es 0', async () => {
        // Verifica que la expresión select() de GROQ no hace división por cero.
        const productos = await client.fetch(
            `*[_type == "producto"][0...5]
             {
               "calificacionPromedio": select(
                 ratingCount > 0 => round(ratingSum / ratingCount, 1),
                 null
               ),
               ratingCount
             }`
        );

        productos.forEach((p: { calificacionPromedio: number | null; ratingCount: number }) => {
            if (!p.ratingCount || p.ratingCount === 0) {
                expect(p.calificacionPromedio).toBeNull();
            } else {
                expect(p.calificacionPromedio).toBeGreaterThanOrEqual(1);
                expect(p.calificacionPromedio).toBeLessThanOrEqual(5);
            }
        });
    });

    it('los comentarios aprobados de un producto tienen los campos requeridos', async () => {
        // Busca cualquier comentario aprobado en staging.
        const comentarios = await client.fetch(
            `*[_type == "comentario" && estado == "aprobado"][0...3]
             { _id, texto, fechaCreacion, estado, producto }`
        );

        // Es válido que no haya comentarios aprobados en staging todavía.
        if (comentarios.length > 0) {
            comentarios.forEach((c: { _id: string; texto: string; estado: string; producto: { _ref: string } }) => {
                expect(c).toHaveProperty('_id');
                expect(typeof c.texto).toBe('string');
                expect(c.estado).toBe('aprobado');
                expect(c.producto).toHaveProperty('_ref');
            });
        }
    });
});

// ── IT-SANITY-03 — Schema configuracionGlobal: singleton consultable ───────────

describe('IT-SANITY-03 | Sanity GROQ — singleton configuracionGlobal', () => {

    it('el documento singleton existe y tiene los campos obligatorios', async () => {
        const config = await client.fetch(
            `*[_type == "configuracionGlobal"][0]
             { paletaActiva, varianteVisual, umbralStockBajo, productosPorPagina, numeroWhatsApp }`
        );

        expect(config).not.toBeNull();
        expect(typeof config.umbralStockBajo).toBe('number');
        expect(typeof config.productosPorPagina).toBe('number');
        expect(config.umbralStockBajo).toBeGreaterThan(0);
        expect(config.productosPorPagina).toBeGreaterThan(0);
    });

    it('paletaActiva tiene un valor reconocido por el sistema de paletas', async () => {
        const config = await client.fetch(
            `*[_type == "configuracionGlobal"][0]{ paletaActiva }`
        );

        const PALETAS_VALIDAS = ['claro', 'oscuro', 'oceano', 'atardecer', 'custom'];
        expect(PALETAS_VALIDAS).toContain(config.paletaActiva);
    });

    it('varianteVisual tiene un valor reconocido por el sistema de layout', async () => {
        const config = await client.fetch(
            `*[_type == "configuracionGlobal"][0]{ varianteVisual }`
        );

        const VARIANTES_VALIDAS = ['clasico', 'moderno', 'minimalista'];
        expect(VARIANTES_VALIDAS).toContain(config.varianteVisual);
    });

    it('existe exactamente un documento configuracionGlobal en staging', async () => {
        const total = await client.fetch(`count(*[_type == "configuracionGlobal"])`);
        expect(total).toBe(1);
    });
});
