/**
 * @file build.ts
 * @description Orquestador en build time del pipeline de recomendaciones y del índice de búsqueda.
 * Consulta los productos activos, categorías y sinónimos desde Sanity.io (con fallback local
 * determinista para entornos CI/offline), ejecuta las etapas secuenciales (`stages: PipelineStage[]`),
 * persiste `product-vectors.json` para clustering futuro, y publica `public/data/recommendations.json`
 * y `public/data/search-index.json`.
 * @satisfies RF-18, RF-21, RF-23, RNF-07, RNF-08
 */

import { createClient } from '@sanity/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SYNONYM_GROUPS } from '../../composables/search/normalize';
import type {
    SearchableCategory,
    SearchableProduct,
    SearchIndexPayload,
    SynonymGroup,
} from '../../composables/search/types';
import { NormalizeStage } from './normalize';
import { SimilarityStage } from './similarity';
import { ContentBasedStrategy } from './strategies/contentBased';
import type {
    PipelineContext,
    PipelineStage,
    ProductDocument,
    RecommendationOutput,
    RecommendationStrategy,
    VectorArtifact,
} from './types';
import { VectorizeStage, vectorizeProducts } from './vectorize';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../..');

/**
 * Datos semilla de respaldo cuando no hay conexión o credenciales de Sanity en build local/CI.
 */
export const FALLBACK_BUILD_PRODUCTS: ProductDocument[] = [
    {
        _id: 'seed-prod-llavero-gato',
        nombre: 'Llavero Gato Kawaii',
        slug: 'llavero-gato-kawaii',
        descripcion:
            'Llavero de resina con diseño de gato kawaii en colores pastel. Hecho a mano, piezas únicas.',
        categoria: 'Llaveros',
        palabrasClave: ['gato', 'kawaii', 'resina', 'pastel', 'michi', 'hecho a mano'],
        precio: 85,
        stock: 12,
        calificacionPromedio: 4.5,
        activo: true,
    },
    {
        _id: 'seed-prod-llavero-studio-ghibli',
        nombre: 'Llavero Totoro',
        slug: 'llavero-totoro',
        descripcion:
            'Llavero metálico esmaltado con diseño de Totoro del Studio Ghibli. Incluye argolla de acero.',
        categoria: 'Llaveros',
        palabrasClave: ['totoro', 'ghibli', 'anime', 'metal', 'pelicula', 'bosque'],
        precio: 120,
        stock: 3,
        calificacionPromedio: 4.8,
        activo: true,
    },
    {
        _id: 'seed-prod-pin-dragon-ball',
        nombre: 'Pin Goku Ultra Instinto',
        slug: 'pin-goku-ultra-instinto',
        descripcion:
            'Pin esmaltado duro de 38mm con diseño de Goku en modo Ultra Instinto. Acabado brillante.',
        categoria: 'Pins',
        palabrasClave: ['goku', 'dragon ball', 'anime', 'manga', 'ultra instinto', 'saiyajin'],
        precio: 65,
        stock: 28,
        calificacionPromedio: 4.2,
        activo: true,
    },
    {
        _id: 'seed-prod-pin-mushroom',
        nombre: 'Pin Mushroom Retro',
        slug: 'pin-mushroom-retro',
        descripcion:
            'Pin esmaltado suave con diseño de hongo estilo pixel art de 8 bits. Mariposa de seguridad incluida.',
        categoria: 'Pins',
        palabrasClave: ['hongo', 'mushroom', 'retro', 'pixel art', '8 bits', 'arcade'],
        precio: 55,
        stock: 0,
        calificacionPromedio: 4.0,
        activo: true,
    },
    {
        _id: 'seed-prod-sticker-pack-anime',
        nombre: 'Sticker Pack Anime Mix',
        slug: 'sticker-pack-anime-mix',
        descripcion:
            'Pack de 10 stickers de vinilo con diseños de anime variados. Resistentes al agua y al sol.',
        categoria: 'Stickers',
        palabrasClave: ['anime', 'mix', 'vinilo', 'impermeable', 'otaku', 'pack'],
        precio: 40,
        stock: 45,
        calificacionPromedio: 5.0,
        activo: true,
    },
];

export const FALLBACK_BUILD_CATEGORIES: SearchableCategory[] = [
    { _id: 'seed-cat-llaveros', nombre: 'Llaveros', slug: 'llaveros' },
    { _id: 'seed-cat-pins', nombre: 'Pins', slug: 'pins' },
    { _id: 'seed-cat-stickers', nombre: 'Stickers', slug: 'stickers' },
];

export interface RunPipelineOptions {
    products: ProductDocument[];
    categories?: SearchableCategory[];
    synonyms?: SynonymGroup[];
    topN?: number;
    vectorsOutputPath?: string;
    recommendationsOutputPath?: string;
    searchIndexOutputPath?: string;
    strategy?: RecommendationStrategy;
    extraStages?: PipelineStage[];
}

export interface RunPipelineResult {
    recommendations: RecommendationOutput;
    vectorArtifact: VectorArtifact;
    searchIndex: SearchIndexPayload;
}

