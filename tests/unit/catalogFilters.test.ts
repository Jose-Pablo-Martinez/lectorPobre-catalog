/**
 * @file catalogFilters.test.ts
 * @description Pruebas unitarias para ordenación dinámica configurable y filtros de
 * rango de precio por presupuesto (`composables/catalog/catalogFilters.ts`).
 * @satisfies PC-UT-ORD-01, PC-UT-ORD-02, PC-UT-ORD-03, PC-UT-ORD-04, PC-UT-PRC-01, PC-UT-PRC-02, PC-UT-PRC-03, V-08
 */

import { describe, expect, it } from 'vitest';
import {
    esRangoPrecioInvalido,
    hashSeedConId,
    matchesPriceFilter,
    ordenarProductos,
    resolverCriterioOrden,
    resolverRangoPrecio,
    sanitizarPrecioLimite,
} from '~/composables/catalog/catalogFilters';
import type { Producto } from '~/types/sanity';

function crearProducto(
    id: string,
    nombre: string,
    precio?: number,
    createdAt = '2026-01-01T00:00:00Z'
): Producto {
    return {
        _id: id,
        _type: 'producto',
        _createdAt: createdAt,
        _updatedAt: createdAt,
        _rev: '1',
        nombre,
        slug: { _type: 'slug', current: id },
        categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
        stock: 3,
        precio,
        activo: true,
    };
}

