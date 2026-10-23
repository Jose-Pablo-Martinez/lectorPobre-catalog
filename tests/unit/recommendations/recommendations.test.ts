/**
 * @file recommendations.test.ts
 * @description Suite de pruebas unitarias, de contrato y de rendimiento para el pipeline
 * de recomendaciones en build time (`normalize.ts`, `vectorize.ts`, `similarity.ts`,
 * `contentBased.ts`, `fallbackRules.ts`, `build.ts`).
 * @satisfies UT-REC-01 a UT-REC-12, NF-BUS-03, RF-21, RF-23, RNF-07, RNF-08
 */

import { describe, expect, it } from 'vitest';
import {
    FALLBACK_BUILD_PRODUCTS,
    runRecommendationPipeline,
} from '~/scripts/recommendations/build';
import { normalizeProducts } from '~/scripts/recommendations/normalize';
import {
    computeProductSimilarity,
    computeSimilarities,
    cosineSimilarity,
} from '~/scripts/recommendations/similarity';
import { ContentBasedStrategy } from '~/scripts/recommendations/strategies/contentBased';
import { FallbackRulesStrategy } from '~/scripts/recommendations/strategies/fallbackRules';
import type {
    ProductDocument,
    RecommendationStrategy,
} from '~/scripts/recommendations/types';
import { l2Normalize, vectorizeProducts } from '~/scripts/recommendations/vectorize';

