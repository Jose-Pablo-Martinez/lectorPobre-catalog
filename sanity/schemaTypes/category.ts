/**
 * @file category.ts
 * @description Esquema de Sanity para categorías de productos.
 * @satisfies RF-04 - Filtrado por categoría y navegación en el catálogo.
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
            // Controla el orden de visualización en el filtro de categorías sin depender del orden de creación.
        }),
    ]
});
