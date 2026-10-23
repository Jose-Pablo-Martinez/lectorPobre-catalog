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
                <MessageSquare class="w-5 h-5 text-brand-secundario" aria-hidden="true" />
                <h2
                    id="comments-heading"
                    class="font-display font-bold text-xl text-zinc-900"
                >
                    Comentarios de clientes ({{ comentariosAprobados.length }})
                </h2>
            </div>

            <div
                v-if="comentariosAprobados.length > 1"
                class="flex items-center gap-2 font-sans text-xs"
            >
                <ArrowUpDown class="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                <label for="comment-sort" class="font-semibold text-zinc-600">Ordenar:</label>
                <select
                    id="comment-sort"
                    v-model="orden"
                    class="px-3 py-1.5 bg-white rounded-lg border border-zinc-300 font-sans text-xs font-medium text-zinc-700 shadow-sm focus:border-brand-secundario focus:ring-2 focus:ring-brand-secundario/20 focus:outline-none"
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
                class="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5"
                data-testid="comment-item"
            >
                <p class="font-sans text-sm text-zinc-800 leading-relaxed">
                    {{ com.texto }}
                </p>
                <span
                    v-if="com.fechaCreacion ?? com._createdAt"
                    class="block font-sans text-xs text-zinc-500"
                >
                    {{ formatearFecha(com.fechaCreacion ?? com._createdAt) }}
                </span>
            </li>
        </ul>
        <p
            v-else
            class="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm font-sans text-sm text-zinc-600"
            data-testid="no-comments-message"
        >
            Aún no hay comentarios publicados para esta pieza. Sé la primera persona en dejar tu opinión.
        </p>

        <!-- Formulario para dejar comentario -->
        <form
            class="p-5 sm:p-6 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-4"
            novalidate
            data-testid="comment-form"
            @submit.prevent="manejarSubmit"
        >
            <div class="space-y-1">
                <label
                    for="comment-textarea"
                    class="block font-display font-bold text-base text-zinc-900"
                >
                    Deja un comentario sobre este producto
                </label>
                <p class="font-sans text-xs text-zinc-600">
                    Tu comentario será revisado para asegurarnos de que cumpla con los lineamientos de comunicación efectiva y respeto.
                </p>
            </div>

            <div class="space-y-1.5">
                <textarea
                    id="comment-textarea"
                    v-model="texto"
                    rows="3"
                    :maxlength="COMMENT_MAX_LENGTH"
                    placeholder="Escribe qué te pareció el artículo, tu experiencia de compra, etc..."
                    class="w-full p-3 bg-zinc-50 text-zinc-900 rounded-lg font-sans text-sm border border-zinc-300 focus:bg-white focus:border-brand-secundario focus:ring-2 focus:ring-brand-secundario/20 focus:outline-none transition-all"
                    data-testid="comment-textarea"
                />

                <div class="flex items-center justify-between font-sans text-xs text-zinc-500">
                    <span>Mínimo 3 caracteres (letras, números, simbolos)</span>
                    <span data-testid="comment-char-counter">
                        {{ caracteresRestantes }} / {{ COMMENT_MAX_LENGTH }} caracteres restantes
                    </span>
                </div>
            </div>

            <div
                v-if="error"
                class="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 font-sans text-xs font-semibold"
                role="alert"
                data-testid="comment-error"
            >
                <AlertCircle class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{{ error }}</span>
            </div>

            <output
                v-if="enviado"
                class="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 font-sans text-xs font-semibold"
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
