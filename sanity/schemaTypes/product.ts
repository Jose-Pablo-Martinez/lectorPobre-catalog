/**
 * @file product.ts
 * @description Sanity schema for catalog products.
 * @satisfies RF-01 - Catalog listing.
 * @satisfies RF-02 - Product detail page.
 * @satisfies RF-11 - Edit products from Studio.
 * @satisfies RF-12 - Image management (main image + gallery).
 * @satisfies RF-13 - Create/delete products.
 * @satisfies RF-14 - Stock management and low-stock alerting.
 */

import { defineType, defineField } from 'sanity';

export const product = defineType({
    name: 'producto',
    title: 'Producto',
    type: 'document',
    fields: [
        defineField({
            name: 'nombre',
            title: 'Nombre',
            type: 'string',
            validation: Rule => Rule.required().min(2).max(120)
        }),
        defineField({
            name: 'slug',
            title: 'Slug (URL)',
            type: 'slug',
            // Is the base for pages/producto/[slug].vue
            options: { source: 'nombre', maxLength: 96 },
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'descripcion',
            title: 'Descripción',
            type: 'text',
            rows: 4
        }),
        defineField({
            name: 'imagenPrincipal',
            title: 'Imagen principal',
            type: 'image',
            options: { hotspot: true }
        }),
        defineField({
            name: 'imagenes',
            title: 'Galería de imagenes',
            type: 'array',
            of: [{type: 'image', options: {hotspot: true}}]
        }),
        defineField({
            name: 'categoria',
            title: 'Categoría',
            type: 'reference',
            to: [{type: 'categoria'}],
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'stock',
            title: 'Stock disponible',
            type: 'number',
            // umbralStockBajo is a global configuration,
            // determine when the alert "pocas unidades" is shown in the frontend
            validation: Rule => Rule.required().min(0).integer()
        }),
        defineField({
            name: 'precio',
            title: 'Precio (opcional)',
            type: 'number',
            // Optional — used only in the WhatsApp message template (RF-17). Not an e-commerce price.
        }),
        defineField({
            name: 'activo',
            title: 'Visible en catálogo',
            type: 'boolean',
            // Allows hiding products without deleting them (RF-13).
            initialValue: true
        }),
        // No persisted 'calificacionPromedio' field exists. The average is derived
        // in every GROQ query as: round(ratingSum / ratingCount, 1).
        // All counters below are updated atomically by the Go rating handler via patch.inc,
        // avoiding the read-calculate-write race condition (see rating.ts file header).
        // rating1Count–rating5Count feed the per-star breakdown panel in the frontend (RF-06).
        defineField({
            name: 'ratingSum',
            title: 'Suma de calificaciones (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        }),
        defineField({
            name: 'ratingCount',
            title: 'Total de calificaciones (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        }),
        defineField({
            name: 'rating1Count',
            title: 'Calificaciones de 1★ (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        }),
        defineField({
            name: 'rating2Count',
            title: 'Calificaciones de 2★ (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        }),
        defineField({
            name: 'rating3Count',
            title: 'Calificaciones de 3★ (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        }),
        defineField({
            name: 'rating4Count',
            title: 'Calificaciones de 4★ (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        }),
        defineField({
            name: 'rating5Count',
            title: 'Calificaciones de 5★ (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0
        })

    ],
    preview: {
        select: {
            title: 'nombre',
            subtitle: 'categoria.nombre',
            media: 'imagenPrincipal'
        }
    }
});