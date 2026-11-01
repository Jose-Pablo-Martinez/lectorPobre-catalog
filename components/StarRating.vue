<!--
  @file StarRating.vue
  @description Componente visual de solo lectura para el resumen de calificaciones por estrellas (1 a 5).
  Muestra promedio numérico, estrellas representativas, contador total de reseñas y desglose por nivel.
  Compatible con Dark Mode (RF-15, RNF-05).
  @satisfies RF-06, RF-15, RNF-05
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Star } from 'lucide-vue-next';
import type { ApiResponse, RatingPayload } from '~/types/api';

export interface StarRatingProps {
    productoId?: string;
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
    productoId: '',
    calificacionPromedio: null,
    ratingCount: 0,
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 0,
    rating4Count: 0,
    rating5Count: 0,
    readonly: true,
    mostrarDesglose: false,
    fetcher: undefined,
});

const promedioMostrado = computed<string>(() => {
    if (
        typeof props.calificacionPromedio === 'number' &&
        props.calificacionPromedio > 0
    ) {
        return props.calificacionPromedio.toFixed(1);
    }
    return 'Sin calificaciones';
});

const nivelesDesglose = computed(() => {
    const conteoTotal = Math.max(0, props.ratingCount ?? 0);
    const divisor = Math.max(1, conteoTotal);
    return [
        { nivel: 5, votos: Math.max(0, props.rating5Count ?? 0) },
        { nivel: 4, votos: Math.max(0, props.rating4Count ?? 0) },
        { nivel: 3, votos: Math.max(0, props.rating3Count ?? 0) },
        { nivel: 2, votos: Math.max(0, props.rating2Count ?? 0) },
        { nivel: 1, votos: Math.max(0, props.rating1Count ?? 0) },
    ].map((item) => ({
        ...item,
        porcentaje:
            conteoTotal > 0 ? Math.round((item.votos / divisor) * 100) : 0,
    }));
});

const estrellaActiva = (indice: number): boolean => {
    if (
        typeof props.calificacionPromedio === 'number' &&
        props.calificacionPromedio > 0
    ) {
        return indice <= Math.round(props.calificacionPromedio);
    }
    return false;
};
</script>

<template>
    <div
        class="p-5 bg-white dark:bg-slate-900/90 rounded-xl border border-zinc-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors"
        data-testid="star-rating"
    >
        <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Promedio actual y estrellas representativas -->
            <div class="flex items-center gap-2">
                <div
                    class="inline-flex items-center gap-1"
                    :aria-label="`Calificación promedio: ${promedioMostrado}`"
                >
                    <Star
                        v-for="n in 5"
                        :key="n"
                        class="w-5 h-5 stroke-[2]"
                        :class="
                            estrellaActiva(n)
                                ? 'fill-brand-acento text-amber-500 dark:text-amber-400'
                                : 'fill-transparent text-zinc-300 dark:text-slate-600'
                        "
                        aria-hidden="true"
                    />
                </div>

                <span
                    class="font-mono font-bold text-sm text-zinc-900 dark:text-slate-100"
                    data-testid="rating-average"
                >
                    {{ promedioMostrado }}
                </span>
            </div>

            <span
                v-if="(ratingCount ?? 0) > 0"
                class="font-sans text-xs font-medium text-zinc-500 dark:text-slate-400"
                data-testid="rating-count"
            >
                {{ ratingCount }} {{ ratingCount === 1 ? 'reseña' : 'reseñas' }}
            </span>
        </div>

        <!-- Desglose por nivel de estrella (RF-06) -->
        <div
            v-if="mostrarDesglose && (ratingCount ?? 0) > 0"
            class="pt-3 border-t border-zinc-100 dark:border-slate-800 space-y-1.5"
            data-testid="rating-breakdown"
        >
            <div
                v-for="fila in nivelesDesglose"
                :key="fila.nivel"
                class="flex items-center gap-2.5 font-sans text-xs"
            >
                <span
                    class="w-12 flex items-center gap-1 font-semibold text-zinc-700 dark:text-slate-300"
                >
                    <span>{{ fila.nivel }}</span>
                    <Star
                        class="w-3.5 h-3.5 fill-brand-acento text-amber-500 dark:text-amber-400"
                        aria-hidden="true"
                    />
                </span>
                <progress
                    :value="fila.porcentaje"
                    max="100"
                    class="flex-1 h-2 w-full appearance-none rounded-full bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 overflow-hidden [&::-webkit-progress-bar]:bg-zinc-100 dark:[&::-webkit-progress-bar]:bg-slate-800 [&::-webkit-progress-value]:bg-brand-acento [&::-moz-progress-bar]:bg-brand-acento"
                    :aria-label="`Porcentaje de calificaciones de ${fila.nivel} estrellas`"
                />
                <span class="w-10 text-right font-mono text-zinc-500 dark:text-slate-400">
                    {{ fila.votos }}
                </span>
            </div>
        </div>
    </div>
</template>
