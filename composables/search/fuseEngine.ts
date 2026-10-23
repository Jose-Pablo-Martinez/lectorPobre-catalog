/**
 * @file composables/search/fuseEngine.ts
 * @description Implementación del adaptador SearchEngine utilizando Fuse.js.
 * Soporta búsqueda difusa tolerante a errores tipográficos, normalización de acentos,
 * expansión de sinónimos y ponderación por campo (nombre 0.5, palabrasClave 0.25,
 * categoría 0.15, descripción 0.1).
 * @satisfies RF-18, RF-23, RNF-07, RNF-08
 */

import Fuse from 'fuse.js';
import {
    buildSynonymMap,
    DEFAULT_SYNONYM_GROUPS,
    expandSynonyms,
    normalizeText,
    tokenize,
} from './normalize';
import type {
    SearchableCategory,
    SearchableProduct,
    SearchEngine,
    SearchIndexPayload,
    SearchResult,
    Suggestion,
    SynonymGroup,
} from './types';

interface IndexedProduct extends SearchableProduct {
    nombreNorm: string;
    palabrasClaveNorm: string;
    categoriaNorm: string;
    descripcionNorm: string;
}

export interface FuseEngineOptions {
    /** Función opcional para cargar el índice (por defecto fetch a `/data/search-index.json`). */
    loader?: () => Promise<SearchIndexPayload>;
    /** Alias de `loader` para compatibilidad con inyección en pruebas. */
    indexLoader?: () => Promise<SearchIndexPayload>;
    /** Payload inicial opcional para hidratar sin red en pruebas unitarias. */
    initialPayload?: SearchIndexPayload;
    /** Umbral de tolerancia difusa de Fuse.js (por defecto 0.35). */
    threshold?: number;
}

/**
 * Motor de búsqueda difusa client-side basado en Fuse.js.
 * @satisfies RF-18, RF-23, RNF-07, RNF-08
 */
export class FuseSearchEngine implements SearchEngine {
    private fuse: Fuse<IndexedProduct> | null = null;
    private indexedProducts: IndexedProduct[] = [];
    private categories: SearchableCategory[] = [];
    private synonymMap: Map<string, string[]> = buildSynonymMap(DEFAULT_SYNONYM_GROUPS);
    private remoteLoaded = false;
    private readonly threshold: number;
    private readonly loader: () => Promise<SearchIndexPayload>;

    constructor(options: FuseEngineOptions = {}) {
        this.threshold = options.threshold ?? 0.35;
        const customLoader = options.loader ?? options.indexLoader;
        this.loader =
            customLoader ??
            (async () => {
                if (options.initialPayload) {
                    return options.initialPayload;
                }
                const response = await fetch('/data/search-index.json');
                if (!response.ok) {
                    throw new Error(
                        `No se pudo cargar /data/search-index.json (${response.status})`
                    );
                }
                return (await response.json()) as SearchIndexPayload;
            });

        if (options.initialPayload) {
            this.hydrate(
                options.initialPayload.products ?? [],
                options.initialPayload.categories ?? [],
                options.initialPayload.synonyms ?? DEFAULT_SYNONYM_GROUPS
            );
        }
    }

    /**
     * Inicializa el motor en memoria directamente con datos hidratados (útil como respaldo
     * inmediato o en pruebas unitarias sin red).
     */
    public hydrate(
        products: readonly SearchableProduct[],
        categories: readonly SearchableCategory[] = [],
        synonyms: readonly SynonymGroup[] = DEFAULT_SYNONYM_GROUPS
    ): void {
        const effectiveSynonyms =
            (synonyms?.length ?? 0) > 0 ? synonyms : DEFAULT_SYNONYM_GROUPS;
        this.synonymMap = buildSynonymMap(effectiveSynonyms);
        this.categories = [...categories];

        this.indexedProducts = products.map((product) => {
            const nombreNorm = normalizeText(product.nombre);
            const categoriaNorm = normalizeText(product.categoria);
            const descripcionNorm = normalizeText(product.descripcion ?? '');
            const rawKeywords = [
                ...(product.palabrasClave ?? []),
                ...tokenize(product.nombre),
                ...tokenize(product.categoria),
            ];
            const expandedKeywords = expandSynonyms(rawKeywords, this.synonymMap);

            return {
                ...product,
                nombreNorm,
                palabrasClaveNorm: expandedKeywords.join(' '),
                categoriaNorm,
                descripcionNorm,
            };
        });

        this.fuse = new Fuse(this.indexedProducts, {
            includeScore: true,
            ignoreLocation: true,
            threshold: this.threshold,
            minMatchCharLength: 2,
            keys: [
                { name: 'nombreNorm', weight: 0.5 },
                { name: 'palabrasClaveNorm', weight: 0.25 },
                { name: 'categoriaNorm', weight: 0.15 },
                { name: 'descripcionNorm', weight: 0.1 },
            ],
        });
    }

