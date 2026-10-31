<!--
  @file CommentForm.vue
  @description Componente unificado para reseñas de clientes: selector interactivo de estrellas (1-5),
  comentario opcional con moderación previa, dirty-checking por dispositivo, filtrado por estrellas
  y límite inicial de 4 comentarios con paginación/scroll.
  @satisfies RF-06, RF-07, RNF-04
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
    AlertCircle,
    ArrowUpDown,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Send,
    Star,
} from 'lucide-vue-next';
import PrimaryButton from '~/components/PrimaryButton.vue';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from '~/composables/useComment';
import {
    getOrCreateUserId,
    getStoredUserReview,
    saveStoredUserReview,
    type StoredUserReview,
} from '~/composables/useReviewStorage';
import type {
    ApiResponse,
    CommentPayload,
    RatingPayload,
    StarRatingValue,
} from '~/types/api';
import type { Comentario } from '~/types/sanity';

export interface CommentFormProps {
    productoId: string;
    comentarios?: Comentario[];
    ratingFetcher?: (payload: RatingPayload) => Promise<ApiResponse>;
    commentFetcher?: (payload: CommentPayload) => Promise<ApiResponse>;
    fetcher?: (payload: any) => Promise<ApiResponse>;
}

const props = withDefaults(defineProps<CommentFormProps>(), {
    comentarios: () => [],
    ratingFetcher: undefined,
    commentFetcher: undefined,
    fetcher: undefined,
});

const emit = defineEmits<{
    (e: 'rating-updated', value: number): void;
}>();

// Estado del formulario interactivo
const estrellaSeleccionada = ref<number>(0);
const hoverEstrella = ref<number>(0);
const textoComentario = ref<string>('');
const savedRating = ref<number | null>(null);
const savedComment = ref<string>('');
const enviando = ref<boolean>(false);

// Retroalimentación independiente
const feedbackEstrellas = ref<string | null>(null);
const feedbackComentario = ref<string | null>(null);
const errorGeneral = ref<string | null>(null);

// Filtrado, orden y paginación de comentarios
const orden = ref<'recientes' | 'antiguos'>('recientes');
const filtroEstrella = ref<number | null>(null);
const mostrarTodos = ref<boolean>(false);

const caracteresRestantes = computed(
    () => COMMENT_MAX_LENGTH - textoComentario.value.length
);

const cargarEstadoLocal = (): void => {
    if (!props.productoId) return;
    const stored = getStoredUserReview(props.productoId);
    if (stored?.rating && stored.rating >= 1 && stored.rating <= 5) {
        savedRating.value = stored.rating;
        estrellaSeleccionada.value = stored.rating;
    }
    if (stored?.comment) {
        savedComment.value = stored.comment;
        textoComentario.value = stored.comment;
    }
};

onMounted(() => {
    cargarEstadoLocal();
});

// Comentarios aprobados globales
const comentariosAprobados = computed<Comentario[]>(() => {
    return (props.comentarios ?? []).filter(
        (c) => !c.estado || c.estado === 'aprobado'
    );
});

// Conteo por estrella para los botones de filtro
const conteoPorNivel = computed(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const c of comentariosAprobados.value) {
        if (typeof c.calificacion === 'number' && c.calificacion >= 1 && c.calificacion <= 5) {
            counts[c.calificacion] = (counts[c.calificacion] ?? 0) + 1;
        }
    }
    return counts;
});

// Comentarios ordenados y filtrados
const comentariosFiltrados = computed<Comentario[]>(() => {
    let lista = comentariosAprobados.value;
    if (filtroEstrella.value !== null) {
        lista = lista.filter((c) => c.calificacion === filtroEstrella.value);
    }
    return [...lista].sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion ?? a._createdAt ?? 0).getTime();
        const fechaB = new Date(b.fechaCreacion ?? b._createdAt ?? 0).getTime();
        return orden.value === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
    });
});

const comentariosVisibles = computed<Comentario[]>(() => {
    if (mostrarTodos.value) {
        return comentariosFiltrados.value;
    }
    return comentariosFiltrados.value.slice(0, 4);
});

// Dirty checking y estado dinámico del botón
const tieneEstrellas = computed(
    () => estrellaSeleccionada.value >= 1 && estrellaSeleccionada.value <= 5
);

const comentarioLimpio = computed(() => textoComentario.value.trim());

const comentarioVacio = computed(() => comentarioLimpio.value.length === 0);

const cambiaronEstrellas = computed(
    () =>
        tieneEstrellas.value &&
        estrellaSeleccionada.value !== savedRating.value
);

const cambioComentario = computed(
    () => comentarioLimpio.value !== savedComment.value.trim()
);

