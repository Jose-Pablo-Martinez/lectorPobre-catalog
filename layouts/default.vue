<!--
  @file default.vue
  @description Layout público principal del catálogo "Lector Pobre" bajo el sistema de diseño
  "Taller Urbano Neo-Pop". Incluye barra de anuncios, encabezado con ilustración vectorial del
  Periquito mascota, botón de acceso a la Lista de Pedido, contenedor centrado `max-w-7xl`,
  pie de página con enlaces a redes sociales (RF-05) y el cajón global `CartDrawer.vue`.
  @satisfies RF-01, RF-05, RF-15, RF-16, RF-17, RNF-05
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Palette, ShoppingBag, Sparkles } from 'lucide-vue-next';
import CartDrawer from '~/components/CartDrawer.vue';
import { useCart } from '~/composables/useCart';
import type { ConfiguracionGlobal } from '~/types/sanity';

const { totalItems, toggleCart } = useCart();

const configGlobal = ref<Partial<ConfiguracionGlobal> | null>(null);

try {
    const sanity = useSanity();
    const { data } = useAsyncData('layout-global-config', () =>
        sanity.fetch<Partial<ConfiguracionGlobal> | null>(
            `*[_type == "configuracionGlobal"][0]{
                nombreSitio,
                numeroWhatsApp,
                urlInstagram,
                urlFacebook,
                urlTikTok,
                patronDecorativoActivo
            }`
        )
    );
    if (data.value) {
        configGlobal.value = data.value;
    }
} catch {
    // Fallback seguro fuera de Nuxt runtime
}

const nombreSitio = computed(() => configGlobal.value?.nombreSitio ?? 'Lector Pobre');
const numeroWhatsApp = computed(
    () => configGlobal.value?.numeroWhatsApp ?? '5219991234567'
);
const urlInstagram = computed(
    () => configGlobal.value?.urlInstagram ?? 'https://instagram.com/lectorpobre'
);
const urlFacebook = computed(
    () => configGlobal.value?.urlFacebook ?? 'https://facebook.com/lectorpobre'
);
const urlTikTok = computed(
    () => configGlobal.value?.urlTikTok ?? 'https://tiktok.com/@lectorpobre'
);
</script>

