/**
 * @file useAnalytics.ts
 * @description Composable para la emisión y registro de eventos analíticos orientados a
 * privacidad (Plausible Analytics), cubriendo observabilidad de tráfico y conversiones.
 * No recolecta datos personales (PII) ni utiliza cookies.
 * @satisfies RNF-06 (Analítica de tráfico y observabilidad), RF-02 (Vista de producto),
 *            RF-06 (Calificaciones), RF-17 (Conversión por WhatsApp), RF-18 (Búsqueda).
 */

declare global {
    interface Window {
        plausible?: (
            eventName: string,
            options?: {
                props?: Record<string, string | number | boolean>;
                callback?: () => void;
            }
        ) => void;
    }
}

export interface AnalyticsEventProps {
    [key: string]: string | number | boolean | undefined;
}

/**
 * Registra un evento personalizado en Plausible si está disponible en el entorno del navegador.
 *
 * @param eventName Nombre del evento (ej. 'whatsapp_click', 'product_view').
 * @param props Metadatos contextuales del evento.
 */
export function trackEvent(
    eventName: string,
    props?: Record<string, string | number | boolean>
): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    if (typeof window.plausible === 'function') {
        try {
            window.plausible(eventName, props ? { props } : undefined);
            return true;
        } catch {
            return false;
        }
    }

    return false;
}

/**
 * Composable que provee métodos tipados para el registro de eventos clave del negocio.
 */
export function useAnalytics() {
    /**
     * Registra la visualización de la ficha de detalle de un producto.
     * @satisfies RF-02, RNF-06
     */
    const trackProductView = (productoId: string, nombre: string): boolean => {
        if (!productoId) return false;
        return trackEvent('product_view', {
            productoId,
            nombre,
        });
    };

    /**
     * Registra el clic en el botón de compra o cotización por WhatsApp (evento de conversión).
     * @satisfies RF-17, RNF-06
     */
    const trackWhatsAppClick = (
        productoId?: string,
        origen: 'product_detail' | 'catalog_card' | 'cart_drawer' | 'general' = 'general'
    ): boolean => {
        return trackEvent('whatsapp_click', {
            productoId: productoId ?? 'varios',
            origen,
        });
    };

    /**
     * Registra una búsqueda realizada en el catálogo de productos.
     * @satisfies RF-18, RNF-06
     */
    const trackSearch = (query: string, resultCount: number): boolean => {
        const queryLimpia = query.trim();
        if (!queryLimpia) return false;
        return trackEvent('search_query', {
            query: queryLimpia,
            resultCount,
        });
    };

    /**
     * Registra el envío exitoso de una calificación por estrellas.
     * @satisfies RF-06, RNF-06
     */
    const trackRatingSubmitted = (productoId: string, valor: number): boolean => {
        if (!productoId || valor < 1 || valor > 5) return false;
        return trackEvent('rating_submitted', {
            productoId,
            valor,
        });
    };

    return {
        trackEvent,
        trackProductView,
        trackWhatsAppClick,
        trackSearch,
        trackRatingSubmitted,
    };
}

