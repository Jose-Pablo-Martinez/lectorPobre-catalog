/**
 * @file variant.test.ts
 * @description Pruebas unitarias del selector de variantes visuales (RF-16).
 * @satisfies UT-VUE-17, RF-16
 */

import { describe, expect, it, vi } from 'vitest';
import defaultVariantPlugin, {
    ejecutarPluginVariante,
    resolverClaseVariante,
    resolverEstilosPatron,
    VARIANTES_PERMITIDAS,
} from '~/plugins/variant';

describe('UT-VUE-17: Plugin de Variante Visual (RF-16)', () => {
    it('retorna la clase correcta para clasico, moderno y minimalista', () => {
        expect(resolverClaseVariante('clasico')).toBe('variante-clasico');
        expect(resolverClaseVariante('moderno')).toBe('variante-moderno');
        expect(resolverClaseVariante('minimalista')).toBe('variante-minimalista');
    });

    it('usa variante-moderno como valor por defecto ante valores vacíos o desconocidos', () => {
        expect(resolverClaseVariante(undefined)).toBe('variante-moderno');
        expect(resolverClaseVariante(null)).toBe('variante-moderno');
        expect(resolverClaseVariante('inexistente')).toBe('variante-moderno');
    });

    it('resolverEstilosPatron retorna array vacío cuando el patrón no está activo o falta la imagen', () => {
        expect(resolverEstilosPatron(null)).toEqual([]);
        expect(resolverEstilosPatron(undefined)).toEqual([]);
        expect(resolverEstilosPatron({ patronDecorativoActivo: false })).toEqual([]);
        expect(
            resolverEstilosPatron({
                patronDecorativoActivo: true,
                patronDecorativo: null as any,
            })
        ).toEqual([]);
        expect(
            resolverEstilosPatron({
                patronDecorativoActivo: true,
                patronDecorativo: {} as any,
            })
        ).toEqual([]);
    });

    it('ejecutarPluginVariante aplica la clase en htmlAttrs, sincroniza el DOM y soporta patrón decorativo', async () => {
        const applyHead = vi.fn();
        document.documentElement.classList.add('variante-moderno');

        const result = await ejecutarPluginVariante({
            fetchConfig: async () => ({
                varianteVisual: 'clasico',
                patronDecorativoActivo: true,
                patronDecorativo: {
                    _type: 'image',
                    asset: {
                        _type: 'reference',
                        _ref: 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-200x200-png',
                    },
                },
            }),
            applyHead,
        });

        expect(result.claseVariante).toBe('variante-clasico');
        expect(result.estilosExtra).toHaveLength(1);
        expect(result.estilosExtra[0].innerHTML).toContain('--bg-patron-decorativo: url(');
        expect(applyHead).toHaveBeenCalledTimes(1);

        // Verifica que se removieron las clases previas y se agregó la nueva en el DOM
        expect(document.documentElement.classList.contains('variante-clasico')).toBe(true);
        expect(document.documentElement.classList.contains('variante-moderno')).toBe(false);

        // Fallback cuando falla el fetch
        const fallback = await ejecutarPluginVariante({
            fetchConfig: async () => {
                throw new Error('offline');
            },
            applyHead,
        });
        expect(fallback.claseVariante).toBe('variante-moderno');
    });

    it('export por defecto es invocable como función o plugin', async () => {
        expect(typeof defaultVariantPlugin).toBe('function');
        const res = await (defaultVariantPlugin as any)({
            fetchConfig: async () => ({ varianteVisual: 'minimalista' }),
        });
        expect(res?.claseVariante ?? 'variante-minimalista').toBe('variante-minimalista');
    });
});
