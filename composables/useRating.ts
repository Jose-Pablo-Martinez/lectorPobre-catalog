/**
 * @file useRating.ts
 * @description Composable para consultar y enviar calificaciones con estrellas (1 a 5)
 * hacia la función serverless `/api/rating`. Incluye validación de rango en cliente,
 * soporte para actualizar calificación previa y persistencia segura en `localStorage`.
 * @satisfies RF-06, RNF-04
 */

import { getCurrentInstance, onMounted, ref } from 'vue';
import {
    getOrCreateUserId,
    getStoredUserReview,
    saveStoredUserReview,
} from '~/composables/useReviewStorage';
import type { ApiResponse, RatingPayload, StarRatingValue } from '~/types/api';

export interface UseRatingOptions {
    fetcher?: (payload: RatingPayload) => Promise<ApiResponse>;
}

/**
 * Composable de calificación por estrellas para un producto específico.
 *
 * @param productoId ID del documento de producto en Sanity.
 * @param options Opciones con fetcher inyectable para pruebas unitarias.
 */
export function useRating(productoId: string, options: UseRatingOptions = {}) {
    const calificacionUsuario = ref<number | null>(null);
    const enviando = ref(false);
    const enviado = ref(false);
    const error = ref<string | null>(null);

    const cargarEstadoLocal = (): void => {
        if (!productoId) return;
        const guardado = getStoredUserReview(productoId);
        if (guardado?.rating && guardado.rating >= 1 && guardado.rating <= 5) {
            calificacionUsuario.value = guardado.rating;
            enviado.value = true;
        }
    };

    if (getCurrentInstance()) {
        onMounted(() => {
            cargarEstadoLocal();
        });
    } else {
        cargarEstadoLocal();
    }

    const defaultFetcher = async (
        payload: RatingPayload
    ): Promise<ApiResponse> => {
        return await $fetch<ApiResponse>('/api/rating', {
            method: 'POST',
            body: payload,
        });
    };

    /**
     * Valida y envía una calificación entera entre 1 y 5.
     * Soporta modificar una calificación previa indicando `previousValue`.
     *
     * @param valor Estrellas seleccionadas (1–5).
     * @param valorPrevio Calificación anterior (opcional).
     * @param uid Identificador del usuario (opcional).
     * @returns `true` si la calificación se registró o actualizó correctamente.
     */
    const enviarCalificacion = async (
        valor: number,
        valorPrevio?: number,
        uid?: string
    ): Promise<boolean> => {
        error.value = null;

        if (!productoId || productoId.trim().length === 0) {
            error.value = 'Producto no válido.';
            return false;
        }

        if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
            error.value =
                'La calificación debe ser un número entero entre 1 y 5 estrellas.';
            return false;
        }

        const prev = valorPrevio ?? calificacionUsuario.value ?? undefined;
        if (prev === valor && enviado.value) {
            error.value = 'Ya calificaste este producto con la misma puntuación.';
            return false;
        }

        enviando.value = true;
        try {
            const runFetch = options.fetcher ?? defaultFetcher;
            const userId = uid ?? getOrCreateUserId();
            const res = await runFetch({
                productId: productoId,
                value: valor as StarRatingValue,
                previousValue: (prev && prev >= 1 && prev <= 5) ? (prev as StarRatingValue) : undefined,
                userId,
            });

            if (res?.ok) {
                calificacionUsuario.value = valor;
                enviado.value = true;
                const existing = getStoredUserReview(productoId) ?? {};
                saveStoredUserReview(productoId, {
                    ...existing,
                    rating: valor as StarRatingValue,
                });
                return true;
            }

            error.value =
                res?.error ?? 'No fue posible registrar tu calificación.';
            return false;
        } catch {
            error.value =
                'No fue posible conectar con el servidor para registrar tu calificación.';
            return false;
        } finally {
            enviando.value = false;
        }
    };

    return {
        calificacionUsuario,
        enviando,
        enviado,
        error,
        cargarEstadoLocal,
        enviarCalificacion,
    };
}