    /**
     * Carga diferida del índice desde `/data/search-index.json` (o el loader inyectado).
     * Si ya fue cargado previamente desde el origen remoto, no repite la descarga.
     * @satisfies RNF-07
     */
    public async load(): Promise<void> {
        if (this.remoteLoaded) return;
        try {
            const payload = await this.loader();
            const payloadSynonyms =
                (payload.synonyms?.length ?? 0) > 0
                    ? payload.synonyms
                    : DEFAULT_SYNONYM_GROUPS;
            this.hydrate(
                payload.products ?? [],
                payload.categories ?? [],
                payloadSynonyms
            );
            this.remoteLoaded = true;
        } catch {
            if (!this.fuse) {
                this.hydrate([], [], DEFAULT_SYNONYM_GROUPS);
            }
        }
    }

    /**
     * Ejecuta búsqueda difusa ponderando nombre (0.5) > palabrasClave (0.25) > categoría (0.15) > descripción (0.1).
     * @param query - Término ingresado por el usuario.
     * @param limit - Máximo de resultados a devolver (por defecto 24).
     * @satisfies RF-18, RF-23
     */
    public search(query: string, limit = 24): SearchResult[] {
        if (!this.fuse) return [];
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return [];

        const queryTokens = tokenize(normalizedQuery);
        const baseTokens = queryTokens.length > 0 ? queryTokens : [normalizedQuery];
        const expandedTokens = expandSynonyms(baseTokens, this.synonymMap);

        const candidateQueries = new Set<string>([
            normalizedQuery,
            ...expandedTokens,
        ]);
        const bestScores = new Map<string, number>();

        for (const candidate of candidateQueries) {
            this.evaluateCandidateQuery(
                candidate,
                normalizedQuery,
                expandedTokens,
                bestScores
            );
        }

        return Array.from(bestScores.entries())
            .map(([id, score]) => ({ id, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    private evaluateCandidateQuery(
        candidate: string,
        normalizedQuery: string,
        expandedTokens: readonly string[],
        bestScores: Map<string, number>
    ): void {
        if (!this.fuse) return;
        const queryPenalty = candidate === normalizedQuery ? 1 : 0.92;
        const fuseResults = this.fuse.search(candidate);

        for (const hit of fuseResults) {
            const fuseDistance = hit.score ?? 0.5;
            const baseSimilarity = Math.max(0.01, 1 - fuseDistance);
            const fieldBoost = this.computeFieldWeightBoost(
                hit.item,
                normalizedQuery,
                expandedTokens
            );
            const finalScore = Number(
                Math.min(1, baseSimilarity * queryPenalty + fieldBoost).toFixed(4)
            );

            const previous = bestScores.get(hit.item._id) ?? 0;
            if (finalScore > previous) {
                bestScores.set(hit.item._id, finalScore);
            }
        }
    }

    /**
     * Genera sugerencias de autocompletado combinando productos y categorías.
     * @param prefix - Texto parcial escrito por el usuario.
     * @param limit - Cantidad máxima de sugerencias (por defecto 6).
     * @satisfies RF-18
     */
    public suggest(prefix: string, limit = 6): Suggestion[] {
        const normalizedPrefix = normalizeText(prefix);
        if (normalizedPrefix.length < 2) return [];

        const suggestions: Suggestion[] = [];
        const maxCategories = Math.min(2, Math.floor(limit / 2));

        for (const category of this.categories) {
            const catNorm = normalizeText(category.nombre);
            if (
                catNorm.includes(normalizedPrefix) ||
                normalizedPrefix.includes(catNorm)
            ) {
                suggestions.push({
                    type: 'categoria',
                    label: category.nombre,
                    id: category._id,
                    slug: category.slug,
                });
                if (suggestions.length >= maxCategories) break;
            }
        }

        const productHits = this.search(prefix, limit - suggestions.length);
        const productMap = new Map(this.indexedProducts.map((p) => [p._id, p]));

        for (const hit of productHits) {
            const prod = productMap.get(hit.id);
            if (!prod) continue;
            suggestions.push({
                type: 'producto',
                label: prod.nombre,
                id: prod._id,
                slug: prod.slug,
            });
            if (suggestions.length >= limit) break;
        }

        return suggestions;
    }

    /**
     * Calcula una bonificación determinista según el campo donde ocurre la coincidencia
     * para garantizar el orden estricto: nombre (0.5) > palabrasClave (0.25) > categoría (0.15) > descripción (0.1).
     */
    private computeFieldWeightBoost(
        item: IndexedProduct,
        normalizedQuery: string,
        expandedTokens: readonly string[]
    ): number {
        const validTerms = [normalizedQuery, ...expandedTokens].filter(
            (term) => term.length > 0
        );
        const weightedFields: ReadonlyArray<readonly [string, number]> = [
            [item.nombreNorm, 0.25],
            [item.palabrasClaveNorm, 0.12],
            [item.categoriaNorm, 0.06],
            [item.descripcionNorm, 0.01],
        ];

        for (const [fieldText, boost] of weightedFields) {
            if (validTerms.some((term) => fieldText.includes(term))) {
                return boost;
            }
        }
        return 0;
    }
}
