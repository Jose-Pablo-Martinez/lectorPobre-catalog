# Fase 2 — Modelo de Datos Sanity: Plan de Implementación Detallado

> **Versión:** 1.0  
> **Documentos base:** `implementationPlan.md` (§2) · `Explicacion_BaseDatos_NoSQL_Esquemas_LectorPobre.md` · `Arquitectura_Tecnica_Detallada_LectorPobre.md` · `ERS_LectorPobre.md`  
> **Propósito:** Guiar la implementación completa y correcta de los esquemas de Sanity.io, la configuración del Studio y la carga de datos de prueba, con el nivel de detalle necesario para no requerir consultas adicionales durante la ejecución.

---

## Objetivo de la Fase

Definir los esquemas de datos en Sanity.io, configurar Sanity Studio y cargar datos de prueba en el dataset `staging` para que la Fase 3 (Frontend) tenga datos reales con qué trabajar desde el primer día.

**Duración estimada:** 1–2 sesiones de trabajo  
**Satisface:** Fundamentos para RF-01 a RF-07, RF-11 a RF-16, RF-17, RF-19 · Estructura base para todos los flujos de datos

---

## Contexto Técnico Previo a la Implementación

Antes de escribir cualquier línea de código, hay tres conceptos del modelo de datos que deben estar claros, ya que impactan directamente en cómo están escritos los esquemas.

### A. Por qué no existe un campo `calificacionPromedio` persistido

En el esquema de `producto` **no existe** el campo `calificacionPromedio` (tal como fue concebido inicialmente). En su lugar existen dos contadores atómicos: `ratingSum` y `ratingCount`.

**¿Por qué?** Calcular el promedio mediante el ciclo "leer → calcular → escribir" en el handler Go provocaría una **condición de carrera**: dos usuarios calificando el mismo producto casi a la vez producirían dos lecturas del mismo promedio "viejo", dos cálculos distintos en paralelo, y la segunda escritura borraría silenciosamente la primera calificación del cálculo. Esto no es detectable con pruebas manuales y solo aparece bajo tráfico concurrente real.

La solución elegida usa la operación `inc` (incremento atómico) de la API de Mutations de Sanity, que resuelve este problema a nivel del servidor de base de datos: no hay ventana de tiempo entre leer y escribir. El promedio **no se guarda**; se deriva de `ratingSum / ratingCount` en cada consulta GROQ.

### B. Por qué `comentario` y `calificacion` referencian a `producto`, y no al revés

Si `producto` tuviera un array de referencias a todos sus comentarios, cada nuevo comentario requeriría **modificar el documento del producto**, generando contención de escritura y haciendo crecer el documento indefinidamente. La referencia desde la entidad de alta cardinalidad (`comentario`) hacia la de baja cardinalidad (`producto`) es el equivalente NoSQL de la clave foránea en una tabla hija SQL.

### C. El token de escritura de Go tiene alcance mínimo deliberado

Según la Arquitectura §8 y §9.3, el token de escritura privado de las funciones Go **solo puede crear** documentos de tipo `comentario` y `calificacion`. Esto es suficiente porque los contadores atómicos (`ratingSum`, `ratingCount`) se incrementan mediante un `patch.inc` sobre el documento `producto` referenciado por la calificación — sin necesitar permiso de escritura general sobre `producto`.

---

## 2.1 Estructura de Archivos a Crear

```
sanity/
├── schemas/
│   ├── index.ts                  ← Exporta todos los schemas
│   ├── producto.ts               ← RF-01, RF-02, RF-11–RF-14
│   ├── categoria.ts              ← RF-04
│   ├── comentario.ts             ← RF-07
│   ├── calificacion.ts           ← RF-06
│   └── configuracionGlobal.ts   ← RF-05, RF-15, RF-16, RF-17, RF-19
├── sanity.config.ts
└── sanity.cli.ts
```

---

## 2.2 Esquemas de Sanity

### Prerrequisito: instalar dependencias de Sanity en el workspace

```bash
# Desde la raíz del proyecto
pnpm add sanity @sanity/vision
```

---

### `sanity/schemas/producto.ts`

**Satisface:** RF-01 (Catálogo), RF-02 (Detalle de producto), RF-11 (Edición desde Studio), RF-12 (Gestión de imágenes), RF-13 (Crear/eliminar productos), RF-14 (Gestión de stock).

