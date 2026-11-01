/**
 * @file useSanityImage.ts
 * @description Composable utilitario para resolver URLs de imágenes almacenadas en Sanity CDN
 * mediante `@sanity/image-url`. Soporta redimensionado y recorte inteligente (hotspot/crop)
 * aplicando optimizaciones automáticas de compresión (auto=format&fit=max&q=80) y retorna `null`
 * de forma segura si la imagen no está disponible.
 * @satisfies RF-01, RF-02, RF-16, RF-20, RNF-02
 */

import { createImageUrlBuilder } from '@sanity/image-url';
import type { ConfiguracionGlobal, SanityImage } from '~/types/sanity';

export interface SanityImageOptions {
    width?: number;
    height?: number;
    quality?: number;
}

const DEFAULT_PROJECT_ID = 'rbrk7xv9';
const DEFAULT_DATASET = 'staging';

/**
 * Construye una URL de Sanity CDN a partir de un objeto `SanityImage`.
 * Aplica auto=format, fit=max y calidad óptima (q=80 por defecto).
 *
 * @param source Objeto de imagen de Sanity.
 * @param projectId ID del proyecto de Sanity.
 * @param dataset Dataset de Sanity ('staging' | 'production').
 * @param options Opciones de transformación (ancho, alto, calidad).
 * @returns URL resuelta o `null` si la imagen no es válida.
 */
export function buildSanityImageUrl(
    source: SanityImage | null | undefined,
    projectId = DEFAULT_PROJECT_ID,
    dataset = DEFAULT_DATASET,
    options: SanityImageOptions = {}
): string | null {
    if (!source?.asset?._ref) {
        return null;
    }

    try {
        const effectiveProjectId =
            projectId.trim().length > 0 ? projectId : DEFAULT_PROJECT_ID;
        const effectiveDataset =
            dataset.trim().length > 0 ? dataset : DEFAULT_DATASET;

        const builder = createImageUrlBuilder({
            projectId: effectiveProjectId,
            dataset: effectiveDataset,
        });

        let imageBuilder = builder.image(source).auto('format').fit('max');

        if (options.width) {
            imageBuilder = imageBuilder.width(options.width);
        }
        if (options.height) {
            imageBuilder = imageBuilder.height(options.height);
        }
        const quality = options.quality ?? 80;
        imageBuilder = imageBuilder.quality(quality);

        return imageBuilder.url() ?? null;
    } catch {
        return null;
    }
}

/**
 * Consulta de forma segura campos de `configuracionGlobal` en Sanity para los plugins de build time.
 */
export async function fetchGlobalConfigSafe(
    projectionFields: string,
    customFetcher?: () => Promise<Partial<ConfiguracionGlobal> | null>
): Promise<Partial<ConfiguracionGlobal> | null> {
    try {
        if (customFetcher) {
            return await customFetcher();
        }
        const sanity = useSanity();
        return await sanity.fetch<Partial<ConfiguracionGlobal> | null>(
            `*[_type == "configuracionGlobal"][0]{ ${projectionFields} }`
        );
    } catch {
        return null;
    }
}

/**
 * Composable para transformar referencias `SanityImage` en URLs optimizadas del CDN.
 */
export function useSanityImage() {
    let projectId = DEFAULT_PROJECT_ID;
    let dataset = DEFAULT_DATASET;

    try {
        const sanity = useSanity();
        const config = sanity?.config;
        if (config?.projectId) projectId = config.projectId;
        if (config?.dataset) dataset = config.dataset;
    } catch {
        // Fallback seguro fuera de contexto Nuxt (ej. pruebas unitarias aisladas)
    }

    const urlFor = (
        source: SanityImage | null | undefined,
        options: SanityImageOptions = {}
    ): string | null => {
        return buildSanityImageUrl(source, projectId, dataset, options);
    };

    return {
        urlFor,
    };
}
