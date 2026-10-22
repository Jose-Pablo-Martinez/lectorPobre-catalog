/**
 * @file sanity.config.ts
 * @description Configuración de Sanity Studio para LectorPobre.
 * - structureTool: interfaz de navegación y edición de documentos.
 * - visionTool: ejecutor de consultas GROQ dentro de Studio (solo para desarrollo/staging).
 *   Utilizar la pestaña Vision para verificar consultas antes de escribir composables en Nuxt.
 *
 * Patrón singleton para 'configuracionGlobal' (enfoque Sanity v3):
 * - schema.templates: previene la opción "Crear nuevo" en el menú global.
 * - document.actions: elimina "Eliminar" y "Duplicar" de la barra de acciones del documento.
 * - structureTool.structure: vincula el elemento del sidebar directamente a un documentId fijo
 *   para que el usuario siempre edite el mismo documento único.
 *
 * projectId y dataset se leen de variables de entorno para no quedar hardcodeados
 * en el repositorio (ver .env.local para valores locales).
 */

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';
import { esESLocale } from '@sanity/locale-es-es';

// Tipos de documentos que deben tener exactamente una única instancia en el dataset.
const SINGLETON_TYPES = ['configuracionGlobal'];
// Tipos de documentos que deben ser de solo lectura en Studio (evitar creación/edición manual).
const READ_ONLY_TYPES = ['calificacion'];
// ID de documento fijo utilizado para el singleton — siempre edita el mismo documento.
const SINGLETON_DOC_ID = 'global-config';

export default defineConfig({
    name: 'default',
    title: 'LectorPobre Studio',

    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'rbrk7xv9',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

    plugins: [
        structureTool({
            structure: (S) =>
                S.list()
                    .title('Contenido')
                    .items([
                        // Tipos de documento regulares listados automáticamente
                        S.documentTypeListItem('producto').title('Productos'),
                        S.documentTypeListItem('categoria').title('Categorías'),
                        S.documentTypeListItem('comentario').title('Comentarios'),
                        S.documentTypeListItem('calificacion').title('Calificaciones'),
                        S.divider(),
                        // Singleton: vincula directamente al ID de documento fijo
                        S.listItem()
                            .title('Configuración Global')
                            .id(SINGLETON_DOC_ID)
                            .child(
                                S.document()
                                    .schemaType('configuracionGlobal')
                                    .documentId(SINGLETON_DOC_ID)
                            ),
                    ]),
        }),
        visionTool(),
        esESLocale(),
    ],

    schema: {
        types: schemaTypes,
        // Evita que aparezca "Crear nuevo documento" para los tipos singleton y de solo lectura.
        templates: (templates) =>
            templates.filter(
                ({ schemaType }) =>
                    !SINGLETON_TYPES.includes(schemaType) && !READ_ONLY_TYPES.includes(schemaType)
            ),
    },

    document: {
        actions: (prev, context) => {
            // Elimina las acciones de "Eliminar" y "Duplicar" para los tipos singleton.
            if (SINGLETON_TYPES.includes(context.schemaType)) {
                return prev.filter(({ action }) =>
                    ['publish', 'discardChanges', 'restore'].includes(action ?? '')
                );
            }
            // Elimina "Publicar" (guardar) y "Duplicar" para tipos de solo lectura,
            // dejando disponible únicamente "eliminar" para moderación y limpieza de spam.
            if (READ_ONLY_TYPES.includes(context.schemaType)) {
                return prev.filter(({ action }) =>
                    ['delete', 'discardChanges', 'restore'].includes(action ?? '')
                );
            }
            return prev;
        },
    },
});
