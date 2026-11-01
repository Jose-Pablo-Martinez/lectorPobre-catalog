<!--
  @file [slug].vue
  @description Vista de detalle de producto (`/product/[slug]`) con estética comercial limpia.
  Presenta galería 1:1 con miniaturas, verificación de stock en tiempo real (`useStock`, RF-03),
  precio, descripción, botón de agregar a la Lista de Pedido, botón de compra directa por WhatsApp
  (`WhatsAppButton`, RF-17), sistema de calificación por estrellas con desglose (`StarRating`, RF-06),
  sección de comentarios moderados (`CommentForm`, RF-07), productos similares (`SimilarProducts`, RF-21)
  y registro automático en "Vistos recientemente" (`useRecentlyViewed`, RF-22).
  Compatible con Dark Mode (RF-15, RNF-05).
  @satisfies RF-02, RF-03, RF-06, RF-07, RF-14, RF-15, RF-17, RF-20, RF-21, RF-22, RNF-05
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
    ArrowLeft,
    Check,
    Image as ImageIcon,
    Minus,
    Plus,
    ShoppingBag,
    Tag,
} from 'lucide-vue-next';
import CommentForm, { type RatingUpdatedPayload } from '~/components/CommentForm.vue';
import RecentlyViewed from '~/components/RecentlyViewed.vue';
import SimilarProducts from '~/components/SimilarProducts.vue';
import StarRating from '~/components/StarRating.vue';
import StockIndicator from '~/components/StockIndicator.vue';
import WhatsAppButton from '~/components/WhatsAppButton.vue';
import { useAnalytics } from '~/composables/useAnalytics';
import { obtenerClasesBotonPedido, useCart } from '~/composables/useCart';
import {
    CATALOG_PRODUCTS_QUERY,
    PRODUCTO_GROQ_FIELDS,
} from '~/composables/useCatalog';
import { useRecentlyViewed } from '~/composables/useRecentlyViewed';
import { useSanityImage } from '~/composables/useSanityImage';
import { useStock } from '~/composables/useStock';
import {
    construirUrlWhatsApp,
    formatearPrecioMXN,
} from '~/composables/useWhatsApp';
import type {
    Comentario,
    ConfiguracionGlobal,
    Producto,
    SanityImage,
} from '~/types/sanity';

export interface ProductDetailPageProps {
    initialProducto?: Producto | null;
    initialComentarios?: Comentario[];
    initialConfig?: Partial<ConfiguracionGlobal> | null;
    initialCatalogo?: Producto[];
}

const props = withDefaults(defineProps<ProductDetailPageProps>(), {
    initialProducto: undefined,
    initialComentarios: undefined,
    initialConfig: undefined,
    initialCatalogo: undefined,
});

const producto = ref<Producto | null>(props.initialProducto ?? null);
const comentarios = ref<Comentario[]>(props.initialComentarios ?? []);
const configGlobal = ref<Partial<ConfiguracionGlobal> | null>(
    props.initialConfig ?? null
);
const catalogoProductos = ref<Producto[]>(props.initialCatalogo ?? []);

// Consulta en entorno Nuxt cuando no se inyectan props de prueba
if (props.initialProducto === undefined) {
    try {
        const route = useRoute();
        const slugParam = computed(() => String(route.params.slug ?? ''));
        const sanity = useSanity();

        const { data } = useAsyncData(
            `producto-detalle-${slugParam.value}`,
            async () => {
                const prod = await sanity.fetch<Producto | null>(
                    `*[_type == "producto" && activo == true && slug.current == $slug][0]{
                        ${PRODUCTO_GROQ_FIELDS},
                        imagenes
                    }`,
                    { slug: slugParam.value }
                );

                const [coms, cfg, todos] = await Promise.all([
                    prod
                        ? sanity.fetch<Comentario[]>(
                              `*[_type == "comentario" && producto._ref == $id && estado == "aprobado"] | order(fechaCreacion desc){
                                  _id,
                                  _type,
                                  _createdAt,
                                  _updatedAt,
                                  _rev,
                                  texto,
                                  calificacion,
                                  usuarioId,
                                  producto,
                                  fechaCreacion,
                                  estado
                              }`,
                              { id: prod._id }
                          )
                        : Promise.resolve([]),
                    sanity.fetch<Partial<ConfiguracionGlobal> | null>(
                        `*[_type == "configuracionGlobal"][0]{
                            nombreSitio,
                            numeroWhatsApp,
                            mensajeWhatsApp,
                            umbralStockBajo
                        }`
                    ),
                    sanity.fetch<Producto[]>(CATALOG_PRODUCTS_QUERY),
                ]);

                return {
                    producto: prod ?? null,
                    comentarios: coms ?? [],
                    config: cfg ?? null,
                    catalogo: todos ?? [],
                };
            }
        );

        watch(
            () => data.value,
            (val) => {
                if (val) {
                    producto.value = val.producto;
                    comentarios.value = val.comentarios;
                    configGlobal.value = val.config;
                    catalogoProductos.value = val.catalogo;
                }
            },
            { immediate: true, flush: 'sync' }
        );
    } catch {
        // Fallback seguro en entorno de pruebas unitarias
    }
}

