<!--
  @file BaseSelect.vue
  @description Selector accesible reutilizable con estética Neo-Pop.
  Se despliega como Bottom Sheet táctil en móvil (< sm) y como popover
  anclado en escritorio (sm+), evitando los cuadros nativos inconsistentes.
  @satisfies RF-01, RF-04, RF-15, RNF-05
-->
<script setup lang="ts">
import { Check, ChevronDown, X } from 'lucide-vue-next';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

export interface BaseSelectOption {
    value: string;
    label: string;
}

const props = withDefaults(
    defineProps<{
        modelValue: string;
        options: readonly BaseSelectOption[];
        id?: string;
        label?: string;
        ariaLabel?: string;
        placeholder?: string;
        testIdPrefix?: string;
    }>(),
    {
        id: 'base-select',
        label: '',
        ariaLabel: '',
        placeholder: 'Seleccionar...',
        testIdPrefix: 'base-select',
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const abierto = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);

const panelId = computed(() => `${props.id}-panel`);

const etiquetaSeleccionada = computed<string>(
    () => props.options.find((opt) => opt.value === props.modelValue)?.label ?? props.placeholder
);

const tituloDialogo = computed<string>(
    () => props.label || props.ariaLabel || props.placeholder
);

const cerrar = (devolverFoco = false): void => {
    abierto.value = false;
    if (devolverFoco) {
        triggerRef.value?.focus();
    }
};

const conmutar = (): void => {
    abierto.value = !abierto.value;
};

const seleccionar = (valor: string): void => {
    emit('update:modelValue', valor);
    cerrar(true);
};

const manejarClickFuera = (ev: Event): void => {
    if (!abierto.value || !containerRef.value) return;
    const target = ev.target as Node | null;
    if (target && !containerRef.value.contains(target)) {
        cerrar();
    }
};

const enfocarOpcionPorDelta = (delta: number): void => {
    const botones = Array.from(
        containerRef.value?.querySelectorAll<HTMLButtonElement>('[data-select-option]') ?? []
    );
    if (botones.length === 0) return;

    const activo = typeof document === 'undefined' ? null : document.activeElement;
    const indiceActual =
        activo instanceof HTMLButtonElement ? botones.indexOf(activo) : -1;
    let siguiente: number;
    if (indiceActual === -1) {
        siguiente = delta > 0 ? 0 : botones.length - 1;
    } else {
        siguiente = (indiceActual + delta + botones.length) % botones.length;
    }

    botones[siguiente]?.focus();
};

const manejarTecladoContenedor = async (ev: KeyboardEvent): Promise<void> => {
    if (ev.key === 'Escape' && abierto.value) {
        ev.preventDefault();
        cerrar(true);
        return;
    }

    if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (!abierto.value) {
            abierto.value = true;
            await nextTick();
        }
        enfocarOpcionPorDelta(1);
        return;
    }

    if (ev.key === 'ArrowUp' && abierto.value) {
        ev.preventDefault();
        enfocarOpcionPorDelta(-1);
    }
};

onMounted(() => {
    if (typeof document !== 'undefined') {
        document.addEventListener('pointerdown', manejarClickFuera);
    }
});

onBeforeUnmount(() => {
    if (typeof document !== 'undefined') {
        document.removeEventListener('pointerdown', manejarClickFuera);
    }
});
</script>

