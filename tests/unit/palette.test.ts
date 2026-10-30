/**
 * @file palette.test.ts
 * @description Pruebas unitarias del sistema de paletas dinámicas (RF-15).
 * @satisfies UT-VUE-14, UT-VUE-15, RF-15
 */

import { describe, expect, it, vi } from 'vitest';
import {
    ejecutarPluginPaleta,
    generarCssVariablesRoot,
    normalizarHexToken,
    PALETAS_PREDEFINIDAS,
    resolverTokensPaleta,
} from '~/plugins/palette';

describe('UT-VUE-14 & UT-VUE-15: Plugin de Paleta de Colores (RF-15)', () => {
    it('contiene las 5 paletas mexicanas predefinidas con los 5 tokens obligatorios', () => {
        const clavesEsperadas = [
            'identidad',
            'cenote',
            'luchaLibre',
            'nocheFiesta',
            'meridaPastel',
        ];

        for (const clave of clavesEsperadas) {
            const paleta = PALETAS_PREDEFINIDAS[clave];
            expect(paleta).toBeDefined();
            expect(paleta?.['--color-brand-primario']).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(paleta?.['--color-brand-secundario']).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(paleta?.['--color-brand-acento']).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(paleta?.['--color-brand-fondo']).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(paleta?.['--color-brand-texto']).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });

    it('resuelve correctamente una paleta predefinida y usa identidad como fallback', () => {
        const cenoteTokens = resolverTokensPaleta({ paletaActiva: 'cenote' });
        expect(cenoteTokens['--color-brand-primario']).toBe('#0f766e');

        const fallbackTokens = resolverTokensPaleta(null);
        expect(fallbackTokens['--color-brand-primario']).toBe('#e4007c');
    });

    it('resuelve la paleta custom usando los campos hexadecimales personalizados y fallback por campo', () => {
        const customTokens = resolverTokensPaleta({
            paletaActiva: 'custom',
            paletaCustomPrimario: '#112233',
            paletaCustomSecundario: '#445566',
            paletaCustomAcento: '#778899',
            paletaCustomFondo: '#fafafa',
            paletaCustomTexto: '#101010',
        });

        expect(customTokens['--color-brand-primario']).toBe('#112233');
        expect(customTokens['--color-brand-secundario']).toBe('#445566');
        expect(customTokens['--color-brand-acento']).toBe('#778899');
        expect(customTokens['--color-brand-fondo']).toBe('#fafafa');
        expect(customTokens['--color-brand-texto']).toBe('#101010');

        // Soporte de hex sin almohadilla y auto-normalización
        const sinAlmohadilla = resolverTokensPaleta({
            paletaActiva: 'custom',
            paletaCustomPrimario: 'ff0099',
            paletaCustomSecundario: '00aaff',
        });
        expect(sinAlmohadilla['--color-brand-primario']).toBe('#ff0099');
        expect(sinAlmohadilla['--color-brand-secundario']).toBe('#00aaff');

        const partialCustom = resolverTokensPaleta({
            paletaActiva: 'custom',
        });
        expect(partialCustom['--color-brand-primario']).toBe('#e4007c');

        const cssRule = generarCssVariablesRoot(customTokens);
        expect(cssRule).toContain(':root {');
        expect(cssRule).toContain('--color-brand-primario:#112233');
    });

    it('normalizarHexToken maneja entradas válidas, incompletas y fallbacks seguros', () => {
        expect(normalizarHexToken('e4007c', '#000000')).toBe('#e4007c');
        expect(normalizarHexToken('#e4007c', '#000000')).toBe('#e4007c');
        expect(normalizarHexToken('   #fff  ', '#000000')).toBe('#fff');
        expect(normalizarHexToken('', '#000000')).toBe('#000000');
        expect(normalizarHexToken(undefined, '#000000')).toBe('#000000');
        expect(normalizarHexToken('invalid-color', '#000000')).toBe('#000000');
    });

    it('ejecutarPluginPaleta obtiene la configuración e inyecta la regla CSS en el head', async () => {
        const applyHead = vi.fn();
        const css = await ejecutarPluginPaleta({
            fetchConfig: async () => ({ paletaActiva: 'nocheFiesta' }),
            applyHead,
        });

        expect(css).toContain('--color-brand-primario:#6d28d9');
        expect(applyHead).toHaveBeenCalledTimes(1);

        // Si fetchConfig lanza error, aplica identidad por defecto sin fallar
        const cssFallback = await ejecutarPluginPaleta({
            fetchConfig: async () => {
                throw new Error('offline');
            },
            applyHead,
        });
        expect(cssFallback).toContain('--color-brand-primario:#e4007c');
    });
});