const sinCambios = computed(
    () =>
        savedRating.value !== null &&
        !cambiaronEstrellas.value &&
        !cambioComentario.value
);

const textoBoton = computed<string>(() => {
    if (!tieneEstrellas.value) {
        return 'Selecciona una calificación';
    }
    if (sinCambios.value) {
        return 'Reseña enviada';
    }
    if (comentarioVacio.value) {
        return savedRating.value !== null
            ? 'Actualizar calificación'
            : 'Enviar calificación';
    }
    if (savedRating.value !== null || savedComment.value) {
        if (cambiaronEstrellas.value && cambioComentario.value) {
            return 'Actualizar reseña';
        }
        if (cambiaronEstrellas.value) {
            return 'Actualizar calificación';
        }
        return 'Actualizar comentario';
    }
    return 'Enviar reseña';
});

const botonDeshabilitado = computed<boolean>(() => {
    if (enviando.value || !tieneEstrellas.value || sinCambios.value) {
        return true;
    }
    return !cambiaronEstrellas.value && !cambioComentario.value;
});

const estrellaFormActiva = (indice: number): boolean => {
    if (hoverEstrella.value > 0) {
        return indice <= hoverEstrella.value;
    }
    return indice <= estrellaSeleccionada.value;
};

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

const ejecutarFetchRating = async (
    payload: RatingPayload
): Promise<ApiResponse> => {
    if (props.ratingFetcher) return await props.ratingFetcher(payload);
    if (props.fetcher) return await props.fetcher(payload);
    return await $fetch<ApiResponse>('/api/rating', {
        method: 'POST',
        body: payload,
    });
};

const ejecutarFetchComment = async (
    payload: CommentPayload
): Promise<ApiResponse> => {
    if (props.commentFetcher) return await props.commentFetcher(payload);
    if (props.fetcher) return await props.fetcher(payload);
    return await $fetch<ApiResponse>('/api/comment', {
        method: 'POST',
        body: payload,
    });
};

const validarEnvio = (): string | null => {
    if (!tieneEstrellas.value) {
        return 'Debes seleccionar una calificación de 1 a 5 estrellas.';
    }
    if (!comentarioVacio.value) {
        if (comentarioLimpio.value.length < COMMENT_MIN_LENGTH) {
            return `El comentario debe tener al menos ${COMMENT_MIN_LENGTH} caracteres.`;
        }
        if (comentarioLimpio.value.length > COMMENT_MAX_LENGTH) {
            return `El comentario no puede superar los ${COMMENT_MAX_LENGTH} caracteres.`;
        }
    }
    return null;
};

