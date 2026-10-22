<!--
  @file index.vue
  @description Vista principal del catálogo "Lector Pobre" (SSG).
  Integra barra de búsqueda difusa con autocompletado accesible por teclado (`role="combobox"`),
  carga diferida del índice en `@focus`, filtros por categoría estilo Vograce, rejilla responsiva
  de 4 columnas en escritorio y 2 en móvil, estado vacío con sugerencias, paginación y sección
  de productos vistos recientemente.
  @satisfies RF-01, RF-04, RF-18, RF-19, RF-20, RF-22, RF-23, RNF-05, RNF-07
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    ChevronLeft,
    ChevronRight,
    Filter,
    Search,
    Sparkles,
    Tag,
    X,
} from 'lucide-vue-next';
import ProductCard from '~/components/ProductCard.vue';
import RecentlyViewed from '~/components/RecentlyViewed.vue';
import type { Suggestion } from '~/composables/search/types';
import { useCatalog } from '~/composables/useCatalog';

const {
    productos,
    categorias,
    configGlobal,
    categoriaSeleccionada,
    seleccionarCategoria,
    searchQuery,
    sugerencias,
    sugeridosEstadoVacio,
    sinResultadosBusqueda,
    cargarIndiceBusqueda,
    limpiarBusqueda,
    productosFiltrados,
    productosPaginados,
    paginaActual,
    totalPaginas,
    pending,
} = useCatalog();

const mostrarDropdownSugerencias = ref(false);
const indiceSugerenciaActiva = ref(-1);

const umbralStockBajo = computed<number>(
    () => configGlobal.value?.umbralStockBajo ?? 5
);

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
        title: 'Lector Pobre | Catálogo de Arte, Llaveros, Pines y Stickers',
        description:
            'Explora el catálogo del taller Lector Pobre: llaveros de resina y acrílico, pines esmaltados, art prints y stickers ilustrados originalmente. Cotiza tu pedido por WhatsApp.',
        ogTitle: 'Lector Pobre | Taller de Arte y Accesorios Originales',
        ogDescription:
            'Llaveros, pines, prints y stickers semi-artesanales diseñados con identidad propia.',
        twitterCard: 'summary_large_image',
    });
} catch {
    // Fallback seguro fuera del contexto Nuxt en pruebas unitarias
}
</script>

