<!--
  @file CartDrawer.vue
  @description Organismo de Lista de Pedido (carrito de cotización estilo Steam sin pasarela de pago).
  Se presenta como panel lateral slide-over en escritorio y bottom-sheet en móvil, permitiendo
  ajustar cantidades, revisar el total estimado y enviar el desglose directo a WhatsApp.
  Compatible con Dark Mode (RF-15, RNF-05).
  @satisfies RF-14, RF-15, RF-17, RNF-05
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import {
    Image as ImageIcon,
    Minus,
    Plus,
    ShoppingBag,
    Trash2,
    X,
} from 'lucide-vue-next';
import WhatsAppButton from '~/components/WhatsAppButton.vue';
import { useCart } from '~/composables/useCart';
import { useSanityImage } from '~/composables/useSanityImage';
import {
    construirUrlWhatsAppCarrito,
    formatearPrecioMXN,
} from '~/composables/useWhatsApp';
import type { SanityImage } from '~/types/sanity';

export interface CartDrawerProps {
    numeroWhatsApp?: string;
}

const props = withDefaults(defineProps<CartDrawerProps>(), {
    numeroWhatsApp: '',
});

const {
    items,
    isOpen,
    totalItems,
    totalAmount,
    updateQuantity,
    removeItem,
    clearCart,
    closeCart,
} = useCart();

const { urlFor } = useSanityImage();

const urlWhatsAppPedido = computed<string>(() =>
    construirUrlWhatsAppCarrito(
        props.numeroWhatsApp,
        items.value.map((item) => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio,
        })),
        totalAmount.value
    )
);

const manejarKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape' && isOpen.value) {
        closeCart();
    }
};

const obtenerMiniatura = (imagen?: SanityImage): string | null => {
    if (!imagen) return null;
    return urlFor(imagen, { width: 160, height: 160 });
};

onMounted(() => {
    if (typeof globalThis.addEventListener === 'function') {
        globalThis.addEventListener('keydown', manejarKeydown);
    }
});

onBeforeUnmount(() => {
    if (typeof globalThis.removeEventListener === 'function') {
        globalThis.removeEventListener('keydown', manejarKeydown);
    }
});
</script>