```typescript
import { defineType, defineField } from 'sanity';

// Satisfies: RF-01 (Catalog), RF-02 (Product detail), RF-11 (Studio editing),
//            RF-12 (Image management), RF-13 (Create/delete), RF-14 (Stock management).
export const producto = defineType({
    name: 'producto',
    title: 'Producto',
    type: 'document',
    fields: [
        defineField({
            name: 'nombre',
            title: 'Nombre',
            type: 'string',
            validation: Rule => Rule.required().min(2).max(120)
        }),
        defineField({
            name: 'slug',
            title: 'Slug (URL)',
            type: 'slug',
            // El slug es la base de la ruta pages/producto/[slug].vue
            options: { source: 'nombre', maxLength: 96 },
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'descripcion',
            title: 'Descripción',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'imagenPrincipal',
            title: 'Imagen principal',
            type: 'image',
            // hotspot: permite recorte inteligente para que el sujeto principal
            // siempre quede centrado independientemente del formato de pantalla.
            options: { hotspot: true },
        }),
        defineField({
            name: 'imagenes',
            title: 'Galería de imágenes',
            type: 'array',
            of: [{ type: 'image', options: { hotspot: true } }],
        }),
        defineField({
            name: 'categoria',
            title: 'Categoría',
            type: 'reference',
            to: [{ type: 'categoria' }],
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'stock',
            title: 'Stock disponible',
            type: 'number',
            // RF-14: el campo umbralStockBajo en configuracionGlobal determina cuándo
            // se muestra la alerta "pocas unidades". Stock = 0 oculta el botón de contacto.
            validation: Rule => Rule.required().min(0).integer()
        }),
        defineField({
            name: 'precio',
            title: 'Precio (opcional)',
            type: 'number',
            // Opcional — usado solo en el template del mensaje de WhatsApp (RF-17).
            // No es un campo de e-commerce; la venta se completa fuera de la plataforma.
        }),
        defineField({
            name: 'activo',
            title: 'Visible en catálogo',
            type: 'boolean',
            // Permite ocultar productos sin eliminarlos (RF-13).
            // Un producto inactivo no aparece en las consultas GROQ del frontend.
            initialValue: true,
        }),

        // ── Contadores atómicos para calificación (RF-06) ──────────────────────────
        // NO existe un campo "calificacionPromedio" persistido.
        // El promedio se calcula en GROQ como: round(ratingSum / ratingCount, 1).
        // Todos los contadores se actualizan mediante patch.inc (operación atómica) desde
        // el handler Go. Los contadores por estrella alimentan el panel de desglose
        // "X votos de 5★, Y votos de 4★..." en la vista de detalle. Satisfies: RF-06.
        defineField({
            name: 'ratingSum',
            title: 'Suma de calificaciones (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0,
        }),
        defineField({
            name: 'ratingCount',
            title: 'Total de calificaciones (interno)',
            type: 'number',
            readOnly: true,
            initialValue: 0,
        }),
        // Contadores por valor de estrella — actualizados con patch.inc desde Go
        defineField({ name: 'rating1Count', title: 'Calificaciones de 1★ (interno)', type: 'number', readOnly: true, initialValue: 0 }),
        defineField({ name: 'rating2Count', title: 'Calificaciones de 2★ (interno)', type: 'number', readOnly: true, initialValue: 0 }),
        defineField({ name: 'rating3Count', title: 'Calificaciones de 3★ (interno)', type: 'number', readOnly: true, initialValue: 0 }),
        defineField({ name: 'rating4Count', title: 'Calificaciones de 4★ (interno)', type: 'number', readOnly: true, initialValue: 0 }),
        defineField({ name: 'rating5Count', title: 'Calificaciones de 5★ (interno)', type: 'number', readOnly: true, initialValue: 0 }),
    ],
    preview: {
        select: {
            title: 'nombre',
            subtitle: 'categoria.nombre',
            media: 'imagenPrincipal'
        }
    }
});
```

---

### `sanity/schemas/categoria.ts`

**Satisface:** RF-04 (Filtrado y navegación por categorías).

