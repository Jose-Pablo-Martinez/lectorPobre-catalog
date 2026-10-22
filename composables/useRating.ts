/**
 * @file useRating.ts
 * @description Composable para consultar y enviar calificaciones con estrellas (1 a 5)
 * hacia la función serverless `/api/rating`. Incluye validación de rango en cliente
 * y control local en `localStorage` para prevenir calificaciones duplicadas por dispositivo.
 * @satisfies RF-06, RNF-04
 */

import { getCurrentInstance, onMounted, ref } from 'vue';
import {
    readLocalStorageSafe,
    writeLocalStorageSafe,
} from '~/composables/useRecentlyViewed';
import type { ApiResponse, RatingPayload } from '~/types/api';

const RATING_STORAGE_PREFIX = 'lp:rated:';

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

    const storageKey = `${RATING_STORAGE_PREFIX}${productoId}`;

    const cargarEstadoLocal = (): void => {
        if (!productoId) return;
        const guardado = readLocalStorageSafe(storageKey);
        if (guardado) {
            const parsed = Number(guardado);
            if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
                calificacionUsuario.value = parsed;
                enviado.value = true;
            }
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
     *
     * @param valor Estrellas seleccionadas (1–5).
     * @returns `true` si la calificación se registró correctamente.
     */
    const enviarCalificacion = async (valor: number): Promise<boolean> => {
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

        if (enviado.value) {
            error.value = 'Ya calificaste este producto desde este navegador.';
            return false;
        }

        enviando.value = true;
        try {
            const runFetch = options.fetcher ?? defaultFetcher;
            const res = await runFetch({
                productId: productoId,
                value: valor as RatingPayload['value'],
            });

            if (res?.ok) {
                calificacionUsuario.value = valor;
                enviado.value = true;
                writeLocalStorageSafe(storageKey, String(valor));
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
