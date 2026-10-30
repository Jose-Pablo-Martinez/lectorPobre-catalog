/**
 * @file useCalificacion.ts
 * @description Composable en español para calificar productos con estrellas (Fase 5.6).
 * Envía hacia /api/calificar (mapeado hacia /api/rating en el backend serverless).
 * @satisfies RF-06, RNF-04
 */

export {
    type UseRatingOptions,
    useRating,
    useRating as useCalificacion,
} from './useRating';

