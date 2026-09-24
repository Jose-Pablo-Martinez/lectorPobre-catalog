#!/usr/bin/env node
/**
 * @file scripts/seed-staging.mjs
 * @description Seed script that populates the Sanity `staging` dataset with
 * representative test data for local development and integration testing.
 *
 * What it creates (in order, respecting references):
 *  1. Configuración Global (singleton)
 *  2. Categorías  (3)
 *  3. Productos   (6 — 2 per category, mix of stock levels)
 *  4. Comentarios (4 — different estado values for moderation testing)
 *  5. Calificaciones (4 — triggers ratingSum/ratingCount patch on products)
 *
 * What it does NOT create:
 *  - Images (imagenPrincipal / imagenes): binary assets must be uploaded
 *    manually through Sanity Studio or via the Sanity Media API.
 *    All products will appear in Studio without a cover image until uploaded.
 *
 * Prerequisites:
 *  - .env.local must have SANITY_WRITE_TOKEN and NUXT_PUBLIC_SANITY_PROJECT_ID
 *  - The staging dataset must already exist:
 *      cd sanity && pnpm exec sanity dataset create staging
 *  - Run from the repository ROOT (not from sanity/):
 *      node scripts/seed-staging.mjs
 *
 * Idempotency:
 *  The script uses fixed _id values prefixed with "seed-" so running it twice
 *  will PATCH (update) existing documents instead of creating duplicates.
 *  To reset, delete all "seed-*" documents from Studio and re-run.
 *
 * @satisfies RF-01, RF-02, RF-03, RF-04, RF-06, RF-07, RF-14, RF-15, RF-17, RF-19
 */

import { createClient } from '@sanity/client';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ── ANSI helpers (no external deps) ──────────────────────────────────────────
const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    red:    '\x1b[31m',
    dim:    '\x1b[2m',
};
const ok    = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const warn  = (msg) => console.log(`${c.yellow}⚠${c.reset}  ${msg}`);
const info  = (msg) => console.log(`${c.cyan}ℹ${c.reset}  ${msg}`);
const err   = (msg) => console.log(`${c.red}✗${c.reset} ${msg}`);
const head  = (msg) => console.log(`\n${c.bold}${c.cyan}▸ ${msg}${c.reset}`);

// ── Load .env.local manually (no dotenv dependency needed) ───────────────────
const ENV_FILE = resolve(ROOT, '.env.local');
if (!existsSync(ENV_FILE)) {
    err('.env.local not found. Run: pnpm run setup');
    process.exit(1);
}

const envVars = Object.fromEntries(
    readFileSync(ENV_FILE, 'utf8')
        .split('\n')
        .filter(l => /^[A-Z_]+=.+/.test(l))
        .map(l => {
            const [key, ...rest] = l.split('=');
            return [key.trim(), rest.join('=').trim()];
        })
);

const PROJECT_ID = envVars['NUXT_PUBLIC_SANITY_PROJECT_ID'] ?? 'rbrk7xv9';
const TOKEN      = envVars['SANITY_WRITE_TOKEN'];
const DATASET    = 'staging';

if (!TOKEN) {
    err('SANITY_WRITE_TOKEN is not set in .env.local');
    err('Get it from: https://sanity.io/manage → your project → API → Tokens → Add API token (Editor)');
    process.exit(1);
}

// ── Sanity client ─────────────────────────────────────────────────────────────
const client = createClient({
    projectId: PROJECT_ID,
    dataset:   DATASET,
    token:     TOKEN,
    apiVersion: '2024-01-01',
    useCdn:    false, // always write to the live API
});

console.log(`\n${c.bold}LectorPobre — Seed Script${c.reset}`);
console.log('─'.repeat(40));
info(`Project:  ${PROJECT_ID}`);
info(`Dataset:  ${DATASET}`);
console.log('─'.repeat(40));

// ── Helper: createOrReplace uses fixed _id for idempotency ───────────────────
/**
 * Creates or replaces a document using its fixed seed _id.
 * Safe to run multiple times — existing documents are updated, not duplicated.
 * @param {object} doc - Sanity document object with _id and _type.
 * @returns {Promise<object>} The created/replaced document.
 */
async function upsert(doc) {
    return client.createOrReplace(doc);
}

// ── Helper: patch product rating counters ─────────────────────────────────────
/**
 * Atomically increments ratingSum and ratingCount on a product using patch.inc.
 * This mirrors what the Go /api/calificar handler does in production.
 * @param {string} productId - The product document _id.
 * @param {number} valor - Rating value (1–5).
 */
