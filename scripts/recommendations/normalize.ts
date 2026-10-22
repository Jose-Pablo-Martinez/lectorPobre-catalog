/**
 * @file normalize.ts
 * @description Etapa 1 del pipeline de recomendaciones: normalización de texto,
 * eliminación de stopwords, expansión de sinónimos y cálculo de frecuencias ponderadas
 * por campo (nombre 3x, palabrasClave 2x, categoría 1x, descripción 1x).
 * Reutiliza el módulo compartido `composables/search/normalize.ts`.
 * @satisfies RF-21, RF-23, RNF-08
 */

import {
    buildSynonymMap,
    DEFAULT_SYNONYM_GROUPS,
    expandSynonyms,
    normalizeText,
    tokenize,
} from '../../composables/search/normalize';
import type { SynonymGroup } from '../../composables/search/types';
import type {
    NormalizedProductTokens,
    PipelineContext,
    PipelineStage,
    ProductDocument,
} from './types';

/**
 * Extrae y pondera los tokens de un conjunto de productos aplicando expansión de sinónimos.
 * Pesos de repetición por campo:
 * - nombre: 3
 * - palabrasClave: 2
 * - categoria: 1
 * - descripcion: 1
 *
 * @param products Lista de productos activos del catálogo.
 * @param synonyms Grupos de sinónimos configurados en Sanity (o por defecto).
 * @returns Arreglo de productos con sus tokens y frecuencias de término.
 */
export function normalizeProducts(
    products: ProductDocument[],
    synonyms: SynonymGroup[] = DEFAULT_SYNONYM_GROUPS
): NormalizedProductTokens[] {
    const mergedSynonyms =
        synonyms.length > 0 ? synonyms : DEFAULT_SYNONYM_GROUPS;
    const synonymMap = buildSynonymMap(mergedSynonyms);

    return products.map((product) => {
        const termFreqs: Record<string, number> = {};
        const allTokens: string[] = [];

        const addWeightedText = (
            text: string | undefined,
            weight: number
        ): void => {
            if (!text) return;
            const rawTokens = tokenize(text, true);
            const expanded = expandSynonyms(rawTokens, synonymMap);
            for (const token of expanded) {
                termFreqs[token] = (termFreqs[token] ?? 0) + weight;
                allTokens.push(token);
            }
        };

        addWeightedText(product.nombre, 3);
        if ((product.palabrasClave?.length ?? 0) > 0) {
            addWeightedText(product.palabrasClave?.join(' '), 2);
        }
        addWeightedText(product.categoria, 1);
        addWeightedText(product.descripcion, 1);

        const rawCat = product.categoria?.trim() ?? '';
        const categoriaNorm = normalizeText(rawCat.length > 0 ? rawCat : 'general');
        const precioValido =
            typeof product.precio === 'number' && product.precio >= 0
                ? product.precio
                : 0;

        return {
            productId: product._id,
            tokens: Array.from(new Set(allTokens)),
            termFreqs,
            categoria: categoriaNorm,
            precio: precioValido,
        };
    });
}

/**
 * Etapa 1 del pipeline ejecutable por el orquestador `build.ts`.
 */
export class NormalizeStage implements PipelineStage {
    public readonly name = 'normalize';

    public execute(ctx: PipelineContext): void {
        ctx.normalized = normalizeProducts(ctx.products, ctx.synonyms);
    }
}
