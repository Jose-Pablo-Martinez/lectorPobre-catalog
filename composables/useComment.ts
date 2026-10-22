/**
 * @file useComment.ts
 * @description Composable para validar y enviar comentarios de usuarios sobre un producto
 * hacia la función serverless `/api/comment`. Los comentarios quedan en estado "pendiente"
 * hasta que el administrador los apruebe desde Sanity Studio.
 * @satisfies RF-07, RNF-04
 */

import { computed, ref } from 'vue';
import type { ApiResponse, CommentPayload } from '~/types/api';

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

    const validarComentario = (rawText = texto.value): string | null => {
        if (!productoId || productoId.trim().length === 0) {
            return 'Producto no válido.';
        }
        const limpio = rawText.trim();
        if (limpio.length === 0) {
            return 'El comentario no puede estar vacío.';
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
     */
    const enviarComentario = async (): Promise<boolean> => {
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
            const res = await runFetch({
                productId: productoId,
                text: texto.value.trim(),
            });

            if (res?.ok) {
                texto.value = '';
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