<template>
    <div class="space-y-8" data-testid="catalog-page">
        <!-- Hero Banner estilo Taller Urbano Neo-Pop -->
        <section
            class="p-6 sm:p-8 bg-white border-2 border-brand-texto shadow-hard relative overflow-hidden"
            aria-labelledby="catalog-hero-heading"
        >
            <div class="max-w-3xl space-y-3">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-acento text-brand-texto border-2 border-brand-texto font-mono text-xs font-bold uppercase tracking-wider">
                    <Sparkles class="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Catálogo Oficial · Hecho con dedicación</span>
                </span>

                <h1
                    id="catalog-hero-heading"
                    class="font-display font-extrabold text-3xl sm:text-4xl text-brand-texto tracking-tight"
                >
                    Piezas ilustradas, llaveros, pines y stickers de colección
                </h1>

                <p class="font-sans text-sm sm:text-base text-zinc-700 leading-relaxed">
                    Arma tu lista de pedido con tus piezas favoritas del taller y envíala directamente por WhatsApp para confirmar existencias y entrega con la artista.
                </p>
            </div>
        </section>

        <!-- Barra de búsqueda difusa y filtros de categoría -->
        <section
            class="p-5 bg-white border-2 border-brand-texto shadow-hard space-y-4"
            aria-label="Buscador y filtros del catálogo"
        >
            <!-- Buscador con autocompletado accesible (RF-18, RF-23) -->
            <div class="relative">
                <label for="catalog-search-input" class="sr-only">
                    Buscar productos por nombre, categoría o palabra clave
                </label>

                <div class="relative flex items-center">
                    <Search
                        class="w-5 h-5 text-zinc-500 absolute left-3.5 pointer-events-none"
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
                        placeholder="Busca llaveros, pines, stickers, anime, resina..."
                        class="w-full pl-11 pr-10 py-3 bg-brand-fondo/50 text-brand-texto font-sans text-sm border-2 border-brand-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                        data-testid="search-input"
                        @focus="manejarFocusBuscador"
                        @blur="manejarBlurBuscador"
                        @keydown="manejarTecladoBuscador"
                    />
                    <button
                        v-if="searchQuery"
                        type="button"
                        class="absolute right-3 p-1 text-zinc-500 hover:text-brand-texto focus-visible:outline-none"
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
                    class="absolute z-20 left-0 right-0 mt-1 bg-white border-2 border-brand-texto shadow-hard divide-y divide-zinc-200 max-h-64 overflow-y-auto"
                    data-testid="search-suggestions"
                >
                    <li
                        v-for="(sug, index) in sugerencias"
                        :key="`${sug.type}-${sug.label}-${index}`"
                    >
                        <button
                            :id="`search-suggestion-${index}`"
                            type="button"
                            class="w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 font-sans text-sm transition-colors focus-visible:outline-none"
                            :class="
                                index === indiceSugerenciaActiva
                                    ? 'bg-brand-acento text-brand-texto font-bold'
                                    : 'hover:bg-brand-fondo text-brand-texto'
                            "
                            @mousedown.prevent="aplicarSugerencia(sug)"
                        >
                            <span class="truncate">{{ sug.label }}</span>
                            <span class="font-mono text-[11px] uppercase px-2 py-0.5 border border-brand-texto bg-white shrink-0">
                                {{ sug.type === 'categoria' ? 'Categoría' : 'Producto' }}
                            </span>
                        </button>
                    </li>
                </ul>
            </div>

            <!-- Chips de filtro por categoría (RF-04) -->
            <fieldset class="flex flex-wrap items-center gap-2 pt-1 m-0 p-0 border-0 min-w-0" aria-label="Filtrar por categoría">
                <span class="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-zinc-600 mr-1">
                    <Filter class="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Categorías:</span>
                </span>

                <button
                    type="button"
                    :aria-pressed="categoriaSeleccionada === ''"
                    class="px-3.5 py-1.5 font-mono text-xs font-bold uppercase border-2 border-brand-texto transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                    :class="
                        categoriaSeleccionada === ''
                            ? 'bg-brand-primario text-white shadow-hard-sm'
                            : 'bg-white text-brand-texto hover:bg-brand-fondo'
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
                    class="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-mono text-xs font-bold uppercase border-2 border-brand-texto transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                    :class="
                        categoriaSeleccionada === (cat.slug?.current ?? cat.nombre)
                            ? 'bg-brand-primario text-white shadow-hard-sm'
                            : 'bg-white text-brand-texto hover:bg-brand-fondo'
                    "
                    :data-testid="`category-chip-${cat.slug?.current ?? cat.nombre}`"
                    @click="seleccionarCategoria(cat.slug?.current ?? cat.nombre)"
                >
                    <Tag class="w-3 h-3" aria-hidden="true" />
                    <span>{{ cat.nombre }}</span>
                </button>
            </fieldset>

            <!-- Resumen accesible de resultados (aria-live) -->
            <div
                class="flex items-center justify-between pt-2 border-t border-zinc-200 font-mono text-xs text-zinc-600"
                aria-live="polite"
            >
                <span data-testid="results-count">
                    Mostrando {{ productosPaginados.length }} de {{ productosFiltrados.length }} piezas disponibles
                </span>
                <button
                    v-if="categoriaSeleccionada || searchQuery"
                    type="button"
                    class="font-bold text-brand-primario hover:underline"
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
            class="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            aria-busy="true"
            aria-label="Cargando catálogo"
        >
            <div
                v-for="n in 4"
                :key="n"
                class="h-80 bg-white border-2 border-brand-texto shadow-hard animate-pulse p-4 flex flex-col justify-between"
            >
                <div class="aspect-square bg-zinc-200 border border-brand-texto" />
                <div class="h-4 bg-zinc-200 w-3/4 mt-3" />
                <div class="h-8 bg-zinc-200 w-full mt-2" />
            </div>
        </div>

        <!-- Rejilla de productos (4 columnas en desktop, 2 en móvil) -->
        <section
            v-else-if="productosPaginados.length > 0"
            aria-label="Lista de productos del catálogo"
        >
            <div
                class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                data-testid="product-grid"
            >
                <ProductCard
                    v-for="prod in productosPaginados"
                    :key="prod._id"
                    :producto="prod"
                    :umbral-stock-bajo="umbralStockBajo"
                />
            </div>

            <!-- Controles de paginación (RF-19) -->
            <nav
                v-if="totalPaginas > 1"
                class="mt-8 flex items-center justify-center gap-3"
                aria-label="Paginación del catálogo"
                data-testid="catalog-pagination"
            >
                <button
                    type="button"
                    :disabled="paginaActual <= 1"
                    class="inline-flex items-center gap-1 px-3.5 py-2 bg-white text-brand-texto font-mono text-xs font-bold uppercase border-2 border-brand-texto shadow-hard-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Página anterior"
                    @click="paginaActual = Math.max(1, paginaActual - 1)"
                >
                    <ChevronLeft class="w-4 h-4" aria-hidden="true" />
                    <span>Anterior</span>
                </button>

                <span class="px-4 py-2 bg-brand-acento text-brand-texto font-mono text-xs font-extrabold border-2 border-brand-texto">
                    Página {{ paginaActual }} de {{ totalPaginas }}
                </span>

                <button
                    type="button"
                    :disabled="paginaActual >= totalPaginas"
                    class="inline-flex items-center gap-1 px-3.5 py-2 bg-white text-brand-texto font-mono text-xs font-bold uppercase border-2 border-brand-texto shadow-hard-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
            class="p-8 bg-white border-2 border-brand-texto shadow-hard space-y-6"
            data-testid="empty-search-state"
        >
            <div class="text-center max-w-md mx-auto space-y-2">
                <h2 class="font-display font-extrabold text-xl text-brand-texto">
                    No encontramos piezas que coincidan con tu búsqueda
                </h2>
                <p class="font-sans text-sm text-zinc-600">
                    Intenta con otros términos o explora estas piezas destacadas del taller:
                </p>
            </div>

            <div
                v-if="sugeridosEstadoVacio.length > 0"
                class="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
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
