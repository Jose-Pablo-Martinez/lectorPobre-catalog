/**
 * @file similarity.ts
 * @description Etapa 3 del pipeline de recomendaciones: cálculo de similitud coseno
 * y similitud híbrida ponderada (texto 0.6, categoría 0.25, precio 0.15) para obtener
 * los top-N vecinos más cercanos de cada producto.
 * @satisfies RF-21, RNF-07, RNF-08
 */

import type {
    PipelineContext,
    PipelineStage,
    ProductVector,
    SimilarNeighbor,
    VectorArtifact,
} from './types';

/**
 * Calcula la similitud coseno entre dos vectores numéricos de igual longitud.
 * Devuelve un valor en [0, 1] (para vectores con componentes no negativas).
 *
 * @param vecA Primer vector.
 * @param vecB Segundo vector.
 * @returns Similitud coseno en [0, 1].
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecA.length !== vecB.length) {
        return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i] ?? 0;
        const b = vecB[i] ?? 0;
        dot += a * b;
        normA += a * a;
        normB += b * b;
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) {
        return 0;
    }

    const sim = dot / denom;
    return Math.max(0, Math.min(1, Number(sim.toFixed(4))));
}

/**
 * Calcula la similitud ponderada entre dos vectores de producto:
 * 60% similitud coseno de texto TF-IDF + 25% coincidencia de categoría + 15% cercanía de precio.
 *
 * @param vecA Vector del producto origen.
 * @param vecB Vector del producto candidato.
 * @returns Puntaje de similitud en [0, 1].
 */
export function computeProductSimilarity(vecA: ProductVector, vecB: ProductVector): number {
    const textSim = cosineSimilarity(vecA.tfidf, vecB.tfidf);
    const categorySim = cosineSimilarity(vecA.categoryOneHot, vecB.categoryOneHot);
    const priceSim = Math.max(0, 1 - Math.abs(vecA.normalizedPrice - vecB.normalizedPrice));

    const weighted = 0.6 * textSim + 0.25 * categorySim + 0.15 * priceSim;
    return Number(weighted.toFixed(4));
}

/**
 * Calcula el mapa de top-N vecinos similares para todos los productos del artefacto vectorial.
 * Nunca incluye el propio producto en su lista de similares.
 *
 * @param artifact Artefacto vectorial de la Etapa 2.
 * @param topN Número máximo de vecinos por producto (por defecto 6).
 * @returns Mapa de productId -> lista ordenada de vecinos similares.
 */
export function computeSimilarities(
    artifact: VectorArtifact,
    topN = 6
): Record<string, SimilarNeighbor[]> {
    const ids = Object.keys(artifact.vectors);
    const result: Record<string, SimilarNeighbor[]> = {};

    for (const sourceId of ids) {
        const sourceVec = artifact.vectors[sourceId];
        if (!sourceVec) continue;

        const neighbors: SimilarNeighbor[] = [];
        for (const targetId of ids) {
            if (targetId === sourceId) continue;
            const targetVec = artifact.vectors[targetId];
            if (!targetVec) continue;

            const score = computeProductSimilarity(sourceVec, targetVec);
            if (score > 0) {
                neighbors.push({ id: targetId, score });
            }
        }

        neighbors.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.id.localeCompare(b.id);
        });

        result[sourceId] = neighbors.slice(0, topN);
    }

    return result;
}

/**
 * Etapa 3 del pipeline ejecutable por el orquestador `build.ts`.
 */
export class SimilarityStage implements PipelineStage {
    public readonly name = 'similarity';

    public execute(ctx: PipelineContext): void {
        if (!ctx.vectorArtifact) {
            ctx.similarities = {};
            return;
        }
        ctx.similarities = computeSimilarities(ctx.vectorArtifact, ctx.topN);
    }
}