<template>
    <dialog
        v-if="isOpen"
        open
        class="fixed inset-0 z-50 flex justify-end items-end md:items-stretch w-full h-full max-w-none max-h-none m-0 p-0 bg-transparent border-0"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        data-testid="cart-drawer"
    >
        <!-- Fondo semitransparente -->
        <div
            class="fixed inset-0 bg-zinc-900/50 backdrop-blur-[1px] transition-opacity"
            aria-hidden="true"
            @click="closeCart"
            @keydown="manejarKeydown"
        />

        <!-- Panel del cotizador -->
        <aside
            class="relative z-10 w-full max-h-[88vh] md:max-h-none md:max-w-md bg-zinc-50 dark:bg-slate-900 text-zinc-900 dark:text-slate-100 rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-zinc-200 dark:border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden transition-colors"
        >
            <!-- Encabezado -->
            <header class="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-b border-zinc-200 dark:border-slate-800">
                <div class="flex items-center gap-2.5">
                    <div class="p-2 rounded-lg bg-brand-secundario/10 dark:bg-sky-950/40 text-brand-secundario dark:text-sky-300">
                        <ShoppingBag class="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h2
                            id="cart-drawer-title"
                            class="font-display font-bold text-lg text-zinc-900 dark:text-slate-100 leading-tight"
                        >
                            Mi carrito de compras
                        </h2>
                        <p class="font-sans text-xs text-zinc-500 dark:text-slate-400">
                            {{ totalItems }} {{ totalItems === 1 ? 'artículo seleccionado' : 'artículos seleccionados' }}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    class="p-2 rounded-full bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 dark:hover:bg-slate-700 text-zinc-700 dark:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario/40 cursor-pointer"
                    aria-label="Cerrar lista de pedido"
                    data-testid="close-cart-button"
                    @click="closeCart"
                >
                    <X class="w-5 h-5" aria-hidden="true" />
                </button>
            </header>

            <!-- Cuerpo con lista de productos -->
            <div class="flex-1 overflow-y-auto p-5 space-y-3">
                <div
                    v-if="items.length === 0"
                    class="py-12 px-4 text-center bg-white dark:bg-slate-850 rounded-xl border border-zinc-200 dark:border-slate-800 shadow-sm space-y-3"
                    data-testid="cart-empty-state"
                >
                    <ShoppingBag class="w-12 h-12 mx-auto text-zinc-400 dark:text-slate-500 stroke-[1.5]" aria-hidden="true" />
                    <p class="font-display font-bold text-base text-zinc-900 dark:text-slate-100">
                        Tu carrito de compras está vacío
                    </p>
                    <p class="font-sans text-sm text-zinc-600 dark:text-slate-300 max-w-xs mx-auto">
                        Agrega llaveros, pines o stickers del catálogo para armar tu cotización directa por WhatsApp.
                    </p>
                </div>

                <ul v-else class="space-y-3" aria-label="Productos en carrito de compras">
                    <li
                        v-for="item in items"
                        :key="item.id"
                        class="flex gap-3 p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-zinc-200 dark:border-slate-700/80 shadow-sm transition-colors"
                        data-testid="cart-item"
                    >
                        <!-- Miniatura 1:1 -->
                        <div class="w-16 h-16 shrink-0 aspect-square bg-zinc-50 dark:bg-slate-900 rounded-lg border border-zinc-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                            <img
                                v-if="obtenerMiniatura(item.imagenPrincipal)"
                                :src="obtenerMiniatura(item.imagenPrincipal) ?? ''"
                                :alt="item.nombre"
                                class="w-full h-full object-cover"
                            />
                            <ImageIcon
                                v-else
                                class="w-6 h-6 text-zinc-400 dark:text-slate-500"
                                aria-hidden="true"
                            />
                        </div>

                        <!-- Información y controles de cantidad -->
                        <div class="flex-1 min-w-0 flex flex-col justify-between gap-2">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <span class="block text-[11px] uppercase tracking-wider font-semibold text-brand-secundario dark:text-sky-300">
                                        {{ item.categoria }}
                                    </span>
                                    <a
                                        :href="`/product/${item.slug}`"
                                        class="font-display font-bold text-sm text-zinc-900 dark:text-slate-100 hover:text-brand-primario line-clamp-1"
                                        @click="closeCart"
                                    >
                                        {{ item.nombre }}
                                    </a>
                                </div>

                                <button
                                    type="button"
                                    class="p-1 text-zinc-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario/40 rounded cursor-pointer"
                                    :aria-label="`Quitar ${item.nombre} de la lista`"
                                    data-testid="remove-cart-item"
                                    @click="removeItem(item.id)"
                                >
                                    <Trash2 class="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>

                            <div class="flex items-center justify-between gap-2 pt-1">
                                <!-- Selector de cantidad -->
                                <div class="inline-flex items-center rounded-lg border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900 overflow-hidden">
                                    <button
                                        type="button"
                                        class="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 transition-colors focus-visible:outline-none cursor-pointer"
                                        :aria-label="`Disminuir cantidad de ${item.nombre}`"
                                        data-testid="decrease-qty"
                                        @click="updateQuantity(item.id, item.cantidad - 1)"
                                    >
                                        <Minus class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    <span
                                        class="px-2.5 py-0.5 font-mono text-xs font-bold text-zinc-900 dark:text-slate-100 border-x border-zinc-200 dark:border-slate-700"
                                        data-testid="item-qty"
                                    >
                                        {{ item.cantidad }}
                                    </span>
                                    <button
                                        type="button"
                                        :disabled="item.cantidad >= item.stockMax"
                                        class="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none cursor-pointer"
                                        :aria-label="`Aumentar cantidad de ${item.nombre}`"
                                        data-testid="increase-qty"
                                        @click="updateQuantity(item.id, item.cantidad + 1)"
                                    >
                                        <Plus class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                </div>

                                <span class="font-mono font-bold text-sm text-zinc-900 dark:text-slate-100">
                                    {{ formatearPrecioMXN(item.precio * item.cantidad) }}
                                </span>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <!-- Pie con resumen y CTA de WhatsApp -->
            <footer
                v-if="items.length > 0"
                class="p-5 bg-white dark:bg-slate-900 border-t border-zinc-200 dark:border-slate-800 space-y-4"
            >
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-sans text-sm text-zinc-600 dark:text-slate-300 font-medium">
                            Total estimado del pedido
                        </span>
                        <span
                            class="font-mono font-extrabold text-xl text-zinc-900 dark:text-slate-100"
                            data-testid="cart-total"
                        >
                            {{ formatearPrecioMXN(totalAmount) }}
                        </span>
                    </div>
                    <p class="font-sans text-xs text-zinc-500 dark:text-slate-400">
                        Sin cobros automáticos. Tu lista se enviará por WhatsApp para confirmar existencias y entrega con la artista.
                    </p>
                </div>

                <div class="space-y-2">
                    <WhatsAppButton
                        :href="urlWhatsAppPedido"
                        label="Comprar por WhatsApp"
                        :full-width="true"
                    />

                    <button
                        type="button"
                        class="w-full py-2 rounded-lg font-sans text-xs font-semibold text-zinc-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        data-testid="clear-cart-button"
                        @click="clearCart"
                    >
                        Vaciar carrito de compras
                    </button>
                </div>
            </footer>
        </aside>
    </dialog>
</template>
