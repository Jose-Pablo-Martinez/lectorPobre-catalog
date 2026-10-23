/**
 * @file useCart.ts
 * @description Composable de estado reactivo para la "Lista de Pedido" (carrito de cotización
 * estilo Steam sin pasarela de pago). Persiste los productos seleccionados en `localStorage`
 * y sincroniza el estado del panel lateral (`CartDrawer.vue`) en toda la aplicación.
 * @satisfies RF-14, RF-17
 */

import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import {
    readLocalStorageSafe,
    writeLocalStorageSafe,
} from '~/composables/useRecentlyViewed';
import type { Producto, SanityImage } from '~/types/sanity';

export const CART_STORAGE_KEY = 'lectorpobre-carrito';

export interface CartItem {
    id: string;
    nombre: string;
    slug: string;
    categoria: string;
    precio: number;
    cantidad: number;
    stockMax: number;
    imagenPrincipal?: SanityImage;
}

const cartItems = ref<CartItem[]>([]);
const cartDrawerOpen = ref(false);
let hydrated = false;

/**
 * Calcula las clases visuales táctiles del botón "Agregar a mi lista de pedido" según su estado,
 * estandarizando la respuesta mecánica con el botón de WhatsApp y evitando ternarios anidados.
 */
export function obtenerClasesBotonPedido(
    agotado: boolean,
    recienAgregado: boolean,
    sombra: 'hard' | 'hard-sm' = 'hard-sm'
): string {
    const shadowClass = sombra === 'hard' ? 'shadow-hard' : 'shadow-hard-sm';
    if (agotado) {
        return 'bg-zinc-200 text-zinc-500 border-2 border-zinc-400 cursor-not-allowed';
    }
    if (recienAgregado) {
        return `bg-emerald-400 text-brand-texto border-2 border-brand-texto ${shadowClass}`;
    }
    return `bg-brand-primario text-white border-2 border-brand-texto ${shadowClass} hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`;
}

function isValidCartItem(entry: unknown): entry is CartItem {
    if (!entry || typeof entry !== 'object') return false;
    const candidate = entry as CartItem;
    return (
        typeof candidate.id === 'string' &&
        typeof candidate.nombre === 'string' &&
        typeof candidate.cantidad === 'number' &&
        candidate.cantidad > 0
    );
}

function readCartStorage(): CartItem[] {
    const raw = readLocalStorageSafe(CART_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isValidCartItem);
    } catch {
        return [];
    }
}

function writeCartStorage(items: CartItem[]): void {
    writeLocalStorageSafe(CART_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Composable reactivo para administrar la Lista de Pedido y el cajón lateral de cotización.
 */
export function useCart() {
    const hydrateCart = (): void => {
        if (globalThis.window !== undefined) {
            cartItems.value = readCartStorage();
            hydrated = true;
        }
    };

    if (getCurrentInstance()) {
        onMounted(() => {
            if (!hydrated) {
                hydrateCart();
            }
        });
    } else if (!hydrated) {
        hydrateCart();
    }

    const addItem = (producto: Producto, cantidad = 1): boolean => {
        if (!producto || producto.stock <= 0 || cantidad <= 0) {
            return false;
        }

        const existingIndex = cartItems.value.findIndex(
            (i) => i.id === producto._id
        );
        const maxStock = Math.max(1, producto.stock);

        if (existingIndex >= 0) {
            const current = cartItems.value[existingIndex];
            if (current) {
                const nextQty = Math.min(maxStock, current.cantidad + cantidad);
                cartItems.value[existingIndex] = {
                    ...current,
                    cantidad: nextQty,
                    stockMax: maxStock,
                    precio:
                        typeof producto.precio === 'number'
                            ? producto.precio
                            : current.precio,
                };
            }
        } else {
            cartItems.value.push({
                id: producto._id,
                nombre: producto.nombre,
                slug: producto.slug?.current ?? producto._id,
                categoria: producto.categoria?.nombre ?? 'General',
                precio:
                    typeof producto.precio === 'number' ? producto.precio : 0,
                cantidad: Math.min(maxStock, cantidad),
                stockMax: maxStock,
                imagenPrincipal: producto.imagenPrincipal,
            });
        }

        writeCartStorage(cartItems.value);
        return true;
    };

    const removeItem = (productId: string): void => {
        cartItems.value = cartItems.value.filter(
            (item) => item.id !== productId
        );
        writeCartStorage(cartItems.value);
    };

    const updateQuantity = (productId: string, nuevaCantidad: number): void => {
        if (nuevaCantidad <= 0) {
            removeItem(productId);
            return;
        }

        const idx = cartItems.value.findIndex((item) => item.id === productId);
        const target = idx >= 0 ? cartItems.value[idx] : undefined;
        if (target) {
            const boundedQty = Math.min(
                target.stockMax,
                Math.floor(nuevaCantidad)
            );
            cartItems.value[idx] = {
                ...target,
                cantidad: boundedQty,
            };
            writeCartStorage(cartItems.value);
        }
    };

    const clearCart = (): void => {
        cartItems.value = [];
        writeCartStorage([]);
    };

    const openCart = (): void => {
        cartDrawerOpen.value = true;
    };

    const closeCart = (): void => {
        cartDrawerOpen.value = false;
    };

    const toggleCart = (): void => {
        cartDrawerOpen.value = !cartDrawerOpen.value;
    };

    const totalItems = computed(() =>
        cartItems.value.reduce((acc, item) => acc + item.cantidad, 0)
    );

    const totalAmount = computed(() =>
        cartItems.value.reduce(
            (acc, item) => acc + item.precio * item.cantidad,
            0
        )
    );

    return {
        items: cartItems,
        isOpen: cartDrawerOpen,
        totalItems,
        totalAmount,
        hydrateCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
    };
}
