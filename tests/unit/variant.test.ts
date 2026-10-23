/**
 * @file variant.test.ts
 * @description Pruebas unitarias del selector de variantes visuales (RF-16).
 * @satisfies UT-VUE-17, RF-16
 */

import { describe, expect, it, vi } from 'vitest';
import { ejecutarPluginVariante, resolverClaseVariante } from '~/plugins/variant';

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

    it('ejecutarPluginVariante aplica la clase en htmlAttrs y soporta patrón decorativo activo', async () => {
        const applyHead = vi.fn();
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
        expect(applyHead).toHaveBeenCalledTimes(1);

        // Fallback cuando falla el fetch
        const fallback = await ejecutarPluginVariante({
            fetchConfig: async () => {
                throw new Error('offline');
            },
            applyHead,
        });
        expect(fallback.claseVariante).toBe('variante-moderno');
    });
});
