/**
 * @file useReviewStorage.ts
 * @description Gestión de identidad anónima de usuario y persistencia local de reseñas por producto.
 * Garantiza que cada dispositivo/usuario mantenga como máximo una reseña activa por producto.
 * @satisfies RF-06, RF-07, RNF-04
 */

import {
    readLocalStorageSafe,
    writeLocalStorageSafe,
} from '~/composables/useRecentlyViewed';
import type { StarRatingValue } from '~/types/api';

export const USER_ID_STORAGE_KEY = 'lp:user_id';
export const REVIEW_STORAGE_PREFIX = 'lp:review:';
export const RATED_STORAGE_PREFIX = 'lp:rated:';

export interface StoredUserReview {
    rating?: StarRatingValue | null;
    comment?: string;
    commentStatus?: 'pendiente' | 'aprobado' | 'rechazado';
    updatedAt?: string;
}

/**
 * Obtiene el ID anónimo del usuario persistido en localStorage o genera uno nuevo determinista/único.
 */
export function getOrCreateUserId(): string {
    const existing = readLocalStorageSafe(USER_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
        return existing.trim();
    }
    const generated = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    writeLocalStorageSafe(USER_ID_STORAGE_KEY, generated);
    return generated;
}

/**
 * Lee la reseña almacenada localmente para un producto dado, con soporte de migración
 * hacia atrás para calificaciones guardadas bajo `lp:rated:<productId>`.
 */
export function getStoredUserReview(productoId: string): StoredUserReview | null {
    if (!productoId) return null;

    const reviewKey = `${REVIEW_STORAGE_PREFIX}${productoId}`;
    const raw = readLocalStorageSafe(reviewKey);
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as StoredUserReview;
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch {
            // Ignorar JSON corrupto y continuar al fallback
        }
    }

    const legacyKey = `${RATED_STORAGE_PREFIX}${productoId}`;
    const legacyVal = readLocalStorageSafe(legacyKey);
    if (legacyVal) {
        const num = Number(legacyVal);
        if (Number.isInteger(num) && num >= 1 && num <= 5) {
            return { rating: num as StarRatingValue };
        }
    }

    return null;
}

/**
 * Persiste la reseña del usuario en localStorage tanto en el formato unificado como en la clave legacy.
 */
export function saveStoredUserReview(
    productoId: string,
    review: StoredUserReview
): void {
    if (!productoId) return;

    const reviewKey = `${REVIEW_STORAGE_PREFIX}${productoId}`;
    const dataToSave: StoredUserReview = {
        ...review,
        updatedAt: new Date().toISOString(),
    };
    writeLocalStorageSafe(reviewKey, JSON.stringify(dataToSave));

    if (review.rating && review.rating >= 1 && review.rating <= 5) {
        writeLocalStorageSafe(
            `${RATED_STORAGE_PREFIX}${productoId}`,
            String(review.rating)
        );
    }
}

