/**
 * @file comment.ts
 * @description Sanity schema for user comments with moderation workflow.
 * @satisfies RF-07 - Text comments with admin moderation via Sanity Studio.
 */

import { defineType, defineField } from 'sanity';

export const comment = defineType({
    name: 'comentario',
    title: 'Comentario',
    type: 'document',
    fields: [
        defineField({
            name: 'texto',
            title: 'Texto del comentario',
            type: 'text',
            validation: Rule => Rule.required().max(1000)
        }),
        defineField({
            name: 'producto',
            title: 'Producto comentado',
            type: 'reference',
            to: [{ type: 'producto' }],
            // Reference sits on the "many" side (comment) to avoid write contention
            // and unbounded growth on the product document — equivalent to a foreign key
            // on the child table in a relational model.
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'fechaCreacion',
            title: 'Fecha de creación',
            type: 'datetime',
        }),
        defineField({
            name: 'estado',
            title: 'Estado de moderación',
            type: 'string',
            options: {
                list: [
                    { title: 'Pendiente de revisión', value: 'pendiente' },
                    { title: 'Aprobado',               value: 'aprobado' },
                    { title: 'Rechazado',              value: 'rechazado' },
                ],
                layout: 'radio',
            },
            // Only 'aprobado' comments are shown in the public catalog GROQ query.
            // Resolves ERS Open Issue #1 (comment moderation strategy).
            initialValue: 'pendiente',
            validation: Rule => Rule.required()
        }),
    ],
    preview: {
        select: { title: 'texto', subtitle: 'estado' },
        prepare(selection) {
            const estado = selection.subtitle as string;
            const icon = estado === 'aprobado' ? '✓' : estado === 'rechazado' ? '✗' : '⏳';
            return { title: selection.title as string, subtitle: `${icon} ${estado}` };
        }
    }
});
