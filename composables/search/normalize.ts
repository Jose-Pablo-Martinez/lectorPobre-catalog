/**
 * @file composables/search/normalize.ts
 * @description Utilidades compartidas de normalización de texto, tokenización en español
 * y expansión de sinónimos. Se comparte entre el buscador client-side y el pipeline
 * de recomendaciones en build time para garantizar consistencia total.
 * @satisfies RF-18 (Ignorar acentos/mayúsculas), RF-21 (Normalización TF-IDF), RF-23 (Sinónimos), RNF-08
 */

import type { SynonymGroup } from './types';

/**
 * Conjunto de palabras vacías (stopwords) en español que no aportan valor semántico
 * en el índice de búsqueda ni en la vectorización TF-IDF.
 */
export const STOPWORDS_ES: ReadonlySet<string> = new Set([
    'a',
    'al',
    'algo',
    'algunas',
    'algunos',
    'ante',
    'antes',
    'como',
    'con',
    'contra',
    'cual',
    'cuando',
    'de',
    'del',
    'desde',
    'donde',
    'durante',
    'e',
    'el',
    'ella',
    'ellas',
    'ellos',
    'en',
    'entre',
    'era',
    'esa',
    'esas',
    'ese',
    'eso',
    'esos',
    'esta',
    'estas',
    'este',
    'esto',
    'estos',
    'fue',
    'ha',
    'hacia',
    'hasta',
    'la',
    'las',
    'le',
    'les',
    'lo',
    'los',
    'mas',
    'me',
    'mi',
    'mis',
    'muy',
    'ni',
    'no',
    'nos',
    'nosotros',
    'nuestra',
    'nuestro',
    'o',
    'otra',
    'otro',
    'para',
    'pero',
    'por',
    'porque',
    'que',
    'quien',
    'se',
    'segun',
    'ser',
    'si',
    'sin',
    'sobre',
    'son',
    'su',
    'sus',
    'tambien',
    'tan',
    'tanto',
    'te',
    'tiene',
    'todo',
    'todos',
    'tu',
    'tus',
    'un',
    'una',
    'uno',
    'unos',
    'unas',
    'y',
    'ya',
    'yo',
]);

/**
 * Grupos de sinónimos por defecto del dominio de arte y mercancía independiente.
 * Se fusionan con los grupos configurados por la administradora en Sanity (`configuracionGlobal.sinonimos`).
 * @satisfies RF-23
 */
export const DEFAULT_SYNONYM_GROUPS: SynonymGroup[] = [
    { terminos: ['llavero', 'llaveros', 'keychain', 'yavero', 'yaveros', 'charm'] },
    { terminos: ['pin', 'pines', 'pins', 'broche', 'prendedor', 'badge'] },
    {
        terminos: [
            'sticker',
            'stickers',
            'calcomania',
            'calcomanias',
            'pegatina',
            'vinil',
            'vinilo',
        ],
    },
    { terminos: ['print', 'prints', 'ilustracion', 'poster', 'lamina'] },
    { terminos: ['acrilico', 'acrilicos', 'transparente', 'acrylic'] },
    { terminos: ['resina', 'epoxica', 'epoxi', 'epoxy', 'domo'] },
    { terminos: ['gato', 'gatito', 'michi', 'felino', 'kawaii'] },
];

/**
 * Normaliza una cadena de texto convirtiéndola a minúsculas, eliminando signos
 * diacríticos/acentos mediante descomposición Unicode NFD y limpiando puntuación.
 *
 * @param text - Texto de entrada.
 * @returns Texto en minúsculas sin acentos y con espacios colapsados.
 * @satisfies RF-18
 */
export function normalizeText(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '')
        .replaceAll(/[^a-z0-9\s]/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
}

/**
 * Tokeniza un texto aplicando normalización y filtrando stopwords en español
 * así como tokens de longitud menor a 2 caracteres.
 *
 * @param text - Texto a tokenizar.
 * @param removeStopwords - Si es true, descarta palabras vacías en español.
 * @returns Arreglo de tokens significativos normalizados.
 * @satisfies RF-18, RF-21
 */
export function tokenize(text: string, removeStopwords = true): string[] {
    const normalized = normalizeText(text);
    if (!normalized) return [];
    return normalized
        .split(' ')
        .filter(
            (token) =>
                token.length >= 2 && (!removeStopwords || !STOPWORDS_ES.has(token))
        );
}

/**
 * Construye un mapa bidireccional de sinónimos normalizados a partir de los grupos
 * de sinónimos provistos por Sanity más los grupos base del dominio.
 *
 * @param customGroups - Grupos de sinónimos desde `configuracionGlobal.sinonimos`.
 * @returns Mapa donde cada término normalizado apunta a todos sus términos equivalentes.
 * @satisfies RF-23
 */
export function buildSynonymMap(
    customGroups: readonly SynonymGroup[] = []
): Map<string, string[]> {
    const map = new Map<string, Set<string>>();
    const allGroups = [...DEFAULT_SYNONYM_GROUPS, ...customGroups];

    for (const group of allGroups) {
        if ((group?.terminos?.length ?? 0) < 2) continue;
        const normalizedTerms = group.terminos
            .map((term) => normalizeText(term))
            .filter((term) => term.length > 0);

        for (const term of normalizedTerms) {
            const existing = map.get(term) ?? new Set<string>();
            for (const eq of normalizedTerms) {
                existing.add(eq);
            }
            map.set(term, existing);
        }
    }

    const result = new Map<string, string[]>();
    for (const [key, set] of map.entries()) {
        result.set(key, Array.from(set));
    }
    return result;
}

/**
 * Expande una lista de tokens añadiendo todos los sinónimos registrados en el mapa,
 * preservando el orden original y evitando duplicados.
 *
 * @param tokens - Lista de tokens normalizados.
 * @param synonymMap - Mapa generado por `buildSynonymMap`.
 * @returns Lista de tokens expandida con sinónimos.
 * @satisfies RF-18, RF-21, RF-23
 */
export function expandSynonyms(
    tokens: readonly string[],
    synonymMap: Map<string, string[]>
): string[] {
    const expanded = new Set<string>();
    for (const token of tokens) {
        const clean = normalizeText(token);
        if (!clean) continue;
        expanded.add(clean);
        const equivalents = synonymMap.get(clean);
        if (equivalents) {
            for (const eq of equivalents) {
                expanded.add(eq);
            }
        }
    }
    return Array.from(expanded);
}