```typescript
import { defineType, defineField } from 'sanity';

// Satisfies: RF-04 (Category filtering and navigation).
export const categoria = defineType({
    name: 'categoria',
    title: 'Categoría',
    type: 'document',
    fields: [
        defineField({
            name: 'nombre',
            title: 'Nombre',
            type: 'string',
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'slug',
            title: 'Slug (URL)',
            type: 'slug',
            options: { source: 'nombre' },
        }),
        defineField({
            name: 'descripcion',
            title: 'Descripción',
            type: 'text',
        }),
        defineField({
            name: 'orden',
            title: 'Orden en el menú',
            type: 'number',
            // Permite controlar el orden en que aparecen las categorías en el filtro
            // sin depender del orden de creación en el Studio.
        }),
    ]
});
```

**Datos de prueba para staging:**

| nombre | slug | orden |
|---|---|---|
| Llaveros | llaveros | 1 |
| Pines | pines | 2 |
| Stickers | stickers | 3 |
| Libros | libros | 4 |

---

### `sanity/schemas/comentario.ts`

**Satisface:** RF-07 (Comentarios con moderación).  
**Decisión de arquitectura:** El campo `estado` implementa la moderación por borrador del Tema Abierto #1 del ERS. Solo los comentarios con `estado == 'aprobado'` se muestran en el catálogo público. El administrador aprueba/rechaza desde Sanity Studio.

```typescript
import { defineType, defineField } from 'sanity';

// Satisfies: RF-07 (Comments with moderation).
// Only documents with estado == 'aprobado' are shown in the public catalog.
// The admin approves/rejects from Sanity Studio.
export const comentario = defineType({
    name: 'comentario',
    title: 'Comentario',
    type: 'document',
    fields: [
        defineField({
            name: 'texto',
            title: 'Texto del comentario',
            type: 'text',
            validation: Rule => Rule.required().max(1000)
        }),
        defineField({
            name: 'producto',
            title: 'Producto comentado',
            type: 'reference',
            to: [{ type: 'producto' }],
            // La referencia está en el comentario (entidad "muchos"), no en el producto
            // (entidad "uno") para evitar contención de escritura y crecimiento indefinido
            // del documento producto.
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'fechaCreacion',
            title: 'Fecha de creación',
            type: 'datetime',
        }),
        defineField({
            name: 'estado',
            title: 'Estado de moderación',
            type: 'string',
            options: {
                list: [
                    { title: 'Pendiente de revisión', value: 'pendiente' },
                    { title: 'Aprobado',               value: 'aprobado' },
                    { title: 'Rechazado',              value: 'rechazado' },
                ],
                layout: 'radio',
            },
            initialValue: 'pendiente',
            validation: Rule => Rule.required()
        }),
    ],
    preview: {
        select: { title: 'texto', subtitle: 'estado' },
        prepare({ title, subtitle }) {
            const icon = subtitle === 'aprobado' ? '✅' : subtitle === 'rechazado' ? '❌' : '⏳';
            return { title, subtitle: `${icon} ${subtitle}` };
        }
    }
});
```

---

### `sanity/schemas/calificacion.ts`

**Satisface:** RF-06 (Calificación por estrellas, rango 1–5).

```typescript
import { defineType, defineField } from 'sanity';

// Satisfies: RF-06 (Star rating, range 1–5).
// When created by the Go handler, it also triggers a patch.inc on the parent
// product's ratingSum and ratingCount fields (atomic operation, no race condition).
export const calificacion = defineType({
    name: 'calificacion',
    title: 'Calificación',
    type: 'document',
    fields: [
        defineField({
            name: 'valor',
            title: 'Valor (1–5)',
            type: 'number',
            validation: Rule => Rule.required().min(1).max(5).integer()
        }),
        defineField({
            name: 'producto',
            title: 'Producto calificado',
            type: 'reference',
            to: [{ type: 'producto' }],
            validation: Rule => Rule.required()
        }),
        defineField({
            name: 'fechaCreacion',
            title: 'Fecha de creación',
            type: 'datetime',
        }),
    ],
    preview: {
        select: { title: 'producto.nombre', subtitle: 'valor' },
        prepare({ title, subtitle }) {
            const stars = '★'.repeat(subtitle) + '☆'.repeat(5 - subtitle);
            return { title, subtitle: stars };
        }
    }
});
```

---

### `sanity/schemas/configuracionGlobal.ts`

**Satisface:** RF-05 (Redes sociales), RF-15 (Paleta de colores — predefinidas + custom), RF-16 (Variantes visuales + patrones decorativos), RF-17 (WhatsApp), RF-19 (Paginación), RF-03/RF-14 (Umbral de stock bajo).