describe('UT-REC-01 a UT-REC-12 & NF-BUS-03: Pipeline de Recomendaciones y Preparación para Clustering', () => {
    it('UT-REC-01 & UT-REC-02: pondera tokens por campo (nombre 3x > palabrasClave 2x > descripción 1x)', () => {
        const docs: ProductDocument[] = [
            {
                _id: 'p1',
                nombre: 'Llavero Totoro',
                categoria: 'Llaveros',
                palabrasClave: ['ghibli'],
                descripcion: 'Pieza de bosque',
                precio: 100,
                stock: 5,
            },
        ];

        const norm = normalizeProducts(docs);
        expect(norm).toHaveLength(1);
        expect(norm[0]?.termFreqs['totoro']).toBe(3);
        expect(norm[0]?.termFreqs['ghibli']).toBe(2);
        expect(norm[0]?.termFreqs['bosque']).toBe(1);
    });

    it('UT-REC-03 & UT-REC-04: vectorizeProducts genera vectores TF-IDF L2 normalizados, one-hot de categoría y precio en [0, 1]', () => {
        const norm = normalizeProducts(FALLBACK_BUILD_PRODUCTS);
        const artifact = vectorizeProducts(norm);

        expect(artifact.schemaVersion).toBe(1);
        expect(artifact.vocabulary.length).toBeGreaterThan(0);
        expect(artifact.categories).toEqual(['llaveros', 'pins', 'stickers']);

        const vecGato = artifact.vectors['seed-prod-llavero-gato'];
        expect(vecGato).toBeDefined();
        expect(vecGato!.tfidf).toHaveLength(artifact.vocabulary.length);
        expect(vecGato!.categoryOneHot).toEqual([1, 0, 0]);
        expect(vecGato!.normalizedPrice).toBeGreaterThanOrEqual(0);
        expect(vecGato!.normalizedPrice).toBeLessThanOrEqual(1);
        expect(vecGato!.combinedVector).toHaveLength(
            artifact.vocabulary.length + artifact.categories.length + 1
        );

        // Norma L2 de un vector unitario es ~1
        const normSq = vecGato!.tfidf.reduce((acc, v) => acc + v * v, 0);
        expect(normSq).toBeCloseTo(1, 2);
        expect(l2Normalize([0, 0, 0])).toEqual([0, 0, 0]);
    });

    it('UT-REC-05, UT-REC-06 & UT-REC-07: calcula similitud coseno e híbrida excluyendo siempre al propio producto y respetando top-N', () => {
        expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
        expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
        expect(cosineSimilarity([], [])).toBe(0);

        const norm = normalizeProducts(FALLBACK_BUILD_PRODUCTS);
        const artifact = vectorizeProducts(norm);
        const sims = computeSimilarities(artifact, 3);

        for (const prod of FALLBACK_BUILD_PRODUCTS) {
            const list = sims[prod._id] ?? [];
            expect(list.length).toBeLessThanOrEqual(3);
            expect(list.some((item) => item.id === prod._id)).toBe(false);
        }

        // Dos llaveros deben tener mayor similitud entre sí que un llavero y un sticker distinto
        const vLlavero1 = artifact.vectors['seed-prod-llavero-gato']!;
        const vLlavero2 = artifact.vectors['seed-prod-llavero-studio-ghibli']!;
        const vPinRetro = artifact.vectors['seed-prod-pin-mushroom']!;

        expect(computeProductSimilarity(vLlavero1, vLlavero2)).toBeGreaterThan(
            computeProductSimilarity(vLlavero1, vPinRetro)
        );
    });

    it('UT-REC-08 & UT-REC-09: aplica estrategia de respaldo cuando hay < 2 productos o producto sin texto suficiente', () => {
        const strategy = new ContentBasedStrategy();

        // Catálogo con 1 solo producto -> no falla y devuelve lista vacía de similares
        const singleDoc: ProductDocument[] = [FALLBACK_BUILD_PRODUCTS[0]!];
        const outSingle = strategy.compute(singleDoc, {
            products: singleDoc,
            synonyms: [],
            topN: 6,
        });
        expect(outSingle.schemaVersion).toBe(1);
        expect(outSingle.items[singleDoc[0]!._id]?.similar).toEqual([]);

        // Producto con texto pobre ("A") usa reglas de respaldo sin lanzar error
        const sparseCatalog: ProductDocument[] = [
            { _id: 'sparse-1', nombre: 'A', categoria: 'Pins', precio: 60, stock: 5 },
            ...FALLBACK_BUILD_PRODUCTS,
        ];
        const outSparse = strategy.compute(sparseCatalog, {
            products: sparseCatalog,
            synonyms: [],
            topN: 4,
        });
        const neighbors = outSparse.items['sparse-1']?.similar ?? [];
        expect(neighbors).toHaveLength(4);
        expect(neighbors.some((n) => n.id === 'sparse-1')).toBe(false);
    });

    it('UT-REC-10 & UT-REC-11: prueba de contrato para cualquier RecommendationStrategy (schemaVersion: 1, clusterId: null)', () => {
        const strategies: RecommendationStrategy[] = [
            new ContentBasedStrategy(),
            new FallbackRulesStrategy(),
        ];

        for (const strat of strategies) {
            const output = strat.compute(FALLBACK_BUILD_PRODUCTS, {
                products: FALLBACK_BUILD_PRODUCTS,
                synonyms: [],
                topN: 4,
            });

            expect(output.schemaVersion).toBe(1);
            expect(output.algorithm).toBe(strat.name);
            expect(typeof output.generatedAt).toBe('string');

            for (const prod of FALLBACK_BUILD_PRODUCTS) {
                const entry = output.items[prod._id];
                expect(entry).toBeDefined();
                expect(entry!.clusterId).toBeNull();
                expect(entry!.similar.length).toBeLessThanOrEqual(4);
                expect(entry!.similar.some((s) => s.id === prod._id)).toBe(false);
            }
        }
    });

    it('UT-REC-12 & NF-BUS-03: ejecuta el pipeline completo por etapas en < 5s para un catálogo sintético amplio', async () => {
        const syntheticProducts: ProductDocument[] = Array.from(
            { length: 250 },
            (_, idx) => ({
                _id: `synth-${idx}`,
                nombre: `Pieza Artesanal ${idx % 10} Edición ${idx}`,
                descripcion: `Accesorio ilustrado con resina epóxica y temática pop ${idx % 7}`,
                categoria: ['Llaveros', 'Pins', 'Stickers'][idx % 3]!,
                palabrasClave: [`tag${idx % 15}`, `tema${idx % 5}`],
                precio: 40 + (idx % 10) * 15,
                stock: idx % 4 === 0 ? 0 : 10,
                activo: true,
            })
        );

        const t0 = Date.now();
        const result = await runRecommendationPipeline({
            products: syntheticProducts,
            topN: 6,
        });
        const elapsed = Date.now() - t0;

        expect(elapsed).toBeLessThan(5000);
        expect(result.recommendations.schemaVersion).toBe(1);
        expect(Object.keys(result.vectorArtifact.vectors)).toHaveLength(250);
        expect(result.searchIndex.products).toHaveLength(250);
    });
});
