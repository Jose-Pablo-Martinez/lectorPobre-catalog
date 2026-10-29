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
        '--color-brand-primario': '#0f766e',
        '--color-brand-secundario': '#0284c7',
        '--color-brand-acento': '#eab308',
        '--color-brand-fondo': '#f0fdfa',
        '--color-brand-texto': '#0f172a',
    },
    luchaLibre: {
        '--color-brand-primario': '#dc2626',
        '--color-brand-secundario': '#2563eb',
        '--color-brand-acento': '#f59e0b',
        '--color-brand-fondo': '#fffdf7',
        '--color-brand-texto': '#1c1917',
    },
    nocheFiesta: {
        '--color-brand-primario': '#6d28d9',
        '--color-brand-secundario': '#c2410c',
        '--color-brand-acento': '#eab308',
        '--color-brand-fondo': '#faf5ff',
        '--color-brand-texto': '#1e1b4b',
    },
    meridaPastel: {
        '--color-brand-primario': '#be185d',
        '--color-brand-secundario': '#047857',
        '--color-brand-acento': '#d97706',
        '--color-brand-fondo': '#fcf9f6',
        '--color-brand-texto': '#1c1917',
    },
};

/**
 * Normaliza y valida un código de color hexadecimal.
 * Soporta entradas con o sin '#' (ej: 'e4007c' -> '#e4007c', '#e4007c' -> '#e4007c').
 * Si el valor no es un color válido, retorna el fallback seguro.
 *
 * @param customValue Valor ingresado por el usuario o API.
 * @param fallbackValue Valor de respaldo garantizado.
 */
export function normalizarHexToken(
    customValue: string | undefined | null,
    fallbackValue: string
): string {
    if (!customValue) return fallbackValue;
    const clean = customValue.trim();
    if (!clean) return fallbackValue;

    // Acepta formato hex sin '#' (ej: "e4007c" o "fff")
    if (/^[0-9a-fA-F]{3,8}$/.test(clean)) {
        return `#${clean}`;
    }

    // Acepta formato hex con '#' (ej: "#e4007c" o "#fff")
    if (/^#[0-9a-fA-F]{3,8}$/.test(clean)) {
        return clean;
    }

    // Acepta formatos funcionales válidos de CSS (rgb, rgba, hsl, hsla)
    if (/^(rgb|hsl)a?\(.+?\)$/.test(clean)) {
        return clean;
    }

    return fallbackValue;
}

/**
 * Resuelve el mapa de custom properties CSS correspondiente a la configuración global de Sanity.
 * Si la paleta es `'custom'`, emplea los campos `paletaCustom*` con normalización segura y respaldo en `identidad`.
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
            '--color-brand-primario': normalizarHexToken(
                config?.paletaCustomPrimario,
                PALETA_IDENTIDAD['--color-brand-primario']
            ),
            '--color-brand-secundario': normalizarHexToken(
                config?.paletaCustomSecundario,
                PALETA_IDENTIDAD['--color-brand-secundario']
            ),
            '--color-brand-acento': normalizarHexToken(
                config?.paletaCustomAcento,
                PALETA_IDENTIDAD['--color-brand-acento']
            ),
            '--color-brand-fondo': normalizarHexToken(
                config?.paletaCustomFondo,
                PALETA_IDENTIDAD['--color-brand-fondo']
            ),
            '--color-brand-texto': normalizarHexToken(
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
    applyHead?: (headObj: { style: Array<{ innerHTML: string; id?: string }> }) => void;
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
        deps.applyHead({ style: [{ innerHTML: cssRule, id: 'lector-pobre-palette' }] });
    } else if (typeof useHead !== 'undefined') {
        useHead({ style: [{ innerHTML: cssRule, id: 'lector-pobre-palette' }] });
    }

    if (typeof document !== 'undefined') {
        for (const [key, value] of Object.entries(tokens)) {
            document.documentElement.style.setProperty(key, value);
        }
    }

    return cssRule;
}

export default typeof defineNuxtPlugin !== 'undefined'
    ? defineNuxtPlugin(async () => {
          await ejecutarPluginPaleta();
      })
    : ejecutarPluginPaleta;
