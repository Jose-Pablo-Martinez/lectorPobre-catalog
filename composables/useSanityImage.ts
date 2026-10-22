/**
 * @file useSanityImage.ts
 * @description Composable utilitario para resolver URLs de imágenes almacenadas en Sanity CDN
 * mediante `@sanity/image-url`. Soporta redimensionado y recorte inteligente (hotspot/crop)
 * y retorna `null` de forma segura si la imagen no está disponible.
 * @satisfies RF-01, RF-02, RF-16, RF-20
 */

import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImage } from '~/types/sanity';

export interface SanityImageOptions {
    width?: number;
    height?: number;
    quality?: number;
}

/**
 * Construye una URL de Sanity CDN a partir de un objeto `SanityImage`.
 *
 * @param source Objeto de imagen de Sanity.
 * @param projectId ID del proyecto de Sanity.
 * @param dataset Dataset de Sanity ('staging' | 'production').
 * @param options Opciones de transformación (ancho, alto, calidad).
 * @returns URL resuelta o `null` si la imagen no es válida.
 */
export function buildSanityImageUrl(
    source: SanityImage | null | undefined,
    projectId = 'rbrk7xv9',
    dataset = 'staging',
    options: SanityImageOptions = {}
): string | null {
    if (!source?.asset?._ref) {
        return null;
    }

    try {
        const builder = createImageUrlBuilder({
            projectId: projectId || 'rbrk7xv9',
            dataset: dataset || 'staging',
        });

        let imageBuilder = builder.image(source).auto('format');

        if (options.width) {
            imageBuilder = imageBuilder.width(options.width);
        }
        if (options.height) {
            imageBuilder = imageBuilder.height(options.height);
        }
        if (options.quality) {
            imageBuilder = imageBuilder.quality(options.quality);
        }

        return imageBuilder.url() ?? null;
    } catch {
        return null;
    }
}

/**
 * Composable para transformar referencias `SanityImage` en URLs optimizadas del CDN.
 */
export function useSanityImage() {
    let projectId = 'rbrk7xv9';
    let dataset = 'staging';

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