> [!IMPORTANT]
> Este documento es un **singleton**: solo puede existir un único documento de `configuracionGlobal` en todo el dataset. Esto se logra con `__experimental_actions: ['update', 'publish']`, que elimina la opción "Crear nuevo documento" en el Studio. En la Fase 3 verás cómo leer este documento desde Nuxt para aplicar la paleta de colores de RF-15.

```typescript
import { defineType, defineField } from 'sanity';

// Satisfies: RF-05 (Social media), RF-15 (Color palette), RF-16 (Visual variants),
//            RF-17 (WhatsApp contact), RF-19 (Pagination), RF-03/RF-14 (Low stock threshold).
// Singleton: only one document of this type can exist per dataset.
export const configuracionGlobal = defineType({
    name: 'configuracionGlobal',
    title: 'Configuración Global del Sitio',
    type: 'document',
    fields: [
        // ── Identidad ──────────────────────────────────────────────────────────────
        defineField({
            name: 'nombreSitio',
            title: 'Nombre del sitio',
            type: 'string',
        }),

        // ── WhatsApp (RF-17) ───────────────────────────────────────────────────────
        defineField({
            name: 'numeroWhatsApp',
            title: 'Número de WhatsApp',
            type: 'string',
            description: 'Formato internacional sin el "+". Ejemplo: 5219991234567',
        }),
        defineField({
            name: 'mensajeWhatsApp',
            title: 'Plantilla del mensaje de WhatsApp',
            type: 'text',
            description: 'Puedes usar {{nombre}} y {{precio}} como variables del producto.',
        }),

        // ── Redes sociales (RF-05) ─────────────────────────────────────────────────
        defineField({ name: 'urlInstagram', title: 'URL de Instagram', type: 'url' }),
        defineField({ name: 'urlFacebook',  title: 'URL de Facebook',  type: 'url' }),
        defineField({ name: 'urlTikTok',    title: 'URL de TikTok',    type: 'url' }),

        // ── Personalización visual (RF-15, RF-16) ──────────────────────────────────
        defineField({
            name: 'paletaActiva',
            title: 'Paleta de colores activa',
            type: 'string',
            // RF-15: el valor seleccionado aquí inyecta CSS custom properties distintos
            // en nuxt.config.ts mediante app.head.style. Ver implementación Fase 3 §3.9.
            // 'custom' activa los campos paletaCustom* de abajo.
            options: {
                list: [
                    { title: 'Claro',     value: 'claro' },
                    { title: 'Oscuro',    value: 'oscuro' },
                    { title: 'Océano',    value: 'oceano' },
                    { title: 'Atardecer', value: 'atardecer' },
                    { title: 'Personalizada', value: 'custom' },
                ],
                layout: 'radio',
            },
            initialValue: 'claro',
        }),

        // RF-15: campos para paleta personalizada (solo se usan cuando paletaActiva === 'custom')
        defineField({
            name: 'paletaCustomPrimario',
            title: 'Color primario (hex)',
            type: 'string',
            description: 'Ej: #3b82f6. Solo se usa cuando la paleta activa es "Personalizada".',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomSecundario',
            title: 'Color secundario (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomAcento',
            title: 'Color de acento (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomFondo',
            title: 'Color de fondo (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'paletaCustomTexto',
            title: 'Color de texto (hex)',
            type: 'string',
            hidden: ({ document }) => document?.paletaActiva !== 'custom',
        }),
        defineField({
            name: 'varianteVisual',
            title: 'Variante visual del catálogo',
            type: 'string',
            // RF-16: controla el layout (cuadrícula vs lista) y el estilo de las tarjetas.
            options: {
                list: [
                    { title: 'Clásico',     value: 'clasico' },
                    { title: 'Moderno',     value: 'moderno' },
                    { title: 'Minimalista', value: 'minimalista' },
                ],
                layout: 'radio',
            },
            initialValue: 'moderno',
        }),

        // ── Patrones decorativos (RF-16) ─────────────────────────────────────────────
        defineField({
            name: 'patronDecorativoActivo',
            title: 'Patrón decorativo activo',
            type: 'boolean',
            description: 'Activa un overlay de imagen repetible sobre el catálogo (p. ej. temática Halloween, Navidad).',
            initialValue: false,
        }),
        defineField({
            name: 'patronDecorativo',
            title: 'Imagen del patrón decorativo',
            type: 'image',
            description: 'Imagen pequeña (ej. 200x200px) que se repite como fondo semi-transparente. Solo se usa si el toggle de arriba está activo.',
            hidden: ({ document }) => !document?.patronDecorativoActivo,
        }),

        // ── Umbrales operativos ────────────────────────────────────────────────────
        defineField({
            name: 'umbralStockBajo',
            title: 'Umbral de stock bajo',
            type: 'number',
            // RF-03/RF-14: cuando stock <= umbralStockBajo, el frontend muestra
            // la alerta "¡Pocas unidades!". Tema Abierto #3 del ERS.
            initialValue: 5,
            validation: Rule => Rule.min(0).integer()
        }),
        defineField({
            name: 'productosPorPagina',
            title: 'Productos por página',
            type: 'number',
            // RF-19: controla la cantidad de productos en la vista de catálogo.
            // Tema Abierto #2 del ERS.
            initialValue: 24,
            validation: Rule => Rule.min(1).integer()
        }),
    ],

    // Singleton: deshabilita la creación de nuevos documentos y la eliminación.
    __experimental_actions: ['update', 'publish'],
});
```