const { urlFor } = useSanityImage();
const { addItem, openCart } = useCart();
const { addProduct: registrarVistoReciente } = useRecentlyViewed();

const umbralStockBajo = computed<number>(
    () => configGlobal.value?.umbralStockBajo ?? 5
);

// Stock en tiempo real (RF-03)
const {
    stock: stockTiempoReal,
    cargando: cargandoStock,
} = useStock(producto.value?._id ?? '', {
    initialStock: producto.value?.stock,
    umbralStockBajo: umbralStockBajo.value,
    autoFetch: props.initialProducto === undefined,
});

const stockActual = computed<number>(
    () => stockTiempoReal.value ?? producto.value?.stock ?? 0
);

const agotado = computed<boolean>(() => stockActual.value <= 0);

// Galería de imágenes (principal + galería secundaria)
const galeriaImagenes = computed<SanityImage[]>(() => {
    if (!producto.value) return [];
    const lista: SanityImage[] = [];
    if (producto.value.imagenPrincipal) {
        lista.push(producto.value.imagenPrincipal);
    }
    if (Array.isArray(producto.value.imagenes)) {
        for (const img of producto.value.imagenes) {
            if (img && !lista.some((existente) => existente.asset?._ref === img.asset?._ref)) {
                lista.push(img);
            }
        }
    }
    return lista;
});

const indiceImagenActiva = ref(0);
const errorImagenActiva = ref(false);

const imagenActivaUrl = computed<string | null>(() => {
    if (errorImagenActiva.value) return null;
    const imagen = galeriaImagenes.value[indiceImagenActiva.value];
    if (!imagen) return null;
    return urlFor(imagen, { width: 900, height: 900 });
});

const obtenerMiniaturaGaleria = (img: SanityImage): string | null => {
    return urlFor(img, { width: 140, height: 140 });
};

const precioFormateado = computed<string>(() =>
    formatearPrecioMXN(producto.value?.precio, 'Precio por cotizar')
);

const cantidadSeleccionada = ref(1);

const aumentarCantidad = (): void => {
    const tope = Math.max(1, stockActual.value);
    cantidadSeleccionada.value = Math.min(tope, cantidadSeleccionada.value + 1);
};

const disminuirCantidad = (): void => {
    cantidadSeleccionada.value = Math.max(1, cantidadSeleccionada.value - 1);
};

// Enlace directo de WhatsApp con mensaje parametrizado (RF-02, RF-17)
const urlWhatsApp = computed<string>(() => {
    if (!producto.value) return '';
    return construirUrlWhatsApp(
        configGlobal.value?.numeroWhatsApp ?? '',
        producto.value.nombre,
        configGlobal.value?.mensajeWhatsApp,
        producto.value.precio
    );
});

// Agregar a la Lista de Pedido (RF-14)
const recienAgregado = ref(false);

const clasesBotonDetallePedido = computed<string>(() =>
    obtenerClasesBotonPedido(agotado.value, recienAgregado.value, 'hard')
);

const manejarAgregarLista = (): void => {
    if (!producto.value || agotado.value) return;
    const exito = addItem(producto.value, cantidadSeleccionada.value);
    if (exito) {
        recienAgregado.value = true;
        openCart();
        setTimeout(() => {
            recienAgregado.value = false;
        }, 1200);
    }
};