function writeJsonArtifact(outputPath: string | undefined, data: unknown): void {
    if (!outputPath) return;
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Ejecuta el pipeline por etapas (`stages: PipelineStage[]`) de forma determinista.
 * Añadir `ClusteringStage` en el futuro solo requiere inyectar una etapa adicional en `stages`.
 *
 * @param options Opciones de ejecución y rutas de salida opcionales.
 * @returns Artefactos generados en memoria (y persistidos si se indicaron rutas).
 */
export async function runRecommendationPipeline(
    options: RunPipelineOptions
): Promise<RunPipelineResult> {
    const activeProducts = options.products.filter((p) => p.activo !== false);
    const synonyms =
        (options.synonyms?.length ?? 0) > 0
            ? (options.synonyms ?? DEFAULT_SYNONYM_GROUPS)
            : DEFAULT_SYNONYM_GROUPS;
    const topN = options.topN ?? 6;

    const ctx: PipelineContext = {
        products: activeProducts,
        synonyms,
        topN,
    };

    const stages: PipelineStage[] = [
        new NormalizeStage(),
        new VectorizeStage(options.vectorsOutputPath),
        new SimilarityStage(),
        ...(options.extraStages ?? []),
    ];

    await stages.reduce<Promise<void>>(
        (chain, stage) => chain.then(() => stage.execute(ctx)),
        Promise.resolve()
    );

    const strategy = options.strategy ?? new ContentBasedStrategy();
    const recommendations = strategy.compute(activeProducts, ctx);

    const searchableProducts: SearchableProduct[] = activeProducts.map((p) => ({
        _id: p._id,
        nombre: p.nombre,
        slug: p.slug,
        descripcion: p.descripcion,
        categoria: p.categoria,
        palabrasClave: p.palabrasClave,
    }));

    const searchIndex: SearchIndexPayload = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        products: searchableProducts,
        categories: options.categories ?? [],
        synonyms,
    };

    writeJsonArtifact(options.recommendationsOutputPath, recommendations);
    writeJsonArtifact(options.searchIndexOutputPath, searchIndex);

    const vectorArtifact =
        ctx.vectorArtifact ?? vectorizeProducts(ctx.normalized ?? []);

    return {
        recommendations,
        vectorArtifact,
        searchIndex,
    };
}

function loadEnvVars(): Record<string, string> {
    const vars: Record<string, string> = {};
    const envPath = resolve(ROOT_DIR, '.env.local');
    if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
                const key = trimmed.slice(0, eqIdx).trim();
                const val = trimmed.slice(eqIdx + 1).trim();
                vars[key] = val;
            }
        }
    }
    return { ...vars, ...(process.env as Record<string, string>) };
}

function getFallbackCatalogBundle(): {
    products: ProductDocument[];
    categories: SearchableCategory[];
    synonyms: SynonymGroup[];
} {
    return {
        products: FALLBACK_BUILD_PRODUCTS,
        categories: FALLBACK_BUILD_CATEGORIES,
        synonyms: DEFAULT_SYNONYM_GROUPS,
    };
}

/**
 * Consulta Sanity para obtener los productos activos, categorías y sinónimos.
 * Si no hay projectId o la red no está disponible, utiliza los datos semilla de respaldo.
 */
async function fetchCatalogFromSanity(): Promise<{
    products: ProductDocument[];
    categories: SearchableCategory[];
    synonyms: SynonymGroup[];
}> {
    const env = loadEnvVars();
    const projectId = env['NUXT_PUBLIC_SANITY_PROJECT_ID'];
    const dataset = env['NUXT_PUBLIC_SANITY_DATASET'] ?? 'staging';

    if (!projectId || projectId === 'your_project_id') {
        return getFallbackCatalogBundle();
    }

    try {
        const client = createClient({
            projectId,
            dataset,
            apiVersion: '2024-01-01',
            useCdn: false, // Live API para pipeline de recomendaciones
        });

        const query = `{
            "products": *[_type == "producto" && activo == true]{
                _id,
                nombre,
                "slug": slug.current,
                descripcion,
                "categoria": coalesce(categoria->nombre, "General"),
                palabrasClave,
                precio,
                stock,
                "calificacionPromedio": select(ratingCount > 0 => round(ratingSum / ratingCount, 1), null),
                activo
            },
            "categories": *[_type == "categoria"] | order(orden asc){
                _id,
                nombre,
                "slug": coalesce(slug.current, lower(nombre))
            },
            "config": *[_type == "configuracionGlobal"][0]{
                sinonimos[]{ terminos }
            }
        }`;

        const result = await client.fetch<{
            products?: ProductDocument[];
            categories?: SearchableCategory[];
            config?: { sinonimos?: SynonymGroup[] } | null;
        }>(query);

        const products =
            (result?.products?.length ?? 0) > 0
                ? (result?.products ?? FALLBACK_BUILD_PRODUCTS)
                : FALLBACK_BUILD_PRODUCTS;
        const categories =
            (result?.categories?.length ?? 0) > 0
                ? (result?.categories ?? FALLBACK_BUILD_CATEGORIES)
                : FALLBACK_BUILD_CATEGORIES;
        const synonyms =
            (result?.config?.sinonimos?.length ?? 0) > 0
                ? (result?.config?.sinonimos ?? DEFAULT_SYNONYM_GROUPS)
                : DEFAULT_SYNONYM_GROUPS;

        return { products, categories, synonyms };
    } catch {
        return getFallbackCatalogBundle();
    }
}

async function main(): Promise<void> {
    const startTime = Date.now();
    const { products, categories, synonyms } = await fetchCatalogFromSanity();

    const vectorsOutputPath = resolve(
        ROOT_DIR,
        'scripts/recommendations/.cache/product-vectors.json'
    );
    const recommendationsOutputPath = resolve(
        ROOT_DIR,
        'public/data/recommendations.json'
    );
    const searchIndexOutputPath = resolve(ROOT_DIR, 'public/data/search-index.json');

    await runRecommendationPipeline({
        products,
        categories,
        synonyms,
        topN: 6,
        vectorsOutputPath,
        recommendationsOutputPath,
        searchIndexOutputPath,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(
        `[recommendations] Pipeline completado en ${elapsedMs}ms (${products.length} productos activos).`
    );
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFilePath)) {
    try {
        await main();
    } catch (err) {
        console.error('[recommendations] Error en build pipeline:', err);
        process.exit(1);
    }
}
