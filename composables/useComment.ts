/**
 * @file useComment.ts
 * @description Composable para validar y enviar comentarios de usuarios sobre un producto
 * hacia la función serverless `/api/comment`. Los comentarios quedan en estado "pendiente"
 * hasta que el administrador los apruebe desde Sanity Studio.
 * Soporta asociar calificación de estrellas y asociar ID determinista por usuario.
 * @satisfies RF-07, RNF-04
 */

import { computed, ref } from 'vue';
import {
    getOrCreateUserId,
    getStoredUserReview,
    saveStoredUserReview,
} from '~/composables/useReviewStorage';
import type { ApiResponse, CommentPayload, StarRatingValue } from '~/types/api';

export const COMMENT_MAX_LENGTH = 500;
export const COMMENT_MIN_LENGTH = 3;

export interface UseCommentOptions {
    fetcher?: (payload: CommentPayload) => Promise<ApiResponse>;
}

/**
 * Composable de formulario de comentarios con validación en cliente.
 *
 * @param productoId ID del producto en Sanity.
 * @param options Opciones con fetcher inyectable para pruebas unitarias.
 */
export function useComment(productoId: string, options: UseCommentOptions = {}) {
    const texto = ref('');
    const enviando = ref(false);
    const enviado = ref(false);
    const error = ref<string | null>(null);

    const caracteresRestantes = computed(
        () => COMMENT_MAX_LENGTH - texto.value.length
    );

    const validarComentario = (
        rawText = texto.value,
        permitirVacio = false
    ): string | null => {
        if (!productoId || productoId.trim().length === 0) {
            return 'Producto no válido.';
        }
        const limpio = rawText.trim();
        if (limpio.length === 0) {
            return permitirVacio ? null : 'El comentario no puede estar vacío.';
        }
        if (limpio.length < COMMENT_MIN_LENGTH) {
            return `El comentario debe tener al menos ${COMMENT_MIN_LENGTH} caracteres.`;
        }
        if (limpio.length > COMMENT_MAX_LENGTH) {
            return `El comentario no puede superar los ${COMMENT_MAX_LENGTH} caracteres.`;
        }
        return null;
    };

    const defaultFetcher = async (
        payload: CommentPayload
    ): Promise<ApiResponse> => {
        return await $fetch<ApiResponse>('/api/comment', {
            method: 'POST',
            body: payload,
        });
    };

    /**
     * Valida y envía el comentario hacia `/api/comment`.
     *
     * @param rating Calificación asociada opcional (1 a 5).
     * @param uid Identificador del usuario (opcional).
     */
    const enviarComentario = async (
        rating?: number,
        uid?: string
    ): Promise<boolean> => {
        error.value = null;
        enviado.value = false;

        const mensajeValidacion = validarComentario(texto.value);
        if (mensajeValidacion) {
            error.value = mensajeValidacion;
            return false;
        }

        enviando.value = true;
        try {
            const runFetch = options.fetcher ?? defaultFetcher;
            const userId = uid ?? getOrCreateUserId();
            const payload: CommentPayload = {
                productId: productoId,
                text: texto.value.trim(),
                userId,
            };
            if (rating && rating >= 1 && rating <= 5) {
                payload.rating = rating as StarRatingValue;
            }

            const res = await runFetch(payload);

            if (res?.ok) {
                const existing = getStoredUserReview(productoId) ?? {};
                saveStoredUserReview(productoId, {
                    ...existing,
                    comment: texto.value.trim(),
                    commentStatus: 'pendiente',
                });
                enviado.value = true;
                return true;
            }

            error.value = res?.error ?? 'No fue posible enviar tu comentario.';
            return false;
        } catch {
            error.value =
                'No fue posible conectar con el servidor. Inténtalo más tarde.';
            return false;
        } finally {
            enviando.value = false;
        }
    };

    return {
        texto,
        caracteresRestantes,
        enviando,
        enviado,
        error,
        validarComentario,
        enviarComentario,
    };
}
