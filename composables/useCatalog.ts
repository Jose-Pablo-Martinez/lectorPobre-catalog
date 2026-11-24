/**
 * @file useCatalog.ts
 * @description Composable principal del catálogo de Lector Pobre para SSG.
 * Consulta productos activos, categorías y configuración global desde Sanity, e integra
 * filtrado por categoría (RF-04), búsqueda difusa desacoplada con Fuse.js (RF-18, RF-23),
 * selección modular de pieza destacada/recomendada y paginación configurable (RF-19).
 * @satisfies RF-01, RF-04, RF-18, RF-19, RF-23
 */

import { computed, type Ref, ref, watch } from 'vue';
import {
    type FiltroPrecioPreset,
    type RangoPrecio,
    esRangoPrecioInvalido,
    matchesPriceFilter,
    ordenarProductos,
    resolverCriterioOrden,
    resolverRangoPrecio,
    sanitizarPrecioLimite,
} from '~/composables/catalog/catalogFilters';
import { useSearch } from '~/composables/search/useSearch';
import type {
    Categoria,
    ConfiguracionGlobal,
    CriterioOrdenCatalogo,
    Producto,
    Subcategoria,
} from '~/types/sanity';

export type EstrategiaDestacado = 'aleatorio' | 'popularidad';

export const SLUG_FORMAT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Valida que un slug siga el formato seguro `^[a-z0-9]+(?:-[a-z0-9]+)*$` (M-2).
 */
export function isValidSlug(value: string): boolean {
    const clean = value.trim();
    return clean.length > 0 && SLUG_FORMAT_RE.test(clean);
}

/**
 * Verifica si un producto pertenece a la categoría filtrada (por slug o nombre).
 */
export function matchesCategoryFilter(
    producto: Producto,
    categoryFilter: string
): boolean {
    const clean = categoryFilter.trim().toLowerCase();
    if (!clean) return true;
    const slugCat = producto.categoria?.slug?.current?.toLowerCase() ?? '';
    const nombreCat = producto.categoria?.nombre?.toLowerCase() ?? '';
    return slugCat === clean || nombreCat === clean;
}

/**
 * Verifica si un producto pertenece a la subcategoría filtrada (por slug o nombre).
 */
export function matchesSubcategoryFilter(
    producto: Producto,
    subcategoryFilter: string
): boolean {
    const clean = subcategoryFilter.trim().toLowerCase();
    if (!clean) return true;
    const slugSub = producto.subcategoria?.slug?.current?.toLowerCase() ?? '';
    const nombreSub = producto.subcategoria?.nombre?.toLowerCase() ?? '';
    return slugSub === clean || nombreSub === clean;
}

/**
 * Devuelve únicamente las subcategorías cuya categoría padre coincide con el filtro activo.
 */
export function filterSubcategoriesByParent(
    subcategorias: readonly Subcategoria[],
    categoryFilter: string
): Subcategoria[] {
    const clean = categoryFilter.trim().toLowerCase();
    if (!clean) return [];
    return subcategorias.filter((sub) => {
        const parentSlug = sub.categoriaPadre?.slug?.current?.toLowerCase() ?? '';
        const parentName = sub.categoriaPadre?.nombre?.toLowerCase() ?? '';
        return parentSlug === clean || parentName === clean;
    });
}

export interface UseCatalogOptions {
    pagina?: number;
    categoria?: string;
    subcategoria?: string;
    criterioOrden?: CriterioOrdenCatalogo;
    filtroPrecioPreset?: FiltroPrecioPreset;
    precioMin?: number | null;
    precioMax?: number | null;
    productosPorPagina?: number;
    estrategiaDestacado?: EstrategiaDestacado;
    initialProductos?: Producto[];
    initialCategorias?: Categoria[];
    initialSubcategorias?: Subcategoria[];
    initialConfig?: Partial<ConfiguracionGlobal>;
}

/**
 * Genera un índice pseudoaleatorio empleando Web Crypto API (`crypto.getRandomValues`)
 * para cumplir las reglas de seguridad de SonarQube (evitando `Math.random()`).
 */
export function obtenerIndiceAleatorioSeguro(total: number): number {
    if (total <= 1) return 0;
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return (buffer[0] ?? 0) % total;
    }
    return 0;
}

/**
 * Selecciona una pieza destacada del catálogo activo según la estrategia configurada:
 * - `'aleatorio'` (etapa actual): elige un producto activo disponible al azar.
 * - `'popularidad'` (preparado para evolución a "más vendido"): ordena por
 *   `calificacionPromedio` y número de calificaciones (`ratingCount`).
 * Prioriza productos con stock disponible (`stock > 0`), con respaldo en cualquier activo.
 */
