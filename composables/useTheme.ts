/**
 * @file useTheme.ts
 * @description Composable para gestión del Modo Oscuro (Dark Mode) en Lector Pobre.
 * Desactivado por defecto (modo claro), con persistencia en localStorage ('lp:theme')
 * y sincronización de clase 'dark' en el elemento raíz (<html>).
 * Funciona en paralelo con la paleta activa configurada por el administrador en Sanity.
 * @satisfies RF-15, RNF-05
 */

import { readonly, ref } from 'vue';
import {
    readLocalStorageSafe,
    writeLocalStorageSafe,
} from '~/composables/useRecentlyViewed';

export const THEME_STORAGE_KEY = 'lp:theme';

// Estado singleton reactivo compartido entre todas las instancias del composable
const isDark = ref<boolean>(false);
const initialized = ref<boolean>(false);

function applyThemeClass(dark: boolean): void {
    if (typeof document === 'undefined') return;
    if (dark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

/**
 * Inicializa el tema leyendo la preferencia almacenada en localStorage.
 * Por defecto está desactivado (modo claro).
 */
export function initTheme(): void {
    if (initialized.value) return;
    const saved = readLocalStorageSafe(THEME_STORAGE_KEY);
    const shouldBeDark = saved === 'dark';
    isDark.value = shouldBeDark;
    applyThemeClass(shouldBeDark);
    initialized.value = true;
}

/**
 * Alterna el tema actual entre claro y oscuro, persistiendo el cambio en localStorage.
 */
export function toggleTheme(): void {
    const next = !isDark.value;
    isDark.value = next;
    writeLocalStorageSafe(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    applyThemeClass(next);
}

/**
 * Establece explícitamente el tema activo (claro u oscuro).
 *
 * @param dark True para modo oscuro, false para modo claro.
 */
export function setTheme(dark: boolean): void {
    isDark.value = dark;
    writeLocalStorageSafe(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
    applyThemeClass(dark);
}

/**
 * Hook composable para acceder al estado y controles del Modo Oscuro.
 */
export function useTheme() {
    if (typeof window !== 'undefined' && !initialized.value) {
        initTheme();
    }

    return {
        isDark: readonly(isDark),
        initialized: readonly(initialized),
        toggleTheme,
        setTheme,
        initTheme,
    };
}

