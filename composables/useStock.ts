/**
 * @file useStock.ts
 * @description Composable para consultar la disponibilidad de stock en tiempo real
 * desde el CDN/API pública de lectura de Sanity (sin exponer tokens secretos).
 * Permite combinar la velocidad del HTML estático (SSG) con disponibilidad actualizada.
 * @satisfies RF-03, RF-14, RNF-03, RNF-04
 */

import { computed, getCurrentInstance, onMounted, ref } from 'vue';

export interface UseStockOptions {
    /** Valor inicial de stock proveniente del build estático (SSG). */
    initialStock?: number;
    /** Umbral configurado en Sanity para considerar pocas unidades (por defecto 5). */
    umbralStockBajo?: number;
    /** Si es true, ejecuta la consulta automáticamente en `onMounted`. */
    autoFetch?: boolean;
    /** Función inyectable para pruebas unitarias. */
    fetcher?: (productId: string) => Promise<{ stock?: number } | null>;
}

/**
 * Consulta en tiempo real el stock de un producto por su `_id` de Sanity.
 *
 * @param productoId Identificador `_id` del documento de producto en Sanity.
 * @param options Opciones de configuración y fallback inicial.
 */
export function useStock(productoId: string, options: UseStockOptions = {}) {
    const stock = ref<number | null>(
        typeof options.initialStock === 'number' ? options.initialStock : null
    );
    const cargando = ref(false);
    const error = ref<string | null>(null);
    const umbral = options.umbralStockBajo ?? 5;

    const defaultFetcher = async (
        id: string
    ): Promise<{ stock?: number } | null> => {
        const sanity = useSanity();
        return sanity.fetch<{ stock?: number } | null>(
            `*[_type == "producto" && _id == $id][0]{ stock }`,
            { id }
        );
    };

    const consultarStock = async (): Promise<number | null> => {
        if (!productoId) {
            return stock.value;
        }
        cargando.value = true;
        error.value = null;

        try {
            const runFetch = options.fetcher ?? defaultFetcher;
            const resultado = await runFetch(productoId);
            if (typeof resultado?.stock === 'number') {
                stock.value = Math.max(0, resultado.stock);
            }
            return stock.value;
        } catch {
            error.value = 'No se pudo verificar el stock en tiempo real.';
            return stock.value;
        } finally {
            cargando.value = false;
        }
    };

    if (options.autoFetch !== false && getCurrentInstance()) {
        onMounted(() => {
            consultarStock().catch(() => null);
        });
    }

    const disponible = computed(() => (stock.value ?? 0) > 0);
    const pocasUnidades = computed(
        () => (stock.value ?? 0) > 0 && (stock.value ?? 0) <= umbral
    );

    return {
        stock,
        cargando,
        error,
        disponible,
        pocasUnidades,
        consultarStock,
    };
}
