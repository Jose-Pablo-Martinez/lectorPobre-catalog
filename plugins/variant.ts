/**
 * @file variant.ts
 * @description Plugin de Nuxt ejecutado en build time / SSR para aplicar la clase de variante
 * visual (`variante-clasico`, `variante-moderno`, `variante-minimalista`) en el elemento `<html>`
 * y configurar opcionalmente el patrón decorativo repetitivo desde `configuracionGlobal`.
 * @satisfies RF-16
 */

import { buildSanityImageUrl, fetchGlobalConfigSafe } from '~/composables/useSanityImage';
import type { ConfiguracionGlobal } from '~/types/sanity';

export const VARIANTES_PERMITIDAS = ['clasico', 'moderno', 'minimalista'] as const;
export type VarianteVisual = (typeof VARIANTES_PERMITIDAS)[number];

/**
 * Devuelve la clase CSS de variante visual válida para aplicar en `<html>`.
 * Si el valor no es reconocido, retorna `'variante-moderno'` por defecto.
 *
 * @param variante Valor configurado en `configuracionGlobal.varianteVisual`.
 * @returns Clase CSS (`'variante-clasico' | 'variante-moderno' | 'variante-minimalista'`).
 */
export function resolverClaseVariante(variante?: string | null): string {
    const limpio = (variante ?? '').trim();
    if (VARIANTES_PERMITIDAS.includes(limpio as VarianteVisual)) {
        return `variante-${limpio}`;
    }
    return 'variante-moderno';
}

export interface VariantPluginDeps {
    fetchConfig?: () => Promise<Partial<ConfiguracionGlobal> | null>;
    applyHead?: (headObj: {
        htmlAttrs: { class: string };
        style?: Array<{ innerHTML: string }>;
    }) => void;
}

/**
 * Ejecuta la lógica de inicialización de variante visual con dependencias inyectables.
 */
export async function ejecutarPluginVariante(
    deps: VariantPluginDeps = {}
): Promise<{ claseVariante: string; estilosExtra: Array<{ innerHTML: string }> }> {
    const configData = await fetchGlobalConfigSafe(
        'varianteVisual, patronDecorativoActivo, patronDecorativo',
        deps.fetchConfig
    );

    const claseVariante = resolverClaseVariante(configData?.varianteVisual);
    const estilosExtra: Array<{ innerHTML: string }> = [];

    if (configData?.patronDecorativoActivo && configData.patronDecorativo) {
        const urlPatron = buildSanityImageUrl(
            configData.patronDecorativo,
            undefined,
            undefined,
            { width: 240 }
        );
        if (urlPatron) {
            estilosExtra.push({
                innerHTML: `:root { --bg-patron-decorativo: url("${urlPatron}"); }`,
            });
        }
    }

    const headPayload = {
        htmlAttrs: { class: claseVariante },
        ...(estilosExtra.length > 0 ? { style: estilosExtra } : {}),
    };

    if (deps.applyHead) {
        deps.applyHead(headPayload);
    } else if (typeof useHead !== 'undefined') {
        useHead(headPayload);
    }

    return { claseVariante, estilosExtra };
}

export default typeof defineNuxtPlugin !== 'undefined'
    ? defineNuxtPlugin(async () => {
          await ejecutarPluginVariante();
      })
    : ejecutarPluginVariante;
