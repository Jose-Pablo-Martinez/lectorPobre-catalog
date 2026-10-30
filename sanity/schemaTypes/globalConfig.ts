/**
 * @file globalConfig.ts
 * @description Documento singleton de Sanity que controla la configuración global del sitio:
 * información de contacto de WhatsApp, URLs de redes sociales, paleta de colores activa (predefinidas
 * o valores hexadecimales personalizados), variante visual, capa de patrón decorativo,
 * umbral de stock bajo y paginación del catálogo.
 *
 * Restricción singleton: se gestiona en Sanity v3 mediante la API de document actions en sanity.config.ts,
 * permitiendo solo actualizar/publicar para evitar documentos de configuración duplicados (uno por dataset).
 *
 * @satisfies RF-05 - Enlaces a redes sociales.
 * @satisfies RF-15 - Paleta de colores: 5 paletas predefinidas (identidad, cenote, luchaLibre,
 *   nocheFiesta, meridaPastel) + paleta personalizada mediante campos hexadecimales.
 * @satisfies RF-16 - Variante visual (estilo de diseño) + imagen de patrón decorativo
 *   almacenada en Sanity y aplicada como capa semitransparente repetida.
 * @satisfies RF-17 - Contacto y plantilla de mensaje de WhatsApp.
 * @satisfies RF-19 - Productos por página (paginación).
 * @satisfies RF-03, RF-14 - Configuración del umbral de stock bajo.
 * @satisfies RF-23 - Definición global de sinónimos de búsqueda.
 */

import { defineType, defineField } from 'sanity';

