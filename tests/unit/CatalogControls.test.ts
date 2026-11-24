/**
 * @file CatalogControls.test.ts
 * @description Pruebas de componente de UI para `pages/index.vue`: selector de
 * ordenación dinámica, presets de presupuesto (`< $50`, `< $100`, `< $200`),
 * rango personalizado `De $X a $Y` y validación de rangos inválidos (`PC-ST-CAT-01`).
 * @satisfies PC-ST-CAT-01, PC-ST-SRCH-01, RF-01, RF-04
 */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import {
    OPCIONES_ORDEN_CATALOGO,
} from '~/composables/catalog/catalogFilters';
import CatalogPage from '~/pages/index.vue';
import type { Categoria, Producto, Subcategoria } from '~/types/sanity';

const mockCatalogState = {
    productos: ref<Producto[]>([
        {
            _id: 'prod-1',
            _type: 'producto',
            _createdAt: '2026-01-01T00:00:00Z',
            _updatedAt: '2026-01-01T00:00:00Z',
            _rev: '1',
            nombre: 'Llavero Místico',
            slug: { _type: 'slug', current: 'llavero-mistico' },
            categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
            stock: 2,
            precio: 90,
            activo: true,
        },
        {
            _id: 'prod-2',
            _type: 'producto',
            _createdAt: '2026-01-02T00:00:00Z',
            _updatedAt: '2026-01-02T00:00:00Z',
            _rev: '1',
            nombre: 'Sticker G de Bandido',
            slug: { _type: 'slug', current: 'sticker-g-de-bandido' },
            categoria: { nombre: 'Stickers', slug: { _type: 'slug', current: 'stickers' } },
            stock: 3,
            precio: 10,
            activo: true,
        },
    ]),
    categorias: ref<Categoria[]>([]),
    subcategoriasActivas: ref<Subcategoria[]>([]),
    configGlobal: ref({ umbralStockBajo: 1 }),
    productoRecomendado: ref(null),
    estrategiaDestacado: ref('aleatorio' as const),
    obtenerExplicacionRecomendacion: vi.fn(() => ''),
    categoriaSeleccionada: ref(''),
    subcategoriaSeleccionada: ref(''),
    criterioOrden: ref('aleatorio'),
    filtroPrecioPreset: ref('todos'),
    filtroPrecioActivo: ref(false),
    seleccionarCategoria: vi.fn(),
    seleccionarSubcategoria: vi.fn(),
    seleccionarOrden: vi.fn((val: string) => {
        mockCatalogState.criterioOrden.value = val;
    }),
    seleccionarPresetPrecio: vi.fn((preset: string) => {
        mockCatalogState.filtroPrecioPreset.value = preset;
        mockCatalogState.filtroPrecioActivo.value = preset !== 'todos';
    }),
    aplicarRangoPrecioPersonalizado: vi.fn((min: unknown, max: unknown) => {
        if (Number(min) > Number(max)) return false;
        mockCatalogState.filtroPrecioPreset.value = 'custom';
        mockCatalogState.filtroPrecioActivo.value = true;
        return true;
    }),
    limpiarFiltroPrecio: vi.fn(() => {
        mockCatalogState.filtroPrecioPreset.value = 'todos';
        mockCatalogState.filtroPrecioActivo.value = false;
    }),
    searchQuery: ref(''),
    sugerencias: ref([{ type: 'producto', label: 'Llavero Místico', slug: 'llavero-mistico' }]),
    sugeridosEstadoVacio: ref([]),
    busquedaConfirmada: ref(''),
    sugerenciasConfirmadas: ref([] as Array<{ type: string; label: string; slug?: string }>),
    confirmarBusqueda: vi.fn((q?: string) => {
        const clean = (q ?? mockCatalogState.searchQuery.value).trim();
        mockCatalogState.busquedaConfirmada.value = clean;
        mockCatalogState.sugerenciasConfirmadas.value = [...mockCatalogState.sugerencias.value];
    }),
    cargarIndiceBusqueda: vi.fn(async () => {}),
    limpiarBusqueda: vi.fn(() => {
        mockCatalogState.searchQuery.value = '';
        mockCatalogState.busquedaConfirmada.value = '';
        mockCatalogState.sugerenciasConfirmadas.value = [];
    }),
    productosFiltrados: ref<Producto[]>([]),
    productosPaginados: ref<Producto[]>([]),
    paginaActual: ref(1),
    totalPaginas: ref(1),
    pending: ref(false),
};

