/**
 * @file design-tokens.test.ts
 * @description Pruebas unitarias de los tokens de diseño CSS y configuración Tailwind
 * para el sistema "Taller Urbano Neo-Pop".
 * @satisfies UT-VUE-16, RF-15, RF-16
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '~/tailwind.config';

describe('UT-VUE-16: Sistema de Diseño y Tokens CSS', () => {
    it('define las variables CSS de la paleta por defecto (identidad) en global.css', () => {
        const cssContent = readFileSync(
            resolve(process.cwd(), 'assets/css/global.css'),
            'utf8'
        );

        expect(cssContent).toContain('--color-brand-primario: #e4007c');
        expect(cssContent).toContain('--color-brand-secundario: #0091d5');
        expect(cssContent).toContain('--color-brand-acento: #ffd000');
        expect(cssContent).toContain('--color-brand-fondo: #edf8f1');
        expect(cssContent).toContain('--color-brand-texto: #18181b');
    });

    it('define las 3 variantes visuales (.variante-clasico, .variante-moderno, .variante-minimalista) en global.css', () => {
        const cssContent = readFileSync(
            resolve(process.cwd(), 'assets/css/global.css'),
            'utf8'
        );

        expect(cssContent).toContain('.variante-clasico .tarjeta-producto');
        expect(cssContent).toContain('.variante-moderno .tarjeta-producto');
        expect(cssContent).toContain('.variante-minimalista .tarjeta-producto');
    });

    it('configura los colores semánticos brand y sombras neobrutalistas en tailwind.config.ts', () => {
        const extend = tailwindConfig.theme?.extend as Record<string, unknown>;
        const colors = extend?.colors as Record<string, Record<string, string>>;
        const boxShadow = extend?.boxShadow as Record<string, string>;

        expect(colors.brand.primario).toBe('var(--color-brand-primario)');
        expect(colors.brand.secundario).toBe('var(--color-brand-secundario)');
        expect(colors.brand.acento).toBe('var(--color-brand-acento)');
        expect(colors.brand.fondo).toBe('var(--color-brand-fondo)');
        expect(colors.brand.texto).toBe('var(--color-brand-texto)');
        expect(colors.whatsapp.DEFAULT).toBe('#25D366');
        expect(boxShadow.hard).toContain('4px 4px 0px');
    });
});
