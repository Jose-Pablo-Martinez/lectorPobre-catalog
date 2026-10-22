import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Tests unitarios: rápidos, deterministas y sin dependencias externas.
        // Los tests de integración (*.integration.test.ts) se excluyen de esta ejecución
        // y se ejecutan por separado con `pnpm run test:integration`.
        // Esto replica el patrón usado para los tests de integración en Go dentro de api/ (§5.7 -tags=integration).
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
