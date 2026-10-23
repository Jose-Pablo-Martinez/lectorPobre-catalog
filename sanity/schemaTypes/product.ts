/**
 * @file product.ts
 * @description Esquema de Sanity para los productos del catálogo.
 * @satisfies RF-01 - Listado en catálogo.
 * @satisfies RF-02 - Vista de detalle de producto.
 * @satisfies RF-11 - Edición de productos desde Sanity Studio.
 * @satisfies RF-12 - Gestión de imágenes (imagen principal + galería).
 * @satisfies RF-13 - Creación y eliminación de productos.
 * @satisfies RF-14 - Gestión de stock y alerta de stock bajo.
 * @satisfies RF-23 - Palabras clave para búsqueda y metadatos de recomendación.
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
            // Es la base para el enrutamiento de pages/producto/[slug].vue
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
            // umbralStockBajo es una configuración global que determina
            // cuándo se muestra la alerta de "pocas unidades" en el frontend
            validation: Rule => Rule.required().min(0).integer()
        }),
        defineField({
            name: 'precio',
            title: 'Precio (opcional)',
            type: 'number',
            // Opcional: utilizado únicamente en la plantilla del mensaje de WhatsApp (RF-17). No es precio de checkout.
        }),
        defineField({
            name: 'activo',
            title: 'Visible en catálogo',
            type: 'boolean',
            // Permite ocultar productos sin eliminarlos físicamente (RF-13).
            initialValue: true
        }),
        // No existe un campo 'calificacionPromedio' persistido. El promedio se deriva
        // en cada consulta GROQ como: round(ratingSum / ratingCount, 1).
        // Todos los contadores siguientes se actualizan de forma atómica desde el handler Go de calificación mediante patch.inc,
        // evitando condiciones de carrera de lectura-cálculo-escritura (ver cabecera de rating.ts).
        // rating1Count–rating5Count alimentan el panel de desglose por estrella en el frontend (RF-06).
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
        }),
        // ── Búsqueda y Recomendaciones (RF-23) ────────────────────────────────
        defineField({
            name: 'palabrasClave',
            title: 'Palabras clave de búsqueda',
            type: 'array',
            of: [{ type: 'string' }],
            options: { layout: 'tags' },
            description: 'Términos, tags o palabras clave adicionales para potenciar el buscador difuso y los productos similares (RF-23).'
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