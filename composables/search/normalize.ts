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

/**
 * Grupo de búsqueda para un término original de la consulta y sus sinónimos.
 * @satisfies RF-18, RF-23
 */
export interface QueryTokenGroup {
    raw: string;
    variants: string[];
    isGeneric: boolean;
}

/**
 * Términos genéricos de categoría, formato, material o rama que acotan el tipo de producto
 * pero no identifican por sí solos al personaje/entidad principal cuando van acompañados.
 */
export const GENERIC_SEARCH_TOKENS: ReadonlySet<string> = new Set([
    'llavero',
    'llaveros',
    'keychain',
    'yavero',
    'yaveros',
    'charm',
    'sticker',
    'stickers',
    'calcomania',
    'calcomanias',
    'pegatina',
    'vinil',
    'vinilo',
    'pin',
    'pines',
    'pins',
    'broche',
    'prendedor',
    'badge',
    'print',
    'prints',
    'ilustracion',
    'poster',
    'lamina',
    'acrilico',
    'acrilicos',
    'transparente',
    'acrylic',
    'resina',
    'epoxica',
    'epoxi',
    'epoxy',
    'domo',
    'grande',
    'pequeno',
    'holografico',
    'clasico',
    'mascara',
    'retrato',
    'muneco',
    'logo',
    'luchador',
    'luchadora',
    'luchadores',
    'lucha',
    'libre',
    'varonil',
    'femenil',
    'local',
    'yucatan',
]);

/**
 * Divide un texto normalizado por espacios preservando palabras cortas (1–3 letras)
 * necesarias para coincidencias exactas como `"lee"`, `"gh"` o `"ph"`.
 */
export function splitNormalizedWords(text: string): string[] {
    const normalized = normalizeText(text);
    return normalized ? normalized.split(' ') : [];
}

/**
 * Construye grupos conjuntivos de consulta conservando los sinónimos agrupados por
 * cada token fuente y clasificando términos genéricos vs. de entidad.
 */
export function buildQueryTokenGroups(
    query: string,
    synonymMap: Map<string, string[]>
): QueryTokenGroup[] {
    const significant = tokenize(query);
    const sourceTokens =
        significant.length > 0 ? significant : splitNormalizedWords(query);
    const seen = new Set<string>();
    const groups: QueryTokenGroup[] = [];

    for (const token of sourceTokens) {
        if (!token || seen.has(token)) continue;
        seen.add(token);
        const variants = expandSynonyms([token], synonymMap);
        const isGeneric = variants.some((v) => GENERIC_SEARCH_TOKENS.has(v));
        groups.push({ raw: token, variants, isGeneric });
    }

    return groups;
}

/**
 * Calcula la distancia de edición Levenshtein iterativa en O(min(m, n)) de memoria.
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
    let prev = Array.from({ length: shorter.length + 1 }, (_, idx) => idx);
    let curr = new Array<number>(shorter.length + 1).fill(0);

    for (let i = 1; i <= longer.length; i++) {
        curr[0] = i;
        const longerChar = longer[i - 1];
        for (let j = 1; j <= shorter.length; j++) {
            const cost = longerChar === shorter[j - 1] ? 0 : 1;
            const deletion = (prev[j] ?? 0) + 1;
            const insertion = (curr[j - 1] ?? 0) + 1;
            const substitution = (prev[j - 1] ?? 0) + cost;
            curr[j] = Math.min(deletion, insertion, substitution);
        }
        [prev, curr] = [curr, prev];
    }

    return prev[shorter.length] ?? longer.length;
}

/**
 * Evalúa la calidad de coincidencia de un término contra un arreglo de palabras normalizadas.
 * Tokens cortos (`<= 3` caracteres) solo aceptan exacto o prefijo para evitar falsos positivos
 * difusos (ej. `"lee"` contra `"libre"`).
 */
export function computeWordMatchScore(
    term: string,
    fieldWords: readonly string[],
    maxFuzzyRatio = 0.25
): number {
    if (!term || fieldWords.length === 0) return 0;
    let best = 0;

    for (const word of fieldWords) {
        if (word === term) return 1;

        if (term.length >= 2 && word.startsWith(term) && best < 0.9) {
            best = 0.9;
            continue;
        }

        const allowFuzzy =
            term.length >= 4 &&
            word.length >= 4 &&
            Math.abs(word.length - term.length) <= 2;

        if (!allowFuzzy) continue;

        const maxLen = Math.max(term.length, word.length);
        const ratio = levenshteinDistance(term, word) / maxLen;
        if (ratio <= maxFuzzyRatio) {
            const fuzzyScore = Math.max(0.65, 1 - ratio * 1.2);
            if (fuzzyScore > best) {
                best = fuzzyScore;
            }
        }
    }

    return best;
}