export function seleccionarProductoDestacado(
    listaProductos: Producto[],
    estrategia: EstrategiaDestacado = 'aleatorio',
    indiceSemilla?: number
): Producto | null {
    const activos = (listaProductos ?? []).filter((p) => p.activo !== false);
    if (activos.length === 0) return null;

    const conStock = activos.filter((p) => p.stock > 0);
    const candidatos = conStock.length > 0 ? conStock : activos;

    if (estrategia === 'popularidad') {
        const ordenados = [...candidatos].sort((a, b) => {
            const promA = a.calificacionPromedio ?? 0;
            const promB = b.calificacionPromedio ?? 0;
            if (promB !== promA) return promB - promA;
            return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        });
        return ordenados[0] ?? null;
    }

    const idx =
        typeof indiceSemilla === 'number'
            ? Math.abs(indiceSemilla) % candidatos.length
            : obtenerIndiceAleatorioSeguro(candidatos.length);
    return candidatos[idx] ?? candidatos[0] ?? null;
}

/**
 * Genera una leyenda de "caja blanca" (explicabilidad algorítmica) que detalla
 * de manera transparente al usuario la razón por la que se recomienda la pieza.
 *
 * @param estrategia Estrategia de selección ('aleatorio' | 'popularidad').
 * @param esPrimeraVisita Si el usuario carece de historial de navegación previo en la tienda.
 * @param producto Objeto del producto recomendado (opcional, para enriquecer con calificaciones).
 */
