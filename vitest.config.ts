import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Unit tests: fast, deterministic, no external dependencies.
        // Integration tests (*.integration.test.ts) are excluded from this run
        // and executed separately with `pnpm run test:integration`.
        // This replicates the pattern used for Go integration tests in api/ (§5.7 -tags=integration).
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/*.integration.test.ts',
        ],
        environment: 'happy-dom',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
        },
    },
});
