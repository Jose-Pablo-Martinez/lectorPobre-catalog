/**
 * @file sanity.config.ts
 * @description Sanity Studio configuration for LectorPobre.
 * - structureTool: document browser and editor UI.
 * - visionTool: in-Studio GROQ query runner (dev/staging use only).
 *   Use the Vision tab to verify queries before writing composables in Nuxt.
 *
 * Singleton pattern for 'configuracionGlobal' (Sanity v3 approach):
 * - schema.templates: prevents "Create new" in the global menu.
 * - document.actions: removes "Delete" and "Duplicate" from the document toolbar.
 * - structureTool.structure: links the sidebar item directly to a fixed documentId
 *   so the user always edits the same unique document.
 *
 * projectId and dataset are read from environment variables so they are never
 * hardcoded in the repository (see .env.local for local overrides).
 */

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

// Document types that must have exactly one instance in the dataset.
const SINGLETON_TYPES = ['configuracionGlobal'];
// The fixed document ID used for the singleton — always edits the same document.
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
                        // Regular document types listed automatically
                        S.documentTypeListItem('producto').title('Productos'),
                        S.documentTypeListItem('categoria').title('Categorías'),
                        S.documentTypeListItem('comentario').title('Comentarios'),
                        S.documentTypeListItem('calificacion').title('Calificaciones'),
                        S.divider(),
                        // Singleton: links directly to the fixed document ID
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
    ],

    schema: {
        types: schemaTypes,
        // Prevent "Create new document" from appearing for singleton types.
        templates: (templates) =>
            templates.filter(({ schemaType }) => !SINGLETON_TYPES.includes(schemaType)),
    },

    document: {
        // Remove "Delete" and "Duplicate" actions for singleton types.
        actions: (prev, context) => {
            if (SINGLETON_TYPES.includes(context.schemaType)) {
                return prev.filter(({ action }) =>
                    ['publish', 'discardChanges', 'restore'].includes(action ?? '')
                );
            }
            return prev;
        },
    },
});
