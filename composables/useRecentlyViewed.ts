/**
 * @file useRecentlyViewed.ts
 * @description Composable para gestionar la lista de productos "Vistos recientemente"
 * persistida localmente en `localStorage` bajo la clave `lp:recentlyViewed` (máximo 6 elementos),
 * además de utilidades seguras de acceso a `localStorage` compartidas entre composables.
 * @satisfies RF-22, RNF-07
 */

import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import type { Producto } from '~/types/sanity';

export const RECENTLY_VIEWED_STORAGE_KEY = 'lp:recentlyViewed';
export const MAX_RECENTLY_VIEWED = 6;

const recentProductIds = ref<string[]>([]);

/**
 * Lee de forma segura una clave de `localStorage` tolerando SSR o almacenamiento bloqueado.
 */
export function readLocalStorageSafe(key: string): string | null {
    if (globalThis.window === undefined) {
        return null;
    }
    try {
        return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

/**
 * Escribe de forma segura un valor en `localStorage` tolerando errores de cuota o privacidad.
 */
export function writeLocalStorageSafe(key: string, value: string): void {
    if (globalThis.window === undefined) {
        return;
    }
    try {
        globalThis.localStorage?.setItem(key, value);
    } catch {
        // Degradación elegante si localStorage está deshabilitado o lleno
    }
}

/**
 * Elimina de forma segura una clave de `localStorage`.
 */
export function removeLocalStorageSafe(key: string): void {
    if (globalThis.window === undefined) {
        return;
    }
    try {
        globalThis.localStorage?.removeItem(key);
    } catch {
        // Ignorar error si localStorage está restringido
    }
}

function readStorageIds(): string[] {
    const raw = readLocalStorageSafe(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (id): id is string =>
                    typeof id === 'string' && id.trim().length > 0
            )
            .slice(0, MAX_RECENTLY_VIEWED);
    } catch {
        return [];
    }
}

function writeStorageIds(ids: string[]): void {
    writeLocalStorageSafe(
        RECENTLY_VIEWED_STORAGE_KEY,
        JSON.stringify(ids.slice(0, MAX_RECENTLY_VIEWED))
    );
}

function extractProductId(
    productOrId: Producto | { _id: string } | string
): string {
    if (typeof productOrId === 'string') {
        return productOrId.trim();
    }
    return productOrId?._id?.trim() ?? '';
}

/**
 * Composable para registrar, consultar y limpiar el historial de productos vistos recientemente.
 */
export function useRecentlyViewed() {
    const loadFromStorage = (): string[] => {
        const loaded = readStorageIds();
        recentProductIds.value = loaded;
        return loaded;
    };

    if (getCurrentInstance()) {
        onMounted(() => {
            loadFromStorage();
        });
    } else {
        loadFromStorage();
    }

    /**
     * Registra un producto al inicio del historial, sin duplicados y respetando el tope de 6.
     *
     * @param productOrId Objeto `Producto` o su `_id`.
     */
    const addProduct = (
        productOrId: Producto | { _id: string } | string
    ): void => {
        const id = extractProductId(productOrId);
        if (!id) return;

        const current =
            recentProductIds.value.length > 0
                ? recentProductIds.value
                : readStorageIds();
        const deduplicated = [
            id,
            ...current.filter((item) => item !== id),
        ].slice(0, MAX_RECENTLY_VIEWED);

        recentProductIds.value = deduplicated;
        writeStorageIds(deduplicated);
    };

    /**
     * Limpia por completo el historial de productos vistos recientemente en memoria y en `localStorage`.
     */
    const clearHistory = (): void => {
        recentProductIds.value = [];
        removeLocalStorageSafe(RECENTLY_VIEWED_STORAGE_KEY);
    };

    /**
     * Cruza los IDs almacenados con el catálogo activo actual, descartando productos eliminados
     * o inactivos y excluyendo opcionalmente el producto que se está visualizando actualmente.
     */
    const resolveRecentProducts = (
        catalogProducts: Producto[],
        excludeProductId?: string
    ): Producto[] => {
        if ((catalogProducts?.length ?? 0) === 0) {
            return [];
        }
        const byId = new Map<string, Producto>();
        for (const prod of catalogProducts) {
            if (prod.activo !== false) {
                byId.set(prod._id, prod);
            }
        }

        const resolved: Producto[] = [];
        for (const id of recentProductIds.value) {
            if (excludeProductId && id === excludeProductId) continue;
            const found = byId.get(id);
            if (found) {
                resolved.push(found);
            }
        }

        return resolved.slice(0, MAX_RECENTLY_VIEWED);
    };

    const hasHistory = computed(() => recentProductIds.value.length > 0);

    return {
        recentIds: recentProductIds,
        hasHistory,
        loadFromStorage,
        addProduct,
        clearHistory,
        resolveRecentProducts,
    };
}
