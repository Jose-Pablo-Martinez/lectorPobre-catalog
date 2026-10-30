/**
 * @file useComentario.ts
 * @description Composable en español para validar y enviar comentarios (Fase 5.6).
 * Envía hacia /api/comentar (mapeado hacia /api/comment en el backend serverless).
 * @satisfies RF-07, RNF-04
 */

export {
    COMMENT_MAX_LENGTH,
    COMMENT_MIN_LENGTH,
    type UseCommentOptions,
    useComment,
    useComment as useComentario,
} from './useComment';

