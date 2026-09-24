# Base de Datos No Relacional en LectorPobre — Explicación y Verificación de Esquemas

> **Versión:** 1.0
> **Documentos base:** `Arquitectura_Tecnica_Detallada_LectorPobre.md` · `ERS_LectorPobre.md` · `implementationPlan.md` (§2.1)
> **Propósito:** Explicar, sin dar por hecho experiencia previa con bases de datos NoSQL, cómo funciona el modelo de datos de Sanity.io y verificar que los esquemas definidos en la Fase 2 del plan de implementación son correctos respecto a la arquitectura y al ERS.

---

## Resumen Ejecutivo

Los esquemas definidos en `implementationPlan.md` §2.1 (`producto`, `categoria`, `comentario`, `calificacion`, `configuracionGlobal`) **son correctos y consistentes** con:

- La Arquitectura Técnica (§4.3), que especifica Sanity.io como *"NoSQL orientado a documentos"*.
- El ERS, cuyos requisitos funcionales trazan directamente a los campos definidos en cada esquema.

Se identificó **una consideración técnica a resolver** (no es un error de diseño, pero faltaba definir el mecanismo): quién y cómo se actualiza el promedio de calificación de un producto. La decisión tomada — guardar dos **contadores atómicos** (`ratingSum`, `ratingCount`) en vez de un promedio directo, y calcular el promedio en tiempo de consulta — se documenta y justifica en la sección 6.

---

## 1. ¿Qué es una base de datos no relacional (NoSQL)?

### 1.1 El problema que resuelve

En una base de datos **relacional** (SQL — MySQL, PostgreSQL, etc.), los datos se organizan en **tablas** con filas y columnas, y una tabla se relaciona con otra mediante **claves foráneas** y consultas `JOIN`. El esquema (qué columnas existe, de qué tipo) es rígido y se define de antemano.

Una base de datos **no relacional (NoSQL)** organiza los datos de otra forma. Sanity.io usa el modelo más común de NoSQL: **orientado a documentos**. En este modelo:

| Concepto SQL (relacional) | Concepto equivalente en Sanity (documentos) |
|---|---|
| Base de datos | **Proyecto** (`lectorpobre`) |
| Tabla | **Tipo de documento** (`_type`), p. ej. `producto` |
| Fila | **Documento** individual, p. ej. un producto específico |
| Columna | **Campo** (`field`) dentro del documento |
| Clave primaria | `_id` (generado automáticamente por Sanity) |
| Clave foránea + `JOIN` | **Referencia** (`reference`) + operador de "dereference" `->` en la consulta |
| `SELECT ... WHERE ...` | Consulta **GROQ** |
| Esquema de tabla fijo | **Esquema flexible por tipo de documento** (definido en código, pero cada documento puede omitir campos opcionales sin romper nada) |

La diferencia clave: en SQL, para saber el nombre de la categoría de un producto necesitas hacer un `JOIN` entre la tabla `productos` y la tabla `categorias`. En un modelo de documentos, el documento `producto` simplemente **contiene una referencia** (un puntero) al documento `categoria`, y tú decides en la consulta si quieres "seguir" esa referencia o no.

### 1.2 Por qué Sanity es la elección correcta para este proyecto

La Arquitectura (§1, Resumen ejecutivo) prioriza **rendimiento, SEO y costo operativo mínimo** mediante Jamstack. Un CMS headless orientado a documentos encaja bien porque:

- El contenido (productos, categorías, configuración) se consulta una vez en *build time* para generar el sitio estático — no requiere un servidor de base de datos siempre encendido.
- El modelo de documentos es naturalmente flexible para contenido semi-estructurado (descripciones, imágenes, configuración visual) sin necesitar migraciones de esquema SQL cada vez que se agrega un campo.
- Sanity expone dos APIs separadas (lectura pública vía CDN / escritura privada con token), lo cual es exactamente el modelo de seguridad que exige RNF-04 (ver Arquitectura §8).

---

## 2. Cómo se organiza un "dataset" en Sanity

Un **dataset** es un espacio de documentos dentro del proyecto. LectorPobre usa dos, tal como define el plan (Fase 0, §0.3):

- `production` — datos reales del catálogo.
- `staging` — datos de prueba, usados en desarrollo y en los tests de integración.

Dentro de un dataset, **todos los documentos conviven juntos**, sin importar su tipo. Lo que distingue a un `producto` de una `categoria` es únicamente el campo interno `_type`. Cada documento tiene automáticamente estos campos de sistema (no hay que declararlos):

| Campo del sistema | Función |
|---|---|
| `_id` | Identificador único del documento (equivalente a clave primaria) |
| `_type` | El tipo de documento (`producto`, `categoria`, etc.) |
| `_createdAt` / `_updatedAt` | Fechas de creación/modificación, gestionadas automáticamente |
| `_rev` | Número de revisión, usado internamente para control de concurrencia |