---

### `sanity/schemas/index.ts`

```typescript
// Exports all Sanity schema types for registration in sanity.config.ts.
export { producto }            from './producto';
export { categoria }           from './categoria';
export { comentario }          from './comentario';
export { calificacion }        from './calificacion';
export { configuracionGlobal } from './configuracionGlobal';
```

---

## 2.3 Configuración de Sanity Studio

### `sanity/sanity.config.ts`

```typescript
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { producto, categoria, comentario, calificacion, configuracionGlobal } from './schemas';

// visionTool: plugin visual para ejecutar consultas GROQ desde el Studio.
// Muy útil en desarrollo para verificar que las consultas devuelven los campos
// correctos antes de escribir el código en Nuxt.
export default defineConfig({
    projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
    plugins: [
        structureTool(),
        visionTool(),
    ],
    schema: {
        types: [producto, categoria, comentario, calificacion, configuracionGlobal]
    }
});
```

### `sanity/sanity.cli.ts`

```typescript
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
    api: {
        projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
        dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
    }
});
```

---

## 2.4 Tipos TypeScript (`types/sanity.ts`)

> [!NOTE]
> En una fase posterior, estos tipos pueden generarse automáticamente con `npx sanity@latest typegen generate`. Por ahora se definen a mano para mantener el control total y evitar dependencias adicionales en CI.

```typescript
// Manual TypeScript interfaces derived from Sanity schemas.
// For automated generation in future phases: npx sanity@latest typegen generate

export interface SanityImage {
    _type: 'image';
    asset: { _ref: string };
    hotspot?: { x: number; y: number; height: number; width: number };
    crop?: { top: number; bottom: number; left: number; right: number };
}

// calificacionPromedio is NOT stored in Sanity.
// It is derived in GROQ as: round(ratingSum / ratingCount, 1).
// ratingSum and ratingCount are internal counters — not exposed in frontend types.
export interface Producto {
    _id: string;
    _type: 'producto';
    nombre: string;
    slug: { current: string };
    descripcion?: string;
    imagenPrincipal?: SanityImage;
    imagenes?: SanityImage[];
    categoria: { _ref?: string; nombre: string; slug: { current: string } };
    stock: number;
    precio?: number;
    activo: boolean;
    calificacionPromedio?: number; // Computed in GROQ — never persisted
}

export interface Categoria {
    _id: string;
    _type: 'categoria';
    nombre: string;
    slug: { current: string };
    descripcion?: string;
    orden?: number;
}

export interface Comentario {
    _id: string;
    _type: 'comentario';
    texto: string;
    producto: { _ref: string };
    fechaCreacion: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface Calificacion {
    _id: string;
    _type: 'calificacion';
    valor: number;
    producto: { _ref: string };
    fechaCreacion: string;
}

export interface ConfiguracionGlobal {
    nombreSitio?: string;
    numeroWhatsApp: string;
    mensajeWhatsApp?: string;
    urlInstagram?: string;
    urlFacebook?: string;
    urlTikTok?: string;
    paletaActiva: 'claro' | 'oscuro' | 'oceano' | 'atardecer' | 'custom';
    paletaCustomPrimario?: string;
    paletaCustomSecundario?: string;
    paletaCustomAcento?: string;
    paletaCustomFondo?: string;
    paletaCustomTexto?: string;
    varianteVisual: 'clasico' | 'moderno' | 'minimalista';
    patronDecorativoActivo: boolean;
    patronDecorativo?: SanityImage;
    umbralStockBajo: number;
    productosPorPagina: number;
}
```