const manejarSubmit = async (): Promise<void> => {
    errorGeneral.value = null;
    feedbackEstrellas.value = null;
    feedbackComentario.value = null;

    const errorValidacion = validarEnvio();
    if (errorValidacion) {
        errorGeneral.value = errorValidacion;
        return;
    }

    enviando.value = true;
    const userId = getOrCreateUserId();
    const reviewData: StoredUserReview = getStoredUserReview(props.productoId) ?? {};

    try {
        const debeEnviarRating =
            cambiaronEstrellas.value || savedRating.value === null;
        const debeEnviarComentario =
            !comentarioVacio.value &&
            (cambioComentario.value || !savedComment.value);

        let ratingOk = true;
        let commentOk = true;

        if (debeEnviarRating) {
            const resRating = await ejecutarFetchRating({
                productId: props.productoId,
                value: estrellaSeleccionada.value as StarRatingValue,
                previousValue: savedRating.value
                    ? (savedRating.value as StarRatingValue)
                    : undefined,
                userId,
            });
            if (resRating?.ok) {
                const eraModificacion = savedRating.value !== null;
                savedRating.value = estrellaSeleccionada.value;
                reviewData.rating = estrellaSeleccionada.value as StarRatingValue;
                feedbackEstrellas.value = eraModificacion
                    ? `Calificación actualizada a ${estrellaSeleccionada.value} estrellas.`
                    : `Tu calificación de ${estrellaSeleccionada.value} estrellas se registró correctamente.`;
                emit('rating-updated', estrellaSeleccionada.value);
            } else {
                ratingOk = false;
                errorGeneral.value =
                    resRating?.error ?? 'Error al registrar tu calificación.';
            }
        }

        if (debeEnviarComentario && ratingOk) {
            const resComment = await ejecutarFetchComment({
                productId: props.productoId,
                text: comentarioLimpio.value,
                rating: estrellaSeleccionada.value as StarRatingValue,
                userId,
            });
            if (resComment?.ok) {
                const eraModificacion = Boolean(savedComment.value);
                savedComment.value = comentarioLimpio.value;
                reviewData.comment = comentarioLimpio.value;
                reviewData.commentStatus = 'pendiente';
                feedbackComentario.value = eraModificacion
                    ? 'Comentario actualizado y enviado a revisión.'
                    : 'Tu comentario fue enviado correctamente y quedará visible cuando sea aprobado por moderación.';
            } else {
                commentOk = false;
                errorGeneral.value =
                    resComment?.error ?? 'Error al enviar tu comentario.';
            }
        }

        if (ratingOk || commentOk) {
            saveStoredUserReview(props.productoId, reviewData);
        }
    } catch {
        errorGeneral.value =
            'No fue posible conectar con el servidor. Inténtalo más tarde.';
    } finally {
        enviando.value = false;
    }
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
                <MessageSquare
                    class="w-5 h-5 text-brand-secundario"
                    aria-hidden="true"
                />
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
                <ArrowUpDown
                    class="w-3.5 h-3.5 text-zinc-500"
                    aria-hidden="true"
                />
                <label for="comment-sort" class="font-semibold text-zinc-600">
                    Ordenar:
                </label>
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

        <!-- Filtros por nivel de estrellas -->
        <div
            v-if="comentariosAprobados.length > 0"
            class="flex flex-wrap items-center gap-2"
            data-testid="rating-filter-bar"
            aria-label="Filtrar comentarios por calificación"
        >
            <button
                type="button"
                class="px-3 py-1 rounded-full font-sans text-xs font-semibold transition-colors"
                :class="
                    filtroEstrella === null
                        ? 'bg-brand-secundario text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                "
                data-testid="filter-star-all"
                @click="filtroEstrella = null"
            >
                Todos ({{ comentariosAprobados.length }})
            </button>
            <button
                v-for="estrella in [5, 4, 3, 2, 1]"
                :key="estrella"
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-sans text-xs font-semibold transition-colors"
                :class="
                    filtroEstrella === estrella
                        ? 'bg-brand-secundario text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                "
                :data-testid="`filter-star-${estrella}`"
                @click="filtroEstrella = estrella"
            >
                <span>{{ estrella }}</span>
                <Star class="w-3 h-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                <span>({{ conteoPorNivel[estrella] ?? 0 }})</span>
            </button>
        </div>

        <!-- Lista de comentarios aprobados con scroll/paginación si hay más de 4 -->
        <div
            v-if="comentariosVisibles.length > 0"
            class="space-y-3"
            :class="{ 'max-h-[500px] overflow-y-auto pr-1': mostrarTodos && comentariosFiltrados.length > 4 }"
            data-testid="approved-comments-list"
        >
            <article
                v-for="com in comentariosVisibles"
                :key="com._id"
                class="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5"
                data-testid="comment-item"
            >
                <!-- Calificación de la reseña si está disponible -->
                <div
                    v-if="com.calificacion"
                    class="inline-flex items-center gap-0.5 mb-1"
                    :aria-label="`${com.calificacion} de 5 estrellas`"
                    data-testid="comment-stars"
                >
                    <Star
                        v-for="s in 5"
                        :key="s"
                        class="w-3.5 h-3.5"
                        :class="
                            s <= com.calificacion
                                ? 'fill-brand-acento text-amber-500'
                                : 'fill-transparent text-zinc-300'
                        "
                        aria-hidden="true"
                    />
                </div>

                <p class="font-sans text-sm text-zinc-800 leading-relaxed">
                    {{ com.texto }}
                </p>
                <span
                    v-if="com.fechaCreacion ?? com._createdAt"
                    class="block font-sans text-xs text-zinc-500"
                >
                    {{ formatearFecha(com.fechaCreacion ?? com._createdAt) }}
                </span>
            </article>
        </div>

        <!-- Mensaje cuando no hay comentarios para el filtro o en general -->
        <p
            v-else
            class="p-4 bg-white rounded-xl border border-zinc-200 shadow-sm font-sans text-sm text-zinc-600"
            data-testid="no-comments-message"
        >
            <template v-if="filtroEstrella !== null">
                No hay comentarios con {{ filtroEstrella }} estrellas aún.
            </template>
            <template v-else>
                Aún no hay comentarios publicados para esta pieza. Sé la primera persona en dejar tu opinión.
            </template>
        </p>

        <!-- Botón expandir/contraer comentarios (Máximo 4 iniciales) -->
        <div
            v-if="comentariosFiltrados.length > 4"
            class="flex justify-center"
        >
            <button
                type="button"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 font-sans text-xs font-semibold text-zinc-700 transition-colors"
                data-testid="toggle-comments-button"
                @click="mostrarTodos = !mostrarTodos"
            >
                <template v-if="!mostrarTodos">
                    <span>Ver todos los comentarios ({{ comentariosFiltrados.length }})</span>
                    <ChevronDown class="w-4 h-4" aria-hidden="true" />
                </template>
                <template v-else>
                    <span>Ver menos</span>
                    <ChevronUp class="w-4 h-4" aria-hidden="true" />
                </template>
            </button>
        </div>

        <!-- Formulario unificado para dejar calificación y comentario -->
        <form
            class="p-5 sm:p-6 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-4"
            novalidate
            data-testid="comment-form"
            @submit.prevent="manejarSubmit"
        >
            <div class="space-y-1">
                <h3 class="font-display font-bold text-base text-zinc-900">
                    Tu opinión sobre este producto
                </h3>
                <p class="font-sans text-xs text-zinc-600">
                    Selecciona tu calificación con estrellas (obligatorio). Puedes incluir un comentario si deseas compartir detalles de tu experiencia.
                </p>
            </div>

            <!-- Selector interactivo de estrellas (1 a 5) -->
            <div class="space-y-1.5" data-testid="interactive-star-selector">
                <label class="block font-sans text-xs font-semibold text-zinc-700">
                    Calificación general:
                </label>
                <fieldset
                    class="inline-flex items-center gap-1.5 m-0 p-0 border-0"
                    aria-label="Selecciona una calificación de 1 a 5 estrellas"
                >
                    <button
                        v-for="n in 5"
                        :key="n"
                        type="button"
                        class="p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario/40 transition-transform hover:scale-110"
                        :aria-label="`Calificar con ${n} de 5 estrellas`"
                        :data-testid="`star-select-button-${n}`"
                        @mouseenter="hoverEstrella = n"
                        @mouseleave="hoverEstrella = 0"
                        @click="estrellaSeleccionada = n"
                    >
                        <Star
                            class="w-6 h-6 stroke-[2]"
                            :class="
                                estrellaFormActiva(n)
                                    ? 'fill-brand-acento text-brand-texto'
                                    : 'fill-transparent text-zinc-300'
                            "
                            aria-hidden="true"
                        />
                    </button>
                </fieldset>
                <span
                    v-if="estrellaSeleccionada > 0"
                    class="block font-sans text-xs font-medium text-zinc-500"
                    data-testid="selected-star-label"
                >
                    {{ estrellaSeleccionada }} de 5 estrellas
                </span>
            </div>

            <!-- Campo de texto para comentario (opcional) -->
            <div class="space-y-1.5">
                <label
                    for="comment-textarea"
                    class="block font-sans text-xs font-semibold text-zinc-700"
                >
                    Comentario (opcional):
                </label>
                <textarea
                    id="comment-textarea"
                    v-model="textoComentario"
                    rows="3"
                    :maxlength="COMMENT_MAX_LENGTH"
                    placeholder="Escribe qué te pareció el artículo, tu experiencia de compra, etc..."
                    class="w-full p-3 bg-zinc-50 text-zinc-900 rounded-lg font-sans text-sm border border-zinc-300 focus:bg-white focus:border-brand-secundario focus:ring-2 focus:ring-brand-secundario/20 focus:outline-none transition-all"
                    data-testid="comment-textarea"
                />

                <div class="flex items-center justify-between font-sans text-xs text-zinc-500">
                    <span>Mínimo 3 caracteres si incluyes comentario</span>
                    <span data-testid="comment-char-counter">
                        {{ caracteresRestantes }} / {{ COMMENT_MAX_LENGTH }} caracteres restantes
                    </span>
                </div>
            </div>

            <!-- Alerta de error -->
            <div
                v-if="errorGeneral"
                class="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 font-sans text-xs font-semibold"
                role="alert"
                data-testid="comment-error"
            >
                <AlertCircle class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{{ errorGeneral }}</span>
            </div>

            <!-- Retroalimentación individual para estrellas -->
            <output
                v-if="feedbackEstrellas"
                class="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 font-sans text-xs font-semibold"
                data-testid="rating-success-message"
            >
                <CheckCircle2 class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{{ feedbackEstrellas }}</span>
            </output>

            <!-- Retroalimentación individual para comentario -->
            <output
                v-if="feedbackComentario"
                class="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 font-sans text-xs font-semibold"
                data-testid="comment-success"
            >
                <CheckCircle2 class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{{ feedbackComentario }}</span>
            </output>

            <div class="flex justify-end">
                <PrimaryButton
                    type="submit"
                    variant="primario"
                    :loading="enviando"
                    :disabled="botonDeshabilitado"
                    data-testid="comment-submit-button"
                >
                    <Send class="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{{ textoBoton }}</span>
                </PrimaryButton>
            </div>
        </form>
    </section>
</template>