---

## 3. Los 5 esquemas definidos para LectorPobre

Cada esquema (`sanity/schemas/*.ts`) define los campos que **puede** tener un tipo de documento. A continuación, cada uno con su trazabilidad al ERS.

### 3.1 `producto`

Satisface RF-01 (catálogo), RF-02 (detalle), RF-11 (edición), RF-12 (imagen), RF-13 (crear/eliminar), RF-14 (stock).

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | `string` | Requerido |
| `slug` | `slug` | URL amigable, generado desde `nombre` — usado en `pages/producto/[slug].vue` |
| `descripcion` | `text` | — |
| `imagenPrincipal` | `image` | Con `hotspot` (recorte inteligente) |
| `imagenes` | `array` de `image` | Galería |
| `categoria` | **`reference`** a `categoria` | Relación "muchos productos → una categoría" |
| `stock` | `number` | Requerido, entero ≥ 0 (RF-03, RF-14) |
| `precio` | `number` | Opcional — usado en el mensaje de WhatsApp |
| `activo` | `boolean` | Controla si aparece en el catálogo público |
| `ratingSum` | `number`, `readOnly`, inicial `0` | Contador atómico — suma de todos los valores de `calificacion` recibidos (ver §6) |
| `ratingCount` | `number`, `readOnly`, inicial `0` | Contador atómico — cantidad total de calificaciones recibidas (ver §6) |

> **Nota de nomenclatura:** `ratingSum` y `ratingCount` se nombran en inglés (a diferencia del resto de campos del esquema, en español) porque son campos nuevos, no provenientes del PDF original de requisitos, y por tanto siguen la convención de `DEVELOPMENT_GUIDELINES.md` §5.1/§4.1 para identificadores de nueva creación en el proyecto. El promedio visible al usuario (`calificacionPromedio`) **no se guarda como campo** — se deriva de estos dos contadores en tiempo de consulta (ver §6).

### 3.2 `categoria`

Satisface RF-04.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | `string` | Requerido |
| `slug` | `slug` | — |
| `descripcion` | `text` | — |
| `orden` | `number` | Controla el orden de despliegue en el filtro de categorías |

### 3.3 `comentario`

Satisface RF-07. Implementa la decisión de moderación tomada en el plan (tabla "Decisiones Tomadas") frente al Tema Abierto #1 del ERS §7.3.

| Campo | Tipo | Notas |
|---|---|---|
| `texto` | `text` | Requerido, máximo 1000 caracteres |
| `producto` | **`reference`** a `producto` | Relación "muchos comentarios → un producto" |
| `fechaCreacion` | `datetime` | — |
| `estado` | `string` (lista: `pendiente` / `aprobado` / `rechazado`) | Inicial: `pendiente` — solo se publica al aprobarse desde Studio |

### 3.4 `calificacion`

Satisface RF-06.

| Campo | Tipo | Notas |
|---|---|---|
| `valor` | `number` | Requerido, entero entre 1 y 5 |
| `producto` | **`reference`** a `producto` | Relación "muchas calificaciones → un producto" |
| `fechaCreacion` | `datetime` | — |

### 3.5 `configuracionGlobal`

