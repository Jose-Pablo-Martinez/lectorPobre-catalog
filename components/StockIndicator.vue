<!--
  @file StockIndicator.vue
  @description Badge atómico táctil del taller que muestra el estado de disponibilidad de un producto
  ("En Stock", "En Stock · Pocas unidades" o "Agotado") empleando iconografía vectorial de Lucide.
  @satisfies RF-03, RF-14
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
    if (estado.value === 'cargando') return 'Verificando stock';
    if (estado.value === 'agotado') return 'Agotado';
    if (estado.value === 'bajo') {
        return props.mostrarUnidades
            ? `En Stock (${props.stock} disponibles)`
            : 'En Stock · Pocas unidades';
    }
    return props.mostrarUnidades ? `En Stock (${props.stock})` : 'En Stock';
});

const clasesBadge = computed<string>(() => {
    switch (estado.value) {
        case 'cargando':
            return 'bg-zinc-100 text-zinc-800';
        case 'agotado':
            return 'bg-rose-100 text-rose-950';
        case 'bajo':
            return 'bg-amber-100 text-amber-950';
        case 'disponible':
        default:
            return 'bg-emerald-100 text-emerald-950';
    }
});

const clasesDot = computed<string>(() => {
    switch (estado.value) {
        case 'agotado':
            return 'bg-rose-600';
        case 'bajo':
            return 'bg-amber-600';
        case 'disponible':
        default:
            return 'bg-emerald-600';
    }
});
</script>

<template>
    <output
        class="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-brand-texto font-mono text-xs font-bold uppercase tracking-wide select-none"
        :class="clasesBadge"
        :data-testid="`stock-${estado}`"
        :aria-label="`Estado de inventario: ${etiquetaTexto}`"
    >
        <Loader2
            v-if="estado === 'cargando'"
            class="w-3.5 h-3.5 animate-spin shrink-0"
            aria-hidden="true"
        />
        <template v-else>
            <span
                class="w-2 h-2 rounded-full border border-brand-texto shrink-0"
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
