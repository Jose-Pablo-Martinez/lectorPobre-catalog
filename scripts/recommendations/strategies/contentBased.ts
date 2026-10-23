/**
 * @file contentBased.ts
 * @description Estrategia principal de recomendación basada en contenido (TF-IDF + similitud coseno
 * ponderada 60% texto, 25% categoría, 15% precio), con respaldo automático por reglas cuando un
 * producto carece de contenido textual suficiente o el catálogo tiene menos de 2 productos.
 * @satisfies RF-21, RNF-07, RNF-08
 */

import { NormalizeStage } from '../normalize';
import { SimilarityStage } from '../similarity';
import type {
    PipelineContext,
    ProductDocument,
    RecommendationItem,
    RecommendationOutput,
    RecommendationStrategy,
    SimilarNeighbor,
} from '../types';
import { VectorizeStage } from '../vectorize';
import { computeFallbackNeighbors, FallbackRulesStrategy } from './fallbackRules';

/**
 * Estrategia basada en contenido TF-IDF + similitud coseno.
 */
export class ContentBasedStrategy implements RecommendationStrategy {
    public readonly name = 'tfidf-cosine';
    private readonly fallback = new FallbackRulesStrategy();

    public compute(
        products: ProductDocument[],
        ctx: PipelineContext
    ): RecommendationOutput {
        const topN = ctx.topN > 0 ? ctx.topN : 6;

        if (products.length < 2) {
            const fallbackResult = this.fallback.compute(products, ctx);
            return {
                ...fallbackResult,
                algorithm: this.name,
            };
        }

        this.ensurePipelineStages(ctx);

        const items: Record<string, RecommendationItem> = {};
        const normalizedMap = new Map(
            (ctx.normalized ?? []).map((n) => [n.productId, n])
        );

        for (const product of products) {
            const tokenCount = normalizedMap.get(product._id)?.tokens.length ?? 0;
            const rawNeighbors = (ctx.similarities?.[product._id] ?? []).filter(
                (n) => n.id !== product._id
            );

            items[product._id] = {
                clusterId: ctx.clusters?.[product._id] ?? null,
                similar: this.resolveProductNeighbors(
                    product,
                    products,
                    rawNeighbors,
                    tokenCount >= 2,
                    topN
                ),
            };
        }

        return {
            schemaVersion: 1,
            algorithm: this.name,
            generatedAt: new Date().toISOString(),
            items,
        };
    }

    private ensurePipelineStages(ctx: PipelineContext): void {
        if (!ctx.normalized) {
            new NormalizeStage().execute(ctx);
        }
        if (!ctx.vectorArtifact) {
            new VectorizeStage().execute(ctx);
        }
        if (!ctx.similarities) {
            new SimilarityStage().execute(ctx);
        }
    }

    private resolveProductNeighbors(
        product: ProductDocument,
        allProducts: ProductDocument[],
        computedNeighbors: SimilarNeighbor[],
        hasEnoughText: boolean,
        topN: number
    ): SimilarNeighbor[] {
        if (!hasEnoughText || computedNeighbors.length === 0) {
            return computeFallbackNeighbors(product, allProducts, topN);
        }
        if (computedNeighbors.length >= topN) {
            return computedNeighbors.slice(0, topN);
        }

        const existingIds = new Set(computedNeighbors.map((s) => s.id));
        const extra = computeFallbackNeighbors(product, allProducts, topN).filter(
            (f) => !existingIds.has(f.id) && f.id !== product._id
        );
        return [...computedNeighbors, ...extra].slice(0, topN);
    }
}