Satisface RF-05, RF-15, RF-16, RF-17, y los umbrales de RF-03/RF-14 (Tema Abierto #3) y RF-19 (Tema Abierto #2).

| Campo | Tipo | Notas |
|---|---|---|
| `nombreSitio` | `string` | — |
| `numeroWhatsApp` / `mensajeWhatsApp` | `string` / `text` | RF-17 |
| `urlInstagram` / `urlFacebook` / `urlTikTok` | `url` | RF-05 |
| `paletaActiva` | `string` (lista de 5 opciones) | RF-15 |
| `varianteVisual` | `string` (lista de 3 opciones) | RF-16 |
| `umbralStockBajo` | `number`, inicial `5` | RF-03/RF-14 |
| `productosPorPagina` | `number`, inicial `24` | RF-19 |

Este documento está pensado como **singleton** (un único documento de configuración para todo el sitio). Eso se logra con `__experimental_actions: ['update', 'publish']` en el esquema, que impide crear varios documentos de este tipo o eliminarlo desde el Studio — un patrón habitual en Sanity para datos de configuración global que no tiene equivalente directo en SQL, donde normalmente sería una tabla con una sola fila.

---

## 4. Cómo se modelan las relaciones (sin JOINs)

### 4.1 El campo `reference`

Cuando un esquema declara:

```typescript
defineField({
    name: 'categoria',
    type: 'reference',
    to: [{ type: 'categoria' }],
})
```

Sanity no copia los datos de la categoría dentro del producto. Guarda únicamente un puntero:

```json
{
  "_type": "producto",
  "nombre": "Libro de ejemplo",
  "categoria": { "_type": "reference", "_ref": "id-del-documento-categoria" }
}
```

### 4.2 "Seguir" la referencia con el operador `->`

Para traer los datos reales de la categoría (el equivalente a un `JOIN`), la consulta GROQ usa el operador `->`. Esto ya está implementado correctamente en `composables/useCatalog.ts`:

```groq
*[_type == "producto" && activo == true]
| order(_createdAt desc)
{
  _id, nombre, slug, descripcion, imagenPrincipal, categoria->{nombre,slug}, stock,
  "calificacionPromedio": select(ratingCount > 0 => round(ratingSum / ratingCount, 1), null)
}
```

`categoria->{nombre,slug}` significa: *"sigue la referencia del campo `categoria` y trae solo los campos `nombre` y `slug` del documento al que apunta"*. Si se omitiera el `->`, solo se obtendría el `_ref` (el ID), sin datos legibles.

El campo `"calificacionPromedio": select(...)` no existe como tal en el documento — se construye en la propia consulta a partir de `ratingSum` y `ratingCount` (ver §6). `select()` evita dividir entre cero cuando un producto todavía no tiene calificaciones.

### 4.3 ¿Por qué `comentario` y `calificacion` referencian a `producto`, y no al revés?

Es una decisión de diseño correcta y deliberada. Existen dos formas de modelar "un producto tiene muchos comentarios":

1. **Referencia desde el lado "muchos"** (lo que hace el proyecto): cada `comentario` guarda una referencia a su `producto`.
2. **Array de referencias desde el lado "uno"**: el documento `producto` tendría un campo `array` con referencias a todos sus comentarios.

La opción 1 es la correcta aquí porque un producto puede acumular un número no acotado de comentarios y calificaciones a lo largo del tiempo. Si se usara la opción 2, cada nuevo comentario requeriría **modificar el documento del producto** para agregarlo al array, lo cual:

- Genera contención de escritura (dos usuarios comentando el mismo producto casi a la vez pueden pisarse la actualización).
- Hace crecer el documento del producto indefinidamente.

Este patrón — referenciar desde la entidad de alta cardinalidad hacia la de baja cardinalidad — es el equivalente NoSQL de tener la clave foránea en la tabla "hija" en un modelo relacional uno-a-muchos, así que la intuición que ya tienes de SQL aplica aquí también.

---

## 5. Las dos APIs y por qué importan para el esquema

La Arquitectura (§8) define dos niveles de acceso, y el diseño de los esquemas los respeta:

- **API de lectura pública (GROQ vía CDN):** sin token secreto, usada por el frontend para catálogo y stock (RNF-03). No debe exponer campos sensibles — por eso las consultas siempre proyectan campos específicos (`{ nombre, slug, ... }`) en vez de traer el documento completo (`*`), evitando el "over-fetching" descrito en Arquitectura §10.2.
- **API de escritura privada (token acotado):** usada únicamente por las funciones Go, y limitada — según Arquitectura §8 — a crear/actualizar documentos de tipo `comentario` y `calificacion`, nunca `producto` ni `configuracionGlobal`. Esto es coherente con que la edición de catálogo (RF-11 a RF-16) se delega a Sanity Studio (autenticado por el proveedor), no a las funciones Go públicas.

---

## 6. Decisión de diseño: contadores atómicos en lugar de un promedio recalculado

### 6.1 El problema original

`producto` necesita mostrar un promedio de calificación, pero ese valor depende de documentos `calificacion` que se crean después y de forma independiente. Ningún componente del plan original definía *quién* actualiza ese promedio. Se evaluaron tres opciones:

1. Calcular el promedio completo en cada consulta con `math::avg()` sobre todos los documentos `calificacion` del producto.
2. Que el handler Go, tras crear la `calificacion`, lea el promedio actual de `producto`, lo recalcule en memoria y lo vuelva a escribir.
3. Guardar dos **contadores atómicos** (`ratingSum`, `ratingCount`) que se incrementan directamente, y derivar el promedio de ellos en tiempo de consulta. *(Opción elegida — se explica abajo.)*

### 6.2 Por qué se descartó la opción 2 (leer → calcular → escribir en Go)

A primera vista parece la más eficiente — evita recorrer todas las calificaciones en cada lectura — pero tiene dos problemas que no dependen de permisos, sino de cómo funciona el modelo serverless:

**a) Condición de carrera (race condition).** El patrón "leer el valor actual → calcularlo en memoria → escribirlo de vuelta" es inseguro cuando puede haber dos escrituras concurrentes. Arquitectura §9.6 es explícita en que cada invocación de una función Go es un evento aislado, sin estado compartido entre invocaciones — es decir, dos calificaciones casi simultáneas del mismo producto corren en dos contenedores distintos, cada uno lee el mismo promedio "viejo", calcula su propio "nuevo" promedio por separado, y la escritura que llega en último lugar **sobrescribe silenciosamente** a la otra. Una de las dos calificaciones desaparece del cálculo, sin ningún error visible. Esto no es un caso extremo hipotético: es exactamente el tipo de bug de concurrencia que solo aparece bajo tráfico real y es difícil de reproducir en pruebas manuales.

