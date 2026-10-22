/**
 * @file ProductCard.test.ts
 * @description Pruebas unitarias de `ProductCard.vue` (renderizado, placeholder 1:1, stock y lista de pedido).
 * @satisfies UT-VUE-04, UT-VUE-05, RF-01, RF-03, RF-14, RF-17
 */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import ProductCard from '~/components/ProductCard.vue';
import { useCart } from '~/composables/useCart';
import type { Producto } from '~/types/sanity';

const BASE_PRODUCTO: Producto = {
    _id: 'prod-card-1',
    _type: 'producto',
    _createdAt: '2026-01-01T00:00:00Z',
    _updatedAt: '2026-01-01T00:00:00Z',
    _rev: '1',
    nombre: 'Llavero Totoro Esmaltado',
    slug: { _type: 'slug', current: 'llavero-totoro' },
    descripcion: 'Llavero metálico con diseño de Totoro.',
    categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
    stock: 8,
    precio: 120,
    activo: true,
    calificacionPromedio: 4.9,
};

describe('UT-VUE-04 & UT-VUE-05: ProductCard.vue', () => {
    beforeEach(() => {
        const { clearCart } = useCart();
        clearCart();
    });

    it('UT-VUE-04: renderiza nombre, categoría, precio, placeholder 1:1 y permite agregar a la lista de pedido', async () => {
        const wrapper = mount(ProductCard, {
            props: {
                producto: BASE_PRODUCTO,
            },
        });

        expect(wrapper.text()).toContain('Llavero Totoro Esmaltado');
        expect(wrapper.text()).toContain('Llaveros');
        expect(wrapper.find('[data-testid="product-price"]').text()).toBe('$120.00 MXN');
        expect(wrapper.find('[data-testid="product-image-placeholder"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="stock-disponible"]').exists()).toBe(true);

        const addBtn = wrapper.find('[data-testid="add-to-order-button"]');
        expect(addBtn.attributes('disabled')).toBeUndefined();
        expect(addBtn.text()).toContain('Agregar a mi lista de pedido');

        await addBtn.trigger('click');
        expect(wrapper.emitted('agregar')).toBeTruthy();

        const { totalItems } = useCart();
        expect(totalItems.value).toBe(1);
    });

    it('UT-VUE-05: muestra estado Agotado y deshabilita el botón cuando stock es 0', () => {
        const wrapper = mount(ProductCard, {
            props: {
                producto: {
                    ...BASE_PRODUCTO,
                    _id: 'prod-card-agotado',
                    stock: 0,
                },
            },
        });

        expect(wrapper.find('[data-testid="stock-agotado"]').exists()).toBe(true);
        const addBtn = wrapper.find('[data-testid="add-to-order-button"]');
        expect(addBtn.attributes('disabled')).toBeDefined();
        expect(addBtn.text()).toBe('Agotado');
    });
});
