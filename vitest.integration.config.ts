import { defineConfig } from 'vitest/config';

/**
 * @file vitest.integration.config.ts
 * @description Configuración de Vitest para tests de integración.
 * Solo incluye archivos con patrón *.integration.test.ts.
 * No usa happy-dom — los tests de integración hacen llamadas HTTP reales
 * a la API de Sanity y no necesitan simular un entorno de navegador.
 *
 * Ejecutar con: pnpm run test:integration
 */

export default defineConfig({
    test: {
        include: ['tests/integration/**/*.integration.test.ts'],
        environment: 'node', // Tests de integración: llamadas HTTP reales, no DOM
        testTimeout: 15000,  // 15s por test — la latencia de Sanity puede variar
    },
});
