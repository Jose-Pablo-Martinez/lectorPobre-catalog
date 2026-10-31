/**
 * @file useCalificacion.ts
 * @description Composable en español para calificar productos con estrellas (Fase 5.6).
 * Envía hacia /api/calificar (mapeado hacia /api/rating en el backend serverless).
 * @satisfies RF-06, RNF-04
 */

import { useRating as baseUseRating, type UseRatingOptions } from './useRating';

export type UseCalificacionOptions = UseRatingOptions;
export const useCalificacion = baseUseRating;
