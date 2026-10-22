<!--
  @file StarRating.vue
  @description Sistema de calificación por estrellas (1 a 5) con visualización de promedio,
  contador de reseñas, desglose opcional por nivel de estrella y selector interactivo
  conectado a `useRating`. Utiliza exclusivamente íconos vectoriales de `lucide-vue-next`.
  @satisfies RF-06
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { CheckCircle2, Star } from 'lucide-vue-next';
import { useRating } from '~/composables/useRating';
import type { ApiResponse, RatingPayload } from '~/types/api';

export interface StarRatingProps {
    productoId: string;
    calificacionPromedio?: number | null;
    ratingCount?: number;
    rating1Count?: number;
    rating2Count?: number;
    rating3Count?: number;
    rating4Count?: number;
    rating5Count?: number;
    readonly?: boolean;
    mostrarDesglose?: boolean;
    fetcher?: (payload: RatingPayload) => Promise<ApiResponse>;
}

const props = withDefaults(defineProps<StarRatingProps>(), {
    calificacionPromedio: null,
    ratingCount: 0,
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 0,
    rating4Count: 0,
    rating5Count: 0,
    readonly: false,
    mostrarDesglose: false,
    fetcher: undefined,
});

const {
    calificacionUsuario,
    enviando,
    enviado,
    error,
    enviarCalificacion,
} = useRating(props.productoId, { fetcher: props.fetcher });

const hoverEstrella = ref<number>(0);

const promedioMostrado = computed<string>(() => {
    if (typeof props.calificacionPromedio === 'number' && props.calificacionPromedio > 0) {
        return props.calificacionPromedio.toFixed(1);
    }
    return 'Sin calificaciones';
});

const nivelesDesglose = computed(() => {
    const conteoTotal = props.ratingCount ?? 0;
    const divisor = Math.max(1, conteoTotal);
    return [
        { nivel: 5, votos: props.rating5Count ?? 0 },
        { nivel: 4, votos: props.rating4Count ?? 0 },
        { nivel: 3, votos: props.rating3Count ?? 0 },
        { nivel: 2, votos: props.rating2Count ?? 0 },
        { nivel: 1, votos: props.rating1Count ?? 0 },
    ].map((item) => ({
        ...item,
        porcentaje: conteoTotal > 0 ? Math.round((item.votos / divisor) * 100) : 0,
    }));
});

const estrellaActiva = (indice: number): boolean => {
    if (hoverEstrella.value > 0) {
        return indice <= hoverEstrella.value;
    }
    if (calificacionUsuario.value !== null) {
        return indice <= calificacionUsuario.value;
    }
    if (typeof props.calificacionPromedio === 'number' && props.calificacionPromedio > 0) {
        return indice <= Math.round(props.calificacionPromedio);
    }
    return false;
};

const manejarSeleccion = async (valor: number): Promise<void> => {
    if (props.readonly || enviado.value || enviando.value) return;
    await enviarCalificacion(valor);
};
</script>

<template>
    <div
        class="p-4 bg-white border-2 border-brand-texto shadow-hard-sm space-y-3"
        data-testid="star-rating"
    >
        <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Promedio actual -->
            <div class="flex items-center gap-2">
                <fieldset
                    class="inline-flex items-center gap-1 m-0 p-0 border-0 min-w-0"
                    :aria-label="`Calificación promedio: ${promedioMostrado}`"
                >
                    <template v-for="n in 5" :key="n">
                        <button
                            v-if="!readonly"
                            type="button"
                            :disabled="enviado || enviando"
                            class="p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario disabled:cursor-default transition-transform hover:scale-110"
                            :aria-label="`Calificar con ${n} de 5 estrellas`"
                            :data-testid="`star-button-${n}`"
                            @mouseenter="hoverEstrella = n"
                            @mouseleave="hoverEstrella = 0"
                            @click="manejarSeleccion(n)"
                        >
                            <Star
                                class="w-5 h-5 stroke-[2]"
                                :class="
                                    estrellaActiva(n)
                                        ? 'fill-brand-acento text-brand-texto'
                                        : 'fill-transparent text-zinc-400'
                                "
                                aria-hidden="true"
                            />
                        </button>
                        <Star
                            v-else
                            class="w-5 h-5 stroke-[2]"
                            :class="
                                estrellaActiva(n)
                                    ? 'fill-brand-acento text-brand-texto'
                                    : 'fill-transparent text-zinc-400'
                            "
                            aria-hidden="true"
                        />
                    </template>
                </fieldset>

                <span
                    class="font-mono font-bold text-sm text-brand-texto"
                    data-testid="rating-average"
                >
                    {{ promedioMostrado }}
                </span>
            </div>

            <span
                v-if="(ratingCount ?? 0) > 0"
                class="font-mono text-xs text-zinc-600"
                data-testid="rating-count"
            >
                {{ ratingCount }} {{ ratingCount === 1 ? 'reseña' : 'reseñas' }}
            </span>
        </div>

        <!-- Desglose por nivel de estrella (RF-06) -->
        <div
            v-if="mostrarDesglose && (ratingCount ?? 0) > 0"
            class="pt-2 border-t border-zinc-200 space-y-1.5"
            data-testid="rating-breakdown"
        >
            <div
                v-for="fila in nivelesDesglose"
                :key="fila.nivel"
                class="flex items-center gap-2 font-mono text-xs"
            >
                <span class="w-16 flex items-center gap-1 font-bold text-brand-texto">
                    <span>{{ fila.nivel }}</span>
                    <Star class="w-3 h-3 fill-brand-acento text-brand-texto" aria-hidden="true" />
                </span>
                <progress
                    :value="fila.porcentaje"
                    max="100"
                    class="flex-1 h-2.5 w-full appearance-none bg-zinc-100 border border-brand-texto overflow-hidden [&::-webkit-progress-bar]:bg-zinc-100 [&::-webkit-progress-value]:bg-brand-acento [&::-moz-progress-bar]:bg-brand-acento"
                    :aria-label="`Porcentaje de calificaciones de ${fila.nivel} estrellas`"
                />
                <span class="w-10 text-right text-zinc-600">{{ fila.votos }}</span>
            </div>
        </div>

        <!-- Mensajes de confirmación o error -->
        <output
            v-if="enviado"
            class="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-emerald-800"
            data-testid="rating-success"
        >
            <CheckCircle2 class="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Gracias por calificar con {{ calificacionUsuario }} de 5 estrellas.</span>
        </output>

        <p
            v-if="error"
            class="font-sans text-xs font-semibold text-rose-700"
            data-testid="rating-error"
            role="alert"
        >
            {{ error }}
        </p>
    </div>
</template>
