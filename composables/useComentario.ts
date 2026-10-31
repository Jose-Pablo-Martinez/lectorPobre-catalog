/**
 * @file useComentario.ts
 * @description Composable en español para validar y enviar comentarios (Fase 5.6).
 * Envía hacia /api/comentar (mapeado hacia /api/comment en el backend serverless).
 * @satisfies RF-07, RNF-04
 */

import { useComment as baseUseComment, type UseCommentOptions } from './useComment';

export type UseComentarioOptions = UseCommentOptions;
export const useComentario = baseUseComment;
