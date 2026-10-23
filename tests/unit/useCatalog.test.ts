/**
 * @file useCatalog.test.ts
 * @description Pruebas unitarias de `useCatalog.ts` (filtrado por categoría, búsqueda difusa y paginación).
 * @satisfies UT-VUE-01, UT-VUE-02, UT-VUE-03, RF-01, RF-04, RF-18, RF-19
 */

import { describe, expect, it } from 'vitest';
import {
    obtenerExplicacionRecomendacion,
    seleccionarProductoDestacado,
    useCatalog,
} from '~/composables/useCatalog';
import type { Categoria, Producto } from '~/types/sanity';

const CATEGORIAS_MOCK: Categoria[] = [
    {
        _id: 'cat-1',
        _type: 'categoria',
        _createdAt: '2026-01-01T00:00:00Z',
        _updatedAt: '2026-01-01T00:00:00Z',
        _rev: '1',
        nombre: 'Llaveros',
        slug: { _type: 'slug', current: 'llaveros' },
        orden: 1,
    },
    {
        _id: 'cat-2',
        _type: 'categoria',
        _createdAt: '2026-01-01T00:00:00Z',
        _updatedAt: '2026-01-01T00:00:00Z',
        _rev: '1',
        nombre: 'Pins',
        slug: { _type: 'slug', current: 'pins' },
        orden: 2,
    },
];

const PRODUCTOS_MOCK: Producto[] = [
    {
        _id: 'prod-1',
        _type: 'producto',
        _createdAt: '2026-01-01T00:00:00Z',
        _updatedAt: '2026-01-01T00:00:00Z',
        _rev: '1',
        nombre: 'Llavero Gato Kawaii Acrílico',
        slug: { _type: 'slug', current: 'llavero-gato-kawaii' },
        descripcion: 'Llavero hecho a mano en resina epóxica.',
        categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
        stock: 10,
        precio: 85,
        activo: true,
        palabrasClave: ['michi', 'gato', 'resina'],
        calificacionPromedio: 4.8,
    },
    {
        _id: 'prod-2',
        _type: 'producto',
        _createdAt: '2026-01-02T00:00:00Z',
        _updatedAt: '2026-01-02T00:00:00Z',
        _rev: '1',
        nombre: 'Pin Goku Ultra Instinto',
        slug: { _type: 'slug', current: 'pin-goku' },
        descripcion: 'Pin metálico esmaltado duro de colección.',
        categoria: { nombre: 'Pins', slug: { _type: 'slug', current: 'pins' } },
        stock: 5,
        precio: 65,
        activo: true,
        palabrasClave: ['dragon ball', 'anime'],
        calificacionPromedio: 4.5,
    },
    {
        _id: 'prod-3',
        _type: 'producto',
        _createdAt: '2026-01-03T00:00:00Z',
        _updatedAt: '2026-01-03T00:00:00Z',
        _rev: '1',
        nombre: 'Producto Inactivo Oculto',
        slug: { _type: 'slug', current: 'inactivo' },
        categoria: { nombre: 'Pins', slug: { _type: 'slug', current: 'pins' } },
        stock: 20,
        precio: 50,
        activo: false,
    },
];

describe('UT-VUE-01, UT-VUE-02, UT-VUE-03: Composable useCatalog', () => {
    it('UT-VUE-01: expone solo productos activos por defecto', () => {
        const { productosFiltrados, productoDestacado } = useCatalog({
            initialProductos: PRODUCTOS_MOCK,
            initialCategorias: CATEGORIAS_MOCK,
        });

        expect(productosFiltrados.value).toHaveLength(2);
        expect(productosFiltrados.value.some((p) => p._id === 'prod-3')).toBe(false);
        expect(productoDestacado.value).not.toBeNull();
        expect(productoDestacado.value?.activo).toBe(true);

        // Validar selector modular por popularidad y catálogo vacío
        const porPopularidad = seleccionarProductoDestacado(
            PRODUCTOS_MOCK,
            'popularidad'
        );
        expect(porPopularidad?._id).toBe('prod-1');
        expect(seleccionarProductoDestacado([], 'aleatorio')).toBeNull();

        // Validar leyenda de caja blanca (explicabilidad de la recomendación)
        const explicacionPrimeraVez = obtenerExplicacionRecomendacion('aleatorio', true);
        expect(explicacionPrimeraVez).toContain('primera vez');

        const explicacionDescubrimiento = obtenerExplicacionRecomendacion('aleatorio', false);
        expect(explicacionDescubrimiento).toContain('SORPRESA');

        const explicacionPopular = obtenerExplicacionRecomendacion(
            'popularidad',
            false,
            porPopularidad
        );
        expect(explicacionPopular).toContain('Popular ahora en la tienda');
        expect(explicacionPopular).toContain('4.8 ★');
    });

    it('UT-VUE-02: filtra correctamente por categoría seleccionada', () => {
        const { productosFiltrados, seleccionarCategoria } = useCatalog({
            initialProductos: PRODUCTOS_MOCK,
            initialCategorias: CATEGORIAS_MOCK,
        });

        seleccionarCategoria('pins');
        expect(productosFiltrados.value).toHaveLength(1);
        expect(productosFiltrados.value[0]?._id).toBe('prod-2');

        seleccionarCategoria('');
        expect(productosFiltrados.value).toHaveLength(2);
    });

    it('UT-VUE-03: filtra mediante búsqueda difusa tolerantemente a acentos y sinónimos, y pagina resultados', () => {
        const {
            searchQuery,
            productosFiltrados,
            productosPaginados,
            totalPaginas,
        } = useCatalog({
            initialProductos: PRODUCTOS_MOCK,
            initialCategorias: CATEGORIAS_MOCK,
            productosPorPagina: 1,
        });

        expect(totalPaginas.value).toBe(2);
        expect(productosPaginados.value).toHaveLength(1);

        // Búsqueda sin acento ("acrilico" -> "Acrílico")
        searchQuery.value = 'acrilico';
        expect(productosFiltrados.value).toHaveLength(1);
        expect(productosFiltrados.value[0]?._id).toBe('prod-1');

        // Búsqueda por sinónimo ("yavero" -> "llavero")
        searchQuery.value = 'yavero';
        expect(productosFiltrados.value).toHaveLength(1);
        expect(productosFiltrados.value[0]?._id).toBe('prod-1');
    });
});
