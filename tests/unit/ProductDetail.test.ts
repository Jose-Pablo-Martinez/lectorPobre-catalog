/**
 * @file ProductDetail.test.ts
 * @description Pruebas unitarias de la vista de detalle `pages/product/[slug].vue` y de
 * `useWhatsApp.ts` (generación de URL individual y de Lista de Pedido codificada sin emojis).
 * @satisfies UT-VUE-06, UT-VUE-07, RF-02, RF-03, RF-17
 */

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import {
    construirUrlWhatsApp,
    construirUrlWhatsAppCarrito,
} from '~/composables/useWhatsApp';
import ProductDetailPage from '~/pages/product/[slug].vue';
import type { Producto } from '~/types/sanity';

const DETALLE_PRODUCTO: Producto = {
    _id: 'prod-det-1',
    _type: 'producto',
    _createdAt: '2026-01-01T00:00:00Z',
    _updatedAt: '2026-01-01T00:00:00Z',
    _rev: '1',
    nombre: 'Pin Goku Ultra Instinto',
    slug: { _type: 'slug', current: 'pin-goku-ultra-instinto' },
    descripcion: 'Pin esmaltado duro de 38mm con acabado brillante.',
    categoria: { nombre: 'Pins', slug: { _type: 'slug', current: 'pins' } },
    stock: 4,
    precio: 65,
    activo: true,
    calificacionPromedio: 4.5,
    ratingCount: 10,
    rating5Count: 6,
    rating4Count: 3,
    rating3Count: 1,
    palabrasClave: ['goku', 'anime'],
};

describe('UT-VUE-06 & UT-VUE-07: Detalle de Producto y Enlaces de WhatsApp', () => {
    it('UT-VUE-06: renderiza correctamente los datos del producto en pages/product/[slug].vue', () => {
        const wrapper = mount(ProductDetailPage, {
            props: {
                initialProducto: DETALLE_PRODUCTO,
                initialConfig: {
                    numeroWhatsApp: '5219991234567',
                    mensajeWhatsApp: 'Hola, me interesa el producto {{nombre}} ({{precio}})',
                    umbralStockBajo: 5,
                },
                initialComentarios: [],
                initialCatalogo: [DETALLE_PRODUCTO],
            },
        });

        expect(wrapper.find('[data-testid="detail-title"]').text()).toBe(
            'Pin Goku Ultra Instinto'
        );
        expect(wrapper.find('[data-testid="detail-category"]').text()).toContain('Pins');
        expect(wrapper.find('[data-testid="detail-price"]').text()).toBe('$65.00 MXN');
        expect(wrapper.find('[data-testid="detail-description"]').text()).toContain(
            'Pin esmaltado duro de 38mm'
        );
        expect(wrapper.find('[data-testid="stock-bajo"]').exists()).toBe(true);

        const waButton = wrapper.find('[data-testid="whatsapp-button"]');
        expect(waButton.exists()).toBe(true);
        expect(waButton.attributes('href')).toContain('https://wa.me/5219991234567?text=');
        expect(decodeURIComponent(waButton.attributes('href') ?? '')).toContain(
            'Pin Goku Ultra Instinto'
        );
    });

    it('UT-VUE-07: genera URLs de WhatsApp válidas tanto para producto individual como para la Lista de Pedido', () => {
        const urlIndividual = construirUrlWhatsApp(
            '+52 (999) 123-4567',
            'Llavero Gato Kawaii',
            'Hola, quiero cotizar {{nombre}} de {{precio}}',
            85
        );

        expect(urlIndividual.startsWith('https://wa.me/529991234567?text=')).toBe(true);
        const decodedInd = decodeURIComponent(urlIndividual.split('?text=')[1] ?? '');
        expect(decodedInd).toBe('Hola, quiero cotizar Llavero Gato Kawaii de $85.00 MXN');

        const urlCarrito = construirUrlWhatsAppCarrito(
            '5219991234567',
            [
                { id: '1', nombre: 'Llavero Gato Kawaii', cantidad: 2, precio: 85 },
                { id: '2', nombre: 'Sticker Pack Anime', cantidad: 1, precio: 40 },
            ],
            210
        );

        const decodedCart = decodeURIComponent(urlCarrito.split('?text=')[1] ?? '');
        expect(decodedCart).toContain('- 2x Llavero Gato Kawaii ($170.00 MXN)');
        expect(decodedCart).toContain('- 1x Sticker Pack Anime ($40.00 MXN)');
        expect(decodedCart).toContain('Total estimado: $210.00 MXN');
    });
});