const manejarRatingActualizado = (evento: RatingUpdatedPayload | number): void => {
    if (!producto.value) return;
    const nuevoValor = typeof evento === 'number' ? evento : evento.nuevoValor;
    const valorPrevio = typeof evento === 'number' ? null : (evento.valorPrevio ?? null);
    const eraModificacion = typeof evento === 'number' ? false : evento.eraModificacion;
    const count = producto.value.ratingCount ?? 0;
    const promActual = producto.value.calificacionPromedio ?? 0;
    const sumaActual = promActual * count;

    let nuevoCount = count;
    let nuevaSuma: number;

    const r1 = Math.max(0, producto.value.rating1Count ?? 0);
    const r2 = Math.max(0, producto.value.rating2Count ?? 0);
    const r3 = Math.max(0, producto.value.rating3Count ?? 0);
    const r4 = Math.max(0, producto.value.rating4Count ?? 0);
    const r5 = Math.max(0, producto.value.rating5Count ?? 0);
    const counts: Record<number, number> = { 1: r1, 2: r2, 3: r3, 4: r4, 5: r5 };

    if (eraModificacion && valorPrevio && valorPrevio >= 1 && valorPrevio <= 5) {
        nuevaSuma = sumaActual - valorPrevio + nuevoValor;
        counts[valorPrevio] = Math.max(0, (counts[valorPrevio] ?? 1) - 1);
        counts[nuevoValor] = (counts[nuevoValor] ?? 0) + 1;
    } else {
        nuevoCount = count + 1;
        nuevaSuma = sumaActual + nuevoValor;
        counts[nuevoValor] = (counts[nuevoValor] ?? 0) + 1;
    }

    const nuevoPromedio = nuevoCount > 0
        ? Number((nuevaSuma / nuevoCount).toFixed(1))
        : null;

    producto.value = {
        ...producto.value,
        ratingCount: nuevoCount,
        calificacionPromedio: nuevoPromedio,
        rating1Count: counts[1],
        rating2Count: counts[2],
        rating3Count: counts[3],
        rating4Count: counts[4],
        rating5Count: counts[5],
    };

    trackRatingSubmitted(producto.value._id, nuevoValor);
};

const { trackProductView, trackRatingSubmitted } = useAnalytics();

onMounted(() => {
    if (producto.value) {
        registrarVistoReciente(producto.value);
        trackProductView(producto.value._id, producto.value.nombre);
    }
});

watch(
    () => producto.value?._id,
    (id) => {
        if (id && producto.value) {
            registrarVistoReciente(producto.value);
            trackProductView(producto.value._id, producto.value.nombre);
            indiceImagenActiva.value = 0;
            errorImagenActiva.value = false;
        }
    }
);

// Metadatos SEO y Open Graph (RF-20)
try {
    useSeoMeta({
        title: () =>
            producto.value
                ? `${producto.value.nombre} | Lector Pobre`
                : 'Detalle de pieza | Lector Pobre',
        description: () =>
            producto.value?.descripcion?.slice(0, 160) ??
            'Pieza ilustrada del taller Lector Pobre.',
        ogTitle: () => producto.value?.nombre ?? 'Lector Pobre',
        ogDescription: () => producto.value?.descripcion?.slice(0, 160) ?? '',
        ogImage: () =>
            producto.value?.imagenPrincipal
                ? urlFor(producto.value.imagenPrincipal, { width: 1200 }) ?? ''
                : '',
        twitterCard: 'summary_large_image',
    });
} catch {
    // Fallback seguro en entorno de pruebas unitarias
}
</script>

