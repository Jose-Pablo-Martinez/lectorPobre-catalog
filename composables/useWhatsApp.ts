/**
 * @file useWhatsApp.ts
 * @description Composable y funciones puras para el formateo de precios en MXN y la generación
 * de enlaces de contacto y cotización directa por WhatsApp (`https://wa.me/...`).
 * Soporta tanto la consulta individual de un producto con plantilla configurable (`{{nombre}}`, `{{precio}}`)
 * como el desglose estructurado de la Lista de Pedido (carrito de cotización).
 * Cumple la regla estricta de cero emojis en plantillas generadas.
 * @satisfies RF-17
 */

export interface WhatsAppOrderItem {
    id: string;
    nombre: string;
    cantidad: number;
    precio?: number;
}

const DEFAULT_TEMPLATE = 'Hola, me interesa el producto {{nombre}}';
const NOMBRE_TOKEN_REGEX = /\{\{\s{0,5}nombre\s{0,5}\}\}/gi;
const PRECIO_TOKEN_REGEX = /\{\{\s{0,5}precio\s{0,5}\}\}/gi;

/**
 * Formatea un monto numérico como moneda mexicana (`$XX.XX MXN`) o devuelve el texto de respaldo.
 *
 * @param precio Monto en pesos mexicanos.
 * @param textoSinPrecio Texto a mostrar cuando el precio no está definido o es 0.
 * @returns Cadena formateada.
 */
export function formatearPrecioMXN(
    precio?: number | null,
    textoSinPrecio = 'por cotizar'
): string {
    if (typeof precio === 'number' && precio > 0) {
        return `$${precio.toFixed(2)} MXN`;
    }
    return textoSinPrecio;
}

/**
 * Codifica una cadena para URL según RFC 3986, codificando además caracteres como
 * '(', ')', '*', '!' y "'" para evitar que servicios intermedios de redirección
 * (como wa.me de Meta) o analizadores de WhatsApp alteren o corrompan el texto.
 */
export function codificarParaWhatsApp(texto: string): string {
    return encodeURIComponent(texto).replaceAll(
        /[!'()*]/g,
        (c) => `%${(c.codePointAt(0) ?? 0).toString(16).toUpperCase()}`
    );
}

/**
 * Limpia el número telefónico dejando únicamente dígitos en formato internacional sin '+'.
 *
 * @param numero Número de WhatsApp configurado.
 * @returns Cadena de dígitos limpia.
 */
export function sanitizarNumeroWhatsApp(numero: string): string {
    return (numero ?? '').replaceAll(/\D/g, '');
}

/**
 * Construye la URL de WhatsApp para consultar por un producto individual.
 * Reemplaza las variables `{{nombre}}` y `{{precio}}` en la plantilla configurada en Sanity.
 *
 * @param numero Número de teléfono en formato internacional (ej. '5219991234567').
 * @param nombreProducto Nombre del producto a consultar.
 * @param plantilla Plantilla opcional desde `ConfiguracionGlobal.mensajeWhatsApp`.
 * @param precio Precio opcional del producto en MXN.
 * @returns URL completa `https://wa.me/...` con el mensaje codificado.
 */
export function construirUrlWhatsApp(
    numero: string,
    nombreProducto: string,
    plantilla?: string,
    precio?: number
): string {
    const cleanPhone = sanitizarNumeroWhatsApp(numero);
    const trimmedTemplate = plantilla?.trim() ?? '';
    const baseTemplate =
        trimmedTemplate.length > 0 ? trimmedTemplate : DEFAULT_TEMPLATE;

    const precioFormateado = formatearPrecioMXN(precio, 'por cotizar');
    const contieneTokenNombre = NOMBRE_TOKEN_REGEX.test(baseTemplate);
    NOMBRE_TOKEN_REGEX.lastIndex = 0;

    let mensaje = baseTemplate
        .replaceAll(NOMBRE_TOKEN_REGEX, nombreProducto)
        .replaceAll(PRECIO_TOKEN_REGEX, precioFormateado);

    if (!contieneTokenNombre && nombreProducto) {
        mensaje = `${mensaje}: ${nombreProducto}`;
    }

    return `https://wa.me/${cleanPhone}?text=${codificarParaWhatsApp(mensaje)}`;
}

/**
 * Construye la URL de WhatsApp con el desglose completo de la Lista de Pedido (carrito de cotización).
 * No utiliza emojis de sistema y codifica caracteres especiales según RFC 3986.
 *
 * @param numero Número de teléfono en formato internacional.
 * @param items Lista de productos seleccionados con sus cantidades.
 * @param totalEstimado Suma total estimada del pedido.
 * @returns URL completa `https://wa.me/...` lista para abrir en nueva pestaña.
 */
export function construirUrlWhatsAppCarrito(
    numero: string,
    items: WhatsAppOrderItem[],
    totalEstimado: number
): string {
    const cleanPhone = sanitizarNumeroWhatsApp(numero);

    if (items.length === 0) {
        const saludoVacio =
            'Hola Lector Pobre, me interesa solicitar informacion sobre su los productos que vende en su catálogo. Disponibilidad.';
        return `https://wa.me/${cleanPhone}?text=${codificarParaWhatsApp(saludoVacio)}`;
    }

    const lineasProductos = items.map((item) => {
        if (typeof item.precio === 'number' && item.precio > 0) {
            const subtotal = item.precio * item.cantidad;
            return `- ${item.cantidad}x ${item.nombre}: ${formatearPrecioMXN(subtotal)}`;
        }
        return `- ${item.cantidad}x ${item.nombre}: Precio por confirmar`;
    });

    const bloques = [
        'Hola Lector Pobre, me gustaria realizar el siguiente pedido:',
        '',
        ...lineasProductos,
        '',
        `Total estimado: $${totalEstimado.toFixed(2)} MXN`,
        '',
        'Quedo pendiente para confirmar disponibilidad y detalles de entrega. Gracias.',
    ];

    const mensajeCompleto = bloques.join('\n');
    return `https://wa.me/${cleanPhone}?text=${codificarParaWhatsApp(mensajeCompleto)}`;
}

/**
 * Composable que expone los generadores de enlaces de WhatsApp y formateo de moneda.
 */
export function useWhatsApp() {
    return {
        formatearPrecioMXN,
        sanitizarNumeroWhatsApp,
        construirUrlWhatsApp,
        construirUrlWhatsAppCarrito,
        codificarParaWhatsApp,
    };
}