describe('P0.0-C: Ordenación Dinámica y Filtros de Precio (catalogFilters.ts)', () => {
    it('PC-UT-ORD-01: ordena alfabéticamente A-Z y Z-A comparando cadenas completas (Llavero Místico antes de Llavero Xibalba)', () => {
        const entrada = [
            crearProducto('p-xib', 'Llavero Xibalba', 90),
            crearProducto('p-mis', 'Llavero Místico', 90),
            crearProducto('p-ban', 'Llavero Bandido', 90),
        ];

        const asc = ordenarProductos(entrada, 'alfabetico_asc');
        expect(asc.map((p) => p.nombre)).toEqual([
            'Llavero Bandido',
            'Llavero Místico',
            'Llavero Xibalba',
        ]);

        const desc = ordenarProductos(entrada, 'alfabetico_desc');
        expect(desc.map((p) => p.nombre)).toEqual([
            'Llavero Xibalba',
            'Llavero Místico',
            'Llavero Bandido',
        ]);

        // Inmutabilidad: no muta el arreglo original
        expect(entrada[0]?._id).toBe('p-xib');
    });

    it('PC-UT-ORD-02: ordena por precio ascendente/descendente (sin precio al final) y por recientes', () => {
        const entrada = [
            crearProducto('p-cotizar', 'Llavero Especial', undefined, '2026-01-05T00:00:00Z'),
            crearProducto('p-caro', 'Llavero Dorado', 180, '2026-01-02T00:00:00Z'),
            crearProducto('p-barato', 'Sticker P', 4, '2026-01-10T00:00:00Z'),
            crearProducto('p-medio', 'Pin Retro', 65, '2026-01-01T00:00:00Z'),
            crearProducto('p-cotizar-2', 'Llavero Custom', undefined, '2026-01-04T00:00:00Z'),
        ];

        const precioAsc = ordenarProductos(entrada, 'precio_asc');
        expect(precioAsc.slice(0, 3).map((p) => p._id)).toEqual([
            'p-barato',
            'p-medio',
            'p-caro',
        ]);
        expect(precioAsc.slice(3).map((p) => p.precio)).toEqual([undefined, undefined]);

        const precioDesc = ordenarProductos(entrada, 'precio_desc');
        expect(precioDesc.slice(0, 3).map((p) => p._id)).toEqual([
            'p-caro',
            'p-medio',
            'p-barato',
        ]);

        const recientes = ordenarProductos(entrada, 'recientes');
        expect(recientes[0]?._id).toBe('p-barato');
        expect(recientes[recientes.length - 1]?._id).toBe('p-medio');
    });

    it('PC-UT-ORD-03: orden aleatorio es determinista para una misma semilla SSR y distinto para otra semilla', () => {
        const entrada = Array.from({ length: 8 }, (_, idx) =>
            crearProducto(`prod-${idx}`, `Pieza ${idx}`, 50 + idx)
        );

        const corridaA = ordenarProductos(entrada, 'aleatorio', 4242);
        const corridaB = ordenarProductos(entrada, 'aleatorio', 4242);
        const otraSemilla = ordenarProductos(entrada, 'aleatorio', 9999);

        expect(corridaA.map((p) => p._id)).toEqual(corridaB.map((p) => p._id));
        expect(corridaA.map((p) => p._id)).not.toEqual(otraSemilla.map((p) => p._id));
        expect(hashSeedConId(123, 'abc')).toBe(hashSeedConId(123, 'abc'));
    });

    it('PC-UT-ORD-04: aplica fallback seguro a aleatorio cuando criterioOrdenDefault es nulo, vacío o desconocido', () => {
        expect(resolverCriterioOrden(undefined)).toBe('aleatorio');
        expect(resolverCriterioOrden(null)).toBe('aleatorio');
        expect(resolverCriterioOrden('')).toBe('aleatorio');
        expect(resolverCriterioOrden('inyeccion_desconocida')).toBe('aleatorio');
        expect(resolverCriterioOrden('alfabetico_asc')).toBe('alfabetico_asc');
    });

    it('PC-UT-PRC-01 & PC-UT-PRC-02: filtra por presets (<50, <100, <200) y rango personalizado De X a Y', () => {
        const p4 = crearProducto('p4', 'Sticker', 4);
        const p50 = crearProducto('p50', 'Pin', 50);
        const p90 = crearProducto('p90', 'Llavero', 90);
        const p180 = crearProducto('p180', 'Print', 180);
        const p250 = crearProducto('p250', 'Tote', 250);
        const pSinPrecio = crearProducto('p0', 'Especial', undefined);
        const todos = [p4, p50, p90, p180, p250, pSinPrecio];

        expect(todos.filter((p) => matchesPriceFilter(p, resolverRangoPrecio('todos')))).toHaveLength(6);
        expect(todos.filter((p) => matchesPriceFilter(p, resolverRangoPrecio('lt50'))).map((p) => p._id)).toEqual([
            'p4',
            'p50',
        ]);
        expect(todos.filter((p) => matchesPriceFilter(p, resolverRangoPrecio('lt100'))).map((p) => p._id)).toEqual([
            'p4',
            'p50',
            'p90',
        ]);
        expect(todos.filter((p) => matchesPriceFilter(p, resolverRangoPrecio('lt200'))).map((p) => p._id)).toEqual([
            'p4',
            'p50',
            'p90',
            'p180',
        ]);

        // Rango personalizado completo, solo mínimo y solo máximo
        expect(
            todos
                .filter((p) => matchesPriceFilter(p, resolverRangoPrecio('custom', '50', '180')))
                .map((p) => p._id)
        ).toEqual(['p50', 'p90', 'p180']);
        expect(
            todos
                .filter((p) => matchesPriceFilter(p, resolverRangoPrecio('custom', '100', '')))
                .map((p) => p._id)
        ).toEqual(['p180', 'p250']);
        expect(
            todos
                .filter((p) => matchesPriceFilter(p, resolverRangoPrecio('custom', '', '50')))
                .map((p) => p._id)
        ).toEqual(['p4', 'p50']);
    });

    it('PC-UT-PRC-03 (V-08): sanitiza precios negativos, NaN, Infinity, tipos no numéricos y rangos invertidos', () => {
        expect(sanitizarPrecioLimite(-10)).toBeNull();
        expect(sanitizarPrecioLimite('-5')).toBeNull();
        expect(sanitizarPrecioLimite(Number.NaN)).toBeNull();
        expect(sanitizarPrecioLimite(Number.POSITIVE_INFINITY)).toBeNull();
        expect(sanitizarPrecioLimite('abc')).toBeNull();
        expect(sanitizarPrecioLimite({})).toBeNull();
        expect(sanitizarPrecioLimite('  0 ')).toBe(0);
        expect(sanitizarPrecioLimite(150)).toBe(150);

        expect(esRangoPrecioInvalido('-1', '100')).toBe(true);
        expect(esRangoPrecioInvalido('10', 'abc')).toBe(true);
        expect(esRangoPrecioInvalido('200', '100')).toBe(true);
        expect(esRangoPrecioInvalido('50', '200')).toBe(false);
        expect(esRangoPrecioInvalido('', '')).toBe(false);

        expect(resolverRangoPrecio('custom', '200', '100')).toEqual({
            min: null,
            max: null,
        });
    });
});