<template>
    <div class="space-y-10" data-testid="product-detail-page">
        <!-- Navegación de regreso -->
        <nav aria-label="Ruta de navegación">
            <a
                href="/"
                class="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-brand-acento dark:hover:bg-brand-acento text-brand-texto dark:text-slate-100 hover:text-zinc-950 dark:hover:text-zinc-950 font-display text-xs font-bold border-2 border-brand-texto dark:border-slate-600 shadow-hard-sm dark:shadow-[3px_3px_0px_rgba(0,0,0,0.6)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                data-testid="back-to-catalog-link"
            >
                <ArrowLeft class="w-4 h-4" aria-hidden="true" />
                <span>Volver al catálogo</span>
            </a>
        </nav>

        <!-- Vista principal del producto -->
        <div
            v-if="producto"
            class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
            <!-- Columna izquierda: Galería 1:1 y miniaturas -->
            <div class="lg:col-span-6 space-y-4">
                <div class="aspect-square w-full bg-white dark:bg-slate-900/90 rounded-2xl border border-zinc-200 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-center transition-colors">
                    <img
                        v-if="imagenActivaUrl"
                        :src="imagenActivaUrl"
                        :alt="producto.nombre"
                        width="900"
                        height="900"
                        class="w-full h-full object-cover"
                        data-testid="detail-main-image"
                        @error="errorImagenActiva = true"
                    />
                    <div
                        v-else
                        class="w-full h-full flex flex-col items-center justify-center gap-3 p-8 bg-zinc-50 dark:bg-slate-950 text-zinc-400 dark:text-slate-500"
                        data-testid="detail-image-placeholder"
                    >
                        <ImageIcon class="w-16 h-16 stroke-[1.5]" aria-hidden="true" />
                        <span class="font-sans text-sm font-medium tracking-wide">
                            ¡Ups! El periquito perdió la foto.
                        </span>
                    </div>
                </div>

                <!-- Tira de miniaturas si existen imágenes adicionales -->
                <fieldset
                    v-if="galeriaImagenes.length > 1"
                    class="grid grid-cols-5 gap-3 m-0 p-0 border-0 min-w-0"
                    aria-label="Miniaturas del producto"
                    data-testid="detail-thumbnails"
                >
                    <button
                        v-for="(img, idx) in galeriaImagenes"
                        :key="idx"
                        type="button"
                        class="aspect-square bg-white dark:bg-slate-900 rounded-lg border border-zinc-200 dark:border-slate-700 overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario/40 cursor-pointer"
                        :class="
                            idx === indiceImagenActiva
                                ? 'ring-2 ring-brand-secundario border-brand-secundario shadow-sm'
                                : 'opacity-75 hover:opacity-100'
                        "
                        :aria-label="`Ver imagen ${idx + 1} de ${producto.nombre}`"
                        @click="
                            indiceImagenActiva = idx;
                            errorImagenActiva = false;
                        "
                    >
                        <img
                            v-if="obtenerMiniaturaGaleria(img)"
                            :src="obtenerMiniaturaGaleria(img) ?? ''"
                            :alt="`${producto.nombre} miniatura ${idx + 1}`"
                            loading="lazy"
                            width="140"
                            height="140"
                            class="w-full h-full object-cover"
                        />
                    </button>
                </fieldset>
            </div>

            <!-- Columna derecha: Información, stock, compra y calificación -->
            <div class="lg:col-span-6 space-y-6">
                <div class="p-6 sm:p-7 bg-white dark:bg-slate-900/90 rounded-2xl border border-zinc-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
                    <!-- Categoría y badge de stock en tiempo real (RF-03) -->
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span
                            v-if="producto.categoria?.nombre"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-secundario/10 dark:bg-sky-950/40 border border-brand-secundario/20 dark:border-sky-800/60 font-sans text-xs font-semibold text-brand-secundario dark:text-sky-300"
                            data-testid="detail-category"
                        >
                            <Tag class="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{{ producto.categoria.nombre }}</span>
                        </span>

                        <StockIndicator
                            :stock="stockActual"
                            :umbral-stock-bajo="umbralStockBajo"
                            :cargando="cargandoStock"
                            :mostrar-unidades="true"
                        />
                    </div>

                    <!-- Título y precio -->
                    <div class="space-y-2">
                        <h1
                            class="font-display font-extrabold text-2xl sm:text-3xl text-zinc-900 dark:text-slate-100 leading-tight"
                            data-testid="detail-title"
                        >
                            {{ producto.nombre }}
                        </h1>

                        <p
                            class="font-mono font-extrabold text-2xl text-brand-primario"
                            data-testid="detail-price"
                        >
                            {{ precioFormateado }}
                        </p>
                    </div>

                    <!-- Descripción completa -->
                    <p
                        v-if="producto.descripcion"
                        class="font-sans text-sm sm:text-base text-zinc-600 dark:text-slate-300 leading-relaxed pt-3 border-t border-zinc-100 dark:border-slate-800"
                        data-testid="detail-description"
                    >
                        {{ producto.descripcion }}
                    </p>

                    <!-- Etiquetas / palabras clave (RF-23) -->
                    <div
                        v-if="(producto.palabrasClave?.length ?? 0) > 0"
                        class="flex flex-wrap gap-1.5 pt-1"
                        aria-label="Palabras clave del producto"
                    >
                        <span
                            v-for="tag in producto.palabrasClave"
                            :key="tag"
                            class="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 font-sans text-xs text-zinc-600 dark:text-slate-300"
                        >
                            #{{ tag }}
                        </span>
                    </div>

                    <!-- Selector de cantidad y botones de acción (Lista de Pedido + WhatsApp directo) -->
                    <div class="pt-4 border-t border-zinc-200 dark:border-slate-800 space-y-3">
                        <div
                            v-if="!agotado"
                            class="flex items-center justify-between gap-4"
                        >
                            <span class="font-sans text-xs font-semibold text-zinc-700 dark:text-slate-300">
                                Cantidad:
                            </span>
                            <div class="inline-flex items-center rounded-lg border border-zinc-300 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800 overflow-hidden">
                                <button
                                    type="button"
                                    class="px-3 py-1.5 hover:bg-zinc-200 dark:hover:bg-slate-700 text-zinc-700 dark:text-slate-200 transition-colors cursor-pointer"
                                    aria-label="Disminuir cantidad"
                                    data-testid="detail-decrease-qty"
                                    @click="disminuirCantidad"
                                >
                                    <Minus class="w-4 h-4" aria-hidden="true" />
                                </button>
                                <span
                                    class="px-4 py-1 font-mono text-sm font-bold text-zinc-900 dark:text-slate-100 border-x border-zinc-300 dark:border-slate-700"
                                    data-testid="detail-qty-value"
                                >
                                    {{ cantidadSeleccionada }}
                                </span>
                                <button
                                    type="button"
                                    :disabled="cantidadSeleccionada >= stockActual"
                                    class="px-3 py-1.5 hover:bg-zinc-200 dark:hover:bg-slate-700 text-zinc-700 dark:text-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                                    aria-label="Aumentar cantidad"
                                    data-testid="detail-increase-qty"
                                    @click="aumentarCantidad"
                                >
                                    <Plus class="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        <!-- Botón Agregar a mi lista de pedido -->
                        <button
                            type="button"
                            :disabled="agotado"
                            :aria-disabled="agotado"
                            :class="[
                                'min-h-[48px] w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg font-display font-bold text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario cursor-pointer',
                                clasesBotonDetallePedido,
                            ]"
                            data-testid="detail-add-to-order"
                            @click="manejarAgregarLista"
                        >
                            <template v-if="agotado">
                                <span>Agotado</span>
                            </template>
                            <template v-else-if="recienAgregado">
                                <Check class="w-5 h-5" aria-hidden="true" />
                                <span>Agregado a mi carrito</span>
                            </template>
                            <template v-else>
                                <ShoppingBag class="w-5 h-5" aria-hidden="true" />
                                <span>Agregar al carrito</span>
                            </template>
                        </button>

                        <!-- Botón directo de WhatsApp (RF-17) -->
                        <WhatsAppButton
                            :href="urlWhatsApp"
                            :disabled="agotado"
                            label="Comprar por WhatsApp"
                            :full-width="true"
                            :producto-id="producto?._id"
                            origen="product_detail"
                        />
                    </div>
                </div>

                <!-- Calificación por estrellas y desglose (RF-06) -->
                <StarRating
                    :producto-id="producto._id"
                    :calificacion-promedio="producto.calificacionPromedio"
                    :rating-count="producto.ratingCount"
                    :rating1-count="producto.rating1Count"
                    :rating2-count="producto.rating2Count"
                    :rating3-count="producto.rating3Count"
                    :rating4-count="producto.rating4Count"
                    :rating5-count="producto.rating5Count"
                    :mostrar-desglose="true"
                />
            </div>
        </div>

        <!-- Estado de producto no encontrado -->
        <div
            v-else
            class="p-8 bg-white dark:bg-slate-900/90 rounded-2xl border border-zinc-200 dark:border-slate-800 shadow-sm text-center space-y-3 transition-colors"
            data-testid="product-not-found"
        >
            <h1 class="font-display font-bold text-2xl text-zinc-900 dark:text-slate-100">
                Al periquito se le perdió la pieza.
            </h1>
            <p class="font-sans text-sm text-zinc-600 dark:text-slate-300">
                El producto que buscas no existe o ya no se encuentra activo en el catálogo.
            </p>
        </div>

        <!-- Secciones inferiores cuando el producto existe -->
        <template v-if="producto">
            <!-- Comentarios moderados (RF-07) -->
            <CommentForm
                :producto-id="producto._id"
                :comentarios="comentarios"
                @rating-updated="manejarRatingActualizado"
            />

            <!-- Productos similares basados en contenido (RF-21) -->
            <SimilarProducts
                :producto-actual-id="producto._id"
                :catalogo-productos="catalogoProductos"
                :umbral-stock-bajo="umbralStockBajo"
            />

            <!-- Vistos recientemente (RF-22) -->
            <RecentlyViewed
                :catalogo-productos="catalogoProductos"
                :exclude-product-id="producto._id"
                :umbral-stock-bajo="umbralStockBajo"
            />
        </template>
    </div>
</template>