async function patchRating(productId, valor) {
    await client
        .patch(productId)
        .setIfMissing({ ratingSum: 0, ratingCount: 0 })
        .inc({ ratingSum: valor, ratingCount: 1 })
        .commit();
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN GLOBAL (singleton)
// ════════════════════════════════════════════════════════════════════════════════

head('1. Configuración Global');

await upsert({
    _id:   'global-config',           // fixed ID used by sanity.config.ts singleton
    _type: 'configuracionGlobal',
    nombreSitio:       'LectorPobre',
    numeroWhatsApp:    '5219991234567',
    mensajeWhatsApp:   'Hola, me interesa el producto {{nombre}}',
    urlInstagram:      'https://instagram.com/lectorpobre',
    urlFacebook:       'https://facebook.com/lectorpobre',
    urlTikTok:         'https://tiktok.com/@lectorpobre',
    paletaActiva:      'azul',
    varianteVisual:    'moderno',
    umbralStockBajo:   5,             // RF-03, RF-14: show "pocas unidades" alert
    productosPorPagina: 24,           // RF-19: catalog page size
});
ok('Configuración Global creada (singleton id: global-config)');

// ════════════════════════════════════════════════════════════════════════════════
// 2. CATEGORÍAS
// ════════════════════════════════════════════════════════════════════════════════

head('2. Categorías');

const categorias = [
    {
        _id:         'seed-cat-llaveros',
        _type:       'categoria',
        nombre:      'Llaveros',
        slug:        { _type: 'slug', current: 'llaveros' },
        descripcion: 'Llaveros artesanales y de colección de diversas temáticas.',
        orden:       1,
    },
    {
        _id:         'seed-cat-pins',
        _type:       'categoria',
        nombre:      'Pins',
        slug:        { _type: 'slug', current: 'pins' },
        descripcion: 'Pins esmaltados de personajes, series y cultura pop.',
        orden:       2,
    },
    {
        _id:         'seed-cat-stickers',
        _type:       'categoria',
        nombre:      'Stickers',
        slug:        { _type: 'slug', current: 'stickers' },
        descripcion: 'Stickers de vinilo resistentes al agua con diseños únicos.',
        orden:       3,
    },
];

for (const cat of categorias) {
    await upsert(cat);
    ok(`Categoría: ${cat.nombre}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. PRODUCTOS (2 por categoría)
// ════════════════════════════════════════════════════════════════════════════════

head('3. Productos');

const productos = [
    // ── Llaveros ──
    {
        _id:         'seed-prod-llavero-gato',
        _type:       'producto',
        nombre:      'Llavero Gato Kawaii',
        slug:        { _type: 'slug', current: 'llavero-gato-kawaii' },
        descripcion: 'Llavero de resina con diseño de gato kawaii en colores pastel. Hecho a mano, piezas únicas.',
        categoria:   { _type: 'reference', _ref: 'seed-cat-llaveros' },
        stock:       12,
        precio:      85,
        activo:      true,
        ratingSum:   0,
        ratingCount: 0,
    },
    {
        _id:         'seed-prod-llavero-studio-ghibli',
        _type:       'producto',
        nombre:      'Llavero Totoro',
        slug:        { _type: 'slug', current: 'llavero-totoro' },
        descripcion: 'Llavero metálico esmaltado con diseño de Totoro del Studio Ghibli. Incluye argolla de acero.',
        categoria:   { _type: 'reference', _ref: 'seed-cat-llaveros' },
        stock:       3,              // ← por debajo del umbral (5) → "pocas unidades" RF-14
        precio:      120,
        activo:      true,
        ratingSum:   0,
        ratingCount: 0,
    },
    // ── Pins ──
    {
        _id:         'seed-prod-pin-dragon-ball',
        _type:       'producto',
        nombre:      'Pin Goku Ultra Instinto',
        slug:        { _type: 'slug', current: 'pin-goku-ultra-instinto' },
        descripcion: 'Pin esmaltado duro de 38mm con diseño de Goku en modo Ultra Instinto. Acabado brillante.',
        categoria:   { _type: 'reference', _ref: 'seed-cat-pins' },
        stock:       28,
        precio:      65,
        activo:      true,
        ratingSum:   0,
        ratingCount: 0,
    },
    {
        _id:         'seed-prod-pin-mushroom',
        _type:       'producto',
        nombre:      'Pin Mushroom Retro',
        slug:        { _type: 'slug', current: 'pin-mushroom-retro' },
        descripcion: 'Pin esmaltado suave con diseño de hongo estilo pixel art de 8 bits. Mariposa de seguridad incluida.',
        categoria:   { _type: 'reference', _ref: 'seed-cat-pins' },
        stock:       0,              // ← sin stock → botón de contacto deshabilitado RF-03
        precio:      55,
        activo:      true,
        ratingSum:   0,
        ratingCount: 0,
    },
    // ── Stickers ──
    {
        _id:         'seed-prod-sticker-pack-anime',
        _type:       'producto',
        nombre:      'Sticker Pack Anime Mix',
        slug:        { _type: 'slug', current: 'sticker-pack-anime-mix' },
        descripcion: 'Pack de 10 stickers de vinilo con diseños de anime variados. Resistentes al agua y al sol.',
        categoria:   { _type: 'reference', _ref: 'seed-cat-stickers' },
        stock:       45,
        precio:      40,
        activo:      true,
        ratingSum:   0,
        ratingCount: 0,
    },
    {
        _id:         'seed-prod-sticker-bookish',
        _type:       'producto',
        nombre:      'Sticker "Read More Books"',
        slug:        { _type: 'slug', current: 'sticker-read-more-books' },
        descripcion: 'Sticker individual de vinilo mate con tipografía vintage. Perfecto para laptops y libretas.',
        categoria:   { _type: 'reference', _ref: 'seed-cat-stickers' },
        stock:       60,
        precio:      25,
        activo:      false,          // ← inactivo → no aparece en el catálogo público RF-13
        ratingSum:   0,
        ratingCount: 0,
    },
];

for (const prod of productos) {
    await upsert(prod);
    const stockTag = prod.stock === 0    ? `${c.red}sin stock${c.reset}` :
                     prod.stock <= 5     ? `${c.yellow}pocas unidades${c.reset}` :
                                          `${c.green}stock ok${c.reset}`;
    const activoTag = prod.activo ? '' : ` ${c.dim}[inactivo]${c.reset}`;
    ok(`Producto: ${prod.nombre} — ${stockTag}${activoTag}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. COMENTARIOS (distintos estados para probar el workflow de moderación)
// ════════════════════════════════════════════════════════════════════════════════

head('4. Comentarios');

const comentarios = [
    {
        _id:           'seed-comment-1',
        _type:         'comentario',
        texto:         '¡Me encantó el llavero! Llegó perfectamente empaquetado y el diseño es precioso. Definitivamente compraré más.',
        producto:      { _type: 'reference', _ref: 'seed-prod-llavero-gato' },
        fechaCreacion: new Date('2026-09-01T10:00:00Z').toISOString(),
        estado:        'aprobado',   // ← visible en catálogo público
    },
    {
        _id:           'seed-comment-2',
        _type:         'comentario',
        texto:         'El pin llegó con un pequeño raspón en el esmalte. Igual se ve bonito pero esperaba mejor calidad.',
        producto:      { _type: 'reference', _ref: 'seed-prod-pin-dragon-ball' },
        fechaCreacion: new Date('2026-09-05T14:30:00Z').toISOString(),
        estado:        'aprobado',
    },
    {
        _id:           'seed-comment-3',
        _type:         'comentario',
        texto:         '¿Tienen el llavero de Totoro en más colores? Me gustaría uno en azul.',
        producto:      { _type: 'reference', _ref: 'seed-prod-llavero-studio-ghibli' },
        fechaCreacion: new Date('2026-09-10T09:15:00Z').toISOString(),
        estado:        'pendiente',  // ← esperando moderación del admin
    },
    {
        _id:           'seed-comment-4',
        _type:         'comentario',
        texto:         'Spam message - buy cheap products at...',
        producto:      { _type: 'reference', _ref: 'seed-prod-sticker-pack-anime' },
        fechaCreacion: new Date('2026-09-12T18:00:00Z').toISOString(),
        estado:        'rechazado',  // ← rechazado por spam, nunca visible
    },
];

for (const com of comentarios) {
    await upsert(com);
    const estadoTag = com.estado === 'aprobado'  ? `${c.green}aprobado${c.reset}` :
                      com.estado === 'pendiente' ? `${c.yellow}pendiente${c.reset}` :
                                                   `${c.red}rechazado${c.reset}`;
    ok(`Comentario en "${com.producto._ref.replace('seed-prod-', '')}" — ${estadoTag}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. CALIFICACIONES + patch en producto (replica comportamiento del handler Go)
// ════════════════════════════════════════════════════════════════════════════════

head('5. Calificaciones');

const calificaciones = [
    { _id: 'seed-rating-1', producto: 'seed-prod-llavero-gato',       valor: 5 },
    { _id: 'seed-rating-2', producto: 'seed-prod-llavero-gato',       valor: 4 },
    { _id: 'seed-rating-3', producto: 'seed-prod-pin-dragon-ball',    valor: 3 },
    { _id: 'seed-rating-4', producto: 'seed-prod-sticker-pack-anime', valor: 5 },
];

for (const cal of calificaciones) {
    // 1. Crear el documento calificacion
    await upsert({
        _id:           cal._id,
        _type:         'calificacion',
        valor:         cal.valor,
        producto:      { _type: 'reference', _ref: cal.producto },
        fechaCreacion: new Date().toISOString(),
    });

    // 2. Patch atómico en el producto — misma lógica que el handler Go (RF-06)
    await patchRating(cal.producto, cal.valor);

    ok(`Calificación ${cal.valor}★ en "${cal.producto.replace('seed-prod-', '')}" (+ patch en producto)`);
}

// ════════════════════════════════════════════════════════════════════════════════
// Resumen final
// ════════════════════════════════════════════════════════════════════════════════

console.log(`\n${c.bold}${c.green}Seed completado exitosamente.${c.reset}`);
console.log('─'.repeat(40));
info('Studio: http://localhost:3333');
info('Verifica los documentos en el Studio antes de iniciar el desarrollo.');
warn('Las imágenes de los productos deben subirse manualmente desde el Studio.');
warn('Para resetear: elimina documentos "seed-*" en Studio y vuelve a correr este script.');
console.log();
