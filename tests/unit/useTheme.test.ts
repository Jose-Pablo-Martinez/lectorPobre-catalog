/**
 * @file useTheme.test.ts
 * @description Pruebas unitarias para el composable useTheme y la integración de tokens de Dark Mode (RF-15).
 * @satisfies RF-15, RNF-05
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
    initTheme,
    setTheme,
    THEME_STORAGE_KEY,
    toggleTheme,
    useTheme,
} from '~/composables/useTheme';
import {
    PALETA_DARK_BASE,
    PALETA_IDENTIDAD,
    resolverTokensPaleta,
} from '~/plugins/palette';

describe('useTheme: Gestión del Modo Oscuro (RF-15, RNF-05)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        setTheme(false);
    });

    it('inicia desactivado por defecto (modo claro)', () => {
        const { isDark } = useTheme();
        expect(isDark.value).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('conmuta a modo oscuro al llamar toggleTheme() y persiste en localStorage', () => {
        const { isDark } = useTheme();
        expect(isDark.value).toBe(false);

        toggleTheme();
        expect(isDark.value).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

        toggleTheme();
        expect(isDark.value).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('establece explícitamente el tema con setTheme()', () => {
        const { isDark } = useTheme();

        setTheme(true);
        expect(isDark.value).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        setTheme(false);
        expect(isDark.value).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('resolverTokensPaleta aplica tokens oscuros sin alterar los colores de marca de Sanity', () => {
        // En modo claro (isDark = false)
        const tokensClaro = resolverTokensPaleta({ paletaActiva: 'cenote' }, false);
        expect(tokensClaro['--color-brand-primario']).toBe('#0f766e');
        expect(tokensClaro['--color-brand-fondo']).toBe('#f0fdfa');
        expect(tokensClaro['--color-brand-texto']).toBe('#0f172a');

        // En modo oscuro (isDark = true)
        const tokensOscuro = resolverTokensPaleta({ paletaActiva: 'cenote' }, true);
        // El color primario de la paleta se preserva
        expect(tokensOscuro['--color-brand-primario']).toBe('#0f766e');
        // El fondo y texto cambian a la escala de elevación oscura sin negros puros
        expect(tokensOscuro['--color-brand-fondo']).toBe(PALETA_DARK_BASE['--color-brand-fondo']);
        expect(tokensOscuro['--color-brand-texto']).toBe(PALETA_DARK_BASE['--color-brand-texto']);
        expect(tokensOscuro['--color-brand-fondo']).not.toBe('#000000');
    });
});

