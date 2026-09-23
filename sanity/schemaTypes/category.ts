/**
 * @file category.ts
 * @description Sanity schema for product categories.
 * @satisfies RF-04 - Category filtering and navigation in the catalog.
 */

import { defineType, defineField } from 'sanity';

export const category = defineType({
    name: 'categoria',
    title: 'Categoría',
    type: 'document',
    fields: [
        defineField({
            name: 'nombre',
            title: 'Nombre',
            type: 'string',
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'slug',
            title: 'Slug (URL)',
            type: 'slug',
            options: { source: 'nombre' },
        }),
        defineField({
            name: 'descripcion',
            title: 'Descripción',
            type: 'text',
        }),
        defineField({
            name: 'orden',
            title: 'Orden en el menú',
            type: 'number',
            // Controls display order in the category filter without depending on creation order.
        }),
    ]
});
