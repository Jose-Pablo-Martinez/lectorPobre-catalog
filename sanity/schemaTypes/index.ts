/**
 * @file index.ts
 * @description Barrel file — collects all Sanity schema types into a single array
 * for registration in sanity.config.ts. Add new schemas here when they are created.
 */

import type { SchemaTypeDefinition } from 'sanity';

import { product }      from './product';
import { category }     from './category';
import { comment }      from './comment';
import { rating }       from './rating';
import { globalConfig } from './globalConfig';

// Explicit type annotation prevents TypeScript from inferring a heterogeneous
// tuple type that is incompatible with what defineConfig expects.
export const schemaTypes: SchemaTypeDefinition[] = [
    product,
    category,
    comment,
    rating,
    globalConfig,
];
