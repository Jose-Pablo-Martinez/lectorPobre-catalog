/**
 * @file subcategory.ts
 * @description Esquema de Sanity para subcategorías jerárquicas vinculadas a una categoría padre.
 * Convive de forma independiente con `palabrasClave` (etiquetas libres) sin migración.
 * @satisfies RF-04 - Filtrado por categoría/subcategoría y navegación en el catálogo.
 * @satisfies RF-13 - Gestión de taxonomía del catálogo.
 */

import { defineField, defineType } from 'sanity';

const SLUG_FORMAT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const subcategory = defineType({
    name: 'subcategoria',
    title: 'Subcategoría',
    type: 'document',
    fields: [
        defineField({
            name: 'nombre',
            title: 'Nombre',
            type: 'string',
            validation: (Rule) => Rule.required().min(2).max(80),
        }),
        defineField({
            name: 'slug',
            title: 'Slug (URL)',
            type: 'slug',
            options: { source: 'nombre', maxLength: 96 },
            validation: (Rule) =>
                Rule.required().custom((value) => {
                    const current = value?.current ?? '';
                    return SLUG_FORMAT_RE.test(current)
                        ? true
                        : 'El slug solo permite minúsculas, números y guiones simples (M-2).';
                }),
        }),
        defineField({
            name: 'categoriaPadre',
            title: 'Categoría padre',
            type: 'reference',
            to: [{ type: 'categoria' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'descripcion',
            title: 'Descripción',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'orden',
            title: 'Orden en el menú',
            type: 'number',
            validation: (Rule) => Rule.min(0).integer(),
        }),
    ],
    preview: {
        select: {
            title: 'nombre',
            subtitle: 'categoriaPadre.nombre',
        },
    },
});
