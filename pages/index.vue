<!--
  @file index.vue
  @description Vista principal del catálogo "Lector Pobre" (SSG) bajo el sistema
  "Neo-Pop Limpio con Carácter de Taller" y arquitectura Mobile-First.
  Integra banner de colección limpio, sección destacada de recomendación del taller,
  barra de búsqueda difusa con autocompletado accesible por teclado (`role="combobox"`),
  carrusel móvil de filtros por categoría con chip activo en Azul Maya, rejilla responsiva
  de 2/3/4 columnas, paginación táctil y sección de productos vistos recientemente.
  @satisfies RF-01, RF-04, RF-18, RF-19, RF-20, RF-22, RF-23, RNF-05, RNF-07
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    ArrowRight,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Filter,
    Image as ImageIcon,
    Search,
    ShoppingBag,
    Bird,
    Tag,
    X,
} from 'lucide-vue-next';
import ProductCard from '~/components/ProductCard.vue';
import RecentlyViewed from '~/components/RecentlyViewed.vue';
import type { Suggestion } from '~/composables/search/types';
import { obtenerClasesBotonPedido, useCart } from '~/composables/useCart';
import { useCatalog } from '~/composables/useCatalog';
import { useRecentlyViewed } from '~/composables/useRecentlyViewed';
import { useSanityImage } from '~/composables/useSanityImage';
import { formatearPrecioMXN } from '~/composables/useWhatsApp';

const {
    productos,
    categorias,
    configGlobal,
    productoRecomendado,
    estrategiaDestacado,
    obtenerExplicacionRecomendacion,
    categoriaSeleccionada,
    seleccionarCategoria,
    searchQuery,
    sugerencias,
    sugeridosEstadoVacio,
    cargarIndiceBusqueda,
    limpiarBusqueda,
    productosFiltrados,
    productosPaginados,
    paginaActual,
    totalPaginas,
    pending,
} = useCatalog();

const { urlFor } = useSanityImage();
const { addItem } = useCart();
const { hasHistory } = useRecentlyViewed();

const mostrarDropdownSugerencias = ref(false);
const indiceSugerenciaActiva = ref(-1);
const errorImagenDestacado = ref(false);
const recienAgregadoDestacado = ref(false);

const motivoRecomendacion = computed<string>(() =>
    obtenerExplicacionRecomendacion(
        estrategiaDestacado.value,
        !hasHistory.value,
        productoRecomendado.value
    )
);

const mostrarExplicacionRecomendado = ref(false);

const conmutarExplicacionRecomendado = (): void => {
    mostrarExplicacionRecomendado.value = !mostrarExplicacionRecomendado.value;
};

const abrirExplicacionHover = (): void => {
    mostrarExplicacionRecomendado.value = true;
};

const cerrarExplicacionHover = (): void => {
    mostrarExplicacionRecomendado.value = false;
};

const umbralStockBajo = computed<number>(
    () => configGlobal.value?.umbralStockBajo ?? 5
);

const imagenRecomendadoUrl = computed<string | null>(() => {
    if (
        errorImagenDestacado.value ||
        !productoRecomendado.value?.imagenPrincipal
    ) {
        return null;
    }
    return urlFor(productoRecomendado.value.imagenPrincipal, {
        width: 600,
        height: 600,
    });
});

const detalleRecomendadoHref = computed<string>(() => {
    if (!productoRecomendado.value) return '/';
    const slug =
        productoRecomendado.value.slug?.current ??
        productoRecomendado.value._id;
    return `/product/${slug}`;
});

const precioRecomendadoFormateado = computed<string>(() =>
    formatearPrecioMXN(productoRecomendado.value?.precio, 'Precio por cotizar')
);

const agotadoRecomendado = computed<boolean>(
    () => (productoRecomendado.value?.stock ?? 0) <= 0
);

const clasesBotonRecomendado = computed<string>(() =>
    obtenerClasesBotonPedido(
        agotadoRecomendado.value,
        recienAgregadoDestacado.value,
        'hard-sm'
    )
);

