/**
 * @file rating.ts
 * @description Sanity schema for product star ratings (1–5).
 *
 * When a new rating document is created by the Go handler, the handler
 * also issues an atomic patch.inc on the parent product's ratingSum and
 * ratingCount fields. This avoids the read-calculate-write race condition
 * that would occur if the average were stored directly on the product.
 *
 * @satisfies RF-06 - Star rating system, range 1–5.
 */

import { defineType, defineField } from 'sanity';

export const rating = defineType({
    name: 'calificacion',
    title: 'Calificación',
    type: 'document',
    readOnly: true, // Disables all form fields in the Studio UI
    fields: [
        defineField({
            name: 'valor',
            title: 'Valor (1–5)',
            type: 'number',
            validation: Rule => Rule.required().min(1).max(5).integer()
        }),
        defineField({
            name: 'producto',
            title: 'Producto calificado',
            type: 'reference',
            to: [{ type: 'producto' }],
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'fechaCreacion',
            title: 'Fecha de creación',
            type: 'datetime',
        }),
    ],
    preview: {
        select: { title: 'producto.nombre', subtitle: 'valor' },
        prepare(selection) {
            const valor = (selection.subtitle as number) ?? 0;
            const stars = '★'.repeat(valor) + '☆'.repeat(5 - valor);
            return { title: selection.title as string, subtitle: stars };
        }
    }
});