export function obtenerExplicacionRecomendacion(
    estrategia: EstrategiaDestacado = 'aleatorio',
    esPrimeraVisita = false,
    producto?: Producto | null
): string {
    if (estrategia === 'popularidad') {
        const calificacion = producto?.calificacionPromedio;
        if (typeof calificacion === 'number' && calificacion > 0) {
            return `Popular ahora en la tienda (${calificacion.toFixed(1)} ★): pieza favorita de nuestra comunidad por sus altas calificaciones.`;
        }
        return 'Esto es popular ahora en la tienda: pieza destacada por el interés y preferencia de la comunidad.';
    }

    if (esPrimeraVisita) {
        return 'Es tu primera vez visitando el sitio: pieza destacada del taller seleccionada para darte la bienvenida.';
    }

    return '¡SORPRESA!: sugerencia aleatoria para explorar piezas únicas de nuestro catálogo.';
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
    subcategoria->{nombre, slug, "categoriaPadreSlug": categoriaPadre->slug.current},
    stock,
    precio,
    activo,
    palabrasClave,
    "ratingCount": count(*[_type == "calificacion" && producto._ref == ^._id]),
    "rating1Count": count(*[_type == "calificacion" && producto._ref == ^._id && valor == 1]),
    "rating2Count": count(*[_type == "calificacion" && producto._ref == ^._id && valor == 2]),
    "rating3Count": count(*[_type == "calificacion" && producto._ref == ^._id && valor == 3]),
    "rating4Count": count(*[_type == "calificacion" && producto._ref == ^._id && valor == 4]),
    "rating5Count": count(*[_type == "calificacion" && producto._ref == ^._id && valor == 5]),
    "calificacionPromedio": select(
        count(*[_type == "calificacion" && producto._ref == ^._id]) > 0 =>
            round(math::avg(*[_type == "calificacion" && producto._ref == ^._id].valor), 1),
        null
    )
`;

export const CATALOG_PRODUCTS_QUERY = `*[_type == "producto" && activo == true] | order(_createdAt desc) { ${PRODUCTO_GROQ_FIELDS} }`;

/**
 * Proyección GROQ pública para comentarios aprobados en detalle de producto.
 * Excluye explícitamente `usuarioId` para evitar secuestro de reseñas ajenas (V-01).
 */
export const PUBLIC_COMMENTS_GROQ_FIELDS = `
    _id,
    _type,
    _createdAt,
    _updatedAt,
    _rev,
    texto,
    calificacion,
    producto,
    fechaCreacion,
    estado
`;

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

export const CATALOG_SUBCATEGORIES_QUERY = `*[_type == "subcategoria"] | order(orden asc, nombre asc) {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    _rev,
    nombre,
    slug,
    categoriaPadre->{_id, nombre, slug},
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
    urlYouTube,
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
    criterioOrdenDefault,
    sinonimos
}`;

/**
 * Obtiene una semilla aleatoria sincronizada entre SSR y cliente mediante `useState`
 * de Nuxt para evitar diferencias de hidratación tanto en destacado como en ordenación.
 */
function obtenerSemillaSSR(clave: string): Ref<number> {
    try {
        if (typeof useState === 'function') {
            return useState<number>(clave, () =>
                obtenerIndiceAleatorioSeguro(10000)
            );
        }
    } catch {
        // Fallback seguro fuera del contexto de Nuxt (pruebas unitarias Vitest)
    }
    return ref<number>(obtenerIndiceAleatorioSeguro(10000));
}

/**
 * Composable reactivo del catálogo con soporte para pruebas unitarias y ejecución SSG en Nuxt.
 */
export function useCatalog(options: UseCatalogOptions = {}) {
    const productos = ref<Producto[]>(options.initialProductos ?? []);
    const categorias = ref<Categoria[]>(options.initialCategorias ?? []);
    const subcategorias = ref<Subcategoria[]>(options.initialSubcategorias ?? []);
    const configGlobal = ref<Partial<ConfiguracionGlobal> | null>(
        options.initialConfig ?? null
    );
    const pending = ref(false);
    const error = ref<Error | null>(null);

    if (!options.initialProductos) {
        try {
            const sanity = useSanity();
            const asyncCatalog = useAsyncData('catalogo-lectorpobre', async () => {
                const [prods, cats, subs, cfg] = await Promise.all([
                    sanity.fetch<Producto[]>(CATALOG_PRODUCTS_QUERY),
                    sanity.fetch<Categoria[]>(CATALOG_CATEGORIES_QUERY),
                    sanity.fetch<Subcategoria[]>(CATALOG_SUBCATEGORIES_QUERY),
                    sanity.fetch<ConfiguracionGlobal | null>(GLOBAL_CONFIG_QUERY),
                ]);
                return {
                    productos: prods ?? [],
                    categorias: cats ?? [],
                    subcategorias: subs ?? [],
                    configGlobal: cfg ?? null,
                };
            });

            watch(
                () => asyncCatalog.data.value,
                (val) => {
                    if (val) {
                        productos.value = val.productos;
                        categorias.value = val.categorias;
                        subcategorias.value = val.subcategorias;
                        configGlobal.value = val.configGlobal;
                    }
                },
                { immediate: true, flush: 'sync' }
            );

            watch(
                () => asyncCatalog.pending.value,
                (isPending) => {
                    pending.value = isPending;
                },
                { immediate: true, flush: 'sync' }
            );

            watch(
                () => asyncCatalog.error.value,
                (err) => {
                    error.value = err instanceof Error ? err : null;
                },
                { immediate: true, flush: 'sync' }
            );
        } catch {
            // Fallback seguro cuando se invoca en pruebas unitarias sin contexto de Nuxt
        }
    }

    const categoriaSeleccionada = ref<string>(options.categoria ?? '');
    const subcategoriaSeleccionada = ref<string>(options.subcategoria ?? '');
    const paginaActual = ref<number>(options.pagina ?? 1);
    const estrategiaDestacado = ref<EstrategiaDestacado>(
        options.estrategiaDestacado ?? 'aleatorio'
    );
    const semillaDestacado = obtenerSemillaSSR('catalogo-featured-seed');
    const semillaOrden = obtenerSemillaSSR('catalogo-sort-seed');

    const criterioOrden = ref<CriterioOrdenCatalogo>(
        resolverCriterioOrden(
            options.criterioOrden ?? options.initialConfig?.criterioOrdenDefault
        )
    );
    const ordenModificadoPorUsuario = ref<boolean>(Boolean(options.criterioOrden));

    watch(
        () => configGlobal.value?.criterioOrdenDefault,
        (nuevoDefault) => {
            if (!ordenModificadoPorUsuario.value) {
                criterioOrden.value = resolverCriterioOrden(nuevoDefault);
            }
        }
    );

    const filtroPrecioPreset = ref<FiltroPrecioPreset>(
        options.filtroPrecioPreset ?? 'todos'
    );
    const precioMin = ref<number | null>(sanitizarPrecioLimite(options.precioMin));
    const precioMax = ref<number | null>(sanitizarPrecioLimite(options.precioMax));

    const rangoPrecioActivo = computed<RangoPrecio>(() =>
        resolverRangoPrecio(
            filtroPrecioPreset.value,
            precioMin.value,
            precioMax.value
        )
    );

    const filtroPrecioActivo = computed<boolean>(
        () =>
            rangoPrecioActivo.value.min !== null ||
            rangoPrecioActivo.value.max !== null
    );

    const subcategoriasActivas = computed<Subcategoria[]>(() =>
        filterSubcategoriesByParent(subcategorias.value, categoriaSeleccionada.value)
    );

    const productoRecomendado = computed<Producto | null>(() =>
        seleccionarProductoDestacado(
            productos.value,
            estrategiaDestacado.value,
            semillaDestacado.value
        )
    );

    const search = useSearch({
        catalogoProductos: productos,
        categorias,
        sinonimos: computed(() => configGlobal.value?.sinonimos),
    });

    const searchQuery = search.query;

    watch(searchQuery, (nuevaQuery) => {
        if ((nuevaQuery ?? '').trim().length > 0 && subcategoriaSeleccionada.value) {
            subcategoriaSeleccionada.value = '';
        }
    });

    watch(
        [
            categoriaSeleccionada,
            subcategoriaSeleccionada,
            searchQuery,
            criterioOrden,
            filtroPrecioPreset,
            precioMin,
            precioMax,
        ],
        () => {
            paginaActual.value = 1;
        },
        { flush: 'sync' }
    );

    const productosFiltrados = computed<Producto[]>(() => {
        const listaActivos = (productos.value ?? []).filter(
            (p) => p.activo !== false
        );

        const q = searchQuery.value.trim();
        const base: Producto[] =
            q.length > 0
                ? search.resultadosProductos.value.filter((p) => p.activo !== false)
                : listaActivos;

        const filtrados = base.filter(
            (p) =>
                matchesCategoryFilter(p, categoriaSeleccionada.value) &&
                matchesSubcategoryFilter(p, subcategoriaSeleccionada.value) &&
                matchesPriceFilter(p, rangoPrecioActivo.value)
        );

        if (q.length > 0 && criterioOrden.value === 'aleatorio') {
            return filtrados;
        }

        return ordenarProductos(filtrados, criterioOrden.value, semillaOrden.value);
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
        subcategoriaSeleccionada.value = '';
    };

    const seleccionarSubcategoria = (slugONombre: string): void => {
        subcategoriaSeleccionada.value = slugONombre;
    };

    const seleccionarOrden = (criterio: string): void => {
        ordenModificadoPorUsuario.value = true;
        criterioOrden.value = resolverCriterioOrden(criterio);
    };

    const seleccionarPresetPrecio = (preset: FiltroPrecioPreset): void => {
        filtroPrecioPreset.value = preset;
        if (preset !== 'custom') {
            precioMin.value = null;
            precioMax.value = null;
        }
    };

    const aplicarRangoPrecioPersonalizado = (
        minRaw: unknown,
        maxRaw: unknown
    ): boolean => {
        if (esRangoPrecioInvalido(minRaw, maxRaw)) {
            return false;
        }
        const minSan = sanitizarPrecioLimite(minRaw);
        const maxSan = sanitizarPrecioLimite(maxRaw);
        if (minSan === null && maxSan === null) {
            filtroPrecioPreset.value = 'todos';
            precioMin.value = null;
            precioMax.value = null;
            return true;
        }
        filtroPrecioPreset.value = 'custom';
        precioMin.value = minSan;
        precioMax.value = maxSan;
        return true;
    };

    const limpiarFiltroPrecio = (): void => {
        filtroPrecioPreset.value = 'todos';
        precioMin.value = null;
        precioMax.value = null;
    };

    return {
        productos,
        categorias,
        subcategorias,
        subcategoriasActivas,
        configGlobal,
        productoRecomendado,
        productoDestacado: productoRecomendado,
        estrategiaDestacado,
        obtenerExplicacionRecomendacion,
        categoriaSeleccionada,
        subcategoriaSeleccionada,
        criterioOrden,
        filtroPrecioPreset,
        precioMin,
        precioMax,
        rangoPrecioActivo,
        filtroPrecioActivo,
        seleccionarCategoria,
        seleccionarSubcategoria,
        seleccionarOrden,
        seleccionarPresetPrecio,
        aplicarRangoPrecioPersonalizado,
        limpiarFiltroPrecio,
        searchQuery,
        sugerencias: search.sugerencias,
        sugeridosEstadoVacio: search.sugeridosEstadoVacio,
        sinResultadosBusqueda: search.sinResultados,
        busquedaConfirmada: search.busquedaConfirmada,
        sugerenciasConfirmadas: search.sugerenciasConfirmadas,
        confirmarBusqueda: search.confirmarBusqueda,
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
