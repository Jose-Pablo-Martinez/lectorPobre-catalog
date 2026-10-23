# Guía Técnica: Cómo Añadir Clustering al Pipeline de Recomendaciones

**Proyecto:** LectorPobre  
**Satisface:** RNF-08 (Extensibilidad de motores de búsqueda y recomendación), ERS §7.5.1, `implementationPlan.md` §3.12.6

---

## 1. Contexto

El sistema de recomendaciones de **LectorPobre** se ejecuta en **build time** (`scripts/recommendations/build.ts`) mediante etapas desacopladas (`PipelineStage[]`):

1. **Normalización (`normalize.ts`)**: Tokenización, eliminación de *stopwords* y expansión de sinónimos.
2. **Vectorización (`vectorize.ts`)**: Cálculo de vectores TF-IDF normalizados L2, *one-hot* de categoría y precio normalizado min-max. Persiste el artefacto intermedio `scripts/recommendations/.cache/product-vectors.json` (`VectorArtifact`).
3. **Similitud (`similarity.ts`)**: Similitud coseno ponderada (60% texto, 25% categoría, 15% precio) para obtener los *top-N* vecinos.

El contrato público `/data/recommendations.json` (`RecommendationOutput`, `schemaVersion: 1`) ya incluye el campo `clusterId: string | null` en cada elemento (`null` en la versión actual).

---

## 2. Pasos para Incorporar Clustering (K-Means)

Cuando el catálogo supere ~150–200 productos activos con descripciones ricas y se desee agrupar piezas en colecciones temáticas automáticas:

### Paso 1: Instalar dependencia de clustering en desarrollo
```bash
pnpm add -D -w ml-kmeans
```

### Paso 2: Crear `scripts/recommendations/clustering.ts`
Implementar una nueva etapa que cumpla la interfaz `PipelineStage` y consuma `ctx.vectorArtifact` (o lea `product-vectors.json`):
- Extraer la matriz de vectores concatenados `combinedVector` de cada `ProductVector`.
- Seleccionar $K$ mediante la heurística $K = \max(2, \lfloor\sqrt{n / 2}\rfloor)$ y validar cohesión con puntaje *silhouette*.
- Poblar `ctx.clusters[productId] = "cluster-" + clusterIndex`.

### Paso 3: Registrar la etapa en `scripts/recommendations/build.ts`
En `runRecommendationPipeline`, agregar `new ClusteringStage()` al arreglo `stages: PipelineStage[]`:
```typescript
const stages: PipelineStage[] = [
    new NormalizeStage(),
    new VectorizeStage(options.vectorsOutputPath),
    new SimilarityStage(),
    new ClusteringStage(), // <-- Nueva etapa sin modificar las anteriores
];
```

### Paso 4: Estrategia `ClusterAwareStrategy` (opcional)
Crear `scripts/recommendations/strategies/clusterAware.ts` implementando `RecommendationStrategy` para bonificar vecinos que pertenezcan al mismo `clusterId` sin cambiar `schemaVersion: 1` ni modificar el componente `SimilarProducts.vue`.
