/**
 * @file rating.ts
 * @description Esquema de Sanity para calificaciones de productos por estrellas (1–5).
 *
 * Cuando el handler de Go crea un nuevo documento de calificación, también ejecuta
 * mutaciones atómicas patch.inc en los campos ratingSum y ratingCount del producto padre.
 * Esto evita la condición de carrera de lectura-cálculo-escritura que ocurriría
 * si el promedio se calculara y almacenara directamente en el producto.
 *
 * @satisfies RF-06 - Sistema de calificación por estrellas, rango 1–5.
 */

import { defineType, defineField } from 'sanity';

export const rating = defineType({
    name: 'calificacion',
    title: 'Calificación',
    type: 'document',
    readOnly: true, // Deshabilita la edición manual en la interfaz de Sanity Studio
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