---

## 2.5 Consultas GROQ de Referencia

Estas consultas son las que usará el frontend en la Fase 3. Puedes verificarlas desde la pestaña **Vision** del Studio contra el dataset `staging` antes de programar los composables de Nuxt.

### Catálogo completo (activos)

```groq
*[_type == "producto" && activo == true]
| order(_createdAt desc)
{
  _id,
  nombre,
  slug,
  descripcion,
  imagenPrincipal,
  categoria->{nombre, slug},
  stock,
  "calificacionPromedio": select(
    ratingCount > 0 => round(ratingSum / ratingCount, 1),
    null
  )
}
```

`select()` devuelve `null` en lugar de una división por cero cuando el producto no tiene calificaciones aún. `categoria->` "sigue" la referencia para traer nombre y slug de la categoría.

### Detalle de un producto por slug

```groq
*[_type == "producto" && slug.current == $slug && activo == true][0]
{
  _id,
  nombre,
  slug,
  descripcion,
  imagenPrincipal,
  imagenes,
  categoria->{nombre, slug},
  stock,
  precio,
  "calificacionPromedio": select(
    ratingCount > 0 => round(ratingSum / ratingCount, 1),
    null
  ),
  ratingCount,
  rating1Count, rating2Count, rating3Count, rating4Count, rating5Count
}
```

`ratingCount` y los contadores `rating1Count`–`rating5Count` alimentan el panel de desglose de calificaciones y el contador de reseñas en el frontend (`SistemaEstrellas.vue` y `DesgloseCalificaciones.vue`).

### Comentarios aprobados de un producto (con orden configurable)

Esta consulta se ejecuta desde el composable `useComentario.ts` con el parámetro `$orden`:

```groq
// Orden por fecha descendente (más recientes primero — default)
*[_type == "comentario" && producto._ref == $productoId && estado == "aprobado"]
| order(fechaCreacion desc)
{ _id, texto, fechaCreacion }

// Orden por fecha ascendente
*[_type == "comentario" && producto._ref == $productoId && estado == "aprobado"]
| order(fechaCreacion asc)
{ _id, texto, fechaCreacion }
```

El filtro por puntuación (mayor a menor / menor a mayor) se implementa en el frontend leyendo los documentos de `calificacion` relacionados en una segunda consulta, o vinculando `calificacionId` al comentario en fases posteriores si se requiere unión exacta por usuario.

`^._id` referencia el `_id` del documento padre (el producto) dentro de la subconsulta de comentarios.

### Configuración Global

```groq
*[_type == "configuracionGlobal"][0]
```

No necesita proyección: el documento singleton no contiene información sensible y siempre tiene todos los campos.

---

## 2.6 Carga de Datos de Prueba en `staging`

### Arrancar el Studio apuntando a staging

```bash
cd sanity
SANITY_STUDIO_DATASET=staging npx sanity dev
```

### Checklist de datos mínimos requeridos

**Categorías (mínimo 4):**

| nombre | orden |
|---|---|
| Llaveros | 1 |
| Pines | 2 |
| Stickers | 3 |
| Libros | 4 |

**Productos (mínimo 10):**

| Criterio | Cantidad | Propósito |
|---|---|---|
| Stock > umbralStockBajo (ej. > 5) | 5 | Casos de producto disponible |
| Stock entre 1 y umbralStockBajo (ej. 1–5) | 3 | Para probar alerta "¡Pocas unidades!" (RF-14) |
| Stock = 0 | 2 | Para verificar que el botón de contacto se desactiva (RF-14) |
| Con imagen principal | todos | Evitar imágenes rotas en el frontend |
| Con categoría = Llaveros | ≥ 3 | Para probar el filtro de categorías (RF-04) |

**Documento `configuracionGlobal` (único — campos obligatorios):**

| Campo | Valor de prueba |
|---|---|
| paletaActiva | azul |
| varianteVisual | moderno |
| umbralStockBajo | 5 |
| productosPorPagina | 12 |
| numeroWhatsApp | 5219991234567 (ficticio para staging) |

---

## 2.7 Configuración del Webhook de Sanity

