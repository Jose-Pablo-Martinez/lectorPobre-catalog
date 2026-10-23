<!--
  @file default.vue
  @description Layout público principal del catálogo "Lector Pobre" bajo la dirección
  "Neo-Pop Limpio con Carácter de Taller" y arquitectura Mobile-First.
  Incluye barra de anuncios superior refinada, encabezado tipográfico limpio,
  botón táctil de acceso a la Lista de Pedido con contador en Amarillo Cempasúchil,
  contenedor centrado `max-w-7xl`, pie de página con enlaces a redes sociales
  (Instagram, Facebook y YouTube — RF-05) y el cajón global `CartDrawer.vue`.
  @satisfies RF-01, RF-05, RF-15, RF-16, RF-17, RNF-05
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ShoppingBag, Sparkles } from 'lucide-vue-next';
import CartDrawer from '~/components/CartDrawer.vue';
import { useCart } from '~/composables/useCart';
import type { ConfiguracionGlobal } from '~/types/sanity';

const { totalItems, toggleCart } = useCart();

const configGlobal = ref<Partial<ConfiguracionGlobal> | null>(null);

try {
    const sanity = useSanity();
    const asyncConfig = useAsyncData('layout-global-config', () =>
        sanity.fetch<Partial<ConfiguracionGlobal> | null>(
            `*[_type == "configuracionGlobal"][0]{
                nombreSitio,
                numeroWhatsApp,
                urlInstagram,
                urlFacebook,
                urlTikTok,
                urlYouTube,
                patronDecorativoActivo
            }`
        )
    );
    watch(
        () => asyncConfig.data.value,
        (val) => {
            if (val) {
                configGlobal.value = val;
            }
        },
        { immediate: true, flush: 'sync' }
    );
} catch {
    // Fallback seguro fuera de Nuxt runtime
}

const nombreSitio = computed(() => configGlobal.value?.nombreSitio ?? 'Lector Pobre');
const numeroWhatsApp = computed(
    () => configGlobal.value?.numeroWhatsApp ?? ''
);
const urlInstagram = computed(() => {
    const val = configGlobal.value?.urlInstagram;
    if (val && !val.includes('instagram.com/lectorpobre')) {
        return val;
    }
    return 'https://www.instagram.com/lector_pobre';
});
const urlFacebook = computed(() => {
    const val = configGlobal.value?.urlFacebook;
    if (val && !val.includes('facebook.com/lectorpobre')) {
        return val;
    }
    return 'https://www.facebook.com/profile.php?id=61594042757515';
});
const urlYouTube = computed(
    () => configGlobal.value?.urlYouTube || 'https://www.youtube.com/@lectorpobre'
);
</script>

<template>
    <div
        class="min-h-screen flex flex-col bg-zinc-50 text-brand-texto font-sans"
        :class="{ 'patron-decorativo-activo': configGlobal?.patronDecorativoActivo }"
    >
        <!-- Barra superior de anuncios del taller -->
        <div class="bg-zinc-900 text-white border-b border-zinc-800 py-2 px-4">
            <div class="max-w-7xl mx-auto flex items-center justify-center gap-2 font-sans text-xs font-medium tracking-wide text-center">
                <Sparkles class="w-3.5 h-3.5 text-brand-acento shrink-0" aria-hidden="true" />
                <span>
                    Arte de Yucatán · ¡Llaveros, pines, stickers, prints, tote bags y mucho más! · Cotización directa por WhatsApp
                </span>
            </div>
        </div>

        <!-- Encabezado principal Mobile-First (h-16 en móvil, h-20 en sm+) -->
        <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-zinc-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
                <!-- Identidad tipográfica limpia preparada para logotipo vectorial oficial -->
                <a
                    href="/"
                    class="inline-flex flex-col justify-center min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario rounded-lg"
                    aria-label="Ir al inicio del catálogo de Lector Pobre"
                >
                    <span class="font-display font-extrabold text-xl tracking-tight text-zinc-900 leading-none">
                        {{ nombreSitio }}
                    </span>
                    <span class="font-sans text-xs font-semibold text-brand-secundario tracking-wide mt-0.5">
                        Arte &amp; Artesanías
                    </span>
                </a>

                <!-- Acciones del Header: Navegación + Botón Táctil Lista de Pedido -->
                <div class="flex items-center gap-3 sm:gap-4">
                    <a
                        href="/"
                        class="hidden sm:inline-flex items-center min-h-[44px] px-3 py-2 font-display font-bold text-sm text-brand-texto hover:text-brand-secundario transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                        Catálogo
                    </a>

                    <button
                        type="button"
                        class="min-h-[44px] inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 rounded-lg bg-brand-primario text-white font-display font-bold text-sm border-2 border-brand-texto shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                        aria-label="Abrir mi lista de pedido"
                        data-testid="open-cart-button"
                        @click="toggleCart"
                    >
                        <ShoppingBag class="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span class="hidden sm:inline">Carrito de Compras</span>
                        <span
                            class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded bg-brand-acento text-brand-texto font-mono text-xs font-black border border-brand-texto"
                            data-testid="cart-badge-count"
                        >
                            {{ totalItems }}
                        </span>
                    </button>
                </div>
            </div>
        </header>

        <!-- Contenido principal centrado max-w-7xl con espaciado Mobile-First (RNF-05) -->
        <main class="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
            <slot />
        </main>

        <!-- Pie de página con redes sociales (RF-05) -->
        <footer class="bg-white border-t border-zinc-200 py-10 sm:py-12 mt-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div class="space-y-2 max-w-md">
                    <p class="font-display font-extrabold text-lg text-brand-texto">
                        {{ nombreSitio }} · Arte de Yucatán
                    </p>
                    <p class="font-sans text-sm text-zinc-600 leading-relaxed">
                        Llaveros acrílicos con protección de resina, pines, art prints, tote bags y stickers ilustrados. Diseños originales. Cotizaciones por WhatsApp.
                    </p>
                </div>

                <!-- Iconos vectoriales de redes sociales con estilo táctil (RF-05) -->
                <div class="flex flex-col sm:items-end gap-3">
                    <span class="font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Síguenos en nuestras redes sociales
                    </span>
                    <div class="flex flex-wrap items-center gap-2.5" data-testid="social-links">
                        <a
                            v-if="urlInstagram"
                            :href="urlInstagram"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-brand-acento text-brand-texto font-mono text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            aria-label="Visitar Instagram de Lector Pobre"
                            data-testid="social-instagram"
                        >
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            <span>Instagram</span>
                        </a>

                        <a
                            v-if="urlFacebook"
                            :href="urlFacebook"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-brand-acento text-brand-texto font-mono text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            aria-label="Visitar Facebook de Lector Pobre"
                            data-testid="social-facebook"
                        >
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                            </svg>
                            <span>Facebook</span>
                        </a>

                        <a
                            v-if="urlYouTube"
                            :href="urlYouTube"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-brand-acento text-brand-texto font-mono text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            aria-label="Visitar YouTube de Lector Pobre"
                            data-testid="social-youtube"
                        >
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span>YouTube</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>

        <!-- Cajón lateral global de Lista de Pedido -->
        <CartDrawer :numero-whats-app="numeroWhatsApp" />
    </div>
</template>