<template>
    <div
        class="min-h-screen flex flex-col bg-brand-fondo text-brand-texto font-sans"
        :class="{ 'patron-decorativo-activo': configGlobal?.patronDecorativoActivo }"
    >
        <!-- Barra superior de anuncios del taller -->
        <div class="bg-brand-acento text-brand-texto border-b-2 border-brand-texto py-2 px-4">
            <div class="max-w-7xl mx-auto flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-center">
                <Sparkles class="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                    Taller de arte y manualidades · Llaveros, pines, prints y stickers hechos con dedicación · Cotización directa por WhatsApp
                </span>
            </div>
        </div>

        <!-- Encabezado principal -->
        <header class="sticky top-0 z-30 bg-white border-b-2 border-brand-texto">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
                <!-- Identidad de marca + Mascota Periquito SVG -->
                <a
                    href="/"
                    class="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario"
                    aria-label="Ir al inicio del catálogo de Lector Pobre"
                >
                    <div class="w-12 h-12 bg-brand-acento border-2 border-brand-texto shadow-hard-sm flex items-center justify-center shrink-0 transition-transform group-hover:-rotate-3">
                        <!-- Ilustración vectorial geométrica del Periquito con lentes -->
                        <svg
                            class="w-9 h-9"
                            viewBox="0 0 40 40"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <circle cx="20" cy="21" r="13" fill="#22c55e" stroke="#18181b" stroke-width="2.5" />
                            <path d="M16 8L20 4L24 8" stroke="#18181b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                            <rect x="9" y="15" width="9" height="7" rx="1.5" fill="#ffffff" stroke="#18181b" stroke-width="2" />
                            <rect x="22" y="15" width="9" height="7" rx="1.5" fill="#ffffff" stroke="#18181b" stroke-width="2" />
                            <line x1="18" y1="18.5" x2="22" y2="18.5" stroke="#18181b" stroke-width="2" />
                            <circle cx="13.5" cy="18.5" r="1.5" fill="#18181b" />
                            <circle cx="26.5" cy="18.5" r="1.5" fill="#18181b" />
                            <polygon points="17,24 23,24 20,29" fill="#ffd000" stroke="#18181b" stroke-width="2" stroke-linejoin="round" />
                        </svg>
                    </div>

                    <div>
                        <span class="block font-display font-extrabold text-xl sm:text-2xl tracking-tight text-brand-texto leading-none">
                            {{ nombreSitio }}
                        </span>
                        <span class="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-brand-primario mt-0.5">
                            <Palette class="w-3 h-3" aria-hidden="true" />
                            <span>Taller de Arte &amp; Accesorios</span>
                        </span>
                    </div>
                </a>

                <!-- Acciones del Header: Navegación + Botón Lista de Pedido -->
                <div class="flex items-center gap-3">
                    <a
                        href="/"
                        class="hidden sm:inline-flex items-center px-3 py-2 font-display font-bold text-sm text-brand-texto hover:text-brand-primario transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                        Catálogo
                    </a>

                    <button
                        type="button"
                        class="inline-flex items-center gap-2.5 px-4 py-2.5 bg-brand-primario text-white font-display font-bold text-sm border-2 border-brand-texto shadow-hard transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                        aria-label="Abrir mi lista de pedido"
                        data-testid="open-cart-button"
                        @click="toggleCart"
                    >
                        <ShoppingBag class="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span class="hidden xs:inline">Mi Lista de Pedido</span>
                        <span
                            class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 bg-brand-acento text-brand-texto font-mono text-xs font-extrabold border-2 border-brand-texto"
                            data-testid="cart-badge-count"
                        >
                            {{ totalItems }}
                        </span>
                    </button>
                </div>
            </div>
        </header>

        <!-- Contenido principal centrado max-w-7xl (RNF-05) -->
        <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <slot />
        </main>

        <!-- Pie de página con redes sociales (RF-05) -->
        <footer class="bg-white border-t-2 border-brand-texto mt-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div class="space-y-2 max-w-md">
                    <p class="font-display font-extrabold text-lg text-brand-texto">
                        {{ nombreSitio }} · Taller Creativo
                    </p>
                    <p class="font-sans text-sm text-zinc-600">
                        Llaveros acrílicos y de resina, pines esmaltados, art prints y stickers ilustrados originalmente. Cotizaciones directas sin intermediarios.
                    </p>
                </div>

                <!-- Iconos vectoriales de redes sociales (RF-05) -->
                <div class="flex flex-col sm:items-end gap-3">
                    <span class="font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Síguenos en redes sociales
                    </span>
                    <div class="flex items-center gap-3" data-testid="social-links">
                        <a
                            v-if="urlInstagram"
                            :href="urlInstagram"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-2 px-3 py-2 bg-brand-fondo hover:bg-brand-acento text-brand-texto font-mono text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-colors"
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
                            class="inline-flex items-center gap-2 px-3 py-2 bg-brand-fondo hover:bg-brand-acento text-brand-texto font-mono text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-colors"
                            aria-label="Visitar Facebook de Lector Pobre"
                            data-testid="social-facebook"
                        >
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                            </svg>
                            <span>Facebook</span>
                        </a>

                        <a
                            v-if="urlTikTok"
                            :href="urlTikTok"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-2 px-3 py-2 bg-brand-fondo hover:bg-brand-acento text-brand-texto font-mono text-xs font-bold border-2 border-brand-texto shadow-hard-sm transition-colors"
                            aria-label="Visitar TikTok de Lector Pobre"
                            data-testid="social-tiktok"
                        >
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                            <span>TikTok</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>

        <!-- Cajón lateral global de Lista de Pedido -->
        <CartDrawer :numero-whats-app="numeroWhatsApp" />
    </div>
</template>
