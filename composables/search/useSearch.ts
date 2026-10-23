/**
 * @file composables/search/useSearch.ts
 * @description Composable de búsqueda reactiva y autocompletado para el catálogo.
 * Carga el índice de forma diferida al enfocar el buscador (@focus) para cumplir RNF-07,
 * y ofrece productos sugeridos de respaldo cuando una búsqueda no arroja resultados.
 * @satisfies RF-18, RF-23, RNF-07, RNF-08
 */

import { computed, isRef, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { Categoria, Producto } from '~/types/sanity';
import { FuseSearchEngine } from './fuseEngine';
import { DEFAULT_SYNONYM_GROUPS } from './normalize';
import type {
    SearchableProduct,
    SearchEngine,
    Suggestion,
    SynonymGroup,
} from './types';

export interface UseSearchOptions {
    /** Motor de búsqueda inyectable (por defecto FuseSearchEngine). */
    engine?: SearchEngine;
    /** Productos reactivos del catálogo en memoria. */
    catalogoProductos?: Ref<Producto[] | null | undefined>;
    /** Categorías disponibles para sugerencias de autocompletado. */
    categorias?: Ref<Categoria[] | null | undefined>;
    /** Grupos de sinónimos desde configuracionGlobal. */
    sinonimos?:
        | Ref<SynonymGroup[] | null | undefined>
        | ComputedRef<SynonymGroup[] | null | undefined>;
    /** Consulta inicial opcional. */
    initialQuery?: string;
}

/**
 * Transforma un documento `Producto` de Sanity al contrato `SearchableProduct`.
 */
export function toSearchableProduct(producto: Producto): SearchableProduct {
    return {
        _id: producto._id,
        nombre: producto.nombre,
        slug: producto.slug?.current,
        descripcion: producto.descripcion,
        categoria: producto.categoria?.nombre ?? '',
        categoriaSlug: producto.categoria?.slug?.current,
        palabrasClave: producto.palabrasClave ?? [],
    };
}

/**
 * Composable de búsqueda difusa y autocompletado.
 * Acepta un objeto de configuración `UseSearchOptions` o un `Ref<Producto[]>` como primer argumento.
 *
 * @satisfies RF-18, RF-23, RNF-07, RNF-08
 */
export function useSearch(
    productosOrOptions: Ref<Producto[] | null | undefined> | UseSearchOptions = {},
    queryArg?: Ref<string>,
    extraOptions: UseSearchOptions = {}
) {
    const isFirstArgRef = isRef(productosOrOptions);
    const options: UseSearchOptions = isFirstArgRef
        ? {
              ...extraOptions,
              catalogoProductos: productosOrOptions as Ref<
                  Producto[] | null | undefined
              >,
          }
        : (productosOrOptions as UseSearchOptions);

    const productos = options.catalogoProductos ?? ref<Producto[]>([]);
    const query = queryArg ?? ref(options.initialQuery ?? '');

    const defaultFuseEngine = new FuseSearchEngine();
    const engine: SearchEngine = options.engine ?? defaultFuseEngine;

    const indiceCargado = ref(false);
    const cargandoIndice = ref(false);

    /**
     * Hidrata el motor con los productos en memoria cuando aún no se ha descargado
     * `/data/search-index.json` o como respaldo inmediato.
     */
    function syncInMemoryIndex(): void {
        if (
            engine instanceof FuseSearchEngine &&
            (productos.value?.length ?? 0) > 0
        ) {
            const list = productos.value ?? [];
            const searchable = list
                .filter((p) => p.activo !== false)
                .map(toSearchableProduct);
            const cats = (options.categorias?.value ?? []).map((c) => ({
                _id: c._id,
                nombre: c.nombre,
                slug: c.slug?.current ?? '',
            }));
            const syns = options.sinonimos?.value ?? DEFAULT_SYNONYM_GROUPS;
            engine.hydrate(searchable, cats, syns);
        }
    }

    watch(
        () => [
            productos.value,
            options.categorias?.value,
            options.sinonimos?.value,
        ],
        () => {
            if (!indiceCargado.value) {
                syncInMemoryIndex();
            }
        },
        { immediate: true }
    );

    /**
     * Carga diferida del índice estático (`/data/search-index.json`) al enfocar el buscador (`@focus`).
     * @satisfies RNF-07
     */
    async function cargarIndice(): Promise<void> {
        if (indiceCargado.value || cargandoIndice.value) return;
        cargandoIndice.value = true;
        try {
            await engine.load();
            const firstProd = productos.value?.[0];
            if (
                engine instanceof FuseSearchEngine &&
                firstProd &&
                engine.search(firstProd.nombre, 1).length === 0
            ) {
                syncInMemoryIndex();
            }
            indiceCargado.value = true;
        } finally {
            cargandoIndice.value = false;
        }
    }

    /**
     * Lista de productos filtrados y ordenados por relevancia según el motor de búsqueda.
     * @satisfies RF-18
     */
    const resultados = computed<Producto[]>(() => {
        const list = (productos.value ?? []).filter((p) => p.activo !== false);
        const trimmed = query.value.trim();
        if (!trimmed) return list;

        if (!indiceCargado.value) {
            syncInMemoryIndex();
        }
        const hits = engine.search(trimmed, Math.max(24, list.length));
        if (hits.length === 0) return [];

        const byId = new Map(list.map((p) => [p._id, p]));
        return hits
            .map((hit) => byId.get(hit.id))
            .filter((p): p is Producto => Boolean(p));
    });

    const sinResultados = computed<boolean>(
        () => query.value.trim().length > 0 && resultados.value.length === 0
    );

    /**
     * Sugerencias de autocompletado (máx. 6) combinando productos y categorías.
     * @satisfies RF-18
     */
    const sugerencias = computed<Suggestion[]>(() => {
        const trimmed = query.value.trim();
        if (trimmed.length < 2) return [];
        if (!indiceCargado.value) {
            syncInMemoryIndex();
        }
        return engine.suggest(trimmed, 6);
    });

    /**
     * Productos sugeridos para el estado vacío cuando la búsqueda no devuelve coincidencias
     * (prioriza productos en stock y mejor calificados).
     * @satisfies RF-18
     */
    const sugeridosEstadoVacio = computed<Producto[]>(() => {
        const list = (productos.value ?? []).filter((p) => p.activo !== false);
        return [...list]
            .sort((a, b) => {
                const stockA = a.stock > 0 ? 1 : 0;
                const stockB = b.stock > 0 ? 1 : 0;
                if (stockB !== stockA) return stockB - stockA;
                return (b.calificacionPromedio ?? 0) - (a.calificacionPromedio ?? 0);
            })
            .slice(0, 4);
    });

    const limpiarBusqueda = (): void => {
        query.value = '';
    };

    return {
        query,
        resultados,
        resultadosProductos: resultados,
        sinResultados,
        sugerencias,
        sugeridosEstadoVacio,
        cargarIndice,
        limpiarBusqueda,
        indiceCargado,
        cargandoIndice,
    };
}
