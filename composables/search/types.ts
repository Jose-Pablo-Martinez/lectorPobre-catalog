/**
 * @file composables/search/types.ts
 * @description Contratos e interfaces desacopladas para el motor de búsqueda client-side.
 * Permite reemplazar Fuse.js por MiniSearch o un servicio externo sin modificar componentes UI.
 * @satisfies RF-18 (Búsqueda difusa y autocompletado), RF-23 (Palabras clave y sinónimos), RNF-07, RNF-08 (Extensibilidad)
 */

/**
 * Representación indexable de un producto para búsqueda difusa.
 * @satisfies RF-18, RF-23
 */
export interface SearchableProduct {
  /** ID único del documento en Sanity.io. */
  _id: string;
  /** Nombre comercial del producto (peso 0.5). */
  nombre: string;
  /** Slug para navegación directa en autocompletado. */
  slug?: string;
  /** Descripción larga opcional (peso 0.1). */
  descripcion?: string;
  /** Nombre de la categoría (peso 0.15). */
  categoria: string;
  /** Slug de la categoría para filtrado directo. */
  categoriaSlug?: string;
  /** Etiquetas y palabras clave de búsqueda definidas en Sanity (peso 0.25). */
  palabrasClave?: string[];
}

/**
 * Grupo de sinónimos equivalentes configurado en Sanity (`configuracionGlobal.sinonimos`).
 * @satisfies RF-23
 */
export interface SynonymGroup {
  terminos: string[];
}

/**
 * Categoría resumida dentro del índice estático de búsqueda.
 * @satisfies RF-04, RF-18
 */
export interface SearchableCategory {
  _id: string;
  nombre: string;
  slug: string;
}

/**
 * Estructura del archivo estático `/data/search-index.json` generado en build time.
 * @satisfies RF-18, RF-23, RNF-07
 */
export interface SearchIndexPayload {
  schemaVersion: 1;
  generatedAt: string;
  products: SearchableProduct[];
  categories: SearchableCategory[];
  synonyms: SynonymGroup[];
}

/**
 * Resultado individual devuelto por un motor de búsqueda, ordenado por relevancia.
 * @satisfies RF-18
 */
export interface SearchResult {
  /** ID del producto coincidente (`_id`). */
  id: string;
  /** Puntaje de relevancia normalizado en [0, 1] (mayor valor = mayor relevancia). */
  score: number;
}

/**
 * Sugerencia de autocompletado para el combobox del buscador.
 * @satisfies RF-18
 */
export interface Suggestion {
  /** Tipo de sugerencia mostrada en el desplegable. */
  type: 'producto' | 'categoria';
  /** Texto visible para el usuario. */
  label: string;
  /** ID del documento asociado (opcional). */
  id?: string;
  /** Slug de ruta hacia el producto o categoría (opcional). */
  slug?: string;
}

/**
 * Contrato desacoplado del motor de búsqueda.
 * Cualquier implementación (Fuse.js, MiniSearch, API externa) debe satisfacer esta interfaz.
 * @satisfies RNF-08
 */
export interface SearchEngine {
  /** Carga diferida del índice de búsqueda (p. ej. al enfocar el buscador). */
  load(): Promise<void>;
  /** Ejecuta búsqueda difusa ponderada por relevancia y retorna hasta `limit` resultados. */
  search(query: string, limit?: number): SearchResult[];
  /** Devuelve sugerencias de autocompletado (productos y categorías) para el prefijo dado. */
  suggest(prefix: string, limit?: number): Suggestion[];
}
