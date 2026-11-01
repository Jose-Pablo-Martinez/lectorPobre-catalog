<!--
  @file StockIndicator.vue
  @description Badge atómico táctil del taller que muestra el estado de disponibilidad de un producto
  ("En Stock", "En Stock · Pocas unidades" o "Agotado") empleando iconografía vectorial de Lucide.
  Compatible con Dark Mode (RF-15, RNF-05).
  @satisfies RF-03, RF-14, RF-15, RNF-05
-->
<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-vue-next';

export interface StockIndicatorProps {
    stock: number;
    umbralStockBajo?: number;
    cargando?: boolean;
    mostrarUnidades?: boolean;
}

const props = withDefaults(defineProps<StockIndicatorProps>(), {
    umbralStockBajo: 5,
    cargando: false,
    mostrarUnidades: false,
});

const estado = computed<'cargando' | 'disponible' | 'bajo' | 'agotado'>(() => {
    if (props.cargando) return 'cargando';
    if (props.stock <= 0) return 'agotado';
    if (props.stock <= props.umbralStockBajo) return 'bajo';
    return 'disponible';
});

const etiquetaTexto = computed<string>(() => {
    if (estado.value === 'cargando') return 'Verificando disponibilidad';
    if (estado.value === 'agotado') return 'Agotado';
    if (estado.value === 'bajo') {
        return `Quedan solo ${props.stock}`;
    }
    return 'Disponibles';
});

const clasesBadge = computed<string>(() => {
    switch (estado.value) {
        case 'cargando':
            return 'bg-zinc-100 dark:bg-slate-800 text-zinc-800 dark:text-slate-200 border-zinc-300 dark:border-slate-700';
        case 'agotado':
            return 'bg-rose-100 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800';
        case 'bajo':
            return 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800';
        case 'disponible':
        default:
            return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
    }
});

const clasesDot = computed<string>(() => {
    switch (estado.value) {
        case 'agotado':
            return 'bg-rose-600 dark:bg-rose-400';
        case 'bajo':
            return 'bg-amber-600 dark:bg-amber-400';
        case 'disponible':
        default:
            return 'bg-emerald-600 dark:bg-emerald-400';
    }
});
</script>

<template>
    <output
        class="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 border-2 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wide select-none transition-colors"
        :class="clasesBadge"
        :data-testid="`stock-${estado}`"
        :aria-label="`Disponibilidad: ${etiquetaTexto}`"
    >
        <Loader2
            v-if="estado === 'cargando'"
            class="w-3.5 h-3.5 animate-spin shrink-0"
            aria-hidden="true"
        />
        <template v-else>
            <span
                class="w-2 h-2 rounded-full border border-current shrink-0"
                :class="clasesDot"
                aria-hidden="true"
            />
            <CheckCircle2
                v-if="estado === 'disponible'"
                class="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
            />
            <AlertTriangle
                v-else-if="estado === 'bajo'"
                class="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
            />
            <XCircle
                v-else
                class="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
            />
        </template>
        <span>{{ etiquetaTexto }}</span>
    </output>
</template>
