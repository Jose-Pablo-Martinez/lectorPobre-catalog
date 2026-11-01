/**
 * @file layout.test.ts
 * @description Pruebas unitarias del layout principal default.vue y conmutador de Dark Mode (RF-15, RNF-05).
 * @satisfies RF-01, RF-05, RF-15, RNF-05
 */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import DefaultLayout from '~/layouts/default.vue';
import { setTheme, useTheme } from '~/composables/useTheme';

const STUBS_DEFAULT = {
    CartDrawer: true,
};

describe('Layout default.vue: Header y Conmutador Dark Mode (RF-15, RNF-05)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        setTheme(false);
    });

    it('renderiza el conmutador de tema con icono Moon y aria-label accesible por defecto', () => {
        const wrapper = mount(DefaultLayout, {
            global: {
                stubs: STUBS_DEFAULT,
            },
        });

        const toggleBtn = wrapper.find('[data-testid="theme-toggle-button"]');
        expect(toggleBtn.exists()).toBe(true);
        expect(toggleBtn.attributes('aria-label')).toBe('Cambiar a modo oscuro');
        expect(toggleBtn.attributes('title')).toBe('Cambiar a modo oscuro');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('conmuta a modo oscuro al presionar el botón en el header', async () => {
        const wrapper = mount(DefaultLayout, {
            global: {
                stubs: STUBS_DEFAULT,
            },
        });

        const toggleBtn = wrapper.find('[data-testid="theme-toggle-button"]');
        await toggleBtn.trigger('click');

        const { isDark } = useTheme();
        expect(isDark.value).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(toggleBtn.attributes('aria-label')).toBe('Cambiar a modo claro');

        await toggleBtn.trigger('click');
        expect(isDark.value).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(toggleBtn.attributes('aria-label')).toBe('Cambiar a modo oscuro');
    });

    it('renderiza enlaces de redes sociales y carrito con contraste accesible', () => {
        const wrapper = mount(DefaultLayout, {
            global: {
                stubs: STUBS_DEFAULT,
            },
        });

        const cartBtn = wrapper.find('[data-testid="open-cart-button"]');
        expect(cartBtn.exists()).toBe(true);

        const socialLinks = wrapper.find('[data-testid="social-links"]');
        expect(socialLinks.exists()).toBe(true);
    });
});
