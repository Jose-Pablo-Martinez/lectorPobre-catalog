/**
 * @file index.ts
 * @description Archivo barrel: reúne todos los tipos de esquema de Sanity en un único arreglo
 * para su registro en sanity.config.ts. Agregar nuevos esquemas aquí cuando se creen.
 */

import type { SchemaTypeDefinition } from 'sanity';

import { product }      from './product';
import { category }     from './category';
import { comment }      from './comment';
import { rating }       from './rating';
import { globalConfig } from './globalConfig';

// La anotación explícita de tipo evita que TypeScript infiera una tupla heterogénea
// incompatible con la firma esperada por defineConfig.
export const schemaTypes: SchemaTypeDefinition[] = [
    product,
    category,
    comment,
    rating,
    globalConfig,
];
