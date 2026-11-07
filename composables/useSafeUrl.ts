/**
 * @file useSafeUrl.ts
 * @description Funciones puras de sanitización y validación de esquema/host para enlaces externos
 * de redes sociales y botones de WhatsApp (V-06). Previene inyección de esquemas `javascript:`,
 * `data:` o redirección a dominios de phishing cuando la configuración proviene del CMS.
 * @satisfies RF-03, RF-05, RF-17, RNF-04
 */

export type RedSocialPermitida = 'instagram' | 'facebook' | 'youtube' | 'tiktok';

const HOSTS_RED_SOCIAL: Record<RedSocialPermitida, readonly string[]> = {
    instagram: ['instagram.com'],
    facebook: ['facebook.com', 'fb.com'],
    youtube: ['youtube.com', 'youtu.be'],
    tiktok: ['tiktok.com'],
};

const WHATSAPP_HREF_REGEX = /^https:\/\/wa\.me\/(?:\d{10,15})?\?text=\S*$/;

/**
 * Valida que una URL corresponda al esquema `https:` y a un dominio oficial de la red social indicada.
 * Si la URL es nula, malformada, usa otro protocolo o apunta a un dominio ajeno, devuelve `fallback`.
 *
 * @param raw URL cruda proveniente de Sanity (`ConfiguracionGlobal`).
 * @param red Identificador de la red social esperada.
 * @param fallback URL de respaldo segura por defecto.
 * @returns URL validada o `fallback`.
 */
export function sanitizarUrlRed(
    raw: string | null | undefined,
    red: RedSocialPermitida,
    fallback: string
): string {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
        return fallback;
    }

    try {
        const parsed = new URL(raw.trim());
        if (parsed.protocol !== 'https:') {
            return fallback;
        }

        const lowerHost = parsed.hostname.toLowerCase();
        const cleanHost = lowerHost.startsWith('www.') ? lowerHost.slice(4) : lowerHost;
        const allowedHosts = HOSTS_RED_SOCIAL[red];
        const esHostValido = allowedHosts.some(
            (allowed) => cleanHost === allowed || cleanHost.endsWith(`.${allowed}`)
        );

        return esHostValido ? parsed.toString() : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Valida que el atributo `href` de un botón de WhatsApp apunte exclusivamente a `https://wa.me/`
 * con número telefónico opcional de 10 a 15 dígitos y parámetro `?text=` sin espacios.
 *
 * @param raw Enlace candidato para `WhatsAppButton.vue`.
 * @returns La cadena original si es válida, o `undefined` si debe bloquearse.
 */
export function sanitizarHrefWhatsApp(
    raw: string | null | undefined
): string | undefined {
    if (typeof raw !== 'string') {
        return undefined;
    }
    return WHATSAPP_HREF_REGEX.test(raw) ? raw : undefined;
}

