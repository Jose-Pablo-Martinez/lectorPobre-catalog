<!--
  @file PrimaryButton.vue
  @description Botón atómico reutilizable con estética táctil "Neo-Pop Limpio con Carácter de Taller"
  (borde sólido de 2px, sombra táctil desplazada y respuesta de pulsación mecánica al hacer clic).
  Garantiza contraste accesible >= 4.5:1 en todos sus estados y variantes (RF-15, RNF-05).
  @satisfies RF-01, RF-06, RF-07, RF-15, RNF-05
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Loader2 } from 'lucide-vue-next';

export interface PrimaryButtonProps {
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primario' | 'secundario' | 'acento' | 'neutro';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
}

const props = withDefaults(defineProps<PrimaryButtonProps>(), {
    type: 'button',
    variant: 'primario',
    disabled: false,
    loading: false,
    fullWidth: false,
});

const variantClasses = computed<string>(() => {
    switch (props.variant) {
        case 'secundario':
            return 'bg-brand-secundario text-white hover:opacity-95';
        case 'acento':
            return 'bg-brand-acento text-zinc-950 hover:opacity-95';
        case 'neutro':
            return 'bg-white dark:bg-slate-800 text-brand-texto dark:text-slate-100 hover:bg-zinc-100 dark:hover:bg-slate-700';
        case 'primario':
        default:
            return 'bg-brand-primario text-white hover:opacity-95';
    }
});
</script>

<template>
    <button
        :type="type"
        :disabled="disabled || loading"
        :aria-busy="loading"
        :class="[
            'min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-display font-bold text-sm border-2 border-brand-texto dark:border-slate-500 shadow-hard-sm dark:shadow-[2px_2px_0px_rgba(0,0,0,0.6)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 cursor-pointer',
            variantClasses,
            fullWidth ? 'w-full' : 'w-auto',
        ]"
    >
        <Loader2
            v-if="loading"
            class="w-4 h-4 animate-spin shrink-0"
            aria-hidden="true"
        />
        <slot />
    </button>
</template>
