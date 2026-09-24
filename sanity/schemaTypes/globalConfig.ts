/**
 * @file globalConfig.ts
 * @description Singleton Sanity document that controls all site-wide settings:
 * WhatsApp contact info, social media URLs, active color palette (predefined or
 * fully custom hex values), visual variant, decorative pattern overlay,
 * low-stock threshold, and catalog pagination.
 *
 * Singleton enforcement: __experimental_actions restricts the Studio to
 * update/publish only — no "Create new" button appears, preventing accidental
 * duplicate config documents. One document per dataset.
 *
 * @satisfies RF-05 - Social media links.
 * @satisfies RF-15 - Color palette: 4 predefined palettes (claro, oscuro, oceano,
 *   atardecer) + a fully custom palette via hex color fields.
 * @satisfies RF-16 - Visual variant (layout style) + decorative pattern image
 *   stored in Sanity and applied as a repeating semi-transparent overlay.
 * @satisfies RF-17 - WhatsApp contact and message template.
 * @satisfies RF-19 - Products per page (pagination).
 * @satisfies RF-03, RF-14 - Low-stock threshold configuration.
 */

import { defineType, defineField } from 'sanity';

export const globalConfig = defineType({
    name: 'configuracionGlobal',
    title: 'Configuración Global del Sitio',
    type: 'document',
    fields: [
        // ── Identity ──────────────────────────────────────────────────────────
        defineField({
            name: 'nombreSitio',
            title: 'Nombre del sitio',
            type: 'string',
        }),

        // ── WhatsApp (RF-17) ─────────────────────────────────────────────────
        defineField({
            name: 'numeroWhatsApp',
            title: 'Número de WhatsApp',
            type: 'string',
            description: 'Formato internacional sin el "+". Ejemplo: 5219991234567',
        }),
        defineField({
            name: 'mensajeWhatsApp',
            title: 'Plantilla del mensaje de WhatsApp',
            type: 'text',
            description: 'Usa {{nombre}} y {{precio}} como variables del producto.',
        }),

        // ── Social media (RF-05) ─────────────────────────────────────────────
        defineField({ name: 'urlInstagram', title: 'URL de Instagram', type: 'url' }),
        defineField({ name: 'urlFacebook',  title: 'URL de Facebook',  type: 'url' }),
        defineField({ name: 'urlTikTok',    title: 'URL de TikTok',    type: 'url' }),

        // ── Color palette (RF-15) ─────────────────────────────────────────────
        defineField({
            name: 'paletaActiva',
            title: 'Paleta de colores activa',
            type: 'string',
            // Read at Nuxt build time and injected as CSS custom properties in
            // plugins/paleta.ts. 'custom' activates the hex color fields below (RF-15).
            options: {
                list: [
                    { title: 'Claro',         value: 'claro' },
                    { title: 'Oscuro',        value: 'oscuro' },
                    { title: 'Océano',        value: 'oceano' },
                    { title: 'Atardecer',     value: 'atardecer' },
                    { title: 'Personalizada', value: 'custom' },
                ],
                layout: 'radio',
            },
            initialValue: 'claro',
        }),

        // RF-15: custom palette hex fields — only visible when paletaActiva === 'custom'
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

        // ── Visual variant + decorative pattern (RF-16) ───────────────────────
        defineField({
            name: 'varianteVisual',
            title: 'Variante visual del catálogo',
            type: 'string',
            // Controls card layout style (grid density, card shape).
            // Applied as a CSS class on the catalog container at build time (RF-16).
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
            // When true, the selected pattern image is rendered as a semi-transparent
            // repeating CSS background overlay on the catalog (RF-16).
            description: 'Activa un overlay decorativo repetible sobre el catálogo (ej. temática Halloween, Navidad).',
            initialValue: false,
        }),
        defineField({
            name: 'patronDecorativo',
            title: 'Imagen del patrón decorativo',
            type: 'image',
            // Recommended: small PNG (~200×200 px) with transparent background.
            // Applied via CSS background-image at 0.06 opacity when the toggle is active.
            description: 'Imagen pequeña (~200×200 px, PNG con fondo transparente) que se repite como overlay.',
            hidden: ({ document }) => !document?.patronDecorativoActivo,
        }),

        // ── Operational thresholds ────────────────────────────────────────────
        defineField({
            name: 'umbralStockBajo',
            title: 'Umbral de stock bajo',
            type: 'number',
            // When product.stock <= umbralStockBajo, the frontend shows the
            // "¡Pocas unidades!" alert. Resolves ERS Open Issue #3 (RF-03, RF-14).
            initialValue: 5,
            validation: Rule => Rule.min(0).integer()
        }),
        defineField({
            name: 'productosPorPagina',
            title: 'Productos por página',
            type: 'number',
            // Controls the slice size in the catalog GROQ query. Resolves ERS Open Issue #2 (RF-19).
            initialValue: 24,
            validation: Rule => Rule.min(1).integer()
        }),
    ],

    // Singleton pattern is handled via sanity.config.ts document actions API in Sanity v3.
});