vi.mock('~/composables/useCatalog', () => ({
    useCatalog: () => mockCatalogState,
}));

describe('PC-ST-CAT-01 & PC-ST-SRCH-01: Controles de Ordenación, Presupuesto y Enter en pages/index.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCatalogState.criterioOrden.value = 'aleatorio';
        mockCatalogState.filtroPrecioPreset.value = 'todos';
        mockCatalogState.filtroPrecioActivo.value = false;
        mockCatalogState.searchQuery.value = '';
        mockCatalogState.busquedaConfirmada.value = '';
        mockCatalogState.sugerenciasConfirmadas.value = [];
        mockCatalogState.productosFiltrados.value = mockCatalogState.productos.value;
        mockCatalogState.productosPaginados.value = mockCatalogState.productos.value;
    });

    it('PC-ST-CAT-01: renderiza el selector de 6 órdenes, presets de presupuesto y rango De $X a $Y con validación', async () => {
        const wrapper = mount(CatalogPage);

        const sortSelect = wrapper.find('[data-testid="catalog-sort-select"]');
        expect(sortSelect.exists()).toBe(true);
        expect(sortSelect.findAll('option')).toHaveLength(OPCIONES_ORDEN_CATALOGO.length);

        await sortSelect.setValue('alfabetico_asc');
        expect(mockCatalogState.seleccionarOrden).toHaveBeenCalledWith('alfabetico_asc');

        // Presets de presupuesto
        expect(wrapper.find('[data-testid="price-preset-lt50"]').text()).toContain('$50');
        expect(wrapper.find('[data-testid="price-preset-lt100"]').text()).toContain('$100');
        expect(wrapper.find('[data-testid="price-preset-lt200"]').text()).toContain('$200');

        await wrapper.find('[data-testid="price-preset-lt50"]').trigger('click');
        expect(mockCatalogState.seleccionarPresetPrecio).toHaveBeenCalledWith('lt50');
        expect(wrapper.find('[data-testid="price-filter-clear"]').exists()).toBe(true);

        // Rango invertido muestra alerta accesible
        await wrapper.find('[data-testid="price-min-input"]').setValue('200');
        await wrapper.find('[data-testid="price-max-input"]').setValue('50');
        await wrapper.find('[data-testid="price-custom-apply"]').trigger('click');
        expect(wrapper.find('[data-testid="price-error-message"]').exists()).toBe(true);

        // Rango válido limpia error y aplica
        await wrapper.find('[data-testid="price-min-input"]').setValue('50');
        await wrapper.find('[data-testid="price-max-input"]').setValue('150');
        await wrapper.find('[data-testid="price-custom-apply"]').trigger('click');
        expect(wrapper.find('[data-testid="price-error-message"]').exists()).toBe(false);
        expect(mockCatalogState.aplicarRangoPrecioPersonalizado).toHaveBeenLastCalledWith(50, 150);

        await wrapper.find('[data-testid="price-filter-clear"]').trigger('click');
        expect(mockCatalogState.limpiarFiltroPrecio).toHaveBeenCalled();
    });

    it('PC-ST-SRCH-01: al presionar Enter cierra dropdown y conserva sugerencias relacionadas visibles', async () => {
        const wrapper = mount(CatalogPage);
        const searchInput = wrapper.find('[data-testid="search-input"]');

        await searchInput.trigger('focus');
        await searchInput.setValue('llavero mistico');
        expect(wrapper.find('[data-testid="search-suggestions"]').exists()).toBe(true);

        await searchInput.trigger('keydown', { key: 'Enter' });
        expect(mockCatalogState.confirmarBusqueda).toHaveBeenCalledWith('llavero mistico');
        expect(wrapper.find('[data-testid="search-suggestions"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="confirmed-search-suggestions"]').exists()).toBe(true);
    });
});
