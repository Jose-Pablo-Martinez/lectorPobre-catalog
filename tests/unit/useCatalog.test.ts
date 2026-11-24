/**
 * @file useCatalog.test.ts
 * @description Pruebas unitarias de `useCatalog.ts` (filtrado por categoría, búsqueda difusa y paginación).
 * @satisfies UT-VUE-01, UT-VUE-02, UT-VUE-03, RF-01, RF-04, RF-18, RF-19
 */

import { describe, expect, it } from 'vitest';
import {
    filterSubcategoriesByParent,
    isValidSlug,
    matchesCategoryFilter,
    matchesSubcategoryFilter,
    obtenerExplicacionRecomendacion,
    seleccionarProductoDestacado,
    useCatalog,
} from '~/composables/useCatalog';
import { subcategory as subcategorySchema } from '~/sanity/schemaTypes/subcategory';
import type { Categoria, Producto, Subcategoria } from '~/types/sanity';

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

    it('PC-UT-SUB-01: valida formato seguro de slugs (M-2) y estructura del esquema subcategoria', () => {
        expect(isValidSlug('llaveros-acrilico')).toBe(true);
        expect(isValidSlug('pins-2026')).toBe(true);
        expect(isValidSlug('')).toBe(false);
        expect(isValidSlug('../hack')).toBe(false);
        expect(isValidSlug('Mayusculas')).toBe(false);
        expect(isValidSlug('con espacios')).toBe(false);

        expect(subcategorySchema.name).toBe('subcategoria');
        const fieldNames = subcategorySchema.fields.map((f) => f.name);
        expect(fieldNames).toEqual([
            'nombre',
            'slug',
            'categoriaPadre',
            'descripcion',
            'orden',
        ]);
    });

    it('PC-IT-SUB-01: filtra subcategorías por categoría padre, limpia subcategoría al cambiar categoría/búsqueda y convive con palabrasClave', async () => {
        const subcategoriasMock: Subcategoria[] = [
            {
                _id: 'sub-1',
                _type: 'subcategoria',
                _createdAt: '2026-01-01T00:00:00Z',
                _updatedAt: '2026-01-01T00:00:00Z',
                _rev: '1',
                nombre: 'Acrílico',
                slug: { _type: 'slug', current: 'acrilico' },
                categoriaPadre: {
                    _id: 'cat-1',
                    nombre: 'Llaveros',
                    slug: { _type: 'slug', current: 'llaveros' },
                },
                orden: 1,
            },
            {
                _id: 'sub-2',
                _type: 'subcategoria',
                _createdAt: '2026-01-01T00:00:00Z',
                _updatedAt: '2026-01-01T00:00:00Z',
                _rev: '1',
                nombre: 'Resina',
                slug: { _type: 'slug', current: 'resina' },
                categoriaPadre: {
                    _id: 'cat-1',
                    nombre: 'Llaveros',
                    slug: { _type: 'slug', current: 'llaveros' },
                },
                orden: 2,
            },
            {
                _id: 'sub-3',
                _type: 'subcategoria',
                _createdAt: '2026-01-01T00:00:00Z',
                _updatedAt: '2026-01-01T00:00:00Z',
                _rev: '1',
                nombre: 'Esmaltados',
                slug: { _type: 'slug', current: 'esmaltados' },
                categoriaPadre: {
                    _id: 'cat-2',
                    nombre: 'Pins',
                    slug: { _type: 'slug', current: 'pins' },
                },
                orden: 1,
            },
        ];

        const productosConSub: Producto[] = [
            {
                ...PRODUCTOS_MOCK[0]!,
                subcategoria: {
                    nombre: 'Acrílico',
                    slug: { _type: 'slug', current: 'acrilico' },
                    categoriaPadreSlug: 'llaveros',
                },
            },
            {
                _id: 'prod-4',
                _type: 'producto',
                _createdAt: '2026-01-04T00:00:00Z',
                _updatedAt: '2026-01-04T00:00:00Z',
                _rev: '1',
                nombre: 'Llavero Botánico Hoja Monstera',
                slug: { _type: 'slug', current: 'llavero-monstera' },
                categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
                subcategoria: {
                    nombre: 'Resina',
                    slug: { _type: 'slug', current: 'resina' },
                    categoriaPadreSlug: 'llaveros',
                },
                stock: 6,
                precio: 95,
                activo: true,
                palabrasClave: ['botanica', 'planta', 'monstera'],
            },
            PRODUCTOS_MOCK[1]!,
        ];

        expect(filterSubcategoriesByParent(subcategoriasMock, '')).toHaveLength(0);
        expect(filterSubcategoriesByParent(subcategoriasMock, 'llaveros')).toHaveLength(2);
        expect(matchesCategoryFilter(productosConSub[0]!, 'llaveros')).toBe(true);
        expect(matchesSubcategoryFilter(productosConSub[0]!, 'acrilico')).toBe(true);
        expect(matchesSubcategoryFilter(productosConSub[2]!, 'acrilico')).toBe(false);

        const catalog = useCatalog({
            initialProductos: productosConSub,
            initialCategorias: CATEGORIAS_MOCK,
            initialSubcategorias: subcategoriasMock,
        });

        expect(catalog.subcategoriasActivas.value).toHaveLength(0);

        catalog.seleccionarCategoria('llaveros');
        expect(catalog.subcategoriasActivas.value.map((s) => s.nombre)).toEqual([
            'Acrílico',
            'Resina',
        ]);
        expect(catalog.productosFiltrados.value).toHaveLength(2);

        catalog.seleccionarSubcategoria('resina');
        expect(catalog.productosFiltrados.value).toHaveLength(1);
        expect(catalog.productosFiltrados.value[0]?._id).toBe('prod-4');

        // Al cambiar de categoría padre, se limpia la subcategoría
        catalog.seleccionarCategoria('pins');
        expect(catalog.subcategoriaSeleccionada.value).toBe('');
        expect(catalog.subcategoriasActivas.value).toHaveLength(1);

        // Al buscar por palabrasClave libres ("michi"), se limpia subcategoría y sigue funcionando
        catalog.seleccionarCategoria('llaveros');
        catalog.seleccionarSubcategoria('resina');
        catalog.searchQuery.value = 'michi';
        await Promise.resolve();
        expect(catalog.subcategoriaSeleccionada.value).toBe('');
        catalog.seleccionarCategoria('');
        expect(catalog.productosFiltrados.value[0]?._id).toBe('prod-1');
    });

    it('PC-IT-CAT-01: combina categoría, subcategoría, filtro de precio y ordenación dinámica reiniciando página a 1', () => {
        const subcategoriasMock: Subcategoria[] = [
            {
                _id: 'sub-acrilico',
                _type: 'subcategoria',
                _createdAt: '2026-01-01T00:00:00Z',
                _updatedAt: '2026-01-01T00:00:00Z',
                _rev: '1',
                nombre: 'Acrílico',
                slug: { _type: 'slug', current: 'acrilico' },
                categoriaPadre: {
                    _id: 'cat-1',
                    nombre: 'Llaveros',
                    slug: { _type: 'slug', current: 'llaveros' },
                },
            },
        ];

        const productos: Producto[] = [
            {
                ...PRODUCTOS_MOCK[0]!,
                _id: 'l-xib',
                nombre: 'Llavero Xibalba',
                precio: 90,
                subcategoria: { nombre: 'Acrílico', slug: { _type: 'slug', current: 'acrilico' } },
            },
            {
                ...PRODUCTOS_MOCK[0]!,
                _id: 'l-mis',
                nombre: 'Llavero Místico',
                precio: 75,
                subcategoria: { nombre: 'Acrílico', slug: { _type: 'slug', current: 'acrilico' } },
            },
            {
                ...PRODUCTOS_MOCK[0]!,
                _id: 'l-esp',
                nombre: 'Llavero Edición Oro',
                precio: 150,
                subcategoria: { nombre: 'Acrílico', slug: { _type: 'slug', current: 'acrilico' } },
            },
            PRODUCTOS_MOCK[1]!,
        ];

        const catalog = useCatalog({
            initialProductos: productos,
            initialCategorias: CATEGORIAS_MOCK,
            initialSubcategorias: subcategoriasMock,
            productosPorPagina: 1,
        });

        catalog.seleccionarCategoria('llaveros');
        catalog.seleccionarSubcategoria('acrilico');
        catalog.seleccionarPresetPrecio('lt100');
        catalog.paginaActual.value = 2;
        catalog.seleccionarOrden('alfabetico_asc');

        expect(catalog.paginaActual.value).toBe(1);
        expect(catalog.productosFiltrados.value.map((p) => p.nombre)).toEqual([
            'Llavero Místico',
            'Llavero Xibalba',
        ]);

        // Rango personalizado válido e inválido
        expect(catalog.aplicarRangoPrecioPersonalizado('200', '100')).toBe(false);
        expect(catalog.aplicarRangoPrecioPersonalizado('80', '160')).toBe(true);
        expect(catalog.productosFiltrados.value.map((p) => p._id)).toEqual([
            'l-esp',
            'l-xib',
        ]);

        expect(catalog.aplicarRangoPrecioPersonalizado('', '')).toBe(true);
        expect(catalog.filtroPrecioActivo.value).toBe(false);

        catalog.seleccionarPresetPrecio('lt100');
        expect(catalog.filtroPrecioActivo.value).toBe(true);
        catalog.limpiarFiltroPrecio();
        expect(catalog.filtroPrecioPreset.value).toBe('todos');
    });

    it('PC-IT-CAT-02: hereda criterioOrdenDefault de Sanity (fallback aleatorio) y respeta relevancia de búsqueda', () => {
        const sinConfig = useCatalog({
            initialProductos: PRODUCTOS_MOCK,
            initialCategorias: CATEGORIAS_MOCK,
        });
        expect(sinConfig.criterioOrden.value).toBe('aleatorio');

        const conConfig = useCatalog({
            initialProductos: PRODUCTOS_MOCK,
            initialCategorias: CATEGORIAS_MOCK,
            initialConfig: { criterioOrdenDefault: 'precio_desc' },
        });
        expect(conConfig.criterioOrden.value).toBe('precio_desc');
        expect(conConfig.productosFiltrados.value.map((p) => p._id)).toEqual([
            'prod-1',
            'prod-2',
        ]);

        // En búsqueda con orden aleatorio se respeta el orden del buscador
        sinConfig.searchQuery.value = 'michi';
        expect(sinConfig.productosFiltrados.value).toHaveLength(1);
        expect(sinConfig.productosFiltrados.value[0]?._id).toBe('prod-1');
    });
});
