#!/usr/bin/env node
/**
 * @file scripts/migrate-review-ids.mjs
 * @description Re-clavea documentos existentes de `comentario` y `calificacion` en Sanity
 * reemplazando `usuarioId` y `_id` en texto plano por el identificador opaco HMAC-SHA256
 * derivado con `REVIEW_ID_SECRET` (remediación V-01).
 *
 * Uso:
 *   node scripts/migrate-review-ids.mjs [--dataset=staging|production] [--dry-run]
 */

import { createClient } from '@sanity/client';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OPAQUE_KEY_REGEX = /^[0-9a-f]{32}$/;

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

export function sanitizeIdSegment(raw) {
    const cleaned = String(raw ?? '')
        .trim()
        .replaceAll(/[^A-Za-z0-9_-]/g, '-');
    let start = 0;
    let end = cleaned.length;
    while (start < end && cleaned[start] === '-') start += 1;
    while (end > start && cleaned[end - 1] === '-') end -= 1;
    return cleaned.slice(start, end);
}

export function deriveOpaqueUserKey(userId, secret) {
    return createHmac('sha256', secret)
        .update(String(userId).trim())
        .digest('hex')
        .slice(0, 32);
}

export function isAlreadyMigrated(doc, prefix) {
    const uid = String(doc?.usuarioId ?? '').trim();
    const pid = sanitizeIdSegment(doc?.producto?._ref ?? '');
    if (!OPAQUE_KEY_REGEX.test(uid) || !pid) {
        return false;
    }
    return doc._id === `${prefix}-${pid}-${uid}`;
}

async function main() {
    const env = loadEnv();
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const datasetArg = args.find((a) => a.startsWith('--dataset='))?.split('=')[1];

    const projectId = env.NUXT_PUBLIC_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID;
    const dataset = datasetArg || env.NUXT_PUBLIC_SANITY_DATASET || env.SANITY_DATASET || 'staging';
    const token = env.SANITY_WRITE_TOKEN;
    const reviewSecret = (env.REVIEW_ID_SECRET ?? '').trim();

    if (!projectId || !token || !reviewSecret) {
        console.error(
            'Faltan credenciales: define NUXT_PUBLIC_SANITY_PROJECT_ID, SANITY_WRITE_TOKEN y REVIEW_ID_SECRET en .env.local'
        );
        process.exit(1);
    }

    const client = createClient({
        projectId,
        dataset,
        apiVersion: '2024-01-01',
        token,
        useCdn: false,
    });

    console.log(`Migrando IDs de reseñas en dataset "${dataset}"${dryRun ? ' (DRY RUN)' : ''}...`);

    const docs = await client.fetch(
        `*[_type in ["comentario", "calificacion"] && !(_id in path("drafts.**")) && defined(usuarioId) && defined(producto._ref)]{
            _id,
            _type,
            texto,
            estado,
            calificacion,
            valor,
            usuarioId,
            producto,
            fechaCreacion
        }`
    );

    let migratedCount = 0;
    for (const doc of docs) {
        const prefix = doc._type === 'comentario' ? 'comentario' : 'calificacion';
        if (isAlreadyMigrated(doc, prefix)) {
            continue;
        }

        const pid = sanitizeIdSegment(doc.producto._ref);
        const opaqueKey = deriveOpaqueUserKey(doc.usuarioId, reviewSecret);
        const newId = `${prefix}-${pid}-${opaqueKey}`;
        if (newId === doc._id) {
            continue;
        }

        const { _id: oldId, ...rest } = doc;
        const newDoc = {
            ...rest,
            _id: newId,
            usuarioId: opaqueKey,
        };

        console.log(`  • [${doc._type}] ${oldId} -> ${newId}`);
        if (!dryRun) {
            await client.transaction().createOrReplace(newDoc).delete(oldId).commit();
        }
        migratedCount += 1;
    }

    console.log(
        dryRun
            ? `Simulación completada: ${migratedCount} documentos pendientes de migrar.`
            : `Migración completada: ${migratedCount} documentos re-claveados.`
    );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        await main();
    } catch (e) {
        console.error('Error durante la migración de reseñas:', e);
        process.exit(1);
    }
}

