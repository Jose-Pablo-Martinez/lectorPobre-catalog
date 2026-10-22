/**
 * @file palette.ts
 * @description Plugin de Nuxt ejecutado en build time / SSR para inyectar los tokens CSS
 * de la paleta de colores activa configurada en Sanity Studio (`configuracionGlobal.paletaActiva`).
 * Soporta las 5 paletas mexicanas predefinidas (`identidad`, `cenote`, `luchaLibre`,
 * `nocheFiesta`, `meridaPastel`) más la paleta `custom` con valores hexadecimales individuales.
 * @satisfies RF-15
 */

import { fetchGlobalConfigSafe } from '~/composables/useSanityImage';
import type { ConfiguracionGlobal } from '~/types/sanity';

export const PALETA_IDENTIDAD: Readonly<Record<string, string>> = {
    '--color-brand-primario': '#e4007c',
    '--color-brand-secundario': '#0091d5',
    '--color-brand-acento': '#ffd000',
    '--color-brand-fondo': '#edf8f1',
    '--color-brand-texto': '#18181b',
};

export const PALETAS_PREDEFINIDAS: Record<string, Record<string, string>> = {
    identidad: { ...PALETA_IDENTIDAD },
    cenote: {
        '--color-brand-primario': '#0d9488',
        '--color-brand-secundario': '#ccfbf1',
        '--color-brand-acento': '#f43f5e',
        '--color-brand-fondo': '#f0fdf4',
        '--color-brand-texto': '#0f172a',
    },
    luchaLibre: {
        '--color-brand-primario': '#1d4ed8',
        '--color-brand-secundario': '#3b82f6',
        '--color-brand-acento': '#ffd000',
        '--color-brand-fondo': '#fffbeb',
        '--color-brand-texto': '#18181b',
    },
    nocheFiesta: {
        '--color-brand-primario': '#ff007f',
        '--color-brand-secundario': '#00e5ff',
        '--color-brand-acento': '#ffd000',
        '--color-brand-fondo': '#0f172a',
        '--color-brand-texto': '#f8fafc',
    },
    meridaPastel: {
        '--color-brand-primario': '#15803d',
        '--color-brand-secundario': '#e4007c',
        '--color-brand-acento': '#f59e0b',
        '--color-brand-fondo': '#faf7f2',
        '--color-brand-texto': '#1c1917',
    },
};

function pickHexToken(customValue: string | undefined, fallbackValue: string): string {
    return customValue && customValue.trim().length > 0 ? customValue : fallbackValue;
}

/**
 * Resuelve el mapa de custom properties CSS correspondiente a la configuración global de Sanity.
 * Si la paleta es `'custom'`, emplea los campos `paletaCustom*` con respaldo en `identidad`.
 *
 * @param config Configuración global parcial o nula.
 * @returns Mapa de variables CSS `--color-brand-*`.
 */
export function resolverTokensPaleta(
    config?: Partial<ConfiguracionGlobal> | null
): Record<string, string> {
    const nombrePaleta = config?.paletaActiva ?? 'identidad';

    if (nombrePaleta === 'custom') {
        return {
            '--color-brand-primario': pickHexToken(
                config?.paletaCustomPrimario,
                PALETA_IDENTIDAD['--color-brand-primario']
            ),
            '--color-brand-secundario': pickHexToken(
                config?.paletaCustomSecundario,
                PALETA_IDENTIDAD['--color-brand-secundario']
            ),
            '--color-brand-acento': pickHexToken(
                config?.paletaCustomAcento,
                PALETA_IDENTIDAD['--color-brand-acento']
            ),
            '--color-brand-fondo': pickHexToken(
                config?.paletaCustomFondo,
                PALETA_IDENTIDAD['--color-brand-fondo']
            ),
            '--color-brand-texto': pickHexToken(
                config?.paletaCustomTexto,
                PALETA_IDENTIDAD['--color-brand-texto']
            ),
        };
    }

    return PALETAS_PREDEFINIDAS[nombrePaleta] ?? { ...PALETA_IDENTIDAD };
}

/**
 * Convierte un mapa de tokens CSS en la regla `:root { ... }` para inyectar en el `<head>`.
 */
export function generarCssVariablesRoot(tokens: Record<string, string>): string {
    const declarations = Object.entries(tokens)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
    return `:root { ${declarations} }`;
}

export interface PalettePluginDeps {
    fetchConfig?: () => Promise<Partial<ConfiguracionGlobal> | null>;
    applyHead?: (headObj: { style: Array<{ innerHTML: string }> }) => void;
}

/**
 * Ejecuta la lógica de inicialización de paleta con dependencias inyectables para pruebas.
 */
export async function ejecutarPluginPaleta(deps: PalettePluginDeps = {}): Promise<string> {
    const configData = await fetchGlobalConfigSafe(
        'paletaActiva, paletaCustomPrimario, paletaCustomSecundario, paletaCustomAcento, paletaCustomFondo, paletaCustomTexto',
        deps.fetchConfig
    );

    const tokens = resolverTokensPaleta(configData);
    const cssRule = generarCssVariablesRoot(tokens);

    if (deps.applyHead) {
        deps.applyHead({ style: [{ innerHTML: cssRule }] });
    } else if (typeof useHead !== 'undefined') {
        useHead({ style: [{ innerHTML: cssRule }] });
    }

    return cssRule;
}

export default typeof defineNuxtPlugin !== 'undefined'
    ? defineNuxtPlugin(async () => {
          await ejecutarPluginPaleta();
      })
    : ejecutarPluginPaleta;
