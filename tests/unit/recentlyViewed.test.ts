/**
 * @file recentlyViewed.test.ts
 * @description Pruebas unitarias de `useRecentlyViewed.ts`, `RecentlyViewed.vue` y `SimilarProducts.vue`
 * (persistencia en `localStorage`, límite de 6 elementos, limpieza de historial, exclusión del
 * producto actual y despriorización de agotados).
 * @satisfies UT-VUE-18, UT-VUE-19, UT-VUE-20, UT-VUE-21, RF-03, RF-21, RF-22
 */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import RecentlyViewed from '~/components/RecentlyViewed.vue';
import SimilarProducts from '~/components/SimilarProducts.vue';
import {
    MAX_RECENTLY_VIEWED,
    RECENTLY_VIEWED_STORAGE_KEY,
    useRecentlyViewed,
} from '~/composables/useRecentlyViewed';
import type { RecommendationOutput } from '~/scripts/recommendations/types';
import type { Producto } from '~/types/sanity';

const CATALOGO_TEST: Producto[] = Array.from({ length: 8 }, (_, idx) => ({
    _id: `prod-rv-${idx + 1}`,
    _type: 'producto',
    _createdAt: '2026-01-01T00:00:00Z',
    _updatedAt: '2026-01-01T00:00:00Z',
    _rev: '1',
    nombre: `Producto Taller ${idx + 1}`,
    slug: { _type: 'slug', current: `producto-taller-${idx + 1}` },
    categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
    stock: idx === 1 ? 0 : 10, // prod-rv-2 está agotado (stock = 0)
    precio: 80 + idx * 10,
    activo: true,
}));

describe('UT-VUE-18 a UT-VUE-21: SimilarProducts y RecentlyViewed', () => {
    beforeEach(() => {
        globalThis.localStorage.clear();
        const { clearHistory } = useRecentlyViewed();
        clearHistory();
    });

    it('UT-VUE-18 & UT-VUE-19: SimilarProducts nunca muestra el producto actual y desprioriza productos agotados', () => {
        const mockRecommendations: RecommendationOutput = {
            schemaVersion: 1,
            algorithm: 'tfidf-cosine',
            generatedAt: '2026-10-21T00:00:00Z',
            items: {
                'prod-rv-1': {
                    clusterId: null,
                    similar: [
                        { id: 'prod-rv-1', score: 1.0 }, // Propio ID (debe filtrarse)
                        { id: 'prod-rv-2', score: 0.95 }, // Agotado (debe ir al final)
                        { id: 'prod-rv-3', score: 0.85 }, // Con stock (debe ir primero)
                        { id: 'prod-rv-4', score: 0.75 }, // Con stock (debe ir segundo)
                    ],
                },
            },
        };

        const wrapper = mount(SimilarProducts, {
            props: {
                productoActualId: 'prod-rv-1',
                catalogoProductos: CATALOGO_TEST,
                recommendationsData: mockRecommendations,
                maxItems: 4,
            },
        });

        const cards = wrapper.findAll('[data-testid="product-card"]');
        expect(cards).toHaveLength(3);

        // No incluye prod-rv-1 ("Producto Taller 1")
        expect(wrapper.text()).not.toContain('Producto Taller 1');

        // prod-rv-3 y prod-rv-4 (con stock) aparecen antes que prod-rv-2 (agotado)
        expect(cards[0]?.text()).toContain('Producto Taller 3');
        expect(cards[1]?.text()).toContain('Producto Taller 4');
        expect(cards[2]?.text()).toContain('Producto Taller 2');
    });

    it('UT-VUE-20 & UT-VUE-21: useRecentlyViewed persiste en lp:recentlyViewed, deduplica, limita a 6 y limpia historial', async () => {
        const {
            recentIds,
            addProduct,
            clearHistory,
            resolveRecentProducts,
        } = useRecentlyViewed();

        for (const p of CATALOGO_TEST) {
            addProduct(p);
        }

        // Límite estricto de 6 elementos
        expect(recentIds.value).toHaveLength(MAX_RECENTLY_VIEWED);
        expect(recentIds.value[0]).toBe('prod-rv-8');

        // Verificar persistencia en localStorage
        const raw = globalThis.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw!)).toHaveLength(6);

        // Si se vuelve a ver prod-rv-5, sube a la primera posición sin duplicarse
        addProduct('prod-rv-5');
        expect(recentIds.value[0]).toBe('prod-rv-5');
        expect(recentIds.value).toHaveLength(6);

        // Resolver contra catálogo excluyendo el producto actual
        const resolved = resolveRecentProducts(CATALOGO_TEST, 'prod-rv-5');
        expect(resolved.some((p) => p._id === 'prod-rv-5')).toBe(false);

        // Montar componente RecentlyViewed y probar botón "Limpiar historial"
        const wrapper = mount(RecentlyViewed, {
            props: {
                catalogoProductos: CATALOGO_TEST,
            },
        });

        expect(wrapper.find('[data-testid="recently-viewed-section"]').exists()).toBe(
            true
        );
        await wrapper.find('[data-testid="clear-history-button"]').trigger('click');

        expect(recentIds.value).toHaveLength(0);
        expect(globalThis.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY)).toBeNull();
        clearHistory();
    });
});
