<!--
  @file [slug].vue
  @description Vista de detalle de producto (`/product/[slug]`) con estética comercial limpia.
  Presenta galería 1:1 con miniaturas, verificación de stock en tiempo real (`useStock`, RF-03),
  precio, descripción, botón de agregar a la Lista de Pedido, botón de compra directa por WhatsApp
  (`WhatsAppButton`, RF-17), sistema de calificación por estrellas con desglose (`StarRating`, RF-06),
  sección de comentarios moderados (`CommentForm`, RF-07), productos similares (`SimilarProducts`, RF-21)
  y registro automático en "Vistos recientemente" (`useRecentlyViewed`, RF-22).
  @satisfies RF-02, RF-03, RF-06, RF-07, RF-14, RF-17, RF-20, RF-21, RF-22
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
import CommentForm from '~/components/CommentForm.vue';
import RecentlyViewed from '~/components/RecentlyViewed.vue';
import SimilarProducts from '~/components/SimilarProducts.vue';
import StarRating from '~/components/StarRating.vue';
import StockIndicator from '~/components/StockIndicator.vue';
import WhatsAppButton from '~/components/WhatsAppButton.vue';
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

// Galería de imágenes (imagenPrincipal + imagenes adicionales)
const galeriaImagenes = computed<SanityImage[]>(() => {
    if (!producto.value) return [];
    const lista: SanityImage[] = [];
    if (producto.value.imagenPrincipal) {
        lista.push(producto.value.imagenPrincipal);
    }
    if (Array.isArray(producto.value.imagenes)) {
        for (const img of producto.value.imagenes) {
            if (img?.asset) {
                lista.push(img);
            }
        }
    }
    return lista;
});

const indiceImagenActiva = ref<number>(0);
const errorImagenActiva = ref<boolean>(false);

const imagenActivaUrl = computed<string | null>(() => {
    if (errorImagenActiva.value) return null;
    const activa = galeriaImagenes.value[indiceImagenActiva.value];
    if (!activa) return null;
    return urlFor(activa, { width: 900, height: 900 });
});

const obtenerMiniaturaGaleria = (img: SanityImage): string | null =>
    urlFor(img, { width: 200, height: 200 });

const cantidadSeleccionada = ref<number>(1);
const recienAgregado = ref<boolean>(false);

const disminuirCantidad = (): void => {
    cantidadSeleccionada.value = Math.max(1, cantidadSeleccionada.value - 1);
};

const aumentarCantidad = (): void => {
    const tope = Math.max(1, stockActual.value);
    cantidadSeleccionada.value = Math.min(tope, cantidadSeleccionada.value + 1);
};

const manejarAgregarLista = (): void => {
    if (!producto.value || agotado.value) return;
    const exito = addItem(
        {
            ...producto.value,
            stock: stockActual.value,
        },
        cantidadSeleccionada.value
    );
    if (exito) {
        recienAgregado.value = true;
        openCart();
        setTimeout(() => {
            recienAgregado.value = false;
        }, 1500);
    }
};

// Enlace directo de WhatsApp para este producto (RF-17)
const urlWhatsApp = computed<string>(() =>
    construirUrlWhatsApp(
        configGlobal.value?.numeroWhatsApp ?? '',
        producto.value?.nombre ?? '',
        configGlobal.value?.mensajeWhatsApp,
        producto.value?.precio
    )
);

const precioFormateado = computed<string>(() =>
    formatearPrecioMXN(producto.value?.precio, 'Precio por cotizar')
);

const clasesBotonDetallePedido = computed<string>(() =>
    obtenerClasesBotonPedido(agotado.value, recienAgregado.value, 'hard')
);

onMounted(() => {
    if (producto.value) {
        registrarVistoReciente(producto.value);
    }
});

watch(
    () => producto.value?._id,
    (id) => {
        if (id && producto.value) {
            registrarVistoReciente(producto.value);
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
                class="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-brand-acento text-brand-texto font-display text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
                <div class="aspect-square w-full bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex items-center justify-center">
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
                        class="w-full h-full flex flex-col items-center justify-center gap-3 p-8 bg-zinc-50 text-zinc-400"
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
                        class="aspect-square bg-white rounded-lg border border-zinc-200 overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario/40"
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
                            class="w-full h-full object-cover"
                        />
                    </button>
                </fieldset>
            </div>

            <!-- Columna derecha: Información, stock, compra y calificación -->
            <div class="lg:col-span-6 space-y-6">
                <div class="p-6 sm:p-7 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-5">
                    <!-- Categoría y badge de stock en tiempo real (RF-03) -->
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span
                            v-if="producto.categoria?.nombre"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-secundario/10 border border-brand-secundario/20 font-sans text-xs font-semibold text-brand-secundario"
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
                            class="font-display font-extrabold text-2xl sm:text-3xl text-zinc-900 leading-tight"
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
                        class="font-sans text-sm sm:text-base text-zinc-600 leading-relaxed pt-3 border-t border-zinc-100"
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
                            class="px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 font-sans text-xs text-zinc-600"
                        >
                            #{{ tag }}
                        </span>
                    </div>

                    <!-- Selector de cantidad y botones de acción (Lista de Pedido + WhatsApp directo) -->
                    <div class="pt-4 border-t border-zinc-200 space-y-3">
                        <div
                            v-if="!agotado"
                            class="flex items-center justify-between gap-4"
                        >
                            <span class="font-sans text-xs font-semibold text-zinc-700">
                                Cantidad:
                            </span>
                            <div class="inline-flex items-center rounded-lg border border-zinc-300 bg-zinc-50 overflow-hidden">
                                <button
                                    type="button"
                                    class="px-3 py-1.5 hover:bg-zinc-200 text-zinc-700 transition-colors"
                                    aria-label="Disminuir cantidad"
                                    data-testid="detail-decrease-qty"
                                    @click="disminuirCantidad"
                                >
                                    <Minus class="w-4 h-4" aria-hidden="true" />
                                </button>
                                <span
                                    class="px-4 py-1 font-mono text-sm font-bold text-zinc-900 border-x border-zinc-300"
                                    data-testid="detail-qty-value"
                                >
                                    {{ cantidadSeleccionada }}
                                </span>
                                <button
                                    type="button"
                                    :disabled="cantidadSeleccionada >= stockActual"
                                    class="px-3 py-1.5 hover:bg-zinc-200 text-zinc-700 disabled:opacity-40 transition-colors"
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
                                'min-h-[48px] w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg font-display font-bold text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario',
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

                        <!-- Botón directo de WhatsApp (RF-17) - Diseño visual intacto -->
                        <WhatsAppButton
                            :href="urlWhatsApp"
                            :disabled="agotado"
                            label="Comprar por WhatsApp"
                            :full-width="true"
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
            class="p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm text-center space-y-3"
            data-testid="product-not-found"
        >
            <h1 class="font-display font-bold text-2xl text-zinc-900">
                Al periquito se le perdió la pieza.
            </h1>
            <p class="font-sans text-sm text-zinc-600">
                El producto que buscas no existe o ya no se encuentra activo en el catálogo.
            </p>
        </div>

        <!-- Secciones inferiores cuando el producto existe -->
        <template v-if="producto">
            <!-- Comentarios moderados (RF-07) -->
            <CommentForm
                :producto-id="producto._id"
                :comentarios="comentarios"
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
