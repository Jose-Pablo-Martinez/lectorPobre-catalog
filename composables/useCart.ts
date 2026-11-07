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

const SLUG_OR_ID_RE = /^[\w-]{1,128}$/;
const MAX_CART_QTY = 99;
const MAX_CART_PRICE = 1_000_000;

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
    const shadowClass =
        sombra === 'hard'
            ? 'shadow-hard dark:shadow-[3px_3px_0px_rgba(0,0,0,0.6)]'
            : 'shadow-hard-sm dark:shadow-[2px_2px_0px_rgba(0,0,0,0.6)]';
    if (agotado) {
        return 'bg-zinc-200 dark:bg-slate-800 text-zinc-500 dark:text-slate-500 border-2 border-zinc-400 dark:border-slate-700 cursor-not-allowed';
    }
    if (recienAgregado) {
        return `bg-emerald-400 text-zinc-950 border-2 border-zinc-950 ${shadowClass}`;
    }
    return `bg-brand-primario text-white border-2 border-brand-texto dark:border-slate-400 ${shadowClass} hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`;
}

export function isValidCartItem(entry: unknown): entry is CartItem {
    if (!entry || typeof entry !== 'object') return false;
    const candidate = entry as CartItem;
    return (
        typeof candidate.id === 'string' &&
        SLUG_OR_ID_RE.test(candidate.id) &&
        typeof candidate.nombre === 'string' &&
        candidate.nombre.trim().length > 0 &&
        candidate.nombre.length <= 200 &&
        typeof candidate.slug === 'string' &&
        SLUG_OR_ID_RE.test(candidate.slug) &&
        typeof candidate.categoria === 'string' &&
        candidate.categoria.length <= 100 &&
        Number.isInteger(candidate.cantidad) &&
        candidate.cantidad > 0 &&
        candidate.cantidad <= MAX_CART_QTY &&
        Number.isFinite(candidate.precio) &&
        candidate.precio >= 0 &&
        candidate.precio <= MAX_CART_PRICE &&
        Number.isInteger(candidate.stockMax) &&
        candidate.stockMax >= 1
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
        const maxStock = Math.min(
            MAX_CART_QTY,
            Math.max(1, Math.floor(producto.stock))
        );
        const safeQty = Math.max(1, Math.floor(cantidad));
        const safePrice =
            typeof producto.precio === 'number' &&
                Number.isFinite(producto.precio) &&
                producto.precio >= 0
                ? Math.min(MAX_CART_PRICE, producto.precio)
                : 0;

        if (existingIndex >= 0) {
            const current = cartItems.value[existingIndex];
            if (current) {
                const nextQty = Math.min(maxStock, current.cantidad + safeQty);
                cartItems.value[existingIndex] = {
                    ...current,
                    cantidad: nextQty,
                    stockMax: maxStock,
                    precio:
                        typeof producto.precio === 'number'
                            ? safePrice
                            : current.precio,
                };
            }
        } else {
            cartItems.value.push({
                id: producto._id,
                nombre: producto.nombre,
                slug: producto.slug?.current ?? producto._id,
                categoria: producto.categoria?.nombre ?? 'General',
                precio: safePrice,
                cantidad: Math.min(maxStock, safeQty),
                stockMax: maxStock,
                imagenPrincipal: producto.imagenPrincipal,
            });
        }

        writeCartStorage(cartItems.value);
        return true;
    };

    /**
     * Reconcilia los artículos almacenados en el carrito contra el catálogo vigente (V-08).
     * Sustituye `precio`, `nombre`, `slug`, `categoria` y `stockMax` por los valores reales del catálogo
     * y descarta productos eliminados, inactivos o agotados, impidiendo manipulación desde `localStorage`.
     */
    const reconcileWithCatalog = (catalogo: Producto[]): void => {
        if (!Array.isArray(catalogo) || catalogo.length === 0 || cartItems.value.length === 0) {
            return;
        }

        const catalogMap = new Map<string, Producto>();
        for (const prod of catalogo) {
            if (prod?._id && prod.activo !== false && prod.stock > 0) {
                catalogMap.set(prod._id, prod);
            }
        }

        const reconciled: CartItem[] = [];
        for (const item of cartItems.value) {
            const prod = catalogMap.get(item.id);
            if (!prod) continue;

            const maxStock = Math.min(
                MAX_CART_QTY,
                Math.max(1, Math.floor(prod.stock))
            );
            const safePrice =
                typeof prod.precio === 'number' &&
                    Number.isFinite(prod.precio) &&
                    prod.precio >= 0
                    ? Math.min(MAX_CART_PRICE, prod.precio)
                    : 0;

            reconciled.push({
                id: prod._id,
                nombre: prod.nombre,
                slug: prod.slug?.current ?? prod._id,
                categoria: prod.categoria?.nombre ?? item.categoria,
                precio: safePrice,
                cantidad: Math.min(maxStock, Math.max(1, Math.floor(item.cantidad))),
                stockMax: maxStock,
                imagenPrincipal: prod.imagenPrincipal ?? item.imagenPrincipal,
            });
        }

        cartItems.value = reconciled;
        writeCartStorage(cartItems.value);
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
        reconcileWithCatalog,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
    };
}
