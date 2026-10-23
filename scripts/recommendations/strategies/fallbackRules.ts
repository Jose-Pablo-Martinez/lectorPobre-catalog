/**
 * @file fallbackRules.ts
 * @description Estrategia de respaldo basada en reglas deterministas (misma categoría,
 * cercanía de precio, mejor calificación promedio y disponibilidad de stock).
 * Se utiliza cuando el catálogo tiene menos de 2 productos o cuando un producto carece
 * de texto descriptivo suficiente para TF-IDF.
 * @satisfies RF-21, RNF-08
 */

import { normalizeText } from '../../../composables/search/normalize';
import type {
    PipelineContext,
    ProductDocument,
    RecommendationItem,
    RecommendationOutput,
    RecommendationStrategy,
    SimilarNeighbor,
} from '../types';

/**
 * Calcula los vecinos de respaldo para un producto dado usando reglas heurísticas.
 *
 * @param source Producto origen.
 * @param allProducts Todos los productos activos del catálogo.
 * @param topN Límite de vecinos a retornar.
 * @returns Lista ordenada de vecinos similares.
 */
export function computeFallbackNeighbors(
    source: ProductDocument,
    allProducts: ProductDocument[],
    topN = 6
): SimilarNeighbor[] {
    if (allProducts.length < 2) {
        return [];
    }

    const prices = allProducts.map((p) => p.precio ?? 0);
    const maxRange = Math.max(1, Math.max(...prices) - Math.min(...prices));
    const sourceCat = normalizeText(source.categoria ?? '');
    const sourcePrice = source.precio ?? 0;

    const candidates: SimilarNeighbor[] = [];

    for (const candidate of allProducts) {
        if (candidate._id === source._id) continue;

        const candCat = normalizeText(candidate.categoria ?? '');
        const sameCategoryScore =
            sourceCat !== '' && sourceCat === candCat ? 0.5 : 0.1;

        const candPrice = candidate.precio ?? 0;
        const priceDiffRatio = Math.min(
            1,
            Math.abs(sourcePrice - candPrice) / maxRange
        );
        const priceProximityScore = 0.25 * (1 - priceDiffRatio);

        const rating = Math.max(
            0,
            Math.min(5, candidate.calificacionPromedio ?? 0)
        );
        const ratingScore = 0.15 * (rating / 5);

        const stockScore = candidate.stock > 0 ? 0.1 : 0;

        const totalScore = Number(
            (
                sameCategoryScore +
                priceProximityScore +
                ratingScore +
                stockScore
            ).toFixed(4)
        );

        candidates.push({
            id: candidate._id,
            score: Math.min(1, totalScore),
        });
    }

    candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.id.localeCompare(b.id);
    });

    return candidates.slice(0, topN);
}

/**
 * Estrategia de respaldo que implementa `RecommendationStrategy`.
 */
export class FallbackRulesStrategy implements RecommendationStrategy {
    public readonly name = 'fallback-rules';

    public compute(
        products: ProductDocument[],
        ctx: PipelineContext
    ): RecommendationOutput {
        const topN = ctx.topN > 0 ? ctx.topN : 6;
        const items: Record<string, RecommendationItem> = {};

        for (const product of products) {
            items[product._id] = {
                clusterId: ctx.clusters?.[product._id] ?? null,
                similar: computeFallbackNeighbors(product, products, topN),
            };
        }

        return {
            schemaVersion: 1,
            algorithm: this.name,
            generatedAt: new Date().toISOString(),
            items,
        };
    }
}
