/**
 * @file api.ts
 * @description Contratos canónicos de la API serverless (espejo de api/handlers/types.go y api/constants/errorcodes.go).
 * @satisfies RF-06 (Calificaciones), RF-07 (Comentarios), RF-18 (Búsqueda), RNF-04 (Mensajes de error genéricos)
 */

/**
 * Códigos de error estructurados retornados por los handlers de Go.
 * Espeja exactamente los valores definidos en api/constants/errorcodes.go.
 * @satisfies RNF-04
 */
export const ErrorCode = {
  InvalidPayload: 'INVALID_PAYLOAD',
  RateLimit: 'RATE_LIMIT_EXCEEDED',
  Unauthorized: 'UNAUTHORIZED',
  InternalError: 'INTERNAL_ERROR',
  RatingOutOfRange: 'RATING_OUT_OF_RANGE',
  InvalidQuery: 'INVALID_QUERY',
  InvalidSignature: 'INVALID_SIGNATURE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Payload para publicar un comentario en un producto (POST /api/comment).
 * @satisfies RF-07
 */
export interface CommentPayload {
  /** ID del documento de producto en Sanity.io. */
  productId: string;
  /** Contenido del comentario (máximo 1000 caracteres). */
  text: string;
}

/**
 * Payload para registrar una calificación por estrellas (POST /api/rating).
 * @satisfies RF-06
 */
export interface RatingPayload {
  /** ID del documento de producto en Sanity.io. */
  productId: string;
  /** Valor entero entre 1 y 5 estrellas. */
  value: 1 | 2 | 3 | 4 | 5;
}

/**
 * Respuesta estándar de los endpoints serverless de escritura.
 * Nunca expone detalles internos del servidor en producción.
 * @satisfies RNF-04
 */
export interface ApiResponse<T = void> {
  /** Indica si la operación fue exitosa. */
  ok: boolean;
  /** Datos opcionales devueltos en caso de éxito. */
  data?: T;
  /** Mensaje de error amigable para el usuario (solo presente cuando ok === false). */
  error?: string;
  /** Código de error estructurado para manejo programático. */
  code?: ErrorCode;
}
