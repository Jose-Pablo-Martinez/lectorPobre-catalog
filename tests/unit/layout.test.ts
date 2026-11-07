/**
 * @file layout.test.ts
 * @description Pruebas unitarias del layout principal default.vue y conmutador de Dark Mode (RF-15, RNF-05).
 * @satisfies RF-01, RF-05, RF-15, RNF-05
 */

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import DefaultLayout from '~/layouts/default.vue';
import { sanitizarHrefWhatsApp, sanitizarUrlRed } from '~/composables/useSafeUrl';
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

        // Ambos iconos (Sun y Moon) están presentes en el DOM con clases CSS dark: para evitar hydration mismatch
        const svgs = toggleBtn.findAll('svg');
        expect(svgs).toHaveLength(2);
        expect(svgs[0]?.classes()).toContain('dark:block');
        expect(svgs[0]?.classes()).toContain('text-amber-400');
        expect(svgs[1]?.classes()).toContain('dark:hidden');
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

    it('V-06: sanitizarUrlRed valida esquema https y host oficial por red social y bloquea javascript:/phishing', () => {
        const fbFallback = 'https://www.facebook.com/profile.php?id=61594042757515';
        const igFallback = 'https://www.instagram.com/lector_pobre';
        const ytFallback = 'https://www.youtube.com/@lectorpobre';
        const ttFallback = 'https://www.tiktok.com/@lectorpobre';

        // URLs legítimas aceptadas
        expect(sanitizarUrlRed('https://www.instagram.com/lector_pobre_arte', 'instagram', igFallback)).toBe(
            'https://www.instagram.com/lector_pobre_arte'
        );
        expect(sanitizarUrlRed('https://fb.com/lectorpobre', 'facebook', fbFallback)).toBe(
            'https://fb.com/lectorpobre'
        );
        expect(sanitizarUrlRed('https://m.facebook.com/lectorpobre', 'facebook', fbFallback)).toBe(
            'https://m.facebook.com/lectorpobre'
        );
        expect(sanitizarUrlRed('https://youtu.be/dQw4w9WgXcQ', 'youtube', ytFallback)).toBe(
            'https://youtu.be/dQw4w9WgXcQ'
        );
        expect(sanitizarUrlRed('https://www.tiktok.com/@lector_pobre', 'tiktok', ttFallback)).toBe(
            'https://www.tiktok.com/@lector_pobre'
        );

        // Esquemas peligrosos o no-HTTPS rechazados -> devuelve fallback
        expect(sanitizarUrlRed('javascript:alert(1)', 'instagram', igFallback)).toBe(igFallback);
        expect(sanitizarUrlRed('data:text/html,<script>alert(1)</script>', 'facebook', fbFallback)).toBe(
            fbFallback
        );
        expect(sanitizarUrlRed('http://www.instagram.com/lector_pobre', 'instagram', igFallback)).toBe(
            igFallback
        );

        // Dominios de phishing o cruzados rechazados -> devuelve fallback
        expect(sanitizarUrlRed('https://instagram.com.evil.example/phish', 'instagram', igFallback)).toBe(
            igFallback
        );
        expect(sanitizarUrlRed('https://notinstagram.com/lector_pobre', 'instagram', igFallback)).toBe(
            igFallback
        );
        expect(sanitizarUrlRed('https://www.youtube.com/@lectorpobre', 'instagram', igFallback)).toBe(
            igFallback
        );

        // Valores vacíos, nulos o malformados -> devuelve fallback
        expect(sanitizarUrlRed('', 'youtube', ytFallback)).toBe(ytFallback);
        expect(sanitizarUrlRed('   ', 'youtube', ytFallback)).toBe(ytFallback);
        expect(sanitizarUrlRed(null, 'youtube', ytFallback)).toBe(ytFallback);
        expect(sanitizarUrlRed(undefined, 'youtube', ytFallback)).toBe(ytFallback);
        expect(sanitizarUrlRed(':::url-invalida:::', 'youtube', ytFallback)).toBe(ytFallback);
    });

    it('V-06: sanitizarHrefWhatsApp acepta solo https://wa.me/ con formato seguro', () => {
        expect(sanitizarHrefWhatsApp('https://wa.me/5219991234567?text=Hola%20mundo')).toBe(
            'https://wa.me/5219991234567?text=Hola%20mundo'
        );
        expect(sanitizarHrefWhatsApp('https://wa.me/?text=Hola')).toBe('https://wa.me/?text=Hola');

        expect(sanitizarHrefWhatsApp('javascript:alert(1)')).toBeUndefined();
        expect(sanitizarHrefWhatsApp('https://evil.com/5219991234567?text=Hola')).toBeUndefined();
        expect(sanitizarHrefWhatsApp('http://wa.me/5219991234567?text=Hola')).toBeUndefined();
        expect(sanitizarHrefWhatsApp('https://wa.me/123?text=Hola')).toBeUndefined();
        expect(sanitizarHrefWhatsApp('https://wa.me/5219991234567?text=con espacio')).toBeUndefined();
        expect(sanitizarHrefWhatsApp(null)).toBeUndefined();
        expect(sanitizarHrefWhatsApp(undefined)).toBeUndefined();
    });
});