<template>
    <div ref="containerRef" class="relative">
        <button
            :id="id"
            ref="triggerRef"
            type="button"
            :aria-expanded="abierto"
            :aria-controls="panelId"
            :aria-label="ariaLabel || label || undefined"
            class="min-h-[44px] sm:min-h-[38px] w-full sm:w-auto sm:min-w-[12.5rem] inline-flex items-center justify-between gap-2.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-sm sm:text-xs font-sans font-semibold transition-all touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
            :class="
                abierto
                    ? 'bg-white dark:bg-slate-800 border-2 border-brand-secundario text-brand-texto dark:text-slate-100 shadow-hard-sm dark:shadow-[2px_2px_0px_rgba(0,0,0,0.6)]'
                    : 'bg-white dark:bg-slate-800 hover:bg-zinc-50 dark:hover:bg-slate-700/80 border border-zinc-300 dark:border-slate-700 text-zinc-800 dark:text-slate-100'
            "
            :data-testid="`${testIdPrefix}-trigger`"
            @click="conmutar"
            @keydown="manejarTecladoContenedor"
        >
            <span class="truncate">{{ etiquetaSeleccionada }}</span>
            <ChevronDown
                class="w-4 h-4 shrink-0 transition-transform duration-200"
                :class="
                    abierto
                        ? 'rotate-180 text-brand-secundario'
                        : 'text-zinc-500 dark:text-slate-400'
                "
                aria-hidden="true"
            />
        </button>

        <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <button
                v-if="abierto"
                type="button"
                tabindex="-1"
                aria-label="Cerrar opciones"
                class="fixed inset-0 z-40 bg-zinc-950/45 backdrop-blur-[2px] sm:hidden cursor-default"
                :data-testid="`${testIdPrefix}-backdrop`"
                @click="cerrar()"
            />
        </Transition>

        <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-2 sm:translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2 sm:translate-y-1"
        >
            <div
                v-if="abierto"
                class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t-2 border-x-2 border-brand-texto dark:border-slate-600 bg-white dark:bg-slate-900 shadow-2xl pb-6 pt-2.5 px-3 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:z-30 sm:w-64 sm:rounded-xl sm:border-2 sm:border-brand-texto sm:dark:border-slate-600 sm:bg-white sm:dark:bg-slate-800 sm:shadow-hard sm:dark:shadow-[4px_4px_0px_rgba(0,0,0,0.6)] sm:p-1.5"
                :data-testid="`${testIdPrefix}-panel`"
            >
                <div class="sm:hidden pb-2.5 mb-2 border-b border-zinc-200 dark:border-slate-800">
                    <div
                        class="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-slate-700"
                        aria-hidden="true"
                    />
                    <div class="flex items-center justify-between gap-2 px-1">
                        <span class="font-display font-extrabold text-sm text-brand-texto dark:text-slate-100">
                            {{ tituloDialogo }}
                        </span>
                        <button
                            type="button"
                            class="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                            aria-label="Cerrar opciones"
                            :data-testid="`${testIdPrefix}-close`"
                            @click="cerrar(true)"
                            @keydown="manejarTecladoContenedor"
                        >
                            <X class="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <ul
                    :id="panelId"
                    :aria-label="tituloDialogo"
                    class="space-y-1 max-h-[60vh] sm:max-h-72 overflow-y-auto"
                >
                    <li v-for="opt in options" :key="opt.value">
                        <button
                            type="button"
                            data-select-option
                            :aria-pressed="opt.value === modelValue"
                            class="min-h-[48px] sm:min-h-[38px] w-full flex items-center justify-between gap-3 px-3.5 sm:px-3 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-left text-sm sm:text-xs font-sans transition-colors touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secundario"
                            :class="
                                opt.value === modelValue
                                    ? 'bg-brand-acento text-zinc-950 font-bold border-2 border-brand-texto dark:border-slate-500 shadow-hard-sm'
                                    : 'text-zinc-800 dark:text-slate-100 hover:bg-zinc-100 dark:hover:bg-slate-700/80 font-medium border border-transparent'
                            "
                            :data-testid="`${testIdPrefix}-option-${opt.value}`"
                            @click="seleccionar(opt.value)"
                            @keydown="manejarTecladoContenedor"
                        >
                            <span>{{ opt.label }}</span>
                            <Check
                                v-if="opt.value === modelValue"
                                class="w-4 h-4 shrink-0 text-zinc-950 stroke-[2.5]"
                                aria-hidden="true"
                            />
                        </button>
                    </li>
                </ul>
            </div>
        </Transition>
    </div>
</template>
