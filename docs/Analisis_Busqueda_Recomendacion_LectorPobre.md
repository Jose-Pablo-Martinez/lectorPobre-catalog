# Análisis de Factibilidad y Decisión de Diseño — Búsqueda Avanzada y Recomendaciones

## Proyecto: Plataforma Web "LectorPobre"

**Tipo de documento:** Registro de decisión de arquitectura (ADR) + análisis de factibilidad
**Fecha:** 2026-10-21
**Estado:** Aprobado por la parte interesada
**Documentos afectados:** [ERS_LectorPobre.md](ERS_LectorPobre.md) (v1.1), [Arquitectura_Tecnica_Detallada_LectorPobre.md](Arquitectura_Tecnica_Detallada_LectorPobre.md) (v2.1), [Stack_Tecnologico_LectorPobre.md](Stack_Tecnologico_LectorPobre.md), [implementationPlan.md](implementationPlan.md), [VyV_LectorPobre.md](VyV_LectorPobre.md), [contextoIADisenio.md](contextoIADisenio.md)

---

## 1. Contexto

La funcionalidad de búsqueda avanzada y recomendaciones **no estaba prevista en el ERS original**. Se evaluó como valor añadido bajo estas restricciones:

| Restricción | Implicación |
|---|---|
| Sin servidor permanente (las funciones solo se activan por petición) | No hay índices en memoria ni modelos persistentes |
| Sin base de datos tradicional (Sanity como CMS de documentos) | Sin búsqueda semántica ni vectorial integrada |
| Presupuesto bajo del cliente | Sin servicios de pago (Algolia, bases vectoriales, APIs de embeddings) |
| Sitio SSG en CDN con rebuild por webhook | Los cálculos pesados pertenecen al build; los resultados se sirven como estáticos |
| Sin cuentas ni historial de usuarios | No hay datos para filtrado colaborativo |

**Tamaño del catálogo (confirmado por el cliente):** 20–30 productos actuales, hasta ~100 el próximo año, tope esperado menor a 2000 y no en un lapso reducido.

---

## 2. Alternativas evaluadas

### 2.1 Búsqueda

| Opción | Dificultad | Tiempo | Costo | Resultado |
|---|---|---|---|---|
| **Fuse.js (fuzzy, cliente)** | Muy baja | 0.5–1 día | $0 | **Elegida** |
| **MiniSearch / FlexSearch** | Baja | 1–2 días | $0 | **Contingencia** (catálogo ~1000+) |
| Función Go `/api/buscar` | Media | 2–3 días | *Cold starts* | Descartada (sin necesidad) |
| Algolia / Meilisearch Cloud | Media | 2 días | Pago / servidor activo | Descartada (presupuesto) |
| Embeddings / búsqueda semántica | Alta | 1–2 semanas | APIs o modelo en cliente | Descartada (desproporcionada) |

### 2.2 Recomendación

| Enfoque | Tipo | Dificultad | Tiempo | Resultado |
|---|---|---|---|---|
| Reglas simples (categoría/precio/calificación) | Tradicional | Muy baja | 0.5 día | **Respaldo** |
| **Basado en contenido: TF-IDF + similitud coseno** | Tradicional | Baja–media | 2–3 días | **Elegido** |
| Vistos recientemente (localStorage) | Tradicional | Muy baja | 0.5 día | **Elegido (complemento)** |
| Clustering (K-Means / jerárquico) | Cluster | Media | 3–5 días | **Pospuesto; puerta abierta** |
| Filtrado colaborativo / híbrido | Tradicional | Alta | 1–2 semanas | Descartado (sin datos de usuarios) |
| Embeddings + vectores | ML moderno | Alta | 1–2 semanas | Descartado |

### 2.3 ¿Por qué no clustering ahora?

- Con pocos productos produce grupos inestables y casi idénticos a las categorías de Sanity.
- Exige elegir y validar K con criterio humano en cada cambio de catálogo; la dueña del negocio no puede interpretarlo ni corregirlo.
- La similitud por contenido entrega directamente "productos parecidos", de forma explicable y determinista.
- Su costo de añadirlo después es bajo (3–5 días) si la arquitectura se prepara ahora.

---

## 3. Decisión

1. **Búsqueda:** Fuse.js en cliente, con tolerancia a errores, normalización de acentos, pesos por campo, sinónimos y palabras clave administrables en Sanity, autocompletado, estado vacío con sugerencias e índice cargado de forma diferida.
2. **Recomendación:** algoritmo **basado en contenido** (no colaborativo, no híbrido, sin usuarios), calculado en **build time** y publicado como `recommendations.json`, con reglas de respaldo.
3. **Complementos:** "Vistos recientemente" en `localStorage`.
4. **Clustering:** no se implementa, **pero la arquitectura se construye para permitirlo** (ver §4).
5. **Arquitectura de servidor/BD:** **no se migra**. Se deja documentada la posibilidad de migrar a servidor y base de datos distintos **solo en caso de ser estrictamente necesario** (ver §5).

