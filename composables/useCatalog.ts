/**
 * @file useCatalog.ts
 * @description Composable principal del catálogo de Lector Pobre para SSG.
 * Consulta productos activos, categorías y configuración global desde Sanity, e integra
 * filtrado por categoría (RF-04), búsqueda difusa desacoplada con Fuse.js (RF-18, RF-23)
 * y paginación configurable (RF-19).
 * @satisfies RF-01, RF-04, RF-18, RF-19, RF-23
 */

import { computed, ref, watch } from 'vue';
import { useSearch } from '~/composables/search/useSearch';
import type { Categoria, ConfiguracionGlobal, Producto } from '~/types/sanity';

export interface UseCatalogOptions {
    pagina?: number;
    categoria?: string;
    productosPorPagina?: number;
    initialProductos?: Producto[];
    initialCategorias?: Categoria[];
    initialConfig?: Partial<ConfiguracionGlobal>;
}

/**
 * Proyección GROQ compartida de campos de `producto` para evitar duplicación de consultas
 * entre la vista de catálogo y la vista de detalle.
 */
export const PRODUCTO_GROQ_FIELDS = `
    _id,
    _type,
    _createdAt,
    _updatedAt,
    _rev,
    nombre,
    slug,
    descripcion,
    imagenPrincipal,
    imagenes,
    categoria->{nombre, slug},
    stock,
    precio,
    activo,
    palabrasClave,
    "calificacionPromedio": select(
        ratingCount > 0 => round(ratingSum / ratingCount, 1),
        null
    ),
    ratingCount,
    rating1Count,
    rating2Count,
    rating3Count,
    rating4Count,
    rating5Count
`;

export const CATALOG_PRODUCTS_QUERY = `*[_type == "producto" && activo == true] | order(_createdAt desc) { ${PRODUCTO_GROQ_FIELDS} }`;

export const CATALOG_CATEGORIES_QUERY = `*[_type == "categoria"] | order(orden asc) {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    _rev,
    nombre,
    slug,
    descripcion,
    orden
}`;

export const GLOBAL_CONFIG_QUERY = `*[_type == "configuracionGlobal"][0] {
    _id,
    _type,
    nombreSitio,
    numeroWhatsApp,
    mensajeWhatsApp,
    urlInstagram,
    urlFacebook,
    urlTikTok,
    paletaActiva,
    paletaCustomPrimario,
    paletaCustomSecundario,
    paletaCustomAcento,
    paletaCustomFondo,
    paletaCustomTexto,
    varianteVisual,
    patronDecorativoActivo,
    patronDecorativo,
    umbralStockBajo,
    productosPorPagina,
    sinonimos
}`;

/**
 * Composable reactivo del catálogo con soporte para pruebas unitarias y ejecución SSG en Nuxt.
 */
export function useCatalog(options: UseCatalogOptions = {}) {
    const productos = ref<Producto[]>(options.initialProductos ?? []);
    const categorias = ref<Categoria[]>(options.initialCategorias ?? []);
    const configGlobal = ref<Partial<ConfiguracionGlobal> | null>(
        options.initialConfig ?? null
    );
    const pending = ref(false);
    const error = ref<Error | null>(null);

    if (!options.initialProductos) {
        try {
            const sanity = useSanity();
            const asyncCatalog = useAsyncData('catalogo-lectorpobre', async () => {
                const [prods, cats, cfg] = await Promise.all([
                    sanity.fetch<Producto[]>(CATALOG_PRODUCTS_QUERY),
                    sanity.fetch<Categoria[]>(CATALOG_CATEGORIES_QUERY),
                    sanity.fetch<ConfiguracionGlobal | null>(GLOBAL_CONFIG_QUERY),
                ]);
                return {
                    productos: prods ?? [],
                    categorias: cats ?? [],
                    configGlobal: cfg ?? null,
                };
            });

            watch(
                () => asyncCatalog.data.value,
                (val) => {
                    if (val) {
                        productos.value = val.productos;
                        categorias.value = val.categorias;
                        configGlobal.value = val.configGlobal;
                    }
                },
                { immediate: true }
            );

            watch(
                () => asyncCatalog.pending.value,
                (isPending) => {
                    pending.value = isPending;
                },
                { immediate: true }
            );

            watch(
                () => asyncCatalog.error.value,
                (err) => {
                    error.value = err instanceof Error ? err : null;
                },
                { immediate: true }
            );
        } catch {
            // Fallback seguro cuando se invoca en pruebas unitarias sin contexto de Nuxt
        }
    }

    const categoriaSeleccionada = ref<string>(options.categoria ?? '');
    const paginaActual = ref<number>(options.pagina ?? 1);

    const search = useSearch({
        catalogoProductos: productos,
        categorias,
        sinonimos: computed(() => configGlobal.value?.sinonimos),
    });

    const searchQuery = search.query;

    watch([categoriaSeleccionada, searchQuery], () => {
        paginaActual.value = 1;
    });

    const productosFiltrados = computed<Producto[]>(() => {
        const listaActivos = (productos.value ?? []).filter(
            (p) => p.activo !== false
        );

        let base: Producto[] = listaActivos;
        const q = searchQuery.value.trim();

        if (q.length > 0) {
            base = search.resultadosProductos.value.filter(
                (p) => p.activo !== false
            );
        }

        const catFilter = categoriaSeleccionada.value.trim().toLowerCase();
        if (!catFilter) {
            return base;
        }

        return base.filter((p) => {
            const slugCat = p.categoria?.slug?.current?.toLowerCase() ?? '';
            const nombreCat = p.categoria?.nombre?.toLowerCase() ?? '';
            return slugCat === catFilter || nombreCat === catFilter;
        });
    });

    const tamanoPagina = computed<number>(() => {
        return (
            options.productosPorPagina ??
            configGlobal.value?.productosPorPagina ??
            24
        );
    });

    const totalPaginas = computed<number>(() => {
        const total = productosFiltrados.value.length;
        return Math.max(1, Math.ceil(total / tamanoPagina.value));
    });

    const productosPaginados = computed<Producto[]>(() => {
        const inicio = (paginaActual.value - 1) * tamanoPagina.value;
        return productosFiltrados.value.slice(
            inicio,
            inicio + tamanoPagina.value
        );
    });

    const seleccionarCategoria = (slugONombre: string): void => {
        categoriaSeleccionada.value = slugONombre;
    };

    return {
        productos,
        categorias,
        configGlobal,
        categoriaSeleccionada,
        seleccionarCategoria,
        searchQuery,
        sugerencias: search.sugerencias,
        sugeridosEstadoVacio: search.sugeridosEstadoVacio,
        sinResultadosBusqueda: search.sinResultados,
        cargarIndiceBusqueda: search.cargarIndice,
        limpiarBusqueda: search.limpiarBusqueda,
        productosFiltrados,
        productosPaginados,
        paginaActual,
        totalPaginas,
        tamanoPagina,
        pending,
        error,
    };
}
