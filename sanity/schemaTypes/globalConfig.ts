/**
 * @file globalConfig.ts
 * @description Singleton Sanity document that controls all site-wide settings:
 * WhatsApp contact info, social media URLs, active color palette, visual variant,
 * low-stock threshold, and catalog pagination.
 *
 * Singleton enforcement: __experimental_actions restricts the Studio to
 * update/publish only — no "Create new" button appears, preventing accidental
 * duplicate config documents. One document per dataset.
 *
 * @satisfies RF-05 - Social media links.
 * @satisfies RF-15 - Active color palette selection.
 * @satisfies RF-16 - Visual variant (layout style).
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

        // ── Visual customization (RF-15, RF-16) ──────────────────────────────
        defineField({
            name: 'paletaActiva',
            title: 'Paleta de colores activa',
            type: 'string',
            // This value is read at Nuxt build time and injected as CSS custom properties
            // in nuxt.config.ts (app.head.style), enabling the color palette to propagate
            // to all components without runtime JS overhead (RF-15).
            options: {
                list: [
                    { title: 'Azul',    value: 'azul' },
                    { title: 'Verde',   value: 'verde' },
                    { title: 'Morado',  value: 'morado' },
                    { title: 'Naranja', value: 'naranja' },
                    { title: 'Gris',    value: 'gris' },
                ],
                layout: 'radio',
            },
            initialValue: 'azul',
        }),
        defineField({
            name: 'varianteVisual',
            title: 'Variante visual del catálogo',
            type: 'string',
            // Controls the card layout style (grid density, card shape).
            // Read at build time and applied via a CSS class on the catalog container (RF-16).
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
});