**Esfuerzo:** versión completa 5–7 días (MVP 2–3 días). **Costo operativo adicional:** $0.

---

## 4. Diseño para extensibilidad (requisito RNF-08)

Reglas obligatorias para la implementación actual, de modo que el clustering futuro sea añadir una pieza y no reescribir:

| Regla | Descripción |
|---|---|
| Interfaces desacopladas | `SearchEngine` y `RecommendationStrategy` con implementaciones intercambiables |
| Pipeline por etapas | Normalización → Vectorización TF-IDF → Similitud → (futuro) Agrupación |
| Artefacto de vectores | `product-vectors.json` se genera y persiste en build; es la entrada natural de K-Means |
| Contrato versionado | `recommendations.json` con `schemaVersion` y `clusterId` opcional (nulo hoy) |
| UI agnóstica | Los componentes solo consumen el contrato de datos, nunca el algoritmo |
| Normalización compartida | Mismo módulo para búsqueda y recomendaciones (consistencia y sinónimos únicos) |
| Pruebas de contrato | Suite común para cualquier `SearchEngine` y `RecommendationStrategy` |

**Cómo se añadiría clustering en el futuro (guía resumida):**

1. Crear `scripts/recommendations/clustering.ts` que lea `product-vectors.json` y aplique K-Means (p. ej. `ml-kmeans`) con K elegido por heurística (raíz de n/2) y validación por *silhouette*.
2. Registrar la etapa en el arreglo `stages` del orquestador `build.ts`.
3. Escribir `clusterId` en `recommendations.json` (sin cambiar `schemaVersion` si el campo ya existe).
4. Crear la estrategia `clusterAware` que combine similitud coseno con pertenencia al mismo *cluster*.
5. Opcional: generar secciones de "Colecciones sugeridas" en la UI.

---

## 5. Evolución condicional de la arquitectura

La migración a un servidor y/o base de datos distintos **no está planificada** y solo debe considerarse si es estrictamente necesario.

**Condiciones que la justificarían (validadas con mediciones):**

- Catálogo sostenido muy superior a ~2000 productos, con incumplimiento de RNF-07.
- Necesidad de personalización por usuario (filtrado colaborativo o híbrido).
- Necesidad de búsqueda semántica o recomendaciones por *embeddings* que no puedan ejecutarse en cliente ni en build.
- Ranking en tiempo real con grandes volúmenes de datos de interacción.

**Opciones posibles en ese caso:** Meilisearch/Typesense como servicio de búsqueda; base de datos con soporte de vectores; servidor persistente o contenedores para cómputo.

**A evaluar antes de decidir:** costos recurrentes, operación y monitoreo, privacidad y consentimiento de datos de usuarios, y revisión del ERS (RNF-01, §2.4, §7.1).

**Mitigación:** el desacoplamiento descrito en §4 permite sustituir motores por servicios externos sin tocar la interfaz.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Peso del índice afecta Lighthouse | Carga diferida al enfocar el buscador; medición en CI (NF-BUS-02, NF-BUS-04) |
| Recomendaciones pobres por textos pobres | Capacitar a la dueña para llenar descripciones, categorías y palabras clave; regla de respaldo |
| Datos obsoletos entre rebuilds | Aceptable: el webhook de Sanity ya dispara rebuild con cada cambio |
| Productos agotados recomendados | Cruce con stock en vivo (RF-03) para deprioritizar |
| Crecimiento de alcance | Registrar el cambio como ERS v1.1 (hecho); clustering y migración quedan fuera de alcance |
| Privacidad | Solo `localStorage` local; sin envío de datos a servidores |

---

## 7. Trazabilidad

| Requisito | Descripción |
|---|---|
| RF-18 (ampliado) | Búsqueda difusa, acentos, relevancia, autocompletado, estado vacío, carga diferida |
| RF-21 | Productos similares basados en contenido |
| RF-22 | Vistos recientemente |
| RF-23 | Palabras clave y sinónimos administrables |
| RNF-07 | Rendimiento y costo sin servidor permanente |
| RNF-08 | Extensibilidad (clustering futuro, cambio de motor) |

Implementación: [implementationPlan.md](implementationPlan.md) §3.12. Pruebas: [VyV_LectorPobre.md](VyV_LectorPobre.md) §3.7 y casos `IT-BUS`, `ST-BUS`, `UAT-BUS`, `NF-BUS`.
