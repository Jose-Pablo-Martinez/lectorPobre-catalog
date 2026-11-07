#!/usr/bin/env node
/**
 * @file scripts/reconcile-ratings.mjs
 * @description Recalcula y sincroniza los contadores de calificación (`ratingSum`, `ratingCount`,
 * `rating1Count`..`rating5Count`) de cada producto en Sanity a partir de los documentos reales
 * de tipo `calificacion` (remediación V-02).
 *
 * Uso:
 *   node scripts/reconcile-ratings.mjs [--dataset=production|staging] [--dry-run]
 */

import { createClient } from '@sanity/client';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
    const envFile = resolve(ROOT, '.env.local');
    const fileVars = existsSync(envFile)
        ? Object.fromEntries(
              readFileSync(envFile, 'utf8')
                  .split('\n')
                  .filter((l) => /^[A-Z0-9_]+=.+/.test(l.trim()))
                  .map((l) => {
                      const [key, ...rest] = l.split('=');
                      const cleanVal = rest.join('=').trim().replace(/^["']|["']$/g, '');
                      return [key.trim(), cleanVal];
                  })
          )
        : {};
    return { ...fileVars, ...process.env };
}

export function computeProductRatingStats(productIds, ratings) {
    const statsByProduct = new Map();
    for (const id of productIds) {
        statsByProduct.set(id, {
            ratingSum: 0,
            ratingCount: 0,
            rating1Count: 0,
            rating2Count: 0,
            rating3Count: 0,
            rating4Count: 0,
            rating5Count: 0,
        });
    }

    for (const r of ratings) {
        const pid = r?.productoId;
        const val = Number(r?.valor);
        if (!pid || !statsByProduct.has(pid) || !Number.isInteger(val) || val < 1 || val > 5) {
            continue;
        }
        const entry = statsByProduct.get(pid);
        entry.ratingSum += val;
        entry.ratingCount += 1;
        entry[`rating${val}Count`] += 1;
    }

    return statsByProduct;
}

async function main() {
    const env = loadEnv();
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const datasetArg = args.find((a) => a.startsWith('--dataset='))?.split('=')[1];

    const projectId = env.NUXT_PUBLIC_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID;
    const dataset = datasetArg || env.NUXT_PUBLIC_SANITY_DATASET || env.SANITY_DATASET || 'production';
    const token = env.SANITY_WRITE_TOKEN;

    if (!projectId || !token) {
        console.error('Faltan credenciales: asegúrate de definir NUXT_PUBLIC_SANITY_PROJECT_ID y SANITY_WRITE_TOKEN en .env.local');
        process.exit(1);
    }

    const client = createClient({
        projectId,
        dataset,
        apiVersion: '2024-01-01',
        token,
        useCdn: false,
    });

    console.log(`Reconciliando contadores de calificación en dataset "${dataset}"${dryRun ? ' (DRY RUN)' : ''}...`);

    const [products, ratings] = await Promise.all([
        client.fetch(`*[_type == "producto" && !(_id in path("drafts.**"))]{ _id, nombre }`),
        client.fetch(`*[_type == "calificacion" && !(_id in path("drafts.**"))]{ _id, valor, "productoId": producto._ref }`),
    ]);

    const statsByProduct = computeProductRatingStats(
        products.map((p) => p._id),
        ratings
    );

    let updated = 0;
    for (const product of products) {
        const stats = statsByProduct.get(product._id);
        console.log(`  • ${product.nombre} (${product._id}): count=${stats.ratingCount}, sum=${stats.ratingSum}`);
        if (!dryRun) {
            await client.patch(product._id).set(stats).commit();
            updated += 1;
        }
    }

    console.log(dryRun ? 'Simulación completada sin escribir cambios.' : `Reconciliación completada: ${updated} productos actualizados.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        await main();
    } catch (e) {
        console.error('Error durante la reconciliación:', e);
        process.exit(1);
    }
}

