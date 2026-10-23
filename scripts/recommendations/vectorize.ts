/**
 * @file vectorize.ts
 * @description Etapa 2 del pipeline de recomendaciones: construcción de vectores TF-IDF,
 * codificación one-hot de categoría y normalización min-max de precio.
 * Persiste el artefacto intermedio `product-vectors.json` para habilitar clustering futuro (K-Means).
 * @satisfies RF-21, RNF-07, RNF-08
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
    NormalizedProductTokens,
    PipelineContext,
    PipelineStage,
    ProductVector,
    VectorArtifact,
} from './types';

/**
 * Normaliza un vector numérico con norma L2 (magnitud unitaria).
 * Si el vector es cero, devuelve un arreglo de ceros de la misma longitud.
 *
 * @param vec Vector de entrada.
 * @returns Vector normalizado L2.
 */
export function l2Normalize(vec: number[]): number[] {
    let sumSq = 0;
    for (const val of vec) {
        sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) {
        return vec.map(() => 0);
    }
    return vec.map((val) => Number((val / norm).toFixed(6)));
}

/**
 * Construye el artefacto de vectores `VectorArtifact` a partir de los productos normalizados.
 *
 * @param normalized Lista de productos con frecuencias de términos.
 * @returns Artefacto completo con vocabulario, categorías y vectores por producto.
 */
export function vectorizeProducts(
    normalized: NormalizedProductTokens[]
): VectorArtifact {
    const docCount = normalized.length;
    const vocabSet = new Set<string>();
    const categorySet = new Set<string>();
    const docFreq: Record<string, number> = {};

    for (const item of normalized) {
        categorySet.add(item.categoria);
        const uniqueTerms = Object.keys(item.termFreqs);
        for (const term of uniqueTerms) {
            vocabSet.add(term);
            docFreq[term] = (docFreq[term] ?? 0) + 1;
        }
    }

    const vocabulary = Array.from(vocabSet).sort((a, b) => a.localeCompare(b));
    const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

    const prices = normalized.map((p) => p.precio);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const priceRange = maxPrice - minPrice;

    const idfMap: Record<string, number> = {};
    for (const term of vocabulary) {
        const df = docFreq[term] ?? 0;
        idfMap[term] = Math.log((1 + docCount) / (1 + df)) + 1;
    }

    const vectors: Record<string, ProductVector> = {};
    const textScale = Math.sqrt(0.6);
    const categoryScale = Math.sqrt(0.25);
    const priceScale = Math.sqrt(0.15);

    for (const item of normalized) {
        const sumTerms = Object.values(item.termFreqs).reduce(
            (acc, v) => acc + v,
            0
        );
        const totalTerms = sumTerms > 0 ? sumTerms : 1;

        const rawTfidf = vocabulary.map((term) => {
            const count = item.termFreqs[term] ?? 0;
            if (count === 0) return 0;
            const tf = count / totalTerms;
            return tf * (idfMap[term] ?? 1);
        });

        const tfidf = l2Normalize(rawTfidf);
        const categoryOneHot = categories.map((cat) =>
            cat === item.categoria ? 1 : 0
        );
        const normalizedPrice =
            priceRange > 0
                ? Number(((item.precio - minPrice) / priceRange).toFixed(6))
                : 0.5;

        const combinedVector = [
            ...tfidf.map((v) => Number((v * textScale).toFixed(6))),
            ...categoryOneHot.map((v) => Number((v * categoryScale).toFixed(6))),
            Number((normalizedPrice * priceScale).toFixed(6)),
        ];

        vectors[item.productId] = {
            productId: item.productId,
            tfidf,
            categoryOneHot,
            normalizedPrice,
            combinedVector,
        };
    }

    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        vocabulary,
        categories,
        vectors,
    };
}

/**
 * Etapa 2 del pipeline ejecutable por el orquestador `build.ts`.
 * Persiste `product-vectors.json` en disco cuando se proporciona `persistPath`.
 */
export class VectorizeStage implements PipelineStage {
    public readonly name = 'vectorize';
    private readonly persistPath?: string;

    constructor(persistPath?: string) {
        this.persistPath = persistPath;
    }

    public execute(ctx: PipelineContext): void {
        const normalized = ctx.normalized ?? [];
        const artifact = vectorizeProducts(normalized);
        ctx.vectorArtifact = artifact;

        if (this.persistPath) {
            mkdirSync(dirname(this.persistPath), { recursive: true });
            writeFileSync(
                this.persistPath,
                JSON.stringify(artifact, null, 2),
                'utf8'
            );
        }
    }
}