const manejarAgregarRecomendado = (): void => {
    if (!productoRecomendado.value || agotadoRecomendado.value) return;
    const exito = addItem(productoRecomendado.value, 1);
    if (exito) {
        recienAgregadoDestacado.value = true;
        setTimeout(() => {
            recienAgregadoDestacado.value = false;
        }, 1200);
    }
};

const listboxAbierto = computed<boolean>(
    () =>
        mostrarDropdownSugerencias.value &&
        searchQuery.value.trim().length > 0 &&
        sugerencias.value.length > 0
);

const idSugerenciaActiva = computed<string | undefined>(() => {
    if (
        !listboxAbierto.value ||
        indiceSugerenciaActiva.value < 0 ||
        indiceSugerenciaActiva.value >= sugerencias.value.length
    ) {
        return undefined;
    }
    return `search-suggestion-${indiceSugerenciaActiva.value}`;
});

const manejarFocusBuscador = async (): Promise<void> => {
    mostrarDropdownSugerencias.value = true;
    await cargarIndiceBusqueda();
};

const manejarBlurBuscador = (): void => {
    setTimeout(() => {
        mostrarDropdownSugerencias.value = false;
        indiceSugerenciaActiva.value = -1;
    }, 180);
};

const aplicarSugerencia = (sug: Suggestion): void => {
    if (sug.type === 'categoria') {
        seleccionarCategoria(sug.slug ?? sug.label);
        limpiarBusqueda();
    } else {
        searchQuery.value = sug.label;
    }
    mostrarDropdownSugerencias.value = false;
    indiceSugerenciaActiva.value = -1;
};

const moverSeleccionSugerencia = (delta: number): void => {
    const total = sugerencias.value.length;
    if (total === 0) return;
    indiceSugerenciaActiva.value =
        (indiceSugerenciaActiva.value + delta + total) % total;
};

const confirmarSugerenciaActiva = (): void => {
    if (indiceSugerenciaActiva.value < 0) return;
    const seleccionada = sugerencias.value[indiceSugerenciaActiva.value];
    if (seleccionada) {
        aplicarSugerencia(seleccionada);
    }
};

const manejarTecladoBuscador = (ev: KeyboardEvent): void => {
    if (!listboxAbierto.value) {
        if (ev.key === 'Escape' && searchQuery.value) {
            limpiarBusqueda();
        }
        return;
    }

    switch (ev.key) {
        case 'ArrowDown':
            ev.preventDefault();
            moverSeleccionSugerencia(1);
            break;
        case 'ArrowUp':
            ev.preventDefault();
            moverSeleccionSugerencia(-1);
            break;
        case 'Enter':
            if (indiceSugerenciaActiva.value >= 0) {
                ev.preventDefault();
                confirmarSugerenciaActiva();
            }
            break;
        case 'Escape':
            ev.preventDefault();
            mostrarDropdownSugerencias.value = false;
            indiceSugerenciaActiva.value = -1;
            break;
    }
};

// Metadatos SEO y Open Graph (RF-20)
try {
    useSeoMeta({
        title: 'Lector Pobre | Catálogo de Arte',
        description:
            'Explora el catálogo del taller Lector Pobre: llaveros de resina y acrílico, pines, art prints, tote bags, stickers ilustrados originalmente. Cotiza tu pedido por WhatsApp.',
        ogTitle: 'Lector Pobre | Arte y Artesanías Originales de diseños únicos',
        ogDescription:
            'Llaveros, pines, prints y stickers semi-artesanales de diseños completamente originales sobre lucha libre y cultura pop.',
        ogImage: '/logo.png',
        twitterImage: '/logo.png',
        twitterCard: 'summary_large_image',
    });
} catch {
    // Fallback seguro fuera del contexto Nuxt en pruebas unitarias
}
</script>

