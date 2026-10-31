<!--
  @file WhatsAppButton.vue
  @description Botón neobrutalista de acción principal para contacto y compra vía WhatsApp
  con color oficial #25D366, borde sólido de 2px e ícono vectorial SVG oficial.
  Garantiza contraste accesible >= 4.5:1 con texto oscuro sobre verde (#25D366).
  Se deshabilita automáticamente cuando el producto está agotado.
  @satisfies RF-03, RF-14, RF-15, RF-17, RNF-05
-->
<script setup lang="ts">
export interface WhatsAppButtonProps {
    href: string;
    disabled?: boolean;
    label?: string;
    fullWidth?: boolean;
}

withDefaults(defineProps<WhatsAppButtonProps>(), {
    disabled: false,
    label: 'Comprar por WhatsApp',
    fullWidth: true,
});
</script>

<template>
    <a
        v-if="!disabled"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        :class="[
            'inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-whatsapp hover:bg-whatsapp-hover text-zinc-950 font-display font-bold text-base border-2 border-zinc-950 dark:border-slate-400 shadow-hard dark:shadow-[3px_3px_0px_rgba(0,0,0,0.6)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primario focus-visible:ring-offset-2',
            fullWidth ? 'w-full' : 'w-auto',
        ]"
        :aria-label="label"
        data-testid="whatsapp-button"
    >
        <!-- Ícono vectorial oficial de WhatsApp -->
        <svg
            class="w-5 h-5 shrink-0 fill-current text-zinc-950"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path
                d="M12.031 2C6.508 2 2.023 6.485 2.023 12.008c0 1.766.461 3.49 1.337 5.01L2 22l5.122-1.343a9.97 9.97 0 0 0 4.909 1.298h.004c5.522 0 10.007-4.485 10.007-10.008C22.042 6.485 17.554 2 12.031 2zm5.829 14.139c-.246.693-1.432 1.326-1.995 1.411-.51.076-1.175.109-1.896-.12-.437-.139-.998-.324-1.716-.634-3.019-1.303-4.991-4.343-5.142-4.544-.15-.201-1.227-1.633-1.227-3.115 0-1.482.776-2.21 1.052-2.512.276-.301.602-.377.803-.377.201 0 .401.002.577.011.185.009.433-.07.678.518.251.603.853 2.085.928 2.236.075.151.125.327.025.528-.1.201-.151.326-.301.502-.151.176-.317.393-.452.528-.15.15-.307.313-.132.615.176.301.78 1.287 1.675 2.085 1.151 1.026 2.121 1.344 2.423 1.495.301.151.477.126.652-.075.176-.201.753-.879.954-1.181.201-.301.402-.251.678-.151.276.101 1.757.829 2.058.98.301.151.502.226.577.352.075.125.075.728-.171 1.421z"
            />
        </svg>
        <span>{{ label }}</span>
    </a>

    <button
        v-else
        type="button"
        disabled
        aria-disabled="true"
        :class="[
            'inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-zinc-200 dark:bg-slate-800 text-zinc-500 dark:text-slate-500 font-display font-bold text-base border-2 border-zinc-400 dark:border-slate-700 opacity-70 cursor-not-allowed',
            fullWidth ? 'w-full' : 'w-auto',
        ]"
        data-testid="whatsapp-button-disabled"
    >
        <span>Agotado</span>
    </button>
</template>
