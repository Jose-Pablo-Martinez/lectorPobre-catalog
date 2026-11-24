/**
 * @file composables/catalog/catalogFilters.ts
 * @description Módulo puro de ordenación dinámica y filtrado por rango de precios
 * para el catálogo (Fase P0.0-C). Desacoplado de Vue/Nuxt para garantizar alta cohesión,
 * bajo acoplamiento, validación defensiva (`V-08`) e inmutabilidad en ordenamientos.
 * @satisfies RF-01, RF-04, RF-15, V-08
 */

import type { CriterioOrdenCatalogo, Producto } from '~/types/sanity';

export type { CriterioOrdenCatalogo };

export type FiltroPrecioPreset = 'todos' | 'lt50' | 'lt100' | 'lt200' | 'custom';

export interface RangoPrecio {
    min: number | null;
    max: number | null;
}

export const CRITERIOS_ORDEN_VALIDOS: ReadonlySet<CriterioOrdenCatalogo> = new Set([
    'aleatorio',
    'recientes',
    'alfabetico_asc',
    'alfabetico_desc',
    'precio_asc',
    'precio_desc',
]);

export const OPCIONES_ORDEN_CATALOGO: ReadonlyArray<{
    value: CriterioOrdenCatalogo;
    label: string;
}> = [
    { value: 'aleatorio', label: 'Aleatorio' },
    { value: 'recientes', label: 'Más recientes' },
    { value: 'alfabetico_asc', label: 'Nombre: A - Z' },
    { value: 'alfabetico_desc', label: 'Nombre: Z - A' },
    { value: 'precio_asc', label: 'Precio: menor a mayor' },
    { value: 'precio_desc', label: 'Precio: mayor a menor' },
];

export const PRESET_MAX_PRICE: Readonly<Record<'lt50' | 'lt100' | 'lt200', number>> = {
    lt50: 50,
    lt100: 100,
    lt200: 200,
};

/**
 * Valida un criterio de orden contra la lista blanca cerrada; aplica fallback
 * seguro a `'aleatorio'` ante cualquier valor ausente o desconocido.
 */
export function resolverCriterioOrden(valor: unknown): CriterioOrdenCatalogo {
    if (
        typeof valor === 'string' &&
        CRITERIOS_ORDEN_VALIDOS.has(valor as CriterioOrdenCatalogo)
    ) {
        return valor as CriterioOrdenCatalogo;
    }
    return 'aleatorio';
}

/**
 * Sanitiza un límite de precio aceptando únicamente números finitos `>= 0` (`V-08`).
 * Devuelve `null` si viene vacío, negativo, `NaN` o `Infinity`.
 */
export function sanitizarPrecioLimite(valor: unknown): number | null {
    if (typeof valor === 'number') {
        return Number.isFinite(valor) && valor >= 0 ? valor : null;
    }
    if (typeof valor === 'string') {
        const trimmed = valor.trim();
        if (trimmed.length === 0) return null;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }
    return null;
}

function tieneValorNoVacio(valor: unknown): boolean {
    if (valor === null || valor === undefined) return false;
    return typeof valor === 'string' ? valor.trim().length > 0 : true;
}

/**
 * Detecta si un rango personalizado contiene límites no válidos, negativos o invertidos (`min > max`).
 */
export function esRangoPrecioInvalido(minRaw: unknown, maxRaw: unknown): boolean {
    const hasMin = tieneValorNoVacio(minRaw);
    const hasMax = tieneValorNoVacio(maxRaw);
    const min = sanitizarPrecioLimite(minRaw);
    const max = sanitizarPrecioLimite(maxRaw);

    if ((hasMin && min === null) || (hasMax && max === null)) {
        return true;
    }
    return min !== null && max !== null && min > max;
}

/**
 * Resuelve el rango efectivo `{ min, max }` según el preset activo o límites personalizados.
 */
export function resolverRangoPrecio(
    preset: FiltroPrecioPreset,
    minRaw: unknown = null,
    maxRaw: unknown = null
): RangoPrecio {
    if (preset === 'lt50' || preset === 'lt100' || preset === 'lt200') {
        return { min: 0, max: PRESET_MAX_PRICE[preset] };
    }
    if (preset !== 'custom' || esRangoPrecioInvalido(minRaw, maxRaw)) {
        return { min: null, max: null };
    }
    return {
        min: sanitizarPrecioLimite(minRaw),
        max: sanitizarPrecioLimite(maxRaw),
    };
}

/**
 * Evalúa si un producto cumple el rango de precio activo.
 */
export function matchesPriceFilter(
    producto: Producto,
    rango: RangoPrecio
): boolean {
    if (rango.min === null && rango.max === null) return true;
    if (typeof producto.precio !== 'number' || !Number.isFinite(producto.precio)) {
        return false;
    }
    if (rango.min !== null && producto.precio < rango.min) return false;
    if (rango.max !== null && producto.precio > rango.max) return false;
    return true;
}

/**
 * Hash FNV-1a de 32 bits determinista que combina la semilla SSR con el `_id` del producto
 * para garantizar un orden aleatorio estable entre renderizado en servidor e hidratación cliente.
 */
export function hashSeedConId(semilla: number, id: string): number {
    let hash = (2166136261 ^ Math.trunc(semilla)) >>> 0;
    for (let i = 0; i < id.length; i++) {
        hash ^= id.codePointAt(i) ?? 0;
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
}

function compararPorPrecio(a: Producto, b: Producto, asc: boolean): number {
    const valA =
        typeof a.precio === 'number' && Number.isFinite(a.precio) ? a.precio : null;
    const valB =
        typeof b.precio === 'number' && Number.isFinite(b.precio) ? b.precio : null;

    if (valA === null && valB === null) return 0;
    if (valA === null) return 1;
    if (valB === null) return -1;
    return asc ? valA - valB : valB - valA;
}

function compararPorFechaCreacionDesc(a: Producto, b: Producto): number {
    const fechaA = a._createdAt ?? '';
    const fechaB = b._createdAt ?? '';
    return fechaB.localeCompare(fechaA);
}

/**
 * Compara dos productos según el criterio elegido usando comparación lexicográfica completa
 * en español para orden alfabético (p. ej. `"Llavero Místico"` antes de `"Llavero Xibalba"`).
 */
export function compararProductos(
    a: Producto,
    b: Producto,
    criterio: CriterioOrdenCatalogo,
    semilla = 0
): number {
    switch (criterio) {
        case 'alfabetico_asc':
            return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        case 'alfabetico_desc':
            return b.nombre.localeCompare(a.nombre, 'es', { sensitivity: 'base' });
        case 'precio_asc':
            return compararPorPrecio(a, b, true);
        case 'precio_desc':
            return compararPorPrecio(a, b, false);
        case 'recientes':
            return compararPorFechaCreacionDesc(a, b);
        case 'aleatorio':
        default:
            return hashSeedConId(semilla, a._id) - hashSeedConId(semilla, b._id);
    }
}

/**
 * Devuelve una nueva lista ordenada de forma inmutable sin alterar el arreglo fuente.
 */
export function ordenarProductos(
    productos: readonly Producto[],
    criterio: CriterioOrdenCatalogo,
    semilla = 0
): Producto[] {
    const copia = [...productos];
    copia.sort((a, b) => compararProductos(a, b, criterio, semilla));
    return copia;
}