> [!NOTE]
> Este paso se completa parcialmente ahora. La URL de Vercel se confirma en la Fase 4 cuando el proyecto esté conectado a Vercel.

Configurar desde **https://sanity.io/manage → tu proyecto → API → Webhooks:**

| Campo | Producción | Staging |
|---|---|---|
| Name | `Rebuild production` | `Rebuild staging preview` |
| URL | `https://[tu-dominio]/api/webhook/rebuild` | URL de Preview de Vercel |
| Trigger on | Create, Update, Delete | Create, Update, Delete |
| Dataset | `production` | `staging` |
| Secret | valor de `SANITY_WEBHOOK_SECRET` | mismo secreto |
| HTTP method | POST | POST |

El handler `/api/webhook/rebuild` ya existe como stub. La lógica HMAC se implementa en la Fase 5.

---

## 2.8 Tests de Integración de Datos (Modelo en V)

> [!NOTE]
> Siguiendo el **Modelo en V**, estos tests se definen ahora, justo después de implementar los esquemas. Garantizan que el contrato de datos entre Sanity y el frontend es correcto antes de que la Fase 3 comience a consumirlos.

### Separación unitarios / integración

Estos tests requieren conexión real al dataset `staging` de Sanity (red, credenciales, latencia variable). Por tanto se clasifican como **tests de integración** y se **aislan del comando `pnpm run test`** (pruebas unitarias puras). El patrón replica el ya usado para Go en §5.7: los tests de integración del backend usan `-tags=integration`; aquí se usa el patrón de nombre `*.integration.test.ts` excluido por `vitest.config.ts`.

```
tests/
├── unit/                  ← pnpm run test (sin red, rápidos, en CI por defecto)
├── integration/           ← pnpm run test:integration (requieren Sanity staging)
│   └── sanity-schemas.integration.test.ts
├── e2e/
└── fixtures/
```

### IT-SANITY-01 — Verificación de tipos por CI (no Vitest)

Las anotaciones de tipo de TypeScript se eliminan en compilación (*type erasure*). Vitest ejecuta JavaScript ya compilado y no puede comparar una `interface` contra un schema externo en tiempo de ejecución. La verificación correcta es un **paso de CI**, no un caso de Vitest:

```yaml
# En .github/workflows/ci.yml — paso dentro de test-frontend
- name: Verify Sanity TypeScript types are in sync (IT-SANITY-01)
  run: |
    npx sanity@latest typegen generate
    git diff --exit-code types/sanity.ts
  env:
    SANITY_STUDIO_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID_STAGING }}
    SANITY_STUDIO_DATASET: staging
```

Si el schema cambia y `types/sanity.ts` no se actualizó a mano, el `git diff` falla el build. Así se detectan divergencias reales entre el schema y los tipos del frontend.

### IT-SANITY-02 e IT-SANITY-03 — Crear `tests/integration/sanity-schemas.integration.test.ts`

```typescript
// Integration tests for Sanity data schemas.
// Satisfies: IT-SANITY-02 (GROQ catalog query), IT-SANITY-03 (global config query).
// Requires: VITE_SANITY_PROJECT_ID env variable pointing to the staging dataset.
// Run with: pnpm run test:integration

import { describe, it, expect } from 'vitest';
import { createClient } from '@sanity/client';

const client = createClient({
    projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
    dataset: import.meta.env.VITE_SANITY_DATASET ?? 'staging',
    useCdn: false,
    apiVersion: '2024-01-01',
});

// IT-SANITY-02: GROQ catalog query returns expected fields with correct nomenclature.
describe('Sanity GROQ — producto schema (IT-SANITY-02)', () => {
    it('returns productos with required fields from staging', async () => {
        const productos = await client.fetch(
            `*[_type == "producto" && activo == true][0...3]
             { _id, nombre, slug, stock, categoria->{nombre} }`
        );
        expect(Array.isArray(productos)).toBe(true);
        if (productos.length > 0) {
            expect(productos[0]).toHaveProperty('_id');
            expect(productos[0]).toHaveProperty('nombre');
            expect(productos[0]).toHaveProperty('slug.current');
            expect(typeof productos[0].stock).toBe('number');
            expect(productos[0].categoria).toHaveProperty('nombre');
        }
    });

    it('ratingSum and ratingCount are initialized to 0 or a valid number', async () => {
        const productos = await client.fetch(
            `*[_type == "producto"][0...3]{ ratingSum, ratingCount }`
        );
        productos.forEach((p: { ratingSum: number; ratingCount: number }) => {
            expect(typeof p.ratingSum).toBe('number');
            expect(typeof p.ratingCount).toBe('number');
            expect(p.ratingCount).toBeGreaterThanOrEqual(0);
        });
    });
});

// IT-SANITY-03: configuracionGlobal singleton is queryable with correct field names.
describe('Sanity GROQ — configuracionGlobal singleton (IT-SANITY-03)', () => {
    it('returns the global config with paletaActiva and varianteVisual', async () => {
        const config = await client.fetch(
            `*[_type == "configuracionGlobal"][0]
             { paletaActiva, varianteVisual, umbralStockBajo, productosPorPagina }`
        );
        expect(config).not.toBeNull();
        expect(['azul', 'verde', 'morado', 'naranja', 'gris']).toContain(config.paletaActiva);
        expect(['clasico', 'moderno', 'minimalista']).toContain(config.varianteVisual);
        expect(typeof config.umbralStockBajo).toBe('number');
        expect(typeof config.productosPorPagina).toBe('number');
    });
});
```

