<!--
  @file CommentForm.vue
  @description Componente de comentarios de usuarios con listado ordenable de reseñas aprobadas
  y formulario con validación en cliente y aviso de moderación previa.
  @satisfies RF-07, RNF-04
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    AlertCircle,
    ArrowUpDown,
    CheckCircle2,
    MessageSquare,
    Send,
} from 'lucide-vue-next';
import PrimaryButton from '~/components/PrimaryButton.vue';
import { COMMENT_MAX_LENGTH, useComment } from '~/composables/useComment';
import type { ApiResponse, CommentPayload } from '~/types/api';
import type { Comentario } from '~/types/sanity';

export interface CommentFormProps {
    productoId: string;
    comentarios?: Comentario[];
    fetcher?: (payload: CommentPayload) => Promise<ApiResponse>;
}

const props = withDefaults(defineProps<CommentFormProps>(), {
    comentarios: () => [],
    fetcher: undefined,
});

const {
    texto,
    caracteresRestantes,
    enviando,
    enviado,
    error,
    enviarComentario,
} = useComment(props.productoId, { fetcher: props.fetcher });

const orden = ref<'recientes' | 'antiguos'>('recientes');

const comentariosAprobados = computed<Comentario[]>(() => {
    const filtrados = (props.comentarios ?? []).filter(
        (c) => !c.estado || c.estado === 'aprobado'
    );
    return [...filtrados].sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion ?? a._createdAt ?? 0).getTime();
        const fechaB = new Date(b.fechaCreacion ?? b._createdAt ?? 0).getTime();
        return orden.value === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
    });
});

const formatearFecha = (iso?: string): string => {
    if (!iso) return '';
    try {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(iso));
    } catch {
        return '';
    }
};

const manejarSubmit = async (): Promise<void> => {
    await enviarComentario();
};
</script>

<template>
    <section
        class="space-y-6"
        aria-labelledby="comments-heading"
        data-testid="comment-section"
    >
        <!-- Encabezado y selector de orden -->
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <MessageSquare class="w-5 h-5 text-brand-primario" aria-hidden="true" />
                <h2
                    id="comments-heading"
                    class="font-display font-bold text-xl text-brand-texto"
                >
                    Comentarios de clientes ({{ comentariosAprobados.length }})
                </h2>
            </div>

            <div
                v-if="comentariosAprobados.length > 1"
                class="flex items-center gap-2 font-mono text-xs"
            >
                <ArrowUpDown class="w-3.5 h-3.5 text-brand-texto" aria-hidden="true" />
                <label for="comment-sort" class="font-bold uppercase">Ordenar:</label>
                <select
                    id="comment-sort"
                    v-model="orden"
                    class="px-2.5 py-1 bg-white border-2 border-brand-texto font-mono text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                    data-testid="comment-sort-select"
                >
                    <option value="recientes">Más recientes primero</option>
                    <option value="antiguos">Más antiguos primero</option>
                </select>
            </div>
        </div>

        <!-- Lista de comentarios aprobados -->
        <ul
            v-if="comentariosAprobados.length > 0"
            class="space-y-3"
            data-testid="approved-comments-list"
        >
            <li
                v-for="com in comentariosAprobados"
                :key="com._id"
                class="p-4 bg-white border-2 border-brand-texto shadow-hard-sm space-y-1.5"
                data-testid="comment-item"
            >
                <p class="font-sans text-sm text-brand-texto leading-relaxed">
                    {{ com.texto }}
                </p>
                <span
                    v-if="com.fechaCreacion ?? com._createdAt"
                    class="block font-mono text-xs text-zinc-500"
                >
                    {{ formatearFecha(com.fechaCreacion ?? com._createdAt) }}
                </span>
            </li>
        </ul>
        <p
            v-else
            class="p-4 bg-white border-2 border-brand-texto font-sans text-sm text-zinc-600"
            data-testid="no-comments-message"
        >
            Aún no hay comentarios publicados para esta pieza. Sé la primera persona en dejar tu opinión.
        </p>

        <!-- Formulario para dejar comentario -->
        <form
            class="p-5 bg-white border-2 border-brand-texto shadow-hard space-y-4"
            novalidate
            data-testid="comment-form"
            @submit.prevent="manejarSubmit"
        >
            <div class="space-y-1">
                <label
                    for="comment-textarea"
                    class="block font-display font-bold text-base text-brand-texto"
                >
                    Deja un comentario sobre este producto
                </label>
                <p class="font-sans text-xs text-zinc-600">
                    Tu comentario será revisado por el taller antes de aparecer públicamente.
                </p>
            </div>

            <div class="space-y-1.5">
                <textarea
                    id="comment-textarea"
                    v-model="texto"
                    rows="3"
                    :maxlength="COMMENT_MAX_LENGTH"
                    placeholder="Escribe qué te pareció el diseño, acabado o materiales..."
                    class="w-full p-3 bg-brand-fondo/40 text-brand-texto font-sans text-sm border-2 border-brand-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                    data-testid="comment-textarea"
                />

                <div class="flex items-center justify-between font-mono text-xs text-zinc-600">
                    <span>Mínimo 3 caracteres</span>
                    <span data-testid="comment-char-counter">
                        {{ caracteresRestantes }} / {{ COMMENT_MAX_LENGTH }} caracteres restantes
                    </span>
                </div>
            </div>

            <div
                v-if="error"
                class="flex items-center gap-2 p-3 bg-rose-100 border-2 border-brand-texto text-rose-900 font-sans text-xs font-semibold"
                role="alert"
                data-testid="comment-error"
            >
                <AlertCircle class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{{ error }}</span>
            </div>

            <output
                v-if="enviado"
                class="flex items-center gap-2 p-3 bg-emerald-100 border-2 border-brand-texto text-emerald-950 font-sans text-xs font-semibold"
                data-testid="comment-success"
            >
                <CheckCircle2 class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                    Tu comentario fue enviado correctamente y quedará visible cuando sea aprobado por moderación.
                </span>
            </output>

            <div class="flex justify-end">
                <PrimaryButton
                    type="submit"
                    variant="primario"
                    :loading="enviando"
                    data-testid="comment-submit-button"
                >
                    <Send class="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Enviar comentario</span>
                </PrimaryButton>
            </div>
        </form>
    </section>
</template>
