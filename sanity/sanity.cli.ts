/**
 * @file sanity.cli.ts
 * @description Sanity CLI configuration for LectorPobre.
 * Used by the `sanity` CLI commands (dev, build, deploy, etc.).
 * projectId and dataset are read from environment variables so the same file
 * works for both the production dataset and the staging override in CI.
 * The hardcoded fallback matches the project created during Phase 0.
 */

import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
    api: {
        projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'rbrk7xv9',
        dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
    },
    deployment: {
        /**
         * Enables automatic minor-version updates for the hosted Studio.
         * See: https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
         */
        autoUpdates: true,
    },
});
