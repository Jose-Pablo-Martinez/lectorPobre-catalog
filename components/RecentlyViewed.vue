<!--
  @file RecentlyViewed.vue
  @description Sección de productos "Vistos recientemente" alimentada por `useRecentlyViewed`
  (`localStorage` clave `lp:recentlyViewed`, máx. 6 elementos) con botón para limpiar el historial.
  Compatible con Dark Mode (RF-15, RNF-05).
  @satisfies RF-15, RF-22, RNF-05, RNF-07
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Clock, RotateCcw } from 'lucide-vue-next';
import ProductCard from '~/components/ProductCard.vue';
import { useRecentlyViewed } from '~/composables/useRecentlyViewed';
import type { Producto } from '~/types/sanity';

export interface RecentlyViewedProps {
    catalogoProductos: Producto[];
    excludeProductId?: string;
    umbralStockBajo?: number;
}

const props = withDefaults(defineProps<RecentlyViewedProps>(), {
    excludeProductId: undefined,
    umbralStockBajo: 5,
});

const { resolveRecentProducts, clearHistory } = useRecentlyViewed();

const vistosRecientes = computed<Producto[]>(() =>
    resolveRecentProducts(props.catalogoProductos, props.excludeProductId)
);
</script>

<template>
    <section
        v-if="vistosRecientes.length > 0"
        class="space-y-5 pt-8 border-t border-zinc-200 dark:border-slate-800 transition-colors"
        aria-labelledby="recently-viewed-heading"
        data-testid="recently-viewed-section"
    >
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-lg bg-brand-secundario text-white border-2 border-brand-texto dark:border-slate-500 shadow-hard-sm dark:shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
                    <Clock class="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                    <h2
                        id="recently-viewed-heading"
                        class="font-display font-extrabold text-xl sm:text-2xl text-brand-texto"
                    >
                        Vistos recientemente
                    </h2>
                    <p class="font-sans text-xs text-zinc-500 dark:text-slate-400">
                        Guardado únicamente en este navegador
                    </p>
                </div>
            </div>

            <button
                type="button"
                class="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-brand-acento dark:hover:bg-brand-acento text-brand-texto dark:text-slate-100 hover:text-zinc-950 dark:hover:text-zinc-950 font-display text-xs font-bold border-2 border-brand-texto dark:border-slate-600 shadow-hard-sm dark:shadow-[3px_3px_0px_rgba(0,0,0,0.6)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario cursor-pointer"
                data-testid="clear-history-button"
                @click="clearHistory"
            >
                <RotateCcw class="w-3.5 h-3.5" aria-hidden="true" />
                <span>Limpiar historial</span>
            </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <ProductCard
                v-for="item in vistosRecientes"
                :key="item._id"
                :producto="item"
                :umbral-stock-bajo="umbralStockBajo"
            />
        </div>
    </section>
</template>
