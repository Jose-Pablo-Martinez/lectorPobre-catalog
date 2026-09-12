# LectorPobre — Guía de Buenas Prácticas de Desarrollo

> **Versión:** 1.0
> **Stack:** Nuxt.js 3 · Vue.js 3 · Tailwind CSS 3 · Go 1.22+ · Sanity.io · Vercel
> **Estándares:** ERS LectorPobre v1.0 · ISO/IEC 25010 · Conventional Commits · JSDoc · GoDoc · OpenAPI 3.0 (Swaggo)
> **Audiencia:** Desarrolladores humanos y agentes de codificación IA que contribuyan a este proyecto.

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Principios Generales](#2-principios-generales)
3. [Estándares de Comentarios y Documentación](#3-estándares-de-comentarios-y-documentación)
4. [Buenas Prácticas — Go (Backend Serverless)](#4-buenas-prácticas--go-backend-serverless)
5. [Buenas Prácticas — TypeScript / Vue / Nuxt](#5-buenas-prácticas--typescript--vue--nuxt)
6. [Buenas Prácticas — Tailwind CSS](#6-buenas-prácticas--tailwind-css)
7. [Buenas Prácticas — CSS](#7-buenas-prácticas--css)
8. [Contrato de API Serverless](#8-contrato-de-api-serverless)
9. [Seguridad](#9-seguridad)
10. [Convenciones de Testing](#10-convenciones-de-testing)
11. [Git y Convenciones de Commits](#11-git-y-convenciones-de-commits)
12. [Directivas para Agentes IA](#12-directivas-para-agentes-ia)
13. [Entorno Local y Troubleshooting](#13-entorno-local-y-troubleshooting)

---

## 1. Introducción

Este documento es la **fuente única de verdad** para estándares de codificación, convenciones de documentación y objetivos de calidad en toda la base de código de LectorPobre. Su propósito es triple:

1. **Consistencia** — todos los contribuidores (humanos o IA) producen código con la misma estructura y estilo.
2. **Trazabilidad** — cada decisión no trivial puede trazarse a un requisito (RF/RNF) del ERS v1.0.
3. **Calidad** — el código debe satisfacer las buenas prácticas de seguridad definidas en la [Sección 9](#9-seguridad) antes de integrarse a `main`.

Toda regla aquí documentada está justificada. Si una regla entra en conflicto con una necesidad técnica específica, abre una discusión y actualiza este documento. **No te desvíes en silencio.**

---

## 2. Principios Generales

Estos principios aplican a todas las capas del stack.

### 2.1 El Código Es la Documentación Principal

> Comenta el *por qué*, no el *qué*. Si necesitas un comentario para explicar qué hace una línea,
> reescríbela hasta que sea autoexplicativa.

- **Los nombres deben estar en inglés** y revelar intención: `validateCommentSchema` es mejor que `validate1`.
- Mantén las funciones cortas: lógica pura ≤ 20 líneas; orquestación ≤ 40 líneas.
- Una función = una responsabilidad.

### 2.2 Explícito Sobre Implícito

- Sin valores mágicos. Constantes con nombre reemplazan `5`, `"comentario"`, `200`.
- Todos los contratos de API están tipados de extremo a extremo: interfaces TypeScript ↔ structs Go.
- Toda condición de error produce un código de error con nombre, nunca un mensaje de excepción crudo enviado al cliente.

### 2.3 Trazabilidad de Requisitos

Cualquier componente, función o handler que implemente directamente un requisito funcional o no funcional **debe** referenciarlo en su documentación JSDoc/GoDoc:

```
Satisfies: RF-07 (Comentarios), RNF-04 (Seguridad sin estado)
```

Esto hace que la base de código sea verificable contra el ERS sin leer documentos externos.

### 2.4 Falla Rápido, Falla Claro

- Valida las entradas al inicio de cada función serverless en Go antes de que lleguen a la lógica de negocio.
- Retorna objetos de error estructurados — `{"error": "solicitud inválida"}` — nunca tragues excepciones silenciosamente.
- Los códigos de error deben coincidir con las constantes definidas en `errorCodes.go` (ver Sección 4.5).

### 2.5 El Frontend No Conoce Secretos — Es No Negociable

RNF-04 exige que ningún token privado sea accesible desde el cliente. **Ninguna librería o cambio de código puede introducir secretos en el bundle de JavaScript.** Todo token de escritura de Sanity vive exclusivamente en variables de entorno de Vercel, accesibles solo por las funciones Go.

### 2.6 Cada Función Es un Evento Aislado

El modelo serverless no garantiza estado entre invocaciones. Cada función Go debe tratar **cada petición como si fuera la primera y la última**. No almacenar estado mutable global entre invocaciones.

---

## 3. Estándares de Comentarios y Documentación

### 3.1 La Regla de Oro

> **Los comentarios explican el *por qué* y los algoritmos complejos. Nunca el *qué*.**
> Un comentario que describe qué hace el código es una señal de que el código mismo debe refactorizarse.

| Escenario | Acción requerida |
|---|---|
| Función/handler Go exportado | GoDoc `// FunctionName description` **requerido** |
| Struct/type Go exportado | GoDoc con descripción + campos relevantes **requerido** |
| Función privada Go con lógica no obvia | Comentario inline explicando la *razón* |
| Función privada simple | **Sin comentario** — el nombre es suficiente |
| Cada archivo `.go` | Comentario de paquete `// Package x ...` al inicio |
| Cada archivo `.ts` / `.vue` | Bloque `@file` JSDoc al inicio |
| Algoritmo complejo | Comentario a nivel de bloque, no línea por línea |
| Regla de negocio del ERS | Referencia el ID RF/RNF en el comentario |
| Endpoint Go exportado | **Anotaciones Swag requeridas** (ver §3.6) |

### 3.2 GoDoc — Backend Serverless

#### 3.2.1 Cabecera de Archivo — Cada `.go`

```go
// Package handlers implementa los handlers HTTP de las funciones serverless de LectorPobre.
// Cada handler actúa como proxy seguro entre el navegador y Sanity.io,
// validando toda entrada antes de firmar peticiones con el token privado.
package handlers
```

#### 3.2.2 Structs y Tipos Exportados

```go
// ComentarioPayload representa la carga útil recibida desde el frontend
// al publicar un comentario en la vista de detalle de un producto.
// Satisfies: RF-07 (Comentarios de texto), RNF-04 (Validación de entrada).
type ComentarioPayload struct {
    // ProductoID es el identificador único del producto en Sanity.io.
    ProductoID string `json:"productoId"`
    // Texto es el contenido del comentario. Longitud máxima: 1000 caracteres.
    Texto string `json:"texto"`
}
```

#### 3.2.3 Handlers HTTP Exportados

```go
// ComentarHandler valida el payload del comentario, aplica controles anti-bot
// y rate limiting, y escribe el documento en Sanity.io usando el token privado.
//
// Endpoint: POST /api/comentar
// Satisfies: RF-07 (Comentarios), RNF-04 (Seguridad sin estado).
//
// Errores posibles:
//   - 400 si el payload es inválido o excede límites de longitud.
//   - 429 si se supera el rate limit por IP.
//   - 500 si falla la escritura en Sanity (el detalle se registra en logs, no se expone al cliente).
func ComentarHandler(w http.ResponseWriter, r *http.Request) {
```

#### 3.2.4 Funciones de Validación y Utilidades

```go
// validarComentario verifica que el payload cumpla con los requisitos
// de esquema, longitud y contenido antes de procesarlo.
// Retorna un error descriptivo si alguna regla es violada.
// Nunca retorna errores con información interna del sistema (RNF-04, sección 9.9).
func validarComentario(p ComentarioPayload) error {
```

### 3.3 JSDoc — Frontend (TypeScript / Vue)

#### 3.3.1 Cabecera de Archivo — Cada `.ts` / `.vue`

```typescript
/**
 * @file useStock.ts
 * @description Composable de Vue que consulta el stock actual de un producto
 * directamente desde la API pública de lectura de Sanity.io (sin token secreto).
 * @satisfies RF-03, RNF-03 - El stock debe consultarse en tiempo real al visualizar el detalle.
 */
```

#### 3.3.2 Composables y Funciones Exportadas

```typescript
/**
 * Consulta el stock actual de un producto desde la API pública de Sanity.io.
 * Esta función NO usa token privado — utiliza únicamente el projectId/dataset públicos.
 *
 * @param productoId - ID del documento de producto en Sanity.io.
 * @returns Reactive ref con el stock actual, null mientras carga, o -1 si hay error.
 * @satisfies RF-03, RNF-03
 */
export function useStock(productoId: string): Ref<number | null> {
```

#### 3.3.3 Interfaces y Tipos

```typescript
/**
 * Respuesta mínima del endpoint serverless tras una operación de escritura.
 * Nunca expone detalles internos (trazas de pila, nombres de campos de BD, etc.).
 *
 * @satisfies RNF-04 - Mensajes de error genéricos en producción.
 */
export interface ApiResponse {
    /** true si la operación fue exitosa. */
    ok: boolean;
    /** Mensaje de error amigable para el usuario (solo presente si ok === false). */
    error?: string;
}
```

### 3.4 Qué NO Debe Comentarse

```go
// ❌ Redundante — el nombre ya lo dice
// Incrementar el índice
i++

// ❌ Redundante — obvio por la declaración
// Retorna el nombre del producto
func (p *Producto) Nombre() string { return p.nombre }

// ✅ Necesario — explica una restricción no obvia del ERS
// Rechaza cualquier query GROQ que concatene directamente la entrada del usuario,
// ya que puede permitir alterar la consulta original (ver sección 9.11 de la arquitectura).
params := map[string]interface{}{"texto": payload.Texto}
```

### 3.5 Convención TODO y FIXME

```go
// TODO(RF-07): Implement pre-moderation before publishing comments. Issue #12.
// FIXME: Rate limiter does not persist between invocations in warm containers — see §9.6.
// NOTE: Sanity API v2024 deprecates this endpoint — migrate before next release.
```

- Always include the RF/RNF ID when the TODO is related to a requirement.
- Never commit a `TODO` that blocks the current feature. Register it as a GitHub Issue.

### 3.6 Documentación de API con Swaggo (OpenAPI 3.0)

Toda función Handler de Go exportada **debe** incluir anotaciones [Swaggo](https://github.com/swaggo/swag) inmediatamente antes de su declaración. Estas anotaciones generan una especificación OpenAPI 3.0 compatible con Postman, Swagger UI e Insomnia.

> [!IMPORTANT]
> Las anotaciones Swag **no son comentarios opcionales**. Son parte del contrato de API y son equivalentes a escribir la documentación de Postman directamente en el código. Si el handler no tiene anotaciones Swag, el PR debe ser bloqueado en revisión.

#### Instalación de la herramienta (una vez, globalmente)

```bash
go install github.com/swaggo/swag/cmd/swag@latest
```

#### Generación de la especificación

```bash
# Ejecutar desde la raíz de /api — genera api/docs/swagger.json y api/docs/swagger.yaml
swag init --dir . --output docs/ --parseDependency
```

#### Formato de anotaciones

El bloque de anotaciones va **entre el comentario GoDoc y la declaración de la función**.

```go
// Handler processes a new comment submission for a product.
//
// Satisfies: RF-07 (Comments), RNF-04 (Security — no token exposure).
//
// @Summary      Submit a product comment
// @Description  Validates the comment payload, applies rate limiting and writes to Sanity.io with the private write token.
// @Tags         comments
// @Accept       json
// @Produce      json
// @Param        body  body      handlers.CommentPayload  true  "Comment payload"
// @Success      201   {object}  handlers.ApiResponse{ok=true}
// @Failure      400   {object}  handlers.ApiResponse  "Invalid payload or comment too long"
// @Failure      429   {object}  handlers.ApiResponse  "Rate limit exceeded"
// @Failure      500   {object}  handlers.ApiResponse  "Internal error (no internal detail exposed)"
// @Router       /api/comment [post]
func Handler(w http.ResponseWriter, r *http.Request) {
```

#### Anotaciones obligatorias por handler

| Tag Swag | Requerido | Descripción |
|---|---|---|
| `@Summary` | ✅ | Frase corta en inglés (< 10 palabras) |
| `@Description` | ✅ | Descripción completa del comportamiento |
| `@Tags` | ✅ | Categoría del endpoint (`comments`, `ratings`, `auth`, `admin`, `webhooks`) |
| `@Accept` | ✅ | `json` para todos los POST |
| `@Produce` | ✅ | `json` para todos los endpoints |
| `@Param` | ✅ | Todos los parámetros (body, query, header) |
| `@Success` | ✅ | Código HTTP y tipo de respuesta exitosa |
| `@Failure` | ✅ | Todos los códigos de error documentados en §8 |
| `@Router` | ✅ | Ruta exacta de Vercel + método HTTP |
| `@Security` | Solo endpoints protegidos | `@Security BearerAuth` para rutas `/api/auth/*` |

#### Importar la colección en Postman

Después de ejecutar `swag init`, el archivo `api/docs/swagger.json` puede importarse directamente en Postman:
1. Postman → **Import** → **File** → seleccionar `api/docs/swagger.json`
2. Postman convierte automáticamente los endpoints en una colección lista para ejecutar.
3. Configurar la variable de entorno `{{baseUrl}}` con `http://localhost:3000` (local) o la URL de Preview de Vercel.

---

## 4. Buenas Prácticas — Go (Backend Serverless)

### 4.1 Convenciones de Nomenclatura

Seguir las [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) estrictamente. **Todos los identificadores (paquetes, tipos, funciones, variables) deben estar en inglés.**

| Elemento | Convención | Ejemplo |
|---|---|---|
| Package | `lowercase`, una sola palabra | `handlers`, `sanity`, `middleware` |
| Exported type / func | `PascalCase` | `CommentPayload`, `CommentHandler` |
| Unexported func / var | `camelCase` | `validateComment`, `signRequest` |
| Constante | `PascalCase` o `SCREAMING_SNAKE_CASE` (errores) | `MaxTextLen`, `ERR_RATE_LIMIT` |
| Interface | `PascalCase`, sufijo `-er` si aplica | `SanityWriter`, `RateLimiter` |
| Error variable | prefijo `Err` | `ErrInvalidPayload`, `ErrRateLimit` |
| Handler HTTP | sufijo `Handler` | `CommentHandler`, `RatingHandler` |

### 4.2 Estructura de Código

#### Archivos

- **Un handler / dominio principal por archivo.** El nombre del archivo refleja su propósito (`comentar.go`, `calificar.go`).
- Orden interno en un archivo: `package` → `import` → tipos → vars/constantes → funciones exportadas → funciones privadas.
- Agrupa imports: stdlib, third-party, interno.

```go
import (
    // stdlib
    "encoding/json"
    "net/http"

    // third-party
    "github.com/sanity-io/client-go"

    // internal
    "github.com/lectorpobre/api/middleware"
    "github.com/lectorpobre/api/sanity"
)
```

#### Longitud y Complejidad

- **Longitud máxima de función:** 40 líneas.
- **Usa guard clauses** para reducir nesting y manejar errores temprano (Fail Fast).

```go
// ✅ Patrón guard clause — falla rápido, mantén el happy path plano
func ComentarHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, `{"error":"método no permitido"}`, http.StatusMethodNotAllowed)
        return
    }

    var payload ComentarioPayload
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        http.Error(w, `{"error":"payload inválido"}`, http.StatusBadRequest)
        return
    }

    if err := validarComentario(payload); err != nil {
        http.Error(w, `{"error":"solicitud inválida"}`, http.StatusBadRequest)
        return
    }

    // Happy path: escritura en Sanity
    if err := sanity.EscribirComentario(r.Context(), payload); err != nil {
        log.Printf("[ERROR] ComentarHandler: escritura fallida: %v", err)
        http.Error(w, `{"error":"error interno"}`, http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
```

### 4.3 Manejo de Errores

```go
// ✅ Retornar errores explícitos y envolver con contexto
func firmarPeticionSanity(payload []byte) (*http.Response, error) {
    resp, err := sanityClient.Mutate(payload)
    if err != nil {
        return nil, fmt.Errorf("firmarPeticionSanity: %w", err)
    }
    return resp, nil
}

// ✅ Errores genéricos al cliente, detalle solo en logs
log.Printf("[ERROR] CalificarHandler: %v", err)      // Log interno — detallado ✅
http.Error(w, `{"error":"error interno"}`, 500)       // Cliente — genérico ✅

// ❌ Nunca exponer trazas o detalles internos al cliente
http.Error(w, err.Error(), 500) // ❌ Viola RNF-04 / sección 9.9
```

### 4.4 Seguridad y Validación de Entradas

```go
// ✅ Validar longitud, tipo y formato ANTES de cualquier operación
const MaxTextoLen = 1000
const MinCalificacion = 1
const MaxCalificacion = 5

func validarComentario(p ComentarioPayload) error {
    if strings.TrimSpace(p.Texto) == "" {
        return errors.New("el texto no puede estar vacío")
    }
    if len([]rune(p.Texto)) > MaxTextoLen {
        return fmt.Errorf("el texto supera el máximo de %d caracteres", MaxTextoLen)
    }
    if strings.TrimSpace(p.ProductoID) == "" {
        return errors.New("productoId es requerido")
    }
    return nil
}

// ✅ Usar parámetros tipados en GROQ — nunca interpolación de strings con entrada del usuario
// Correcto — usando params tipados del cliente de Sanity
query := `*[_type == "producto" && _id == $id]{nombre, stock}`
params := map[string]interface{}{"id": productoID}

// ❌ Inyección GROQ — nunca hacer esto
query := `*[_type == "producto" && nombre match "` + entrada + `"]` // ❌
```

### 4.5 Registro de Códigos de Error

Todos los códigos de error viven en un único archivo en el paquete de constantes del backend. Los mismos strings se espejean en el frontend TypeScript.

```go
// api/constants/errorcodes.go

// ErrCodes centraliza los códigos de error estructurados retornados por los handlers.
// Espeja estos valores en frontend/types/api.ts → ErrorCode.
var ErrCodes = struct {
    PayloadInvalido  string
    RateLimit        string
    NoAutorizado     string
    ErrorInterno     string
    CalificacionRango string
}{
    PayloadInvalido:   "PAYLOAD_INVALIDO",
    RateLimit:         "RATE_LIMIT_EXCEDIDO",
    NoAutorizado:      "NO_AUTORIZADO",
    ErrorInterno:      "ERROR_INTERNO",
    CalificacionRango: "CALIFICACION_FUERA_DE_RANGO",
}
```

### 4.6 Estado en Funciones Serverless

```go
// ✅ Sin variables globales mutables con datos de petición
// Está bien: configuración inmutable inicializada una vez
var sanityClient = sanity.NewClient(os.Getenv("SANITY_WRITE_TOKEN"))

// ❌ Nunca almacenar datos de una petición en variables globales
var ultimoComentario string // ❌ Puede filtrarse a otra petición en contenedor warm
```

---

## 5. Buenas Prácticas — TypeScript / Vue / Nuxt

### 5.1 Convenciones de Nomenclatura

**Todos los identificadores (componentes, composables, funciones, tipos, constantes, archivos) deben estar en inglés.**

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componente Vue | `PascalCase` | `ProductCard`, `StarRating` |
| Composable | prefijo `use` | `useStock`, `useRating`, `useCatalog` |
| Servicio / utilidad | `camelCase` | `sendComment`, `buildWhatsAppUrl` |
| Type / Interface | `PascalCase` | `Product`, `CommentPayload`, `ApiResponse` |
| Constante | `SCREAMING_SNAKE_CASE` | `MAX_COMMENT_LENGTH`, `SANITY_PROJECT_ID` |
| Archivo (componente) | `PascalCase` igual al componente | `ProductCard.vue`, `StarRating.vue` |
| Archivo (composable/servicio) | `camelCase` | `useStock.ts`, `sanityClient.ts` |
| Página Nuxt | `kebab-case` (convención del directorio `pages/`) | `pages/product/[slug].vue` |

### 5.2 Reglas de Tipado

```typescript
// tsconfig.json debe tener "strict": true

// ✅ Interfaces explícitas para todas las entidades del dominio
export interface Producto {
    /** Identificador único del documento en Sanity.io. */
    _id: string;
    nombre: string;
    descripcion: string;
    /** URL pública de la imagen principal, resuelta por Sanity Asset Pipeline. */
    imagenUrl: string;
    categoria: string;
    /** Stock actual. Puede estar desactualizado si viene del build; usar useStock para tiempo real. */
    stock: number;
    calificacionPromedio?: number;
}

// ✅ Unión discriminada para respuestas de API
export type ApiResponse<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: string; code: ErrorCode };

// ✅ Nunca usar `any` — usar `unknown` + narrowing
const raw: unknown = await response.json();
if (!esApiResponse(raw)) throw new Error('Respuesta inesperada del servidor');

// ❌ Nunca
const data: any = await response.json(); // ❌ Desactiva seguridad de tipos
```

### 5.3 Patrones de Vue 3 y Composables

```vue
<script setup lang="ts">
/**
 * @file TarjetaProducto.vue
 * @description Tarjeta de producto reutilizable para el catálogo.
 * @satisfies RF-01 (Catálogo), RF-02 (Detalle), RNF-05 (Responsividad).
 */

interface Props {
    /** Datos del producto a mostrar. */
    producto: Producto;
    /** Si es true, muestra el indicador de stock en tiempo real (RF-03). */
    mostrarStock?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    mostrarStock: false,
});

// ✅ Separa lógica de negocio en composables — el componente solo renderiza
const { stock, cargando } = useStock(props.producto._id);
const urlWhatsApp = computed(() => construirUrlWhatsApp(props.producto));
</script>
```

```typescript
// ✅ Composables responsables de un solo dominio
// useStock.ts — maneja SOLO la consulta de stock en tiempo real
export function useStock(productoId: string) {
    const stock = ref<number | null>(null);
    const cargando = ref(true);

    // Consulta directa a la API pública de Sanity — sin token secreto (sección 8 arquitectura)
    onMounted(async () => {
        try {
            stock.value = await sanityPublicClient.fetch(
                `*[_id == $id][0].stock`,
                { id: productoId }
            );
        } catch {
            stock.value = -1; // Indica error de consulta; UI muestra fallback
        } finally {
            cargando.value = false;
        }
    });

    return { stock: readonly(stock), cargando: readonly(cargando) };
}
```

### 5.4 SEO y Metadatos (RF-20)

```vue
<script setup lang="ts">
// ✅ useSeoMeta por página de detalle de producto (RF-20)
useSeoMeta({
    title: () => `${producto.value.nombre} | LectorPobre`,
    description: () => producto.value.descripcion.slice(0, 160),
    ogTitle: () => producto.value.nombre,
    ogImage: () => producto.value.imagenUrl,
    twitterCard: 'summary_large_image',
});
</script>
```

### 5.5 Reglas de Interacción con la API Serverless

```typescript
// ✅ Tipado estricto de las respuestas de los endpoints Go
async function publicarComentario(payload: ComentarioPayload): Promise<ApiResponse> {
    const res = await $fetch<ApiResponse>('/api/comentar', {
        method: 'POST',
        body: payload,
    });
    return res;
}

// ✅ Manejo de errores en composables — nunca en templates directamente
const { error, ejecutar: enviar } = useAsyncState(publicarComentario, null);

// ✅ Espeja los ErrorCodes del backend en TypeScript
export const ErrorCode = {
    PayloadInvalido:   'PAYLOAD_INVALIDO',
    RateLimit:         'RATE_LIMIT_EXCEDIDO',
    NoAutorizado:      'NO_AUTORIZADO',
    ErrorInterno:      'ERROR_INTERNO',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
```

---

## 6. Buenas Prácticas — Tailwind CSS

### 6.1 Orden de Clases

Aplica las clases utilitarias en este orden consistente para mejorar la legibilidad y soportar el ordenamiento automático de `prettier-plugin-tailwindcss`:

```
Layout → Tamaño → Espaciado → Tipografía → Visual → Interacción → Responsivo → Modificadores de estado
```

```vue
<!-- ✅ Ejemplo de orden consistente -->
<div class="flex flex-col gap-4 w-full max-w-sm p-4 text-sm text-gray-700
            bg-white rounded-xl shadow cursor-pointer hover:shadow-md
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
            sm:flex-row dark:bg-gray-800 dark:text-gray-200">
```

### 6.2 Extraer Grupos de Clases Repetidos

Cuando una combinación de clases aparece en **3 o más lugares**, extráela en un componente Vue.

```vue
<!-- ❌ Repetido en múltiples archivos -->
<button class="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg
               hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
               transition-colors focus-visible:ring-2 focus-visible:ring-brand-500">

<!-- ✅ Componente reutilizable -->
<!-- components/BotonPrimario.vue -->
<template>
    <button
        class="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg
               hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
               transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
        v-bind="$attrs"
    >
        <slot />
    </button>
</template>
```

### 6.3 Sin `style` Inline para Valores del Sistema de Diseño

```vue
<!-- ❌ Evita el sistema de diseño y rompe el modo oscuro -->
<div :style="{ color: '#374151', padding: '16px' }">

<!-- ✅ Usa tokens de Tailwind -->
<div class="text-gray-700 p-4 dark:text-gray-200">
```

**Excepción permitida:** valores dinámicos en tiempo de ejecución que no pueden expresarse como clases estáticas de Tailwind.

```vue
<!-- ✅ Ancho dinámico de barra de progreso — no puede ser una clase estática -->
<div
    class="h-2 rounded-full bg-brand-500 transition-all duration-300"
    :style="{ width: `${progreso}%` }"
    role="progressbar"
    :aria-valuenow="progreso"
    aria-valuemin="0"
    aria-valuemax="100"
/>
```

### 6.4 Accesibilidad con Tailwind (RNF-05)

```vue
<!-- ✅ Siempre agregar estilos focus-visible para navegación por teclado -->
<button class="... focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-brand-500 focus-visible:ring-offset-2">

<!-- ✅ Nunca depender solo del color para comunicar estado -->
<span class="flex items-center gap-1 text-red-600 dark:text-red-400">
    <IconoAlerta aria-hidden="true" />
    <span>Producto agotado</span>
</span>
```

### 6.5 Personalización de Paleta (RF-15, RF-16)

La paleta de colores de la marca debe configurarse en `tailwind.config.ts` usando un token `brand` para facilitar el cambio de tema desde Sanity.

```typescript
// tailwind.config.ts
export default {
    theme: {
        extend: {
            colors: {
                // Token de marca — actualizable desde configuración de Sanity
                brand: {
                    50: 'var(--color-brand-50)',
                    // ...
                    600: 'var(--color-brand-600)',
                    700: 'var(--color-brand-700)',
                },
            },
        },
    },
};
```

---

## 7. Buenas Prácticas — CSS

Tailwind es la herramienta principal de estilos. Los archivos CSS crudos se reservan para:
- Custom Properties globales (tokens de diseño) en `assets/css/global.css`
- Animaciones demasiado complejas para expresarse limpiamente en Tailwind
- Overrides de estilos de librerías de terceros

### 7.1 Custom Properties

```css
/* assets/css/global.css */
:root {
    --color-brand-50: #eff6ff;
    --color-brand-600: #2563eb;
    --color-brand-700: #1d4ed8;
    --lectorpobre-transition-base: 200ms ease-in-out;
}

/* Los tokens de color pueden ser sobreescritos dinámicamente desde JS
   al aplicar cambios de paleta desde Sanity Studio (RF-15) */
```

### 7.2 Animaciones y Movimiento

```css
@keyframes entrada-suave {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

.tarjeta-entrada {
    animation: entrada-suave 200ms ease-out;
    will-change: opacity, transform; /* Usar con moderación */
}

/* ✅ Siempre respetar las preferencias de movimiento del usuario (RNF-02, WCAG 2.3.3) */
@media (prefers-reduced-motion: reduce) {
    .tarjeta-entrada {
        animation: none;
    }
}
```

### 7.3 Reglas de Selectores

- **Nunca usar `!important`.** Si sientes la necesidad, la arquitectura de especificidad necesita corrección.
- **Evitar selectores descendientes más profundos que 2 niveles.** Tailwind maneja el scoping.
- **Sin selectores de ID para estilos.** Los IDs son para accesibilidad (`aria-labelledby`) y anclas.

---

## 8. Contrato de API Serverless

La API serverless de Go es la **superficie de API** del backend. Los cambios de esquema son **cambios que rompen compatibilidad** y requieren actualizaciones coordinadas en ambos lados (frontend TypeScript + handlers Go) antes de integrarse.

### 8.1 Endpoints Definidos

| Endpoint | Método | Requisito | Responsabilidad |
|---|---|---|---|
| `/api/comentar` | POST | RF-07 | Validar + rate limit + escribir comentario en Sanity |
| `/api/calificar` | POST | RF-06 | Validar rango (1–5) + rate limit + escribir calificación |
| `/api/buscar` | GET | RF-18 | Rate limit + sanitizar params + búsqueda (si no es client-side) |
| `/api/auth/login` | POST | RF-08 | Autenticar administrador, emitir JWT de corta duración |
| `/api/auth/logout` | POST | RF-09 | Invalidar token activo |
| `/api/webhook/rebuild` | POST | Build flow | Verificar firma HMAC de Sanity + disparar rebuild en Vercel |

### 8.2 Reglas de Versionado de Esquemas

- Los campos opcionales deben permanecer opcionales — nunca hagas requerido un campo opcional sin migración.
- Los nuevos campos en respuestas deben ser opcionales en TypeScript (`error?: string`).
- Al renombrar un endpoint: soportar el nombre antiguo junto al nuevo por un ciclo de release, luego eliminarlo.
- Nunca eliminar un campo de un esquema de mensaje sin un período de deprecación.

### 8.3 Contratos Canónicos de Mensajes

```typescript
// frontend/types/api.ts

/** Payload para publicar un comentario en un producto (RF-07). */
export interface ComentarioPayload {
    productoId: string;
    texto: string;          // máximo 1000 caracteres
}

/** Payload para registrar una calificación por estrellas (RF-06). */
export interface CalificacionPayload {
    productoId: string;
    valor: 1 | 2 | 3 | 4 | 5;
}

/** Respuesta estándar de los endpoints de escritura. */
export interface ApiResponse {
    ok: boolean;
    error?: string;         // solo presente si ok === false; siempre genérico en producción
    code?: ErrorCode;       // código de error para manejo programático
}
```

```go
// api/handlers/types.go

// ComentarioPayload es el contrato de entrada para POST /api/comentar.
// Satisfies: RF-07 (Comentarios de texto).
type ComentarioPayload struct {
    ProductoID string `json:"productoId"`
    Texto      string `json:"texto"`
}

// ApiResponse es el contrato de salida estándar de todos los handlers de escritura.
// Satisfies: RNF-04 - Los mensajes de error nunca exponen información interna.
type ApiResponse struct {
    Ok    bool   `json:"ok"`
    Error string `json:"error,omitempty"`
    Code  string `json:"code,omitempty"`
}
```

---

## 9. Seguridad

La seguridad de LectorPobre está documentada exhaustivamente en el documento de arquitectura. Esta sección resume las reglas de implementación obligatorias.

### 9.1 Checklist de Seguridad Antes de Cada PR

- [ ] El frontend no contiene ningún token privado, variable de entorno `SANITY_WRITE_TOKEN` ni credencial.
- [ ] Las funciones Go validan esquema, tipos y longitudes al inicio del handler.
- [ ] Las consultas GROQ usan parámetros tipados — nunca interpolación de strings con entrada del usuario.
- [ ] Los mensajes de error al cliente son genéricos; el detalle real solo en logs internos.
- [ ] CORS de las funciones está restringido a `https://lectorpobre.com` (no `*`).
- [ ] El endpoint `/api/webhook/rebuild` verifica la firma HMAC de Sanity antes de procesar.
- [ ] Rate limiting activo en `/api/comentar`, `/api/calificar` y `/api/buscar`.
- [ ] Los comentarios de usuarios son sanitizados/escapados al guardarse y al renderizarse.
- [ ] Ninguna función Go almacena datos de petición en variables globales mutables.

### 9.2 Tokens y Secretos

```bash
# ✅ Siempre en variables de entorno de Vercel — nunca en el repositorio
SANITY_WRITE_TOKEN=...
SANITY_WEBHOOK_SECRET=...
ADMIN_JWT_SECRET=...

# ❌ Nunca en el código fuente ni en .env commiteado
const token = "skXXXXXXXXXXXXX" // ❌
```

### 9.3 CORS en Handlers Go

```go
// ✅ CORS restrictivo — solo el dominio de producción
func setCORSHeaders(w http.ResponseWriter, r *http.Request) bool {
    origin := r.Header.Get("Origin")
    if origin == "https://lectorpobre.com" {
        w.Header().Set("Access-Control-Allow-Origin", origin)
        w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        return true
    }
    // Origen no permitido — rechazar
    http.Error(w, `{"error":"origen no permitido"}`, http.StatusForbidden)
    return false
}
```

### 9.4 Verificación de Webhook

```go
// ✅ Verificar firma HMAC de Sanity antes de procesar el rebuild
func WebhookRebuildHandler(w http.ResponseWriter, r *http.Request) {
    secret := os.Getenv("SANITY_WEBHOOK_SECRET")
    payload, _ := io.ReadAll(r.Body)
    firma := r.Header.Get("Sanity-Webhook-Signature")

    if !verificarFirmaHMAC(payload, firma, secret) {
        http.Error(w, `{"error":"firma inválida"}`, http.StatusUnauthorized)
        return
    }
    // Procesar rebuild...
}
```

---

## 10. Convenciones de Testing

### 10.1 Go — `testing` + `testify`

La nomenclatura de tests sigue `NombreFuncion_Escenario_ResultadoEsperado`.

```go
// handlers/comentar_test.go

// TestComentarHandler_PayloadValido_Retorna201 verifica el flujo exitoso de publicación.
// Satisfies: RF-07.
func TestComentarHandler_PayloadValido_Retorna201(t *testing.T) {
    payload := `{"productoId":"abc123","texto":"Excelente producto"}`
    req := httptest.NewRequest(http.MethodPost, "/api/comentar", strings.NewReader(payload))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    ComentarHandler(w, req)

    assert.Equal(t, http.StatusCreated, w.Code)
    var resp ApiResponse
    json.NewDecoder(w.Body).Decode(&resp)
    assert.True(t, resp.Ok)
}

func TestComentarHandler_TextoVacio_Retorna400(t *testing.T) {
    payload := `{"productoId":"abc123","texto":""}`
    req := httptest.NewRequest(http.MethodPost, "/api/comentar", strings.NewReader(payload))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    ComentarHandler(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
    var resp ApiResponse
    json.NewDecoder(w.Body).Decode(&resp)
    assert.False(t, resp.Ok)
}
```

### 10.2 TypeScript / Vue — Vitest + Vue Test Utils

```typescript
/**
 * @file TarjetaProducto.test.ts
 * @description Tests del componente de tarjeta de producto.
 * @satisfies RF-01 (Catálogo), RNF-05 (Responsividad visual básica).
 */

describe('TarjetaProducto', () => {
    it('muestra el nombre y la imagen del producto', () => {
        const producto = crearProductoMock({ nombre: 'Libro Test', imagenUrl: '/img/test.jpg' });
        const wrapper = mount(TarjetaProducto, { props: { producto } });

        expect(wrapper.text()).toContain('Libro Test');
        expect(wrapper.find('img').attributes('src')).toBe('/img/test.jpg');
    });

    it('incluye el enlace de WhatsApp cuando se proporciona el producto', () => {
        const producto = crearProductoMock({ nombre: 'Libro Test' });
        const wrapper = mount(TarjetaProducto, { props: { producto } });

        const enlace = wrapper.find('[data-testid="whatsapp-link"]');
        expect(enlace.exists()).toBe(true);
        expect(enlace.attributes('href')).toContain('wa.me');
    });
});
```

### 10.3 Targets de Cobertura

> **Umbral mínimo global:** ≥ 85% de cobertura de sentencias, verificado por SonarQube y aplicado como gate en CI a partir de la Fase 5 (ver `VyV_LectorPobre.md` §10.2).

| Capa | Cobertura Mínima | Tipo |
|---|---|---|
| Middleware Go (CORS, rate limit, HMAC) | ≥ 90% | Ramas |
| Handlers Go (validación, lógica de negocio) | ≥ 85% | Ramas |
| Composables Vue (useStock, useRating) | ≥ 70% | Sentencias |
| Componentes Vue (solo renderizado) | ≥ 40% | Sentencias |

---

## 11. Git y Convenciones de Commits

### 11.1 Nomenclatura de Ramas

```
feature/RF-07-comentarios-productos
fix/RNF-04-cors-restringido-produccion
refactor/validacion-groq-parametrizada
test/handler-calificar-edge-cases
docs/actualizar-contrato-api-v1.1
chore/actualizar-dependencias-go
```

### 11.2 Mensajes de Commit — Conventional Commits

```
<tipo>(<scope>): <descripción> [referencia RF/RNF]
```

```
feat(handlers): implementar ComentarHandler con rate limiting [RF-07, RNF-04]
feat(handlers): agregar CalificarHandler con validación de rango 1-5 [RF-06, RNF-04]
fix(security): restringir CORS a dominio de producción [RNF-04]
fix(groq): reemplazar interpolación de strings por params tipados [sección 9.11]
feat(frontend): implementar useStock para consulta de inventario en tiempo real [RF-03, RNF-03]
feat(seo): agregar useSeoMeta por página de detalle de producto [RF-20]
test(handlers): agregar casos de borde para payload vacío y rate limit
refactor(handlers): extraer validarComentario a paquete de validación
docs(guidelines): agregar contrato de API serverless v1.0
chore(deps): actualizar módulos de Go a versiones más recientes
```

**Tipos permitidos:** `feat` · `fix` · `test` · `docs` · `refactor` · `chore` · `perf` · `style`

---

## 12. Directivas para Agentes IA

Reglas explícitas para agentes de codificación IA (Claude, Copilot, Cursor, etc.) que trabajen en esta base de código. Estas reglas son aplicadas en revisión de código y no deben ser eludidas.

### 12.1 Antes de Generar Cualquier Código

1. **Lee el ERS.** Toda función debe trazarse a RF-01–RF-20 o RNF-01–RNF-06. No implementes funcionalidades no solicitadas sin aprobación humana explícita.
2. **Lee la Arquitectura Técnica.** Comprende el patrón Jamstack, los tres planos de confianza (público, dinámico, administrativo) y las responsabilidades de cada capa antes de escribir código.
3. **Confirma la capa objetivo.** La lógica de negocio y validación de seguridad pertenece a los handlers Go. El renderizado y la composición de UI pertenecen a Vue/Nuxt. **Nunca mezcles responsabilidades.**

### 12.2 Reglas Obligatorias para Código Generado

| Regla | Justificación |
|---|---|
| Nuevos handlers Go tienen GoDoc con `Satisfies: RF-XX` | Trazabilidad |
| Nunca interpolar input del usuario en consultas GROQ | Prevención de inyección GROQ (sección 9.11) |
| Nunca exponer `os.Getenv("SANITY_WRITE_TOKEN")` o cualquier secreto en respuestas o logs visibles al cliente | RNF-04, sección 8 |
| CORS siempre restringido al dominio de producción en handlers Go | RNF-04, sección 9.4 |
| Toda operación de escritura en Sanity pasa por un handler Go, nunca directamente desde el frontend | Arquitectura — sección 8 |
| Los mensajes de error al cliente son siempre genéricos; el detalle solo en `log.Printf` | RNF-04, sección 9.9 |
| Los componentes Vue usan `aria-label` o HTML semántico | Accesibilidad, RNF-05 |
| Nunca usar `any` en TypeScript | Seguridad de tipos |
| Consultas GROQ públicas proyectan solo los campos necesarios | Prevención de over-fetching (sección 10.2 de arquitectura) |
| Nunca almacenar datos de petición en variables globales mutables en Go | Seguridad serverless (sección 9.6 de arquitectura) |

### 12.3 Lo Que Nunca Debes Hacer

- **Nunca enviar el `SANITY_WRITE_TOKEN` al cliente** — ni en el bundle de JS, ni en respuestas, ni en comentarios de código.
- **Nunca concatenar input del usuario directamente en una query GROQ** — usa siempre parámetros tipados.
- **Nunca retornar trazas de pila, nombres de variables internas ni versiones de librerías** en respuestas de error al cliente.
- **Nunca configurar CORS con `*`** en los handlers de escritura.
- **Nunca escribir directamente en Sanity desde el frontend Nuxt** — toda escritura pasa por los handlers Go.
- **Nunca almacenar datos sensibles de una petición en variables globales de Go** — cada invocación es un evento aislado.
- **Nunca deshabilitar reglas de linter/vet** sin un comentario explicando la razón y un Issue de GitHub vinculado.

### 12.4 Checklist de Modificación de Archivos

Antes de enviar cualquier cambio, verifica:

- [ ] Todos los tipos/handlers públicos de Go tienen GoDoc completo
- [ ] Todo nuevo código referencia al menos un RF o RNF del ERS
- [ ] No se introdujo `any` en TypeScript
- [ ] No hay consultas GROQ con interpolación de strings de input del usuario
- [ ] No hay secretos hardcodeados ni en el código ni en los tests
- [ ] Los mensajes de error al cliente son genéricos (sin información interna del sistema)
- [ ] CORS restringido al dominio correcto en cualquier handler nuevo
- [ ] Los componentes Vue nuevos incluyen atributos de accesibilidad (`role`, `aria-label`, etc.)
- [ ] Si se agregó un nuevo endpoint: el contrato está documentado tanto en Go como en TypeScript
- [ ] Si se modificó un handler existente: los tests correspondientes fueron actualizados

---

### 13. Entorno Local y Troubleshooting

#### 13.1 Ejecución de pnpm en Windows
Es común que al instalar `pnpm` de forma global en Windows (`npm install -g pnpm`), la ruta al binario se corrompa, provocando el error: *"pnpm no se reconoce como un comando interno o externo"*.
Para solucionar esto permanentemente y evitar depender de configuraciones frágiles de npm, **utiliza el instalador oficial nativo para Windows**:
1. Desinstala la versión corrupta: `npm uninstall -g pnpm`
2. Elimina la carpeta residual: `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\pnpm"`
3. Instala con el script oficial: `iwr https://get.pnpm.io/install.ps1 -useb | iex`
Si en una emergencia no puedes reinstalar, puedes usar `npx pnpm <comando>` para descargar y ejecutar el binario al vuelo de forma segura.

#### 13.2 Error `ERR_PNPM_IGNORED_BUILDS`
Por motivos de seguridad, las versiones modernas de `pnpm` bloquean la ejecución automática de scripts de construcción (postinstall) de dependencias de terceros (como `esbuild` requerido por Vite/Nuxt). 
Si al hacer `npx pnpm install` la instalación falla con `ERR_PNPM_IGNORED_BUILDS`:
1. Ejecuta `npx pnpm approve-builds`
2. En la lista interactiva, presiona la tecla **`<espacio>`** sobre las dependencias bloqueadas (ej. `esbuild`) para cambiar su estado a `true`.
3. Presiona **`<enter>`** para confirmar.
4. Vuelve a ejecutar `npx pnpm install`.

---

*Última actualización: Septiembre 2026 · Aplica a LectorPobre ERS v1.0*
*Este documento debe revisarse y actualizarse con cada revisión del ERS o actualización mayor de dependencias.*