**b) Radio de impacto de un fallo (principio de mínimo privilegio).** Para poder escribir el nuevo promedio, el token de las funciones Go necesitaría permiso de escritura sobre `producto` — no solo sobre `calificacion`. Arquitectura §8 y §9.3 limitan deliberadamente el token de escritura a los tipos `comentario`/`calificacion` para que, si alguna vez hay un fallo de validación en un handler (payload manipulado, bug, etc.), el daño quede contenido a esos dos tipos de documento y nunca pueda alterar precio, stock o descripción de un producto.

### 6.3 La solución elegida: `ratingSum` + `ratingCount`

En vez de guardar el promedio directamente, `producto` guarda dos **contadores enteros** que se actualizan mediante una operación de **incremento atómico** — una instrucción que el propio motor de Sanity resuelve de forma segura, sin que la función Go tenga que leer el valor anterior:

```go
// Tras escribir el documento "calificacion" en Sanity, el handler dispara
// un segundo patch — pero de tipo INCREMENTO, no de lectura-cálculo-escritura.
// Satisfies: RF-06 (Calificación por estrellas).
mutaciones := map[string]interface{}{
    "mutations": []map[string]interface{}{
        {"patch": map[string]interface{}{
            "id": productoID,
            "inc": map[string]interface{}{
                "ratingSum":   valorCalificacion, // p. ej. 4
                "ratingCount": 1,
            },
        }},
    },
}
```

Como `inc` es una operación atómica ejecutada por el servidor de Sanity, **no existe la ventana de tiempo** entre "leer" y "escribir" donde otra petición pueda intercalarse — dos incrementos concurrentes simplemente se suman correctamente, sin importar el orden en que lleguen. El promedio nunca se guarda; se deriva de `ratingSum / ratingCount` en el momento de la consulta (ver el ejemplo GROQ de la sección 4.2), lo cual es una división trivial, muy distinto en costo a recorrer todos los documentos `calificacion` con `math::avg()`.

### 6.4 Por qué esta opción es mejor que las otras dos

| Criterio | Opción 1 (`math::avg()` en cada consulta) | Opción 2 (Go recalcula y escribe) | **Opción 3 — elegida** (contadores atómicos) |
|---|:---:|:---:|:---:|
| Riesgo de condición de carrera | Ninguno (solo lectura) | **Sí** — ver §6.2a | Ninguno — el `inc` es atómico |
| Respeta el mínimo privilegio del token Go | Sí | **No** — necesita escribir `producto` | Sí — sigue escribiendo solo un `patch` acotado al mismo documento que ya referencia la calificación |
| Costo en tiempo de lectura | Recorre todas las calificaciones del producto en cada consulta | Ninguno (ya está calculado) | Ninguno — solo una división |
| Exactitud | Siempre exacta | Puede desincronizarse por la condición de carrera | Siempre exacta |

La opción 3 combina lo mejor de las otras dos: tiene el bajo costo de lectura que buscaba la opción 2, sin su problema de concurrencia ni su violación del principio de mínimo privilegio, y sin el costo de recorrido de la opción 1.

> Nota: como el sitio es SSG (Arquitectura §2), el promedio solo se evalúa una vez por *rebuild*, no una vez por visita de usuario — así que el ahorro de la opción 3 frente a la opción 1 es una mejora, aunque el costo de la opción 1 ya era, en la práctica, aceptable para este proyecto en concreto.

---

## 7. Conclusión

Los esquemas de la Fase 2 del `implementationPlan.md` están correctamente diseñados conforme al patrón de base de datos no relacional orientada a documentos que exige la Arquitectura Técnica, y cada campo traza de forma consistente a los requisitos funcionales del ERS. La precisión que faltaba —cómo se mantiene actualizado el promedio de calificación de un producto— se resuelve reemplazando el campo `calificacionPromedio` persistido por dos contadores atómicos, `ratingSum` y `ratingCount` (sección 6), que el handler Go actualiza mediante incrementos atómicos (`patch.inc`) en lugar de un ciclo de lectura-cálculo-escritura. Esta decisión evita una condición de carrera bajo tráfico concurrente y mantiene la escritura de las funciones Go acotada al mismo alcance mínimo ya definido en la Arquitectura (§8, §9.3), sin sacrificar el bajo costo de lectura.

---

*Documento generado como material de apoyo educativo y de verificación técnica para el proyecto LectorPobre.*
