<!--
  @file CartDrawer.vue
  @description Organismo de Lista de Pedido (carrito de cotización estilo Steam sin pasarela de pago).
  Se presenta como panel lateral slide-over en escritorio y bottom-sheet en móvil, permitiendo
  ajustar cantidades, revisar el total estimado y enviar el desglose directo a WhatsApp.
  @satisfies RF-14, RF-17, RNF-05
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
    numeroWhatsApp: '5219991234567',
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
            class="fixed inset-0 bg-black/60 transition-opacity"
            aria-hidden="true"
            @click="closeCart"
        />

        <!-- Panel del cotizador -->
        <aside
            class="relative z-10 w-full max-h-[88vh] md:max-h-none md:max-w-md bg-brand-fondo text-brand-texto border-t-2 md:border-t-0 md:border-l-2 border-brand-texto shadow-hard-lg flex flex-col justify-between overflow-hidden"
        >
            <!-- Encabezado -->
            <header class="flex items-center justify-between px-5 py-4 bg-white border-b-2 border-brand-texto">
                <div class="flex items-center gap-2.5">
                    <div class="p-2 bg-brand-acento border-2 border-brand-texto">
                        <ShoppingBag class="w-5 h-5 text-brand-texto" aria-hidden="true" />
                    </div>
                    <div>
                        <h2
                            id="cart-drawer-title"
                            class="font-display font-extrabold text-lg leading-tight"
                        >
                            Mi Lista de Pedido
                        </h2>
                        <p class="font-mono text-xs text-zinc-600">
                            {{ totalItems }} {{ totalItems === 1 ? 'pieza seleccionada' : 'piezas seleccionadas' }}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    class="p-2 bg-white hover:bg-zinc-100 border-2 border-brand-texto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                    aria-label="Cerrar lista de pedido"
                    data-testid="close-cart-button"
                    @click="closeCart"
                >
                    <X class="w-5 h-5" aria-hidden="true" />
                </button>
            </header>

            <!-- Cuerpo con lista de productos -->
            <div class="flex-1 overflow-y-auto p-5 space-y-4">
                <div
                    v-if="items.length === 0"
                    class="py-12 px-4 text-center bg-white border-2 border-brand-texto shadow-hard-sm space-y-3"
                    data-testid="cart-empty-state"
                >
                    <ShoppingBag class="w-12 h-12 mx-auto text-zinc-400 stroke-[1.5]" aria-hidden="true" />
                    <p class="font-display font-bold text-base text-brand-texto">
                        Tu lista de pedido está vacía
                    </p>
                    <p class="font-sans text-sm text-zinc-600 max-w-xs mx-auto">
                        Agrega llaveros, pines o stickers del catálogo para armar tu cotización directa por WhatsApp.
                    </p>
                </div>

                <ul v-else class="space-y-3" aria-label="Productos en tu lista de pedido">
                    <li
                        v-for="item in items"
                        :key="item.id"
                        class="flex gap-3 p-3 bg-white border-2 border-brand-texto shadow-hard-sm"
                        data-testid="cart-item"
                    >
                        <!-- Miniatura 1:1 -->
                        <div class="w-16 h-16 shrink-0 aspect-square bg-zinc-100 border-2 border-brand-texto flex items-center justify-center overflow-hidden">
                            <img
                                v-if="obtenerMiniatura(item.imagenPrincipal)"
                                :src="obtenerMiniatura(item.imagenPrincipal) ?? ''"
                                :alt="item.nombre"
                                class="w-full h-full object-cover"
                            />
                            <ImageIcon
                                v-else
                                class="w-6 h-6 text-zinc-400"
                                aria-hidden="true"
                            />
                        </div>

                        <!-- Información y controles de cantidad -->
                        <div class="flex-1 min-w-0 flex flex-col justify-between gap-2">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <span class="block font-mono text-[11px] uppercase font-bold text-brand-secundario">
                                        {{ item.categoria }}
                                    </span>
                                    <a
                                        :href="`/product/${item.slug}`"
                                        class="font-display font-bold text-sm text-brand-texto hover:text-brand-primario line-clamp-1"
                                        @click="closeCart"
                                    >
                                        {{ item.nombre }}
                                    </a>
                                </div>

                                <button
                                    type="button"
                                    class="p-1 text-zinc-500 hover:text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                                    :aria-label="`Quitar ${item.nombre} de la lista`"
                                    data-testid="remove-cart-item"
                                    @click="removeItem(item.id)"
                                >
                                    <Trash2 class="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>

                            <div class="flex items-center justify-between gap-2 pt-1">
                                <!-- Selector de cantidad -->
                                <div class="inline-flex items-center border-2 border-brand-texto bg-zinc-50">
                                    <button
                                        type="button"
                                        class="px-2 py-1 hover:bg-zinc-200 transition-colors focus-visible:outline-none"
                                        :aria-label="`Disminuir cantidad de ${item.nombre}`"
                                        data-testid="decrease-qty"
                                        @click="updateQuantity(item.id, item.cantidad - 1)"
                                    >
                                        <Minus class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    <span
                                        class="px-2.5 py-0.5 font-mono text-xs font-bold border-x-2 border-brand-texto"
                                        data-testid="item-qty"
                                    >
                                        {{ item.cantidad }}
                                    </span>
                                    <button
                                        type="button"
                                        :disabled="item.cantidad >= item.stockMax"
                                        class="px-2 py-1 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none"
                                        :aria-label="`Aumentar cantidad de ${item.nombre}`"
                                        data-testid="increase-qty"
                                        @click="updateQuantity(item.id, item.cantidad + 1)"
                                    >
                                        <Plus class="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                </div>

                                <span class="font-mono font-bold text-sm text-brand-texto">
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
                class="p-5 bg-white border-t-2 border-brand-texto space-y-4"
            >
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-sans text-sm text-zinc-600 font-medium">
                            Total estimado del pedido
                        </span>
                        <span
                            class="font-mono font-extrabold text-xl text-brand-texto"
                            data-testid="cart-total"
                        >
                            {{ formatearPrecioMXN(totalAmount) }}
                        </span>
                    </div>
                    <p class="font-sans text-xs text-zinc-500">
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
                        class="w-full py-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-rose-700 border-2 border-transparent hover:border-brand-texto transition-colors"
                        data-testid="clear-cart-button"
                        @click="clearCart"
                    >
                        Vaciar lista de pedido
                    </button>
                </div>
            </footer>
        </aside>
    </dialog>
</template>
