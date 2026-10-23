/**
 * @file sanity.cli.ts
 * @description Configuración de la CLI de Sanity para LectorPobre.
 * Utilizada por los comandos de la CLI de `sanity` (dev, build, deploy, etc.).
 * projectId y dataset se leen de las variables de entorno para que el mismo archivo
 * funcione tanto para el dataset de producción como para el de staging en CI.
 * El valor por defecto coincide con el proyecto inicial del proyecto.
 */

import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
    api: {
        projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'rbrk7xv9',
        dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
    },
    deployment: {
        /**
         * Habilita actualizaciones automáticas de versiones menores para el Studio alojado.
         * Ver: https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
         */
        autoUpdates: true,
    },
});
