<!--
  @file ProductCard.vue
  @description Tarjeta molecular de producto con estética "Neo-Pop Limpio con Carácter de Taller",
  relación de aspecto 1:1, soporte de imagen de Sanity o placeholder vectorial limpio, indicador
  de stock táctil, calificación promedio con estrella en Amarillo Cempasúchil, precio en tipografía
  monoespaciada y botón táctil directo para agregar a la Lista de Pedido.
  @satisfies RF-01, RF-03, RF-06, RF-14, RF-16, RF-17
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Image as ImageIcon, ShoppingBag, Star } from 'lucide-vue-next';
import StockIndicator from '~/components/StockIndicator.vue';
import { obtenerClasesBotonPedido, useCart } from '~/composables/useCart';
import { useSanityImage } from '~/composables/useSanityImage';
import { formatearPrecioMXN } from '~/composables/useWhatsApp';
import type { Producto } from '~/types/sanity';

export interface ProductCardProps {
    producto: Producto;
    umbralStockBajo?: number;
}

const props = withDefaults(defineProps<ProductCardProps>(), {
    umbralStockBajo: 5,
});

const emit = defineEmits<{
    (e: 'agregar', producto: Producto): void;
}>();

const { urlFor } = useSanityImage();
const { addItem } = useCart();

const errorImagen = ref(false);
const recienAgregado = ref(false);

const imagenUrl = computed<string | null>(() => {
    if (errorImagen.value || !props.producto.imagenPrincipal) {
        return null;
    }
    return urlFor(props.producto.imagenPrincipal, { width: 600, height: 600 });
});

const detalleHref = computed<string>(() => {
    const slug = props.producto.slug?.current ?? props.producto._id;
    return `/product/${slug}`;
});

const agotado = computed<boolean>(() => props.producto.stock <= 0);

const precioFormateado = computed<string>(() =>
    formatearPrecioMXN(props.producto.precio, 'Cotizar')
);

const clasesBotonAgregar = computed<string>(() =>
    obtenerClasesBotonPedido(agotado.value, recienAgregado.value, 'hard-sm')
);

const manejarAgregar = (): void => {
    if (agotado.value) return;
    const exito = addItem(props.producto, 1);
    if (exito) {
        emit('agregar', props.producto);
        recienAgregado.value = true;
        setTimeout(() => {
            recienAgregado.value = false;
        }, 1200);
    }
};
</script>

<template>
    <article
        class="tarjeta-producto group bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
        data-testid="product-card"
    >
        <!-- Marco 1:1 de imagen con badges flotantes -->
        <div class="aspect-square bg-zinc-50 relative overflow-hidden border-b border-zinc-100">
            <a
                :href="detalleHref"
                class="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-secundario"
                :aria-label="`Ver detalles de ${producto.nombre}`"
            >
                <img
                    v-if="imagenUrl"
                    :src="imagenUrl"
                    :alt="producto.nombre"
                    loading="lazy"
                    width="600"
                    height="600"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    @error="errorImagen = true"
                />
                <div
                    v-else
                    class="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-zinc-400 bg-zinc-50"
                    data-testid="product-image-placeholder"
                >
                    <ImageIcon class="w-12 h-12 stroke-[1.5]" aria-hidden="true" />
                    <span class="font-sans text-xs font-medium tracking-wide text-center">
                        Artículo del catálogo 
                    </span>
                </div>
            </a>

            <!-- Badge de Stock flotante superior izquierdo -->
            <div class="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 z-10 max-w-[calc(100%-1rem)]">
                <StockIndicator
                    :stock="producto.stock"
                    :umbral-stock-bajo="umbralStockBajo"
                />
            </div>

            <!-- Badge de Calificación flotante: en móvil se ubica abajo a la derecha de la imagen para evitar cualquier solapamiento con el stock; en desktop arriba a la derecha -->
            <div
                v-if="typeof producto.calificacionPromedio === 'number' && producto.calificacionPromedio > 0"
                class="absolute bottom-2 right-2 sm:bottom-auto sm:top-2.5 sm:right-2.5 z-10 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-white/95 border border-brand-texto shadow-hard-sm font-mono text-xs font-bold text-brand-texto"
                :aria-label="`Calificación promedio ${producto.calificacionPromedio} de 5`"
            >
                <Star class="w-3.5 h-3.5 fill-brand-acento text-brand-texto shrink-0" aria-hidden="true" />
                <span>{{ producto.calificacionPromedio.toFixed(1) }}</span>
            </div>
        </div>

        <!-- Cuerpo de la tarjeta -->
        <div class="flex flex-col flex-1 justify-between p-3.5 sm:p-4 gap-3">
            <div class="space-y-1.5">
                <span
                    v-if="producto.categoria?.nombre"
                    class="inline-block font-mono text-[11px] font-bold uppercase tracking-wider text-brand-secundario"
                >
                    {{ producto.categoria.nombre }}
                </span>

                <h3 class="font-display font-bold text-sm sm:text-base text-brand-texto group-hover:text-brand-primario transition-colors line-clamp-2">
                    <a
                        :href="detalleHref"
                        class="focus-visible:outline-none focus-visible:underline"
                    >
                        {{ producto.nombre }}
                    </a>
                </h3>

                <p
                    v-if="producto.descripcion"
                    class="font-sans text-xs text-zinc-600 line-clamp-2"
                >
                    {{ producto.descripcion }}
                </p>
            </div>

            <div class="pt-2.5 border-t border-zinc-100 space-y-2.5">
                <div class="flex items-baseline justify-between gap-2">
                    <span class="font-mono text-xs uppercase text-zinc-500 font-medium">Precio</span>
                    <span
                        class="font-mono font-bold text-sm sm:text-base text-brand-texto"
                        data-testid="product-price"
                    >
                        {{ precioFormateado }}
                    </span>
                </div>

                <button
                    type="button"
                    :disabled="agotado"
                    :aria-disabled="agotado"
                    :class="[
                        'min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm font-bold font-display transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario',
                        clasesBotonAgregar,
                    ]"
                    data-testid="add-to-order-button"
                    @click="manejarAgregar"
                >
                    <template v-if="agotado">
                        <span>Agotado</span>
                    </template>
                    <template v-else-if="recienAgregado">
                        <Check class="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Agregado a mi carrito</span>
                    </template>
                    <template v-else>
                        <ShoppingBag class="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Agregar al carrito</span>
                    </template>
                </button>
            </div>
        </div>
    </article>
</template>
