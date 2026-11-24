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
    buildQueryTokenGroups,
    buildSynonymMap,
    computeWordMatchScore,
    DEFAULT_SYNONYM_GROUPS,
    expandSynonyms,
    normalizeText,
    splitNormalizedWords,
    tokenize,
    type QueryTokenGroup,
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
    nombreWords: string[];
    palabrasClaveWords: string[];
    categoriaWords: string[];
    descripcionWords: string[];
}

export interface FuseEngineOptions {
    /** Función opcional para cargar el índice (por defecto fetch a `/data/search-index.json`). */
    loader?: () => Promise<SearchIndexPayload>;
    /** Alias de `loader` para compatibilidad con inyección en pruebas. */
    indexLoader?: () => Promise<SearchIndexPayload>;
    /** Payload inicial opcional para hidratar sin red en pruebas unitarias. */
    initialPayload?: SearchIndexPayload;
    /** Umbral de tolerancia difusa (por defecto 0.25). */
    threshold?: number;
}

const MIN_RELEVANCE_SCORE = 0.5;
const FIELD_WEIGHTS: ReadonlyArray<
    readonly ['nombreWords' | 'palabrasClaveWords' | 'categoriaWords' | 'descripcionWords', number]
> = [
    ['nombreWords', 1.0],
    ['palabrasClaveWords', 0.86],
    ['categoriaWords', 0.78],
    ['descripcionWords', 0.56],
];

/**
 * Motor de búsqueda difusa client-side basado en Fuse.js con evaluación conjuntiva por grupos.
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
        this.threshold = options.threshold ?? 0.25;
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
            const palabrasClaveNorm = expandedKeywords.join(' ');

            return {
                ...product,
                nombreNorm,
                palabrasClaveNorm,
                categoriaNorm,
                descripcionNorm,
                nombreWords: splitNormalizedWords(product.nombre),
                palabrasClaveWords: splitNormalizedWords(palabrasClaveNorm),
                categoriaWords: splitNormalizedWords(product.categoria),
                descripcionWords: splitNormalizedWords(product.descripcion ?? ''),
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
     * Ejecuta búsqueda conjuntiva por grupos de entidad y contexto con corte de relevancia
     * para evitar explosión OR y falsos positivos en búsquedas multi-término.
     * @param query - Término ingresado por el usuario.
     * @param limit - Máximo de resultados a devolver (por defecto 24).
     * @satisfies RF-18, RF-23
     */
    public search(query: string, limit = 24): SearchResult[] {
        if (!this.fuse) return [];
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return [];

        const groups = buildQueryTokenGroups(normalizedQuery, this.synonymMap);
        if (groups.length === 0) return [];

        const entityGroups = groups.filter((g) => !g.isGeneric);
        const genericGroups = groups.filter((g) => g.isGeneric);
        const results: SearchResult[] = [];

        for (const item of this.indexedProducts) {
            const score = this.scoreProductForGroups(
                item,
                normalizedQuery,
                groups,
                entityGroups,
                genericGroups
            );
            if (score > 0) {
                results.push({ id: item._id, score });
            }
        }

        const sorted = [...results];
        sorted.sort((a, b) => b.score - a.score);
        return sorted.slice(0, limit);
    }

    private evaluateGroupMatch(
        item: IndexedProduct,
        group: QueryTokenGroup
    ): number {
        let best = 0;
        for (const variant of group.variants) {
            const synonymFactor = variant === group.raw ? 1 : 0.96;
            for (const [fieldKey, weight] of FIELD_WEIGHTS) {
                const wordScore = computeWordMatchScore(
                    variant,
                    item[fieldKey],
                    this.threshold
                );
                if (wordScore === 0) continue;
                const weighted = wordScore * weight * synonymFactor;
                if (weighted > best) {
                    best = weighted;
                }
            }
        }
        return best;
    }

    private evaluateRequiredGroups(
        item: IndexedProduct,
        requiredGroups: readonly QueryTokenGroup[]
    ): { matched: number; sum: number } {
        let matched = 0;
        let sum = 0;
        for (const group of requiredGroups) {
            const groupScore = this.evaluateGroupMatch(item, group);
            if (groupScore > 0) {
                matched++;
                sum += groupScore;
            }
        }
        return { matched, sum };
    }

    private computeHybridScore(
        item: IndexedProduct,
        avgRequired: number,
        genericGroups: readonly QueryTokenGroup[]
    ): number {
        let matchedGeneric = 0;
        for (const group of genericGroups) {
            if (this.evaluateGroupMatch(item, group) > 0) {
                matchedGeneric++;
            }
        }
        const genericCoverage = matchedGeneric / genericGroups.length;
        return matchedGeneric === genericGroups.length
            ? 0.84 + 0.16 * avgRequired
            : 0.56 + 0.24 * avgRequired + 0.04 * genericCoverage;
    }

    private scoreProductForGroups(
        item: IndexedProduct,
        normalizedQuery: string,
        groups: readonly QueryTokenGroup[],
        entityGroups: readonly QueryTokenGroup[],
        genericGroups: readonly QueryTokenGroup[]
    ): number {
        const requiredGroups = entityGroups.length > 0 ? entityGroups : groups;
        const minRequired =
            requiredGroups.length <= 2
                ? requiredGroups.length
                : Math.ceil(requiredGroups.length * 0.7);

        const { matched, sum } = this.evaluateRequiredGroups(item, requiredGroups);
        if (matched < minRequired) return 0;

        const avgRequired = sum / requiredGroups.length;
        const hasHybridGroups =
            entityGroups.length > 0 && genericGroups.length > 0;
        let baseScore = hasHybridGroups
            ? this.computeHybridScore(item, avgRequired, genericGroups)
            : avgRequired * (0.75 + 0.25 * (matched / requiredGroups.length));

        if (item.nombreNorm.includes(normalizedQuery)) {
            baseScore += 0.02;
        }

        return baseScore >= MIN_RELEVANCE_SCORE
            ? Number(Math.min(1, baseScore).toFixed(4))
            : 0;
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
}
