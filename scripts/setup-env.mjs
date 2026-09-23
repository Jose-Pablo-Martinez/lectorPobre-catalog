#!/usr/bin/env node
/**
 * @file scripts/setup-env.mjs
 * @description Interactive setup script that creates .env.local from .env.example.
 * Run once after cloning the repository: node scripts/setup-env.mjs
 *
 * What it does:
 *  1. Checks whether .env.local already exists (skips if it does, to avoid overwriting secrets).
 *  2. Copies .env.example → .env.local
 *  3. Prints the next steps the developer needs to follow (Sanity login, dataset creation, etc.)
 *
 * It does NOT fill in secret values automatically — those must be obtained from the project owner
 * or generated manually (tokens, JWT secrets, etc.).
 */

import { existsSync, copyFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const EXAMPLE   = resolve(ROOT, '.env.example');
const TARGET    = resolve(ROOT, '.env.local');

// ── ANSI colour helpers (no external dependencies) ───────────────────────────
const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    red:    '\x1b[31m',
    dim:    '\x1b[2m',
};
const ok   = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}⚠${c.reset}  ${msg}`);
const info = (msg) => console.log(`${c.cyan}ℹ${c.reset}  ${msg}`);
const step = (n, msg) => console.log(`\n${c.bold}${c.cyan}[${n}]${c.reset} ${c.bold}${msg}${c.reset}`);
const code = (cmd) => `${c.dim}  ${cmd}${c.reset}`;

console.log(`\n${c.bold}LectorPobre — Environment Setup${c.reset}`);
console.log('─'.repeat(40));

// ── Step 1: Check .env.example exists ────────────────────────────────────────
if (!existsSync(EXAMPLE)) {
    console.error(`${c.red}✗${c.reset} .env.example not found at ${EXAMPLE}`);
    console.error('  Make sure you are running this script from the repository root.');
    process.exit(1);
}

// ── Step 2: Copy .env.example → .env.local ───────────────────────────────────
if (existsSync(TARGET)) {
    warn('.env.local already exists — skipping copy to avoid overwriting your secrets.');
    warn('Delete .env.local manually if you want to reset it, then re-run this script.');
} else {
    copyFileSync(EXAMPLE, TARGET);
    ok('.env.local created from .env.example');
}

// ── Step 3: Count empty variables so the developer knows what to fill ─────────
const lines  = readFileSync(TARGET, 'utf8').split('\n');
const empty  = lines.filter(l => /^[A-Z_]+=\s*$/.test(l)).map(l => l.split('=')[0]);
const filled = lines.filter(l => /^[A-Z_]+=.+/.test(l)).length;

info(`${filled} variables already have values.`);
if (empty.length > 0) {
    warn(`${empty.length} variable(s) still need values in .env.local:`);
    empty.forEach(k => console.log(`     ${c.dim}${k}${c.reset}`));
}

// ── Step 4: Print next-steps instructions ────────────────────────────────────
console.log(`\n${c.bold}Next steps to finish local setup:${c.reset}`);
console.log('─'.repeat(40));

step(1, 'Install dependencies (root + Sanity Studio)');
console.log(code('pnpm install'));
console.log(code('cd sanity && pnpm install && cd ..'));

step(2, 'Log in to Sanity (opens browser)');
console.log(code('cd sanity'));
console.log(code('pnpm exec sanity login'));

step(3, 'Create the staging dataset (first time only)');
console.log(code('pnpm exec sanity dataset create staging'));
console.log(`   ${c.dim}→ Choose "private" when prompted.${c.reset}`);

step(4, 'Fill in .env.local');
console.log(`   Edit ${c.cyan}.env.local${c.reset} in the project root with the values from the project owner.`);
console.log(`   Minimum required for Nuxt + Studio to work locally:`);
console.log(code('NUXT_PUBLIC_SANITY_PROJECT_ID=rbrk7xv9'));
console.log(code('NUXT_PUBLIC_SANITY_DATASET=staging'));
console.log(code('SANITY_STUDIO_PROJECT_ID=rbrk7xv9'));
console.log(code('SANITY_STUDIO_DATASET=staging'));

step(5, 'Launch Sanity Studio (to load seed data)');
console.log(code('cd sanity && pnpm dev'));
console.log(`   ${c.dim}→ Studio opens at http://localhost:3333${c.reset}`);

step(6, 'Launch Nuxt frontend (separate terminal)');
console.log(code('pnpm dev'));
console.log(`   ${c.dim}→ Site opens at http://localhost:3000${c.reset}`);

console.log(`\n${c.dim}See docs/CONTRIBUTING.md for the full environment setup guide.${c.reset}\n`);
