/**
 * @file composables.test.ts
 * @description Pruebas de integración frontend para la interacción con los endpoints Go (Fase 5.6 y 5.7).
 * Satisface: IT-08 (FormularioComentario envía POST a /api/comentar),
 *            IT-09 (FormularioComentario maneja error 429 amigablemente),
 *            IT-10 (SistemaEstrellas envía POST a /api/calificar con valor correcto).
 */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FormularioComentario from '~/components/FormularioComentario.vue';
import SistemaEstrellas from '~/components/SistemaEstrellas.vue';
import { useCalificacion } from '~/composables/useCalificacion';
import { useComentario } from '~/composables/useComentario';

describe('IT-08 a IT-10: Integración Frontend con Handlers Go', () => {
    beforeEach(() => {
        globalThis.localStorage.clear();
    });

    it('IT-08: FormularioComentario envía POST a /api/comentar y muestra confirmación de éxito', async () => {
        const mockFetcher = vi.fn().mockResolvedValue({ ok: true });
        const wrapper = mount(FormularioComentario, {
            props: {
                productoId: 'prod-it-08',
                fetcher: mockFetcher,
            },
        });

        await wrapper
            .find('[data-testid="comment-textarea"]')
            .setValue('Excelente producto, recomendado 100%.');
        await wrapper.find('[data-testid="comment-form"]').trigger('submit.prevent');

        expect(mockFetcher).toHaveBeenCalledWith({
            productId: 'prod-it-08',
            text: 'Excelente producto, recomendado 100%.',
        });
        expect(wrapper.find('[data-testid="comment-success"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="comment-success"]').text()).toContain('enviado correctamente');
    });

    it('IT-09: FormularioComentario muestra error amigable ante código 429 de rate limit', async () => {
        const mockFetcher = vi.fn().mockResolvedValue({
            ok: false,
            error: 'Has enviado demasiados comentarios en poco tiempo. Por favor espera un minuto.',
            code: 'RATE_LIMIT_EXCEEDED',
        });

        const wrapper = mount(FormularioComentario, {
            props: {
                productoId: 'prod-it-09',
                fetcher: mockFetcher,
            },
        });

        await wrapper
            .find('[data-testid="comment-textarea"]')
            .setValue('Comentario rápido de prueba.');
        await wrapper.find('[data-testid="comment-form"]').trigger('submit.prevent');

        expect(wrapper.find('[data-testid="comment-error"]').exists()).toBe(true);
        const errorText = wrapper.find('[data-testid="comment-error"]').text();
        expect(errorText).toContain('demasiados comentarios');
        expect(errorText).not.toContain('429'); // Mensaje amigable (RNF-04)
    });

    it('IT-10: SistemaEstrellas envía POST a /api/calificar y persiste calificación', async () => {
        const mockFetcher = vi.fn().mockResolvedValue({ ok: true });
        const wrapper = mount(SistemaEstrellas, {
            props: {
                productoId: 'prod-it-10',
                fetcher: mockFetcher,
            },
        });

        // Click en la estrella 4
        await wrapper.find('[data-testid="star-button-4"]').trigger('click');

        expect(mockFetcher).toHaveBeenCalledWith({
            productId: 'prod-it-10',
            value: 4,
        });

        expect(wrapper.find('[data-testid="rating-success"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="rating-success"]').text()).toContain('4 de 5 estrellas');
    });

    it('useComentario y useCalificacion son alias válidos con la misma funcionalidad que useComment y useRating', async () => {
        const fetcherComment = vi.fn().mockResolvedValue({ ok: true });
        const comentario = useComentario('prod-alias-1', { fetcher: fetcherComment });
        comentario.texto.value = 'Un comentario de prueba.';
        expect(await comentario.enviarComentario()).toBe(true);

        const fetcherRating = vi.fn().mockResolvedValue({ ok: true });
        const calificacion = useCalificacion('prod-alias-2', { fetcher: fetcherRating });
        expect(await calificacion.enviarCalificacion(5)).toBe(true);
    });
});

