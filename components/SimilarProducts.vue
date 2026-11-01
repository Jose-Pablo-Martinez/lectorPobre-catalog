<!--
  @file SimilarProducts.vue
  @description Sección de "Productos similares" en la página de detalle.
  Consume exclusivamente el contrato versionado `RecommendationOutput` (`/data/recommendations.json`),
  excluye siempre el producto actual y desprioriza los productos agotados cruzando con el stock.
  Compatible con Dark Mode (RF-15, RNF-05).
  @satisfies RF-03, RF-15, RF-21, RNF-05, RNF-08
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Layers } from 'lucide-vue-next';
import ProductCard from '~/components/ProductCard.vue';
import type { RecommendationOutput } from '~/scripts/recommendations/types';
import type { Producto } from '~/types/sanity';

export interface SimilarProductsProps {
    productoActualId: string;
    catalogoProductos: Producto[];
    recommendationsData?: RecommendationOutput | null;
    umbralStockBajo?: number;
    maxItems?: number;
}

const props = withDefaults(defineProps<SimilarProductsProps>(), {
    recommendationsData: null,
    umbralStockBajo: 5,
    maxItems: 4,
});

const fetchedRecommendations = ref<RecommendationOutput | null>(null);

onMounted(async () => {
    if (props.recommendationsData) return;
    if (typeof globalThis.fetch !== 'function') return;
    // Evitar peticiones HTTP a puerto local en entorno de pruebas unitarias happy-dom sin servidor
    if (globalThis.location?.href === 'http://localhost:3000/') return;
    try {
        const res = await globalThis.fetch('/data/recommendations.json');
        if (res.ok) {
            fetchedRecommendations.value = (await res.json()) as RecommendationOutput;
        }
    } catch {
        // Respaldo silencioso usando productos de la misma categoría en memoria
    }
});

const contratoActivo = computed<RecommendationOutput | null>(
    () => props.recommendationsData ?? fetchedRecommendations.value
);

function mapearCatalogoActivo(
    catalogo: Producto[],
    productoActualId: string
): Map<string, Producto> {
    const mapa = new Map<string, Producto>();
    for (const p of catalogo) {
        if (p.activo !== false && p._id !== productoActualId) {
            mapa.set(p._id, p);
        }
    }
    return mapa;
}

function resolverCandidatosRespaldo(
    catalogo: Producto[],
    catalogoMapa: Map<string, Producto>,
    productoActualId: string
): Producto[] {
    const productoActual = catalogo.find((p) => p._id === productoActualId);
    const catActual = productoActual?.categoria?.nombre?.toLowerCase() ?? '';
    return Array.from(catalogoMapa.values()).sort((a, b) => {
        const aMismaCat = a.categoria?.nombre?.toLowerCase() === catActual ? 1 : 0;
        const bMismaCat = b.categoria?.nombre?.toLowerCase() === catActual ? 1 : 0;
        return bMismaCat - aMismaCat;
    });
}

/**
 * Ordena y filtra los productos similares:
 * 1. Nunca incluye `productoActualId`.
 * 2. Preserva el orden de puntaje del contrato `RecommendationOutput`.
 * 3. Desprioriza los productos agotados (`stock <= 0`) colocándolos al final.
 */
const productosSimilares = computed<Producto[]>(() => {
    const listaCatalogo = props.catalogoProductos ?? [];
    const catalogoMapa = mapearCatalogoActivo(listaCatalogo, props.productoActualId);
    const vecinosContrato =
        contratoActivo.value?.items?.[props.productoActualId]?.similar ?? [];

    let candidatos: Producto[];

    if (vecinosContrato.length > 0) {
        candidatos = vecinosContrato
            .filter((vecino) => vecino.id !== props.productoActualId)
            .map((vecino) => catalogoMapa.get(vecino.id))
            .filter((item): item is Producto => Boolean(item));
    } else {
        candidatos = resolverCandidatosRespaldo(
            listaCatalogo,
            catalogoMapa,
            props.productoActualId
        );
    }

    // Despriorizar agotados (RF-03): primero con stock > 0, luego agotados
    const conStock = candidatos.filter((p) => p.stock > 0);
    const agotados = candidatos.filter((p) => p.stock <= 0);

    return [...conStock, ...agotados].slice(0, props.maxItems);
});
</script>

<template>
    <section
        v-if="productosSimilares.length > 0"
        class="space-y-5 pt-8 border-t border-zinc-200 dark:border-slate-800 transition-colors"
        aria-labelledby="similar-products-heading"
        data-testid="similar-products-section"
    >
        <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-lg bg-brand-acento text-zinc-950 border-2 border-zinc-950 shadow-hard-sm dark:shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
                <Layers class="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
                <h2
                    id="similar-products-heading"
                    class="font-display font-extrabold text-xl sm:text-2xl text-brand-texto"
                >
                    Piezas similares recomendadas por el Periquito
                </h2>
                <p class="font-sans text-xs text-zinc-500 dark:text-slate-400">
                    Recomendaciones por temática, técnica artesanal y categoría
                </p>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <ProductCard
                v-for="item in productosSimilares"
                :key="item._id"
                :producto="item"
                :umbral-stock-bajo="umbralStockBajo"
            />
        </div>
    </section>
</template>