export const globalConfig = defineType({
    name: 'configuracionGlobal',
    title: 'Configuración Global del Sitio',
    type: 'document',
    fields: [
        // ── Identidad ─────────────────────────────────────────────────────────
        defineField({
            name: 'nombreSitio',
            title: 'Nombre del sitio / marca',
            type: 'string',
            description: 'Aparece en el navbar y en el title del navegador.',
            initialValue: 'LectorPobre',
            validation: Rule => Rule.required()
        }),

        // ── Contacto y WhatsApp (RF-17) ───────────────────────────────────────
        defineField({
            name: 'numeroWhatsApp',
            title: 'Número de WhatsApp (con lada, sin "+")',
            type: 'string',
            description: 'Ejemplo: 5219991234567. Usado para generar el enlace directo wa.me.',
            validation: Rule => Rule.required().regex(/^\d{10,15}$/, {
                name: 'número de teléfono internacional',
                invert: false
            })
        }),
        defineField({
            name: 'mensajeWhatsApp',
            title: 'Plantilla del mensaje de WhatsApp',
            type: 'text',
            rows: 3,
            description: 'Usa {{nombre}} y {{precio}} como variables dinámicas que se sustituyen al contactar por un producto.',
            initialValue: '¡Hola! Me interesa adquirir "{{nombre}}" que vi en el catálogo de LectorPobre (precio: ${{precio}} MXN). ¿Sigue disponible?'
        }),

        // ── Redes Sociales (RF-05) ────────────────────────────────────────────
        defineField({
            name: 'urlInstagram',
            title: 'URL de Instagram',
            type: 'url',
            description: 'Enlace al perfil de Instagram (aparece en el footer).'
        }),
        defineField({
            name: 'urlFacebook',
            title: 'URL de Facebook',
            type: 'url',
            description: 'Enlace a la página de Facebook (aparece en el footer).'
        }),
        defineField({
            name: 'urlYouTube',
            title: 'URL de YouTube',
            type: 'url',
            description: 'Enlace al canal de YouTube (aparece en el footer).'
        }),

        // ── Paleta de Colores (RF-15) ─────────────────────────────────────────
        defineField({
            name: 'paletaActiva',
            title: 'Paleta de colores activa',
            type: 'string',
            description: 'Selecciona la combinación cromática del sitio o elige "Personalizada" para definir valores hex individuales.',
            options: {
                list: [
                    { title: 'Identidad (Rosa Mexicano, Azul Maya, Amarillo)',        value: 'identidad' },
                    { title: 'Cenote Yucateco (Verde Jade, Turquesa, Dorado)',         value: 'cenote' },
                    { title: 'Lucha Libre (Rojo Máscara, Azul Eléctrico, Oro)',        value: 'luchaLibre' },
                    { title: 'Noche de Fiesta (Morado Bugambilia, Naranja, Amarillo)',  value: 'nocheFiesta' },
                    { title: 'Mérida Pastel (Rosa Palo, Menta Suave, Crema Cacao)',    value: 'meridaPastel' },
                    { title: 'Personalizada (Valores Hex)',                            value: 'custom' },
                ],
                layout: 'radio',
            },
            initialValue: 'identidad',
        }),

        // RF-15: campos hex para paleta personalizada — visibles solo cuando paletaActiva === 'custom'
        defineField({
            name: 'paletaCustomPrimario',
            title: 'Color primario (hex)',
            type: 'string',
            description: 'Ej: #3b82f6. Solo se usa cuando la paleta activa es "Personalizada".',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomSecundario',
            title: 'Color secundario (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomAcento',
            title: 'Color de acento (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomFondo',
            title: 'Color de fondo (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomTexto',
            title: 'Color de texto (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),

        // ── Variante visual + patrón decorativo (RF-16) ───────────────────────
        defineField({
            name: 'varianteVisual',
            title: 'Variante visual del catálogo',
            type: 'string',
            // Controla el estilo de diseño de las tarjetas (densidad y forma).
            // Se aplica como clase CSS en el contenedor del catálogo en tiempo de build (RF-16).
            options: {
                list: [
                    { title: 'Clásico',     value: 'clasico' },
                    { title: 'Moderno',     value: 'moderno' },
                    { title: 'Minimalista', value: 'minimalista' },
                ],
                layout: 'radio',
            },
            initialValue: 'moderno',
        }),
        defineField({
            name: 'patronDecorativoActivo',
            title: 'Patrón decorativo activo',
            type: 'boolean',
            // Si es true, la imagen seleccionada se renderiza como una capa semitransparente
            // repetida mediante CSS sobre el catálogo (RF-16).
            description: 'Activa un overlay decorativo repetible sobre el catálogo (ej. temática Halloween, Navidad).',
            initialValue: false,
        }),
        defineField({
            name: 'patronDecorativo',
            title: 'Imagen del patrón decorativo',
            type: 'image',
            // Recomendado: PNG pequeño (~200×200 px) con fondo transparente.
            // Se aplica mediante background-image CSS con opacidad 0.06 cuando está activo.
            description: 'Imagen pequeña (~200×200 px, PNG con fondo transparente) que se repite como overlay.',
            hidden: ({ document }) => !document?.patronDecorativoActivo,
        }),

        // ── Umbrales operativos ───────────────────────────────────────────────
        defineField({
            name: 'umbralStockBajo',
            title: 'Umbral de stock bajo',
            type: 'number',
            // Cuando producto.stock <= umbralStockBajo, el frontend muestra la alerta
            // "¡Pocas unidades!". Resuelve Tema Abierto #3 del ERS (RF-03, RF-14).
            initialValue: 5,
            validation: Rule => Rule.min(0).integer()
        }),
        defineField({
            name: 'productosPorPagina',
            title: 'Productos por página',
            type: 'number',
            // Controla el tamaño de página en la consulta GROQ del catálogo. Resuelve Tema Abierto #2 del ERS (RF-19).
            initialValue: 24,
            validation: Rule => Rule.min(1).integer()
        }),

        // ── Búsqueda y Recomendaciones (RF-23) ────────────────────────────────
        defineField({
            name: 'sinonimos',
            title: 'Sinónimos globales de búsqueda',
            type: 'array',
            description: 'Grupos de términos equivalentes para la búsqueda y recomendaciones (ej. llavero, keychain, yavero).',
            of: [
                {
                    type: 'object',
                    name: 'grupoSinonimos',
                    title: 'Grupo de sinónimos',
                    fields: [
                        defineField({
                            name: 'terminos',
                            title: 'Términos equivalentes',
                            type: 'array',
                            of: [{ type: 'string' }],
                            options: { layout: 'tags' },
                            validation: Rule => Rule.required().min(2)
                        })
                    ],
                    preview: {
                        select: { terminos: 'terminos' },
                        prepare({ terminos }: { terminos?: string[] }) {
                            return {
                                title: terminos && terminos.length > 0 ? terminos.join(' ↔ ') : 'Grupo vacío'
                            };
                        }
                    }
                }
            ]
        }),
    ],

    // El patrón singleton se gestiona en sanity.config.ts mediante la API de acciones de documento en Sanity v3.
});
