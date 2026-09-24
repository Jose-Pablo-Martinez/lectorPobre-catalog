# Observaciones al Plan de Implementación — §2.6 "Tests de Integración de Datos (Modelo en V)"

> **Versión:** 1.0
> **Documento revisado:** `implementationPlan.md`, Fase 2 — Modelo de Datos Sanity, sección 2.6
> **Documentos de referencia cruzada:** `Arquitectura_Tecnica_Detallada_LectorPobre.md` §2.1 (esquemas), Fase 1 §1.1 (árbol de carpetas), Fase 1 §1.4 (`ci.yml`), Fase 5 §5.7 (convención de separación IT/UT ya aplicada en el backend)
> **Estándares aplicables:** IEEE 829 (Especificación de entorno de prueba), ISO/IEC/IEEE 29119 (niveles de prueba: unitaria vs. integración)
> **Propósito:** Documentar de forma trazable los defectos encontrados en la especificación de pruebas de integración de datos de la Fase 2, para su corrección antes de que el equipo las implemente.

---

## 1. Resumen Ejecutivo

La sección 2.6 del plan de implementación aplica correctamente el principio metodológico del **Modelo en V** — definir y ejecutar las pruebas de integración de datos inmediatamente después de implementar los esquemas, antes de avanzar a la Fase 3 — y esto es consistente con el mismo patrón que el propio plan usa después en las Fases 3, 4 y 5.

Sin embargo, la especificación concreta de las tres pruebas (`IT-SANITY-01`, `IT-SANITY-02`, `IT-SANITY-03`) contiene **cuatro defectos** que, de implementarse tal como están redactados, producirían pruebas que fallan por razones ajenas a la corrección del sistema, o que ni siquiera pueden ejecutarse como se describe. Se detallan en la sección 3.

Ningún hallazgo cuestiona el enfoque metodológico (Modelo en V); todos son defectos de especificación/redacción dentro de esa sección.

---

## 2. Ubicación exacta del texto observado

Texto original de `implementationPlan.md`, Fase 2, sección 2.6:

> *"Crear los siguientes tests en `tests/unit/sanity-schemas.test.ts`:*
> *- Verificar que los tipos TypeScript generados en `types/sanity.ts` coincidan con los schemas de Sanity (IT-SANITY-01).*
> *- Verificar que las consultas GROQ básicas (`*[_type == "product"]`) retornan la estructura de campos esperada contra el dataset `staging` (IT-SANITY-02).*
> *- Verificar que un documento `globalConfig` con `activepalette` y `visualVariant` puede ser consultado correctamente (IT-SANITY-03)."*

```bash
npm run test -- tests/unit/sanity-schemas.test.ts
```

---

## 3. Hallazgos Detallados

### Hallazgo 1 — Discrepancia de nomenclatura entre las pruebas y los esquemas reales del proyecto

**Severidad:** Alta (bloqueante — la prueba, tal como está escrita, no puede pasar nunca)

**Descripción:** Los identificadores usados en `IT-SANITY-02` e `IT-SANITY-03` no existen en el modelo de datos definido por el propio plan en la Fase 2, sección 2.1:

| Usado en §2.6 | Nombre real del esquema (§2.1) |
|---|---|
| `_type == "product"` | `_type == "producto"` |
| `globalConfig` | `configuracionGlobal` |
| `activepalette` | `paletaActiva` |
| `visualVariant` | `varianteVisual` |

**Evidencia de la inconsistencia interna:** el propio documento ya usa los nombres correctos en otro lugar — la consulta GROQ de `composables/useCatalog.ts` (Fase 3, §3.3) consulta `_type == "producto"`, no `"product"`. Esto confirma que §2.6 no fue actualizada cuando el resto del modelo de datos se tradujo a español, probablemente quedando como remanente de una plantilla en inglés.

**Impacto:** Una prueba que consulta un `_type` inexistente en el dataset no falla por un defecto real del sistema — falla siempre, incondicionalmente, independientemente de si el esquema está bien implementado. Esto contradice el propósito declarado de la sección ("garantizar que el contrato de datos... sea correcto desde el inicio"): en lugar de detectar defectos reales, generaría una alarma falsa permanente que el equipo terminaría ignorando o comentando — el riesgo clásico de una prueba mal especificada, que erosiona la confianza en toda la suite.

**Corrección sugerida:** Reemplazar los cuatro identificadores por los nombres reales del esquema (`producto`, `configuracionGlobal`, `paletaActiva`, `varianteVisual`) antes de que cualquier agente o desarrollador implemente el archivo `sanity-schemas.test.ts`.

