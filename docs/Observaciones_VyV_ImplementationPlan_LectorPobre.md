# Observaciones de V&V sobre `implementationPlan.md` — LectorPobre

> **Documento evaluado:** [`implementationPlan.md`](file:///c:/Users/j_pab/Documents/dev/infoLectorPobre/implementationPlan.md)
> **Fuentes de contraste:** Semana 1 — Introducción a V&V, Calidad de Software e ISO/IEC 25010 · Semana 2 — Planificación de V&V y Modelo en V · Semana 3 — Pruebas Unitarias I: TDD y Frameworks · Semana 4 — Pruebas Unitarias II: Cobertura y Mocks
> **Objetivo:** Verificar que el plan de implementación siga las buenas prácticas de V&V enseñadas en las 4 semanas del curso, e identificar brechas accionables.
> **Fecha de revisión:** Septiembre 2026

---

## Resumen Ejecutivo

`implementationPlan.md` sigue el espíritu del curso de forma **notablemente consistente**: está construido explícitamente sobre el Modelo en V y repite en cada fase la idea de "las pruebas se crean junto con el código, no al final" — el principio de *shift-left* de la Semana 1 y el principio #2 del Modelo en V de la Semana 2.

Sin embargo, existen **7 brechas concretas y accionables** frente al material del curso, principalmente relacionadas con:
- Gates de cobertura no aplicados en CI (Semana 4)
- Ausencia de cobertura diferenciada por riesgo (Semana 4)
- Casos de valores límite (BVA) no explicitados en umbrales de negocio ya definidos (Semana 3)
- Arquitectura de los handlers Go que dificulta el mockeo real (Semana 4)
- Criterios de entrada/suspensión no formalizados (Semana 2)
- Matriz de riesgos no formalizada con probabilidad × impacto (Semana 2/4)
- El Plan de Pruebas formal (`VyV_LectorPobre.md`) no estaba disponible para verificación cruzada

---

## 1. Lo que sí está bien alineado

| Concepto del curso | Semana | Dónde aparece en el plan | Evaluación |
|---|---|---|---|
| Modelo en V | S1 (D.1), S2 (A) | Cada fase (2.6, 3.11, 4.4, 5.7, 6.6) tiene su bloque "Modelo en V" que ata pruebas a la fase de desarrollo correspondiente | ✅ Aplicación fiel y explícita |
| Trazabilidad bidireccional requisito↔prueba | S2 (A.2) | Tabla "Trazabilidad RF/RNF → Fase" al final del documento | ✅ Presente, aunque solo a nivel de fase, no de caso de prueba individual |
| Pirámide de pruebas 70/20/10 | S2 (D.2) | Proporción real observada: muchos `UT-GO-*` / `UT-VUE-*`, pocos `ST-*` (E2E) | ✅ La distribución respeta la pirámide; no incurre en el anti-patrón "cono de helado" |
| Criterios de salida medibles y objetivos | S2 (B.3) | Ej.: *"el rate limiting rechaza la petición 11 con HTTP 429"*, *"Lighthouse ≥ 90"* | ✅ Buenos ejemplos de criterios objetivos, tal como exige la Semana 2 |
| Aislamiento de dependencias externas en el write-path | S3/S4 | `IT-01 a IT-07` para `sanity/client.go` están correctamente clasificados como **integración** (no unitarios) porque tocan Sanity real | ✅ Clasificación correcta según el modelo FIRST (Fast / Isolated) |
| Seguridad como característica de calidad | S1 (C) | `SEC-01` a `SEC-11` en Fase 7, checklist de seguridad pre-producción | ✅ Cobertura razonable de la característica ISO 25010 "Seguridad" |

---

## 2. Brechas detectadas y recomendaciones

### 2.1 Sin gate de cobertura real en CI

**Semana de referencia:** 4, Bloque B (Coverage.py / JaCoCo)

El pipeline corre `go test ... -cover` y `npm run test -- --coverage`, pero **no fija un umbral que haga fallar el build**. La Semana 4 es explícita: para proyectos de este curso el estándar es `≥ 85%`, aplicado con `--cov-fail-under=85` (Coverage.py) o `<minimum>0.85</minimum>` (JaCoCo).

**Recomendación:** agregar un paso en `ci.yml` que aborte el build si la cobertura cae por debajo del umbral — en Go no existe un flag nativo equivalente a `--cov-fail-under`, así que se puede usar `go tool cover -func=coverage.out` combinado con un script que compare el `%` total contra el umbral; en el frontend, usar `coverage.thresholds` de Vitest.

### 2.2 Cobertura no diferenciada por riesgo

**Semana de referencia:** 4, Bloque D (D.1 — Cobertura por riesgo)

La tabla de la Semana 4 enseña que el umbral debe variar según la criticidad del módulo (crítico 90–95% con cobertura de ramas, medio 80%, bajo 70%). El plan trata la cobertura como un número único global.

**Recomendación:** diferenciar objetivos de cobertura, por ejemplo:

| Módulo | Riesgo | Cobertura objetivo | Tipo |
|---|---|---|---|
| `api/auth/login.go` (RF-08) | Crítico | 90–95% | Ramas |
| `api/sanity/client.go` (escritura) | Crítico | 90% | Ramas |
| `api/middleware/*` (CORS, rate limit, HMAC) | Crítico | 90% | Ramas |
| `composables/useStock.ts`, `useRating.ts` | Medio | 80% | Sentencias |
| `plugins/paleta.ts`, `plugins/variante.ts` | Bajo | 70% | Sentencias |

### 2.3 Casos de valores límite (BVA) no explicitados en umbrales ya definidos

**Semana de referencia:** 3, Bloque B (B.2 — Análisis de Valores Límite)

El plan define umbrales de negocio perfectos para aplicar BVA, pero las tablas de pruebas no los detallan a nivel de caso límite:

| Umbral definido en el plan | Requisito | Casos BVA recomendados (no explicitados hoy) |
|---|---|---|
| `umbralStockBajo = 5` | RF-03, RF-14 | 4, 5, 6 unidades |
| `productosPorPagina = 24` | RF-19 | 23, 24, 25 productos |
| Rango de calificación | RF-06 | 0, 1, 5, 6 (actualmente solo dice "rango 1-5") |

**Recomendación:** añadir explícitamente estos casos límite en las tablas de pruebas de las Fases 2, 3 y 5. Es una mejora barata y de alto valor: la Semana 3 identifica el error *off-by-one* como el más común en producción, y estos tres umbrales son exactamente el tipo de condición donde ocurre.

### 2.4 Mockeo no explicitado para los handlers Go

**Semana de referencia:** 4, Bloque C (C.6 — Buenas prácticas con mocks)

El código de ejemplo en la sección 5.5 llama a `sanity.CrearComentario` como función de paquete, no a través de una interfaz inyectada. Para que `UT-GO-09 a UT-GO-14` (pruebas del handler `/api/comentar`) sean realmente **unitarias** (Fast + Isolated según el modelo FIRST), necesitan aislar la llamada a Sanity — hoy la arquitectura no lo permite sin tocar red real o levantar un `httptest.Server`.

**Recomendación:** definir una interfaz `SanityWriter` en `api/sanity/`, e inyectarla en los handlers. Así, `IT-01 a IT-07` quedan como las únicas pruebas que tocan Sanity real, y los `UT-GO-*` pueden usar un mock/stub de la interfaz, tal como recomienda la Semana 4: *"prefiera inyección de dependencias... no mockee lo que no posee, cree un adaptador propio"*.

### 2.5 Criterios de entrada y suspensión no formalizados

**Semana de referencia:** 2, Bloque B (B.2 — sección 6 y 8 del plan IEEE 829 / ISO 29119)

El plan tiene checklists de "Verificación" al final de cada fase que funcionan como criterios de *salida* implícitos, pero no define:
- **Criterios de entrada:** ¿cuándo puedo empezar la Fase 5? (ej. "la Fase 4 debe estar desplegada y con webhook funcionando").
- **Criterios de suspensión:** ¿qué defecto detiene las pruebas (un "showstopper")? y ¿qué se requiere para reanudar?

**Recomendación:** agregar una subsección corta de "Criterios de entrada" y "Criterios de suspensión/reanudación" al inicio de cada fase, siguiendo la estructura de las secciones 6 y 8 del Plan de Pruebas IEEE 829/ISO 29119 vista en la Semana 2.

### 2.6 Matriz de riesgos no formalizada

**Semana de referencia:** 2, Bloque D (D.1 — Pruebas basadas en riesgo) y 4, Bloque D (D.1)

La sección "Correcciones y Precisiones a la Arquitectura" identifica riesgos de forma cualitativa (autenticación no definida, CORS, moderación de comentarios), pero no los prioriza con la fórmula `Probabilidad × Impacto` enseñada en la Semana 2, ni asigna como consecuencia una cobertura diferenciada (ver punto 2.2).

**Recomendación:** construir una matriz de riesgos explícita (probabilidad × impacto) para los puntos ya identificados en el plan, y usarla para justificar los umbrales de cobertura diferenciados.

### 2.7 `VyV_LectorPobre.md` no disponible para verificación cruzada

`implementationPlan.md` referencia ese documento como el Plan de Pruebas formal — el que debería contener las 14 secciones IEEE 829/ISO 29119 (identificador, alcance, estrategia, entrada/salida, RACI, calendario, etc., vistas en la Semana 2). Ese archivo no estaba disponible en la sesión de revisión, por lo que **no fue posible confirmar si estos huecos ya están cubiertos ahí**.

**Recomendación:** revisar `VyV_LectorPobre.md` contra la estructura de 14 secciones de la Semana 2, punto por punto, en una sesión posterior.

---

## 3. Recomendación priorizada

Si solo se van a ajustar tres cosas antes de continuar con la implementación:

1. **Agregar el gate de cobertura con umbral explícito** en `ci.yml` (Semana 4, Bloque B) — ver §2.1.
2. **Especificar los casos BVA** para `umbralStockBajo`, `productosPorPagina` y el rango de calificación en las tablas de pruebas de las Fases 2/3/5 (Semana 3, B.2) — ver §2.3.
3. **Refactorizar `sanity/client.go`** para exponer una interfaz inyectable, de modo que los `UT-GO-*` sean unitarios de verdad y no dependan de red (Semana 4, C.6) — ver §2.4.

---

## 4. Tabla de trazabilidad de observaciones

| # | Observación | Semana | Bloque | Severidad sugerida | Fase del plan afectada |
|---|---|---|---|---|---|
| 2.1 | Gate de cobertura no aplicado en CI | S4 | B | Media | 1, 5, 6 |
| 2.2 | Cobertura no diferenciada por riesgo | S4 | D | Media | 5, 6 |
| 2.3 | Casos BVA no explicitados en umbrales de negocio | S3 | B | Alta (bajo costo, alto valor) | 2, 3, 5 |
| 2.4 | Handlers Go difíciles de mockear (falta interfaz inyectable) | S4 | C | Alta | 5 |
| 2.5 | Criterios de entrada/suspensión no formalizados | S2 | B | Baja | Todas |
| 2.6 | Matriz de riesgos no formalizada (probabilidad × impacto) | S2, S4 | D | Media | Todas |
| 2.7 | Plan de Pruebas formal (`VyV_LectorPobre.md`) no verificado | S2 | B | Pendiente de validar | — |

---

*Documento generado a partir de la revisión de `implementationPlan.md` contra las Semanas 1–4 del curso de Verificación y Validación de Software (LIS, 7.º semestre).*
*Este documento debe revisarse si `implementationPlan.md` o `VyV_LectorPobre.md` cambian de versión.*
