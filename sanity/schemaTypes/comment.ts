/**
 * @file comment.ts
 * @description Esquema de Sanity para comentarios de usuarios con flujo de moderación.
 * @satisfies RF-07 - Comentarios de texto con moderación administrativa vía Sanity Studio.
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
            name: 'calificacion',
            title: 'Calificación asociada (1–5)',
            type: 'number',
            validation: Rule => Rule.required().min(1).max(5).integer()
        }),
        defineField({
            name: 'usuarioId',
            title: 'Identificador de usuario / dispositivo',
            type: 'string',
        }),
        defineField({
            name: 'producto',
            title: 'Producto comentado',
            type: 'reference',
            to: [{ type: 'producto' }],
            // La referencia se ubica en el lado "muchos" (comentario) para evitar contención de escritura
            // y crecimiento ilimitado en el documento de producto — equivalente a una clave foránea
            // en la tabla hija dentro de un modelo relacional.
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
            // Solo los comentarios 'aprobado' se muestran en la consulta GROQ pública del catálogo.
            // Resuelve el Tema Abierto #1 del ERS (estrategia de moderación de comentarios).
            initialValue: 'pendiente',
            validation: Rule => Rule.required()
        }),
    ],
    preview: {
        select: { title: 'texto', subtitle: 'estado', rating: 'calificacion' },
        prepare(selection) {
            const estado = selection.subtitle as string;
            const rating = (selection.rating as number) ?? 0;
            const stars = rating > 0 ? ` (${'★'.repeat(rating)}${'☆'.repeat(5 - rating)})` : '';
            const icon = estado === 'aprobado' ? '✓' : estado === 'rechazado' ? '✗' : '⏳';
            return { title: selection.title as string, subtitle: `${icon} ${estado}${stars}` };
        }
    }
});