<template>
    <div class="space-y-6 sm:space-y-8" data-testid="catalog-page">
        <!-- Hero Banner limpio estilo colección de Vograce -->
        <section
            class="rounded-2xl bg-gradient-to-r from-blue-50/50 via-white to-pink-50/50 border border-zinc-200 p-6 sm:p-8 shadow-sm relative overflow-hidden"
            aria-labelledby="catalog-hero-heading"
        >
            <div class="max-w-3xl">
                <h1
                    id="catalog-hero-heading"
                    class="font-display font-extrabold text-2xl sm:text-4xl text-zinc-900 tracking-tight"
                >
                    ¡Piezas de arte e ilustración originales, artesanales y semiartesanales!
                </h1>

                <p class="font-sans text-zinc-600 text-sm sm:text-base max-w-2xl mt-2 leading-relaxed">
                    Arma tu lista de artículos, agregando al carrito, con tus piezas favoritas del catálog y envíala directamente por WhatsApp para confirmar existencias y entrega con la artista Lector Pobre.
                </p>
            </div>
        </section>

        <!-- Nueva Funcionalidad: Sección de Producto Recomendado / Destacado -->
        <section
            v-if="!pending && productoRecomendado"
            class="bg-white border-2 border-brand-texto shadow-hard rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8"
            aria-labelledby="featured-product-heading"
            data-testid="featured-product-section"
        >
            <!-- Lado visual: Imagen 1:1 con borde y placeholder -->
            <div class="rounded-lg aspect-square w-full md:w-64 shrink-0 overflow-hidden bg-zinc-50 border-2 border-brand-texto relative flex items-center justify-center">
                <a
                    :href="detalleRecomendadoHref"
                    class="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                    :aria-label="`Ver detalles de ${productoRecomendado.nombre}`"
                >
                    <img
                        v-if="imagenRecomendadoUrl"
                        :src="imagenRecomendadoUrl"
                        :alt="productoRecomendado.nombre"
                        width="600"
                        height="600"
                        class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        @error="errorImagenDestacado = true"
                    />
                    <div
                        v-else
                        class="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-zinc-500 bg-zinc-50"
                        data-testid="featured-product-placeholder"
                    >
                        <ImageIcon class="w-12 h-12 stroke-[1.5]" aria-hidden="true" />
                        <span class="font-mono text-xs font-bold uppercase tracking-wider text-center">
                            Pieza recomendada del catálogo
                        </span>
                    </div>
                </a>
            </div>

            <!-- Lado informativo -->
            <div class="flex-1 space-y-4 w-full">
                <div class="flex flex-wrap items-center gap-2.5">
                    <span
                        class="inline-flex items-center gap-1 px-3 py-1 bg-brand-acento text-brand-texto font-mono text-xs font-extrabold uppercase border border-brand-texto shadow-hard-sm"
                        data-testid="featured-product-badge"
                    >
                        <Bird class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Me lo dijo un periquito...</span>
                    </span>

                    <span
                        v-if="productoRecomendado.categoria?.nombre"
                        class="font-mono text-xs font-bold uppercase tracking-wider text-brand-secundario"
                    >
                        {{ productoRecomendado.categoria.nombre }}
                    </span>
                </div>

                <!-- Disparador interactivo y tooltip de explicabilidad de caja blanca -->
                <div class="relative inline-block">
                    <button
                        type="button"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-brand-secundario transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario rounded px-2 py-1 -ml-1 cursor-pointer"
                        :aria-expanded="mostrarExplicacionRecomendado"
                        aria-describedby="featured-recommendation-tooltip"
                        data-testid="featured-reason-trigger"
                        @mouseenter="abrirExplicacionHover"
                        @mouseleave="cerrarExplicacionHover"
                        @focus="abrirExplicacionHover"
                        @blur="cerrarExplicacionHover"
                        @click="conmutarExplicacionRecomendado"
                        @keydown.escape="cerrarExplicacionHover"
                    >
                        <CircleAlert class="w-4 h-4 text-brand-secundario shrink-0" aria-hidden="true" />
                        <span class="underline decoration-zinc-300 decoration-dashed underline-offset-4 hover:decoration-brand-secundario">
                            ¿Por qué te recomendamos esto?
                        </span>
                    </button>

                    <!-- Tooltip flotante con la explicación de caja blanca (hover en escritorio, click/touch en móvil) -->
                    <Transition
                        enter-active-class="transition duration-150 ease-out"
                        enter-from-class="opacity-0 translate-y-1"
                        enter-to-class="opacity-100 translate-y-0"
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="opacity-100 translate-y-0"
                        leave-to-class="opacity-0 translate-y-1"
                    >
                        <div
                            v-if="mostrarExplicacionRecomendado"
                            id="featured-recommendation-tooltip"
                            role="tooltip"
                            class="absolute z-20 left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-white border-2 border-brand-texto shadow-hard-sm rounded-xl text-xs text-zinc-700 leading-relaxed pointer-events-auto"
                            data-testid="featured-product-reason"
                        >
                            <div class="flex items-start gap-2.5">
                                <CircleAlert class="w-4 h-4 text-brand-secundario shrink-0 mt-0.5" aria-hidden="true" />
                                <div class="space-y-1">
                                    <p class="font-bold text-brand-texto font-display">
                                        El periquito lo recomienda porque...
                                    </p>
                                    <p class="text-zinc-600">{{ motivoRecomendacion }}</p>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>

                <div class="space-y-2">
                    <h2
                        id="featured-product-heading"
                        class="font-display font-extrabold text-2xl text-brand-texto leading-snug"
                    >
                        <a
                            :href="detalleRecomendadoHref"
                            class="hover:text-brand-primario transition-colors focus-visible:outline-none focus-visible:underline"
                        >
                            {{ productoRecomendado.nombre }}
                        </a>
                    </h2>

                    <p
                        v-if="productoRecomendado.descripcion"
                        class="font-sans text-sm text-zinc-600 leading-relaxed line-clamp-2 max-w-2xl"
                    >
                        {{ productoRecomendado.descripcion }}
                    </p>
                </div>

                <p
                    class="font-mono font-extrabold text-xl text-brand-primario"
                    data-testid="featured-product-price"
                >
                    {{ precioRecomendadoFormateado }}
                </p>

                <div class="flex flex-wrap items-center gap-3 pt-1">
                    <a
                        :href="detalleRecomendadoHref"
                        class="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-brand-secundario text-white px-4 py-2.5 font-display font-bold text-sm border-2 border-brand-texto shadow-hard-sm hover:opacity-95 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                        data-testid="featured-detail-link"
                    >
                        <span>Más información del artículo</span>
                        <ArrowRight class="w-4 h-4 shrink-0" aria-hidden="true" />
                    </a>

                    <button
                        type="button"
                        :disabled="agotadoRecomendado"
                        :aria-disabled="agotadoRecomendado"
                        :class="[
                            'min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-bold font-display transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario',
                            clasesBotonRecomendado,
                        ]"
                        data-testid="featured-add-to-order"
                        @click="manejarAgregarRecomendado"
                    >
                        <template v-if="agotadoRecomendado">
                            <span>Agotado</span>
                        </template>
                        <template v-else-if="recienAgregadoDestacado">
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
        </section>

        <!-- Barra de búsqueda difusa y filtros de categoría -->
        <section
            class="p-4 sm:p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-4"
            aria-label="Buscador y filtros del catálogo"
        >
            <!-- Buscador con autocompletado accesible (RF-18, RF-23) -->
            <div class="relative">
                <label for="catalog-search-input" class="sr-only">
                    Buscar productos por nombre, categoría o palabra clave
                </label>

                <div class="relative flex items-center">
                    <Search
                        class="w-5 h-5 text-zinc-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                    />
                    <input
                        id="catalog-search-input"
                        v-model="searchQuery"
                        type="search"
                        role="combobox"
                        aria-autocomplete="list"
                        :aria-expanded="listboxAbierto"
                        aria-controls="search-suggestions-listbox"
                        :aria-activedescendant="idSugerenciaActiva"
                        placeholder="Busca llaveros, pines, stickers, anime, lucha libre..."
                        class="w-full pl-11 pr-10 py-3 rounded-xl border border-zinc-300 focus:border-brand-secundario focus:ring-2 focus:ring-brand-secundario/20 shadow-sm text-zinc-900 bg-white font-sans text-sm focus:outline-none transition-all"
                        data-testid="search-input"
                        @focus="manejarFocusBuscador"
                        @blur="manejarBlurBuscador"
                        @keydown="manejarTecladoBuscador"
                    />
                    <button
                        v-if="searchQuery"
                        type="button"
                        class="absolute right-2 p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-zinc-400 hover:text-zinc-700 focus-visible:outline-none"
                        aria-label="Limpiar búsqueda"
                        data-testid="clear-search-button"
                        @click="limpiarBusqueda"
                    >
                        <X class="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                <!-- Lista desplegable de autocompletado -->
                <ul
                    v-if="listboxAbierto"
                    id="search-suggestions-listbox"
                    aria-label="Sugerencias de búsqueda"
                    class="absolute z-20 left-0 right-0 mt-1.5 bg-white rounded-xl border-2 border-brand-texto shadow-hard divide-y divide-zinc-100 max-h-64 overflow-y-auto"
                    data-testid="search-suggestions"
                >
                    <li
                        v-for="(sug, index) in sugerencias"
                        :key="`${sug.type}-${sug.label}-${index}`"
                    >
                        <button
                            :id="`search-suggestion-${index}`"
                            type="button"
                            class="w-full text-left px-4 py-2.5 min-h-[44px] flex items-center justify-between gap-2 font-sans text-sm transition-colors focus-visible:outline-none"
                            :class="
                                index === indiceSugerenciaActiva
                                    ? 'bg-brand-acento text-brand-texto font-bold'
                                    : 'hover:bg-zinc-50 text-brand-texto'
                            "
                            @mousedown.prevent="aplicarSugerencia(sug)"
                        >
                            <span class="truncate">{{ sug.label }}</span>
                            <span class="rounded-full font-mono text-[11px] font-bold uppercase px-2.5 py-0.5 border border-brand-texto bg-white text-brand-texto shrink-0">
                                {{ sug.type === 'categoria' ? 'Categoría' : 'Producto' }}
                            </span>
                        </button>
                    </li>
                </ul>
            </div>

            <!-- Carrusel Mobile-First de chips de categoría (scroll táctil en móvil, wrap en sm+) -->
            <fieldset
                class="flex items-center gap-2 overflow-x-auto sm:flex-wrap no-scrollbar py-1 m-0 p-0 border-0 min-w-0"
                aria-label="Filtrar por categoría"
            >
                <span class="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-zinc-600 mr-1 shrink-0">
                    <Filter class="w-3.5 h-3.5 text-brand-secundario" aria-hidden="true" />
                    <span>Categorías:</span>
                </span>

                <button
                    type="button"
                    :aria-pressed="categoriaSeleccionada === ''"
                    class="min-h-[40px] sm:min-h-[36px] shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                    :class="
                        categoriaSeleccionada === ''
                            ? 'bg-brand-secundario text-white border-2 border-brand-texto shadow-hard-sm font-bold'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                    "
                    data-testid="category-chip-all"
                    @click="seleccionarCategoria('')"
                >
                    Todas
                </button>

                <button
                    v-for="cat in categorias"
                    :key="cat._id"
                    type="button"
                    :aria-pressed="
                        categoriaSeleccionada === (cat.slug?.current ?? cat.nombre)
                    "
                    class="min-h-[40px] sm:min-h-[36px] shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                    :class="
                        categoriaSeleccionada === (cat.slug?.current ?? cat.nombre)
                            ? 'bg-brand-secundario text-white border-2 border-brand-texto shadow-hard-sm font-bold'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300'
                    "
                    :data-testid="`category-chip-${cat.slug?.current ?? cat.nombre}`"
                    @click="seleccionarCategoria(cat.slug?.current ?? cat.nombre)"
                >
                    <Tag class="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{{ cat.nombre }}</span>
                </button>
            </fieldset>

            <!-- Resumen accesible de resultados (aria-live) -->
            <div
                class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 font-sans text-xs text-zinc-600"
                aria-live="polite"
            >
                <span data-testid="results-count">
                    Mostrando {{ productosPaginados.length }} de {{ productosFiltrados.length }} piezas disponibles
                </span>
                <button
                    v-if="categoriaSeleccionada || searchQuery"
                    type="button"
                    class="font-bold text-brand-secundario hover:text-brand-primario hover:underline transition-colors"
                    data-testid="reset-filters-button"
                    @click="
                        seleccionarCategoria('');
                        limpiarBusqueda();
                    "
                >
                    Restablecer filtros
                </button>
            </div>
        </section>

        <!-- Estado de carga -->
        <div
            v-if="pending && productos.length === 0"
            class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
            aria-busy="true"
            aria-label="Cargando catálogo"
        >
            <div
                v-for="n in 4"
                :key="n"
                class="h-80 bg-white rounded-xl border border-zinc-200 shadow-sm animate-pulse p-4 flex flex-col justify-between"
            >
                <div class="aspect-square rounded-lg bg-zinc-100" />
                <div class="h-4 rounded bg-zinc-100 w-3/4 mt-3" />
                <div class="h-8 rounded-lg bg-zinc-100 w-full mt-2" />
            </div>
        </div>

        <!-- Rejilla Mobile-First del catálogo (2 cols móvil, 3 cols md, 4 cols lg) -->
        <section
            v-else-if="productosPaginados.length > 0"
            aria-label="Lista de productos del catálogo"
        >
            <div
                class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
                data-testid="product-grid"
            >
                <ProductCard
                    v-for="prod in productosPaginados"
                    :key="prod._id"
                    :producto="prod"
                    :umbral-stock-bajo="umbralStockBajo"
                />
            </div>

            <!-- Controles de paginación táctiles (RF-19) -->
            <nav
                v-if="totalPaginas > 1"
                class="mt-8 flex items-center justify-center gap-3"
                aria-label="Paginación del catálogo"
                data-testid="catalog-pagination"
            >
                <button
                    type="button"
                    :disabled="paginaActual <= 1"
                    class="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-50 text-brand-texto font-display text-xs font-bold border-2 border-brand-texto shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                    aria-label="Página anterior"
                    @click="paginaActual = Math.max(1, paginaActual - 1)"
                >
                    <ChevronLeft class="w-4 h-4" aria-hidden="true" />
                    <span>Anterior</span>
                </button>

                <span class="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg bg-brand-acento text-brand-texto font-mono text-xs font-extrabold border-2 border-brand-texto shadow-hard-sm">
                    Página {{ paginaActual }} de {{ totalPaginas }}
                </span>

                <button
                    type="button"
                    :disabled="paginaActual >= totalPaginas"
                    class="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-50 text-brand-texto font-display text-xs font-bold border-2 border-brand-texto shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                    aria-label="Página siguiente"
                    @click="paginaActual = Math.min(totalPaginas, paginaActual + 1)"
                >
                    <span>Siguiente</span>
                    <ChevronRight class="w-4 h-4" aria-hidden="true" />
                </button>
            </nav>
        </section>

        <!-- Estado vacío con productos sugeridos (§3.12.2 punto 5) -->
        <section
            v-else
            class="p-6 sm:p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-6"
            data-testid="empty-search-state"
        >
            <div class="text-center max-w-md mx-auto space-y-2">
                <h2 class="font-display font-bold text-xl text-brand-texto">
                    El periquito lo lamenta, no hay resultados para tu búsqueda
                </h2>
                <p class="font-sans text-sm text-zinc-600">
                    Intenta con otros términos o explora estas piezas destacadas del catálogo:
                </p>
            </div>

            <div
                v-if="sugeridosEstadoVacio.length > 0"
                class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
                data-testid="empty-state-suggestions"
            >
                <ProductCard
                    v-for="sugerido in sugeridosEstadoVacio"
                    :key="sugerido._id"
                    :producto="sugerido"
                    :umbral-stock-bajo="umbralStockBajo"
                />
            </div>
        </section>

        <!-- Sección de Vistos Recientemente (RF-22) -->
        <RecentlyViewed
            :catalogo-productos="productos"
            :umbral-stock-bajo="umbralStockBajo"
        />
    </div>
</template>
