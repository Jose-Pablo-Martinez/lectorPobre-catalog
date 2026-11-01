import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        vue({
            template: {
                transformAssetUrls: false,
            },
        }),
    ],
    resolve: {
        alias: {
            '~': resolve(import.meta.dirname, '.'),
            '@': resolve(import.meta.dirname, '.'),
        },
    },
    test: {
        // Unit tests: fast, deterministic, no external dependencies.
        // Integration tests (*.integration.test.ts) are excluded from this run
        // and executed separately with `pnpm run test:integration`.
        // This replicates the pattern used for Go integration tests in api/ (§5.7 -tags=integration).
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/tests/e2e/**',
            '**/*.integration.test.ts',
        ],
        environment: 'happy-dom',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: [
                'components/**/*.vue',
                'composables/**/*.ts',
                'plugins/**/*.ts',
                'scripts/recommendations/**/*.ts',
            ],
            exclude: [
                '**/*.d.ts',
                '**/types.ts',
                'scripts/recommendations/build.ts',
            ],
        },
    },
});
