/**
 * @file components.test.ts
 * @description Pruebas unitarias de los componentes atómicos, moleculares, organismos y
 * composables auxiliares (`StockIndicator`, `WhatsAppButton`, `PrimaryButton`, `StarRating`,
 * `CommentForm`, `CartDrawer`, `useStock`, `useSanityImage`, `useRating`, `useComment`).
 * @satisfies UT-VUE-08, UT-VUE-09, UT-VUE-10, UT-VUE-11, UT-VUE-12, UT-VUE-13
 */

import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CartDrawer from '~/components/CartDrawer.vue';
import CommentForm from '~/components/CommentForm.vue';
import PrimaryButton from '~/components/PrimaryButton.vue';
import StarRating from '~/components/StarRating.vue';
import StockIndicator from '~/components/StockIndicator.vue';
import WhatsAppButton from '~/components/WhatsAppButton.vue';
import { useCart } from '~/composables/useCart';
import { useComment } from '~/composables/useComment';
import { useRating } from '~/composables/useRating';
import { buildSanityImageUrl, useSanityImage } from '~/composables/useSanityImage';
import { useStock } from '~/composables/useStock';
import { useWhatsApp } from '~/composables/useWhatsApp';

describe('UT-VUE-08 a UT-VUE-13: Componentes y Composables del Frontend', () => {
    beforeEach(() => {
        globalThis.localStorage.clear();
        const { clearCart, closeCart } = useCart();
        clearCart();
        closeCart();
    });

    it('UT-VUE-08: StockIndicator muestra Disponibles, Quedan solo X, Agotado y Verificando disponibilidad', () => {
        const loadingWrapper = mount(StockIndicator, {
            props: { stock: 10, cargando: true },
        });
        expect(loadingWrapper.find('[data-testid="stock-cargando"]').exists()).toBe(true);
        expect(loadingWrapper.text()).toContain('Verificando disponibilidad');

        const okWrapper = mount(StockIndicator, {
            props: { stock: 12, umbralStockBajo: 5, mostrarUnidades: true },
        });
        expect(okWrapper.find('[data-testid="stock-disponible"]').exists()).toBe(true);
        expect(okWrapper.text()).toContain('Disponibles');

        const lowWrapper = mount(StockIndicator, {
            props: { stock: 3, umbralStockBajo: 5, mostrarUnidades: true },
        });
        expect(lowWrapper.find('[data-testid="stock-bajo"]').exists()).toBe(true);
        expect(lowWrapper.text()).toContain('Quedan solo 3');

        const zeroWrapper = mount(StockIndicator, {
            props: { stock: 0, umbralStockBajo: 5 },
        });
        expect(zeroWrapper.find('[data-testid="stock-agotado"]').exists()).toBe(true);
        expect(zeroWrapper.text()).toBe('Agotado');
    });

    it('UT-VUE-09: WhatsAppButton y useWhatsApp manejan enlaces activos, vacíos y deshabilitados', () => {
        const active = mount(WhatsAppButton, {
            props: {
                href: 'https://wa.me/5219991234567?text=Hola',
                disabled: false,
                fullWidth: false,
            },
        });
        expect(active.find('[data-testid="whatsapp-button"]').exists()).toBe(true);
        expect(active.text()).toBe('Comprar por WhatsApp');

        const disabled = mount(WhatsAppButton, {
            props: {
                href: 'https://wa.me/5219991234567?text=Hola',
                disabled: true,
                fullWidth: false,
            },
        });
        expect(disabled.find('[data-testid="whatsapp-button-disabled"]').exists()).toBe(true);
        expect(disabled.text()).toBe('Agotado');

        const { construirUrlWhatsApp, construirUrlWhatsAppCarrito } = useWhatsApp();
        const urlSinVariable = construirUrlWhatsApp(
            '5219991234567',
            'Pin Retro',
            'Hola taller'
        );
        expect(decodeURIComponent(urlSinVariable)).toContain('Hola taller: Pin Retro');

        const urlCarritoVacio = construirUrlWhatsAppCarrito('5219991234567', [], 0);
        expect(decodeURIComponent(urlCarritoVacio)).toContain('solicitar informacion');

        const urlSinPrecio = construirUrlWhatsAppCarrito(
            '5219991234567',
            [{ id: '1', nombre: 'Pieza Especial', cantidad: 1 }],
            0
        );
        expect(decodeURIComponent(urlSinPrecio)).toContain('Precio por confirmar');
    });

    it('UT-VUE-10: PrimaryButton soporta todas las variantes (primario, secundario, acento, neutro) y estados', () => {
        for (const variant of ['primario', 'secundario', 'acento', 'neutro'] as const) {
            const btn = mount(PrimaryButton, {
                props: { variant, fullWidth: true },
                slots: { default: `Botón ${variant}` },
            });
            expect(btn.text()).toContain(`Botón ${variant}`);
        }

        const loadingBtn = mount(PrimaryButton, {
            props: { loading: true },
            slots: { default: 'Guardar' },
        });
        expect(loadingBtn.attributes('disabled')).toBeDefined();
        expect(loadingBtn.attributes('aria-busy')).toBe('true');
    });

    it('UT-VUE-11: StarRating como resumen de solo lectura y useRating valida rangos y errores', async () => {
        const mockFetcher = vi.fn().mockResolvedValue({ ok: true });
        const wrapper = mount(StarRating, {
            props: {
                productoId: 'prod-star-1',
                calificacionPromedio: 4.5,
                ratingCount: 4,
                rating5Count: 2,
                rating4Count: 2,
                mostrarDesglose: true,
                fetcher: mockFetcher,
            },
        });

        expect(wrapper.find('[data-testid="rating-average"]').text()).toBe('4.5');
        expect(wrapper.find('[data-testid="rating-breakdown"]').exists()).toBe(true);

        // Validar casos de useRating directo
        const rValido = useRating('prod-star-1', { fetcher: mockFetcher });
        expect(await rValido.enviarCalificacion(5)).toBe(true);
        expect(mockFetcher).toHaveBeenCalledWith(
            expect.objectContaining({
                productId: 'prod-star-1',
                value: 5,
            })
        );

        const rInvalido = useRating('', { fetcher: mockFetcher });
        expect(await rInvalido.enviarCalificacion(5)).toBe(false);

        const rFueraRango = useRating('prod-star-2', { fetcher: mockFetcher });
        expect(await rFueraRango.enviarCalificacion(9)).toBe(false);

        const rFalloRed = useRating('prod-star-3', {
            fetcher: async () => {
                throw new Error('network error');
            },
        });
        expect(await rFalloRed.enviarCalificacion(4)).toBe(false);
        expect(rFalloRed.error.value).toContain('conectar con el servidor');
    });

    it('UT-VUE-12: CommentForm y useComment validan estrellas obligatorias, comentarios opcionales, filtros y límites', async () => {
        const mockFetcher = vi.fn().mockResolvedValue({ ok: true });
        const comentariosPrueba = [
            {
                _id: 'c1',
                _type: 'comentario' as const,
                _createdAt: '2026-09-01T10:00:00Z',
                _updatedAt: '2026-09-01T10:00:00Z',
                _rev: '1',
                texto: 'Primer comentario aprobado.',
                calificacion: 5,
                producto: { _type: 'reference' as const, _ref: 'prod-com-1' },
                fechaCreacion: '2026-09-01T10:00:00Z',
                estado: 'aprobado' as const,
            },
            {
                _id: 'c2',
                _type: 'comentario' as const,
                _createdAt: '2026-09-05T10:00:00Z',
                _updatedAt: '2026-09-05T10:00:00Z',
                _rev: '1',
                texto: 'Segundo comentario más reciente.',
                calificacion: 4,
                producto: { _type: 'reference' as const, _ref: 'prod-com-1' },
                fechaCreacion: '2026-09-05T10:00:00Z',
                estado: 'aprobado' as const,
            },
            {
                _id: 'c3',
                _type: 'comentario' as const,
                _createdAt: '2026-09-06T10:00:00Z',
                _updatedAt: '2026-09-06T10:00:00Z',
                _rev: '1',
                texto: 'Tercer comentario.',
                calificacion: 5,
                producto: { _type: 'reference' as const, _ref: 'prod-com-1' },
                fechaCreacion: '2026-09-06T10:00:00Z',
                estado: 'aprobado' as const,
            },
            {
                _id: 'c4',
                _type: 'comentario' as const,
                _createdAt: '2026-09-07T10:00:00Z',
                _updatedAt: '2026-09-07T10:00:00Z',
                _rev: '1',
                texto: 'Cuarto comentario.',
                calificacion: 3,
                producto: { _type: 'reference' as const, _ref: 'prod-com-1' },
                fechaCreacion: '2026-09-07T10:00:00Z',
                estado: 'aprobado' as const,
            },
            {
                _id: 'c5',
                _type: 'comentario' as const,
                _createdAt: '2026-09-08T10:00:00Z',
                _updatedAt: '2026-09-08T10:00:00Z',
                _rev: '1',
                texto: 'Quinto comentario.',
                calificacion: 5,
                producto: { _type: 'reference' as const, _ref: 'prod-com-1' },
                fechaCreacion: '2026-09-08T10:00:00Z',
                estado: 'aprobado' as const,
            },
        ];

        const wrapper = mount(CommentForm, {
            props: {
                productoId: 'prod-com-1',
                comentarios: comentariosPrueba,
                fetcher: mockFetcher,
            },
        });

        // Inicialmente muestra máximo 4 comentarios y botón de toggle
        expect(wrapper.findAll('[data-testid="comment-item"]')).toHaveLength(4);
        expect(wrapper.find('[data-testid="toggle-comments-button"]').exists()).toBe(true);

        // Expandir todos los comentarios
        await wrapper.find('[data-testid="toggle-comments-button"]').trigger('click');
        expect(wrapper.findAll('[data-testid="comment-item"]')).toHaveLength(5);

        // Filtrar por 4 estrellas (solo hay 1)
        await wrapper.find('[data-testid="filter-star-4"]').trigger('click');
        expect(wrapper.findAll('[data-testid="comment-item"]')).toHaveLength(1);

        // Resetear a todos
        await wrapper.find('[data-testid="filter-star-all"]').trigger('click');
        expect(wrapper.findAll('[data-testid="comment-item"]')).toHaveLength(5);

        // Ordenar por antiguos
        await wrapper.find('[data-testid="comment-sort-select"]').setValue('antiguos');
        expect(wrapper.findAll('[data-testid="comment-item"]')[0]?.text()).toContain(
            'Primer comentario aprobado.'
        );

        // Intento de envío sin estrellas -> bloqueado con error
        await wrapper.find('[data-testid="comment-form"]').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.find('[data-testid="comment-error"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="comment-error"]').text()).toContain('Debes seleccionar una calificación');

        // Seleccionar 5 estrellas sin comentario -> botón "Enviar calificación"
        await wrapper.find('[data-testid="star-select-button-5"]').trigger('click');
        expect(wrapper.find('[data-testid="comment-submit-button"]').text()).toContain('Enviar calificación');
        await wrapper.find('[data-testid="comment-form"]').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.find('[data-testid="rating-success-message"]').exists()).toBe(true);

        // Escribir comentario válido -> botón cambia a reseña / actualización
        await wrapper
            .find('[data-testid="comment-textarea"]')
            .setValue('Me gustó mucho el detalle del broche.');
        await wrapper.find('[data-testid="comment-form"]').trigger('submit.prevent');
        await flushPromises();
        expect(wrapper.find('[data-testid="comment-success"]').exists()).toBe(true);

        // Validaciones directas de useComment
        const cCorto = useComment('prod-com-2', {
            fetcher: async () => ({ ok: false, error: 'Rechazado' }),
        });
        cCorto.texto.value = 'ab';
        expect(await cCorto.enviarComentario()).toBe(false);

        cCorto.texto.value = 'Comentario suficientemente largo';
        expect(await cCorto.enviarComentario()).toBe(false);
        expect(cCorto.error.value).toBe('Rechazado');
    });

    it('UT-VUE-13: CartDrawer, useCart, useStock y useSanityImage cubren operaciones completas', async () => {
        const {
            addItem,
            updateQuantity,
            removeItem,
            toggleCart,
            hydrateCart,
            items,
        } = useCart();

        hydrateCart();
        // Producto sin stock no se agrega
        expect(
            addItem(
                {
                    _id: 'p-agotado',
                    _type: 'producto',
                    _createdAt: '2026-01-01T00:00:00Z',
                    _updatedAt: '2026-01-01T00:00:00Z',
                    _rev: '1',
                    nombre: 'Agotado',
                    slug: { _type: 'slug', current: 'agotado' },
                    categoria: { nombre: 'Pins', slug: { _type: 'slug', current: 'pins' } },
                    stock: 0,
                    activo: true,
                },
                1
            )
        ).toBe(false);

        const prodValido = {
            _id: 'p-cart-1',
            _type: 'producto' as const,
            _createdAt: '2026-01-01T00:00:00Z',
            _updatedAt: '2026-01-01T00:00:00Z',
            _rev: '1',
            nombre: 'Sticker Pack Anime',
            slug: { _type: 'slug' as const, current: 'sticker-pack-anime' },
            categoria: { nombre: 'Stickers', slug: { _type: 'slug' as const, current: 'stickers' } },
            stock: 5,
            precio: 40,
            activo: true,
        };

        addItem(prodValido, 1);
        addItem(prodValido, 1); // Incrementa existente a 2
        toggleCart();

        const wrapper = mount(CartDrawer, {
            props: { numeroWhatsApp: '5219991234567' },
        });

        expect(wrapper.find('[data-testid="item-qty"]').text()).toBe('2');
        await wrapper.find('[data-testid="decrease-qty"]').trigger('click');
        expect(wrapper.find('[data-testid="item-qty"]').text()).toBe('1');

        // Actualizar cantidad a 0 elimina el ítem
        updateQuantity('p-cart-1', 0);
        expect(items.value).toHaveLength(0);

        addItem(prodValido, 1);
        removeItem('p-cart-1');
        expect(items.value).toHaveLength(0);

        // useStock en tiempo real
        const stockState = useStock('p-cart-1', {
            initialStock: 5,
            umbralStockBajo: 5,
            autoFetch: false,
            fetcher: async () => ({ stock: 2 }),
        });
        await stockState.consultarStock();
        expect(stockState.stock.value).toBe(2);
        expect(stockState.disponible.value).toBe(true);
        expect(stockState.pocasUnidades.value).toBe(true);

        const stockErrorState = useStock('p-cart-1', {
            initialStock: 5,
            autoFetch: false,
            fetcher: async () => {
                throw new Error('timeout');
            },
        });
        await stockErrorState.consultarStock();
        expect(stockErrorState.error.value).toContain('No se pudo verificar');

        // useSanityImage y buildSanityImageUrl
        const { urlFor } = useSanityImage();
        expect(urlFor(null)).toBeNull();
        const resolvedUrl = buildSanityImageUrl(
            {
                _type: 'image',
                asset: {
                    _type: 'reference',
                    _ref: 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-600x600-jpg',
                },
            },
            'rbrk7xv9',
            'staging',
            { width: 400, height: 400, quality: 85 }
        );
        expect(resolvedUrl).toContain('cdn.sanity.io');
        expect(resolvedUrl).toContain('w=400');
    });
});
