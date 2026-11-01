/**
 * @file useAnalytics.test.ts
 * @description Pruebas unitarias para el composable useAnalytics y trackEvent.
 * @satisfies RNF-06, RF-02, RF-06, RF-17, RF-18
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent, useAnalytics } from '~/composables/useAnalytics';

describe('useAnalytics', () => {
    let mockPlausible: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockPlausible = vi.fn();
        window.plausible = mockPlausible as unknown as typeof window.plausible;
    });

    afterEach(() => {
        delete (window as any).plausible;
        vi.restoreAllMocks();
    });

    it('trackEvent invoca window.plausible con el nombre y props correspondientes', () => {
        const resultado = trackEvent('custom_event', { key: 'value' });
        expect(resultado).toBe(true);
        expect(mockPlausible).toHaveBeenCalledWith('custom_event', {
            props: { key: 'value' },
        });
    });

    it('trackEvent maneja la ausencia de window.plausible sin arrojar excepción', () => {
        delete (window as any).plausible;
        const resultado = trackEvent('custom_event');
        expect(resultado).toBe(false);
    });

    it('trackProductView registra vista de producto con ID y nombre (RF-02, RNF-06)', () => {
        const { trackProductView } = useAnalytics();
        const exito = trackProductView('prod-123', 'Sticker Neón');
        expect(exito).toBe(true);
        expect(mockPlausible).toHaveBeenCalledWith('product_view', {
            props: {
                productoId: 'prod-123',
                nombre: 'Sticker Neón',
            },
        });
    });

    it('trackProductView retorna false si el ID de producto está vacío', () => {
        const { trackProductView } = useAnalytics();
        const exito = trackProductView('', 'Sticker');
        expect(exito).toBe(false);
        expect(mockPlausible).not.toHaveBeenCalled();
    });

    it('trackWhatsAppClick registra evento de conversión con origen (RF-17, RNF-06)', () => {
        const { trackWhatsAppClick } = useAnalytics();
        const exito = trackWhatsAppClick('prod-456', 'product_detail');
        expect(exito).toBe(true);
        expect(mockPlausible).toHaveBeenCalledWith('whatsapp_click', {
            props: {
                productoId: 'prod-456',
                origen: 'product_detail',
            },
        });
    });

    it('trackSearch registra búsquedas no vacías con conteo de resultados (RF-18, RNF-06)', () => {
        const { trackSearch } = useAnalytics();
        const exito = trackSearch('llavero', 4);
        expect(exito).toBe(true);
        expect(mockPlausible).toHaveBeenCalledWith('search_query', {
            props: {
                query: 'llavero',
                resultCount: 4,
            },
        });

        const fallo = trackSearch('   ', 0);
        expect(fallo).toBe(false);
    });

    it('trackRatingSubmitted registra calificación enviada de 1 a 5 (RF-06, RNF-06)', () => {
        const { trackRatingSubmitted } = useAnalytics();
        const exito = trackRatingSubmitted('prod-789', 5);
        expect(exito).toBe(true);
        expect(mockPlausible).toHaveBeenCalledWith('rating_submitted', {
            props: {
                productoId: 'prod-789',
                valor: 5,
            },
        });

        const invalido = trackRatingSubmitted('prod-789', 0);
        expect(invalido).toBe(false);
    });
});
