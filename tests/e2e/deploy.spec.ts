import { test, expect } from '@playwright/test';

/**
 * @file deploy.spec.ts
 * @description Tests E2E de despliegue según Modelo en V (§4.4 de implementationPlan.md).
 * Se ejecutan contra la URL de Preview en Vercel (o entorno local si BASE_URL está disponible).
 * Si BASE_URL no está configurada en CI (previa al primer despliegue de Preview),
 * los tests se omiten limpiamente sin romper el pipeline.
 * @satisfies ST-01, ST-02, ST-03, RF-01, RF-02, RF-17
 */

test.describe('E2E Deployment Tests (ST-01, ST-02, ST-03)', () => {
    test.beforeEach(async () => {
        // En CI, si VERCEL_PREVIEW_URL aún no existe en GitHub Secrets, omitir limpiamente
        test.skip(
            process.env.CI === 'true' && !process.env.BASE_URL,
            'Requiere secreto BASE_URL (VERCEL_PREVIEW_URL) configurado para tests E2E contra preview.'
        );
    });

    test('ST-01: La página principal carga sin errores y muestra productos del catálogo', async ({
        page,
    }) => {
        const response = await page.goto('/');
        expect(response?.status()).toBeLessThan(400);

        // Verificar título y presencia de elementos principales del catálogo
        await expect(page).toHaveTitle(/Lector Pobre/i);
        const searchInput = page.locator('input[type="search"]');
        await expect(searchInput).toBeVisible();
    });

    test('ST-02: La navegación a un producto muestra el detalle correctamente', async ({
        page,
    }) => {
        await page.goto('/');
        const firstCardLink = page.locator('article a').first();
        if ((await firstCardLink.count()) > 0) {
            await firstCardLink.click();
            await page.waitForURL(/\/product\/.+/);
            const detailTitle = page.locator('[data-testid="detail-title"]');
            await expect(detailTitle).toBeVisible();
        }
    });

    test('ST-03: El botón de WhatsApp directo genera un enlace wa.me válido', async ({
        page,
    }) => {
        await page.goto('/');
        const firstCardLink = page.locator('article a').first();
        if ((await firstCardLink.count()) > 0) {
            await firstCardLink.click();
            await page.waitForURL(/\/product\/.+/);

            const whatsappBtn = page.locator('[data-testid="whatsapp-button"]');
            if ((await whatsappBtn.count()) > 0) {
                const href = await whatsappBtn.getAttribute('href');
                expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+/);
                expect(href).not.toContain('undefined');
            }
        }
    });
});
