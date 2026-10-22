/**
 * @file types.ts
 * @description Contratos tipados para el pipeline de recomendaciones basadas en contenido
 * ejecutado en build time, con preparación explícita para clustering futuro.
 * @satisfies RF-21, RF-23, RNF-07, RNF-08
 */

import type { SynonymGroup } from '../../composables/search/types';

/**
 * Representación plana de un producto de Sanity para el pipeline de recomendaciones.
 */
export interface ProductDocument {
    _id: string;
    nombre: string;
    slug?: string;
    descripcion?: string;
    categoria: string;
    palabrasClave?: string[];
    precio?: number;
    stock: number;
    calificacionPromedio?: number | null;
    activo?: boolean;
}

/**
 * Salida de la Etapa 1 (Normalización): tokens ponderados por producto.
 */
export interface NormalizedProductTokens {
    productId: string;
    tokens: string[];
    termFreqs: Record<string, number>;
    categoria: string;
    precio: number;
}

/**
 * Vector numérico de un producto generado en la Etapa 2 (Vectorización).
 * Sirve tanto para similitud coseno como de entrada para un futuro algoritmo K-Means.
 */
export interface ProductVector {
    productId: string;
    /** Vector TF-IDF normalizado L2 sobre el vocabulario del catálogo. */
    tfidf: number[];
    /** Vector one-hot de la categoría del producto. */
    categoryOneHot: number[];
    /** Precio normalizado min-max en el rango [0, 1]. */
    normalizedPrice: number;
    /** Vector concatenado y ponderado listo para clustering (K-Means). */
    combinedVector: number[];
}

/**
 * Artefacto intermedio `product-vectors.json` persistido en build time (RNF-08).
 */
export interface VectorArtifact {
    schemaVersion: 1;
    generatedAt: string;
    vocabulary: string[];
    categories: string[];
    vectors: Record<string, ProductVector>;
}

/**
 * Vecino similar con puntaje de similitud en [0, 1].
 */
export interface SimilarNeighbor {
    id: string;
    score: number;
}

/**
 * Entrada de recomendación por producto en el contrato público.
 */
export interface RecommendationItem {
    /** Reservado para clustering futuro (null en la estrategia actual TF-IDF + coseno). */
    clusterId: string | null;
    /** Lista ordenada descendentemente de hasta top-N productos similares. */
    similar: SimilarNeighbor[];
}

/**
 * Contrato versionado de salida publicado en `/data/recommendations.json` (RF-21, RNF-08).
 */
export interface RecommendationOutput {
    schemaVersion: 1;
    /** Identificador del algoritmo empleado ('tfidf-cosine' | 'fallback-rules'). */
    algorithm: string;
    generatedAt: string;
    items: Record<string, RecommendationItem>;
}

/**
 * Contexto compartido entre las etapas del pipeline en build time.
 */
export interface PipelineContext {
    products: ProductDocument[];
    synonyms: SynonymGroup[];
    topN: number;
    normalized?: NormalizedProductTokens[];
    vectorArtifact?: VectorArtifact;
    similarities?: Record<string, SimilarNeighbor[]>;
    clusters?: Record<string, string | null>;
}

/**
 * Interfaz de etapa desacoplada del pipeline (Normalización -> Vectorización -> Similitud -> [Futuro] Clustering).
 * @satisfies RNF-08
 */
export interface PipelineStage {
    readonly name: string;
    execute(ctx: PipelineContext): void | Promise<void>;
}

/**
 * Interfaz de estrategia de recomendación intercambiable.
 * @satisfies RF-21, RNF-08
 */
export interface RecommendationStrategy {
    readonly name: string;
    compute(products: ProductDocument[], ctx: PipelineContext): RecommendationOutput;
}