---

### Hallazgo 2 — Ausencia de separación entre pruebas unitarias y de integración

**Severidad:** Media-Alta

**Descripción:** `IT-SANITY-02` e `IT-SANITY-03` requieren, por definición, una conexión real al dataset `staging` de Sanity.io ("...retornan la estructura de campos esperada **contra el dataset `staging`**"; "...puede ser **consultado correctamente**"). Esto las clasifica como pruebas de **integración** según el prefijo `IT-` que el propio plan usa consistentemente en el resto del documento. Sin embargo, se ubican en `tests/unit/sanity-schemas.test.ts` y se ejecutan con el mismo comando que cualquier prueba unitaria pura (`npm run test -- ...`), sin ningún mecanismo de exclusión del resto de la suite.

**Evidencia de que el propio plan ya resuelve este problema en otra capa:** en el backend Go, la Fase 5 (§5.7) sí aplica la separación correctamente:

> *"5.5 `sanity/client.go` | IT-01 a IT-07 (escritura en Sanity staging) | `cd api && go test -tags=integration ./sanity/...`"*

Es decir, el propio documento ya reconoce — para Go — que las pruebas de integración deben aislarse con un build tag específico (`-tags=integration`) para que no corran junto con `go test ./...` por defecto. Esa misma disciplina no se aplicó al lado del frontend en la Fase 2.

**Impacto:** Sin esta separación, `npm run test` (usado, por ejemplo, en el paso "Run Vitest unit tests with coverage" del `ci.yml` de la Fase 1, §1.4) intentaría ejecutar pruebas que dependen de una red y un dataset externos junto con las pruebas unitarias puras. Esto viola el principio de que las pruebas unitarias deben ser rápidas, deterministas y sin dependencias externas — si el dataset de staging no está disponible momentáneamente (mantenimiento, límite de tasa, etc.), fallarían pruebas unitarias que no deberían depender de eso en absoluto.

**Corrección sugerida:** Elegir una de estas dos opciones (consistente con el patrón que ya existe para Go en §5.7):
1. Mover estos tres casos a una carpeta nueva `tests/integration/` (agregarla al árbol de carpetas de la Fase 1, §1.1, que hoy solo contempla `tests/unit/`, `tests/e2e/` y `tests/fixtures/`), con su propio script `npm run test:integration`.
2. Usar un patrón de nombre de archivo reconocible (p. ej. `sanity-schemas.integration.test.ts`) y configurar `vitest.config.ts` para excluirlo del comando `npm run test` por defecto.

---

### Hallazgo 3 — El pipeline de CI no está configurado para que estas pruebas puedan ejecutarse correctamente

**Severidad:** Media

**Descripción:** Aun si se resolviera el Hallazgo 2, el `ci.yml` definido en la Fase 1 (§1.4) solo inyecta las variables de entorno del proyecto/dataset de Sanity (`NUXT_PUBLIC_SANITY_PROJECT_ID`, `NUXT_PUBLIC_SANITY_DATASET`) en el paso **"Build Nuxt (SSG)"**, no en el paso previo **"Run Vitest unit tests with coverage"**:

```yaml
- name: Run Vitest unit tests with coverage
  run: npm run test -- --coverage --run
- name: Build Nuxt (SSG)
  run: npm run generate
  env:
    NUXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID_STAGING }}
    NUXT_PUBLIC_SANITY_DATASET: staging
```

**Impacto:** Si `IT-SANITY-02`/`IT-SANITY-03` se ejecutan dentro del paso de Vitest tal como está configurado, fallarían por falta de configuración del entorno (sin `projectId`/`dataset`), no por un defecto real del esquema — el mismo tipo de falso negativo descrito en el Hallazgo 1, pero originado en el pipeline en vez de en el código de la prueba. Desde la perspectiva de IEEE 829, esto corresponde a una omisión en la **especificación del entorno de prueba** (Test Environment): el documento define el caso de prueba pero no garantiza que el entorno de ejecución (CI) provea las precondiciones que ese caso necesita.

**Corrección sugerida:** Agregar el bloque `env` con `NUXT_PUBLIC_SANITY_PROJECT_ID`/`NUXT_PUBLIC_SANITY_DATASET` (dataset `staging`) al paso de CI donde efectivamente corran las pruebas de integración de datos — ya sea el mismo paso de Vitest (si no se separa por comando) o un paso/job dedicado posterior, una vez resuelto el Hallazgo 2.

---