**Ejecutar localmente:**

```bash
# Requiere VITE_SANITY_PROJECT_ID en el entorno (.env.local)
pnpm run test:integration
```

> [!IMPORTANT]
> En CI, el job `integration-tests` en `.github/workflows/ci.yml` inyecta automáticamente `VITE_SANITY_PROJECT_ID` y `VITE_SANITY_DATASET` desde los secrets del repositorio. El job solo se ejecuta si `test-backend` y `test-frontend` pasan primero.

---

## 2.9 Verificación Final

- [ ] `cd sanity && npx sanity dev` arranca el Studio sin errores de compilación
- [ ] Los 5 tipos de documento aparecen en el Studio: `producto`, `categoria`, `comentario`, `calificacion`, `configuracionGlobal`
- [ ] Se puede crear un producto nuevo con imagen, categoría y stock sin errores de validación
- [ ] La pestaña **Vision** del Studio ejecuta la consulta del catálogo y devuelve `calificacionPromedio`, `categoria.nombre` y `slug.current`
- [ ] El dataset `staging` tiene al menos 4 categorías y 10 productos con imágenes
- [ ] El documento `configuracionGlobal` existe en `staging` con los campos obligatorios completados
- [ ] Los tipos TypeScript en `types/sanity.ts` no tienen un campo `calificacionPromedio` persistido (es `// Computed in GROQ`)
- [ ] El paso CI `sanity typegen generate` + `git diff --exit-code` pasa sin diferencias (IT-SANITY-01)
- [ ] Tests de integración pasan localmente: `pnpm run test:integration` (IT-SANITY-02, IT-SANITY-03)
- [ ] El webhook de Sanity está creado en `sanity.io/manage` (URL de Vercel pendiente para Fase 4)
- [ ] Commit: `feat(sanity): define data schemas, studio config, staging seed data and integration tests`

---

## Decisiones de Diseño Tomadas en Esta Fase

| Decisión | Opción elegida | Razón |
|---|---|---|
| Cálculo del promedio de calificación | Contadores atómicos `ratingSum` + `ratingCount`, promedio derivado en GROQ | Evita condición de carrera bajo concurrencia; mantiene el token Go acotado a `calificacion` |
| Dirección de la referencia | `comentario`/`calificacion` → `producto` (no al revés) | Evita contención de escritura y crecimiento indefinido del documento `producto` |
| `configuracionGlobal` como singleton | `__experimental_actions: ['update', 'publish']` | Impide la creación accidental de múltiples configuraciones en Studio |
| Moderación de comentarios | Campo `estado`: `pendiente`/`aprobado`/`rechazado` | Implementa Tema Abierto #1 del ERS sin sistema externo de moderación |
| Precio como campo opcional | `precio` no requerido | Solo se usa en el mensaje de WhatsApp; no es un campo de e-commerce crítico |
| Separación unitario/integración | Patrón `*.integration.test.ts` excluido en `vitest.config.ts` | Aísla tests con dependencias de red del comando `pnpm run test` por defecto |
| IT-SANITY-01 | Verificación CI con `sanity typegen generate` + `git diff` | Los tipos TS no son verificables en runtime por *type erasure* |