### Hallazgo 4 — `IT-SANITY-01` no es verificable en tiempo de ejecución tal como está planteada

**Severidad:** Media

**Descripción:** El caso pide *"verificar que los tipos TypeScript generados en `types/sanity.ts` coincidan con los schemas de Sanity"*. Las anotaciones de tipo de TypeScript se eliminan por completo durante la compilación (*type erasure*) — no existen como valores en tiempo de ejecución. Un framework de pruebas como Vitest ejecuta JavaScript ya compilado y no tiene forma de "leer" una `interface` en ejecución para compararla estructuralmente contra un schema externo.

**Evidencia de que el propio plan ya apunta a la solución correcta, sin conectarla con este caso de prueba:** la sección 2.3 del mismo documento (Fase 2) ya recomienda:

> *"Para producción, usar `npx sanity@latest typegen generate`."*

Es decir, el plan ya identifica la herramienta que genera `types/sanity.ts` automáticamente **a partir** del schema. Si se adopta esa herramienta, una prueba que compare "el tipo" contra "el schema" pierde sentido, porque uno se deriva mecánicamente del otro — siempre van a coincidir por construcción, y la prueba nunca podría detectar una divergencia real.

**Impacto:** Tal como está redactado, `IT-SANITY-01` no es un caso de prueba implementable como prueba automatizada de Vitest; es, en el mejor de los casos, un recordatorio de proceso mal clasificado como caso de prueba con ID de integración.

**Corrección sugerida:** Reemplazar `IT-SANITY-01` por un paso de verificación de CI (no una prueba de Vitest) que ejecute `sanity typegen generate` y compare el resultado contra `types/sanity.ts` ya comiteado, fallando el build si hay diferencia (`git diff --exit-code` sobre el archivo generado). Esto sí detecta divergencias reales entre el schema y el tipo usado por el frontend.

---

## 4. Matriz de Trazabilidad de Hallazgos

| # | Hallazgo | Severidad | Sección afectada | Principio/estándar relacionado |
|---|---|---|---|---|
| 1 | Nomenclatura inconsistente (`product`/`globalConfig`/etc.) | Alta | §2.6, casos IT-SANITY-02, IT-SANITY-03 | Corrección/trazabilidad del caso de prueba respecto al objeto bajo prueba |
| 2 | Sin separación unitaria/integración | Media-Alta | §2.6 vs. §5.7 (patrón ya existente en Go) | ISO/IEC/IEEE 29119 — niveles de prueba; independencia de pruebas unitarias |
| 3 | CI sin variables de entorno para el dataset de staging | Media | §2.6 vs. §1.4 (`ci.yml`) | IEEE 829 — Especificación de entorno de prueba |
| 4 | IT-SANITY-01 no verificable en runtime | Media | §2.6 vs. §2.3 (`sanity typegen generate`) | Verificabilidad del caso de prueba |

---

## 5. Acciones Correctivas Priorizadas

1. **(Alta)** Corregir los cuatro identificadores de `IT-SANITY-02`/`IT-SANITY-03` para que coincidan con el esquema real (`producto`, `configuracionGlobal`, `paletaActiva`, `varianteVisual`).
2. **(Media-Alta)** Definir la ubicación/convención de aislamiento de estas pruebas de integración (carpeta `tests/integration/` o patrón `*.integration.test.ts` + exclusión en `vitest.config.ts`), replicando el patrón ya usado para Go en §5.7.
3. **(Media)** Actualizar `ci.yml` (Fase 1, §1.4) para inyectar `NUXT_PUBLIC_SANITY_PROJECT_ID`/`NUXT_PUBLIC_SANITY_DATASET` en el paso donde corran estas pruebas.
4. **(Media)** Reemplazar `IT-SANITY-01` por una verificación de CI basada en `sanity typegen generate` + diff, en lugar de una prueba de Vitest.

---

## 6. Conclusión

El enfoque metodológico de la sección 2.6 (pruebas de integración de datos inmediatamente después de los esquemas, siguiendo el Modelo en V) es correcto y coherente con el resto del plan. Los cuatro hallazgos documentados son defectos de especificación — nombres de esquema desactualizados, falta de aislamiento unitario/integración, configuración de entorno de CI incompleta, y un caso de prueba no verificable como está planteado — que deben corregirse antes de que el equipo implemente `tests/unit/sanity-schemas.test.ts`, para evitar que la suite produzca fallos que no reflejan defectos reales del sistema.

---

*Documento generado como observación complementaria al plan de implementación de LectorPobre, en el marco de la revisión de V&V del proyecto.*
