# Plan de Verificación y Validación (V&V) — LectorPobre

> **Versión:** 1.0
> **Basado en:** `ERS_LectorPobre.md` (v1.0) · `Arquitectura_Tecnica_Detallada_LectorPobre.md` (v2.0) · `Stack_Tecnologico_LectorPobre.md` (v1.0)
> **Estándar de referencia:** IEEE 829 (Documentación de testing) · ISO/IEC 25010 (Calidad de software)
> **Stack bajo prueba:** Nuxt.js 3 · Vue 3 · Tailwind CSS · Go 1.22+ · Sanity.io · Vercel

---

## Tabla de Contenido

1. [Introducción y Alcance](#1-introducción-y-alcance)
2. [Estrategia General de Testing](#2-estrategia-general-de-testing)
3. [Pruebas Unitarias](#3-pruebas-unitarias)
4. [Pruebas de Integración](#4-pruebas-de-integración)
5. [Pruebas de Sistema](#5-pruebas-de-sistema)
6. [Pruebas de Aceptación](#6-pruebas-de-aceptación)
7. [Pruebas No Funcionales](#7-pruebas-no-funcionales)
8. [Pruebas de Seguridad](#8-pruebas-de-seguridad)
9. [Entornos y Herramientas](#9-entornos-y-herramientas)
10. [Criterios de Entrada y Salida](#10-criterios-de-entrada-y-salida)
11. [Matriz de Trazabilidad RF/RNF → Pruebas](#11-matriz-de-trazabilidad-rfrnf--pruebas)

---

## 1. Introducción y Alcance

### 1.1 Propósito

Este documento define el **Plan de Verificación y Validación (V&V)** de la plataforma web LectorPobre. Su propósito es establecer qué se prueba, cómo se prueba, con qué herramientas y cuáles son los criterios de éxito para cada nivel de prueba.

- **Verificación:** ¿Estamos construyendo el sistema correctamente? (el código cumple los estándares definidos en `DEVELOPMENT_GUIDELINES.md`)
- **Validación:** ¿Estamos construyendo el sistema correcto? (el sistema satisface los requisitos del `ERS_LectorPobre.md`)

### 1.2 Alcance

El plan cubre las cuatro capas del sistema:

| Capa | Tecnología | Niveles de prueba aplicables |
|---|---|---|
| Frontend (UI) | Nuxt.js 3, Vue 3, Tailwind CSS | Unitaria, Sistema, Aceptación |
| Backend Serverless | Go 1.22+ (Vercel Functions) | Unitaria, Integración, Sistema |
| CMS / Datos | Sanity.io (GROQ, webhooks) | Integración, Sistema |
| Infraestructura | Vercel (CDN, CI/CD, env vars) | Sistema, Aceptación |

### 1.3 Fuera de Alcance

- Pruebas de rendimiento de la infraestructura de Sanity.io (responsabilidad del proveedor).
- Pruebas de carga masiva de la CDN de Vercel (responsabilidad del proveedor).
- Pruebas de compatibilidad con navegadores obsoletos (IE11, Chrome < 90).

---

## 2. Estrategia General de Testing

### 2.1 Pirámide de Testing

```
          ┌─────────────────────────────┐
          │   Pruebas de Aceptación     │  ← Menos, más lentas, más valor de negocio
          │  (E2E con Playwright, UAT)  │
          ├─────────────────────────────┤
          │    Pruebas de Sistema       │
          │  (flujos completos E2E,     │
          │   seguridad, rendimiento)   │
          ├─────────────────────────────┤
          │   Pruebas de Integración    │
          │ (handlers Go ↔ Sanity,      │
          │  frontend ↔ API serverless) │
          ├─────────────────────────────┤
          │     Pruebas Unitarias       │  ← Más, más rápidas, más granulares
          │  (handlers Go, composables  │
          │   Vue, utilidades)          │
          └─────────────────────────────┘
```

### 2.2 Principios de Testing

1. **Independencia:** cada prueba es autónoma; no depende del estado dejado por otra prueba.
2. **Determinismo:** el mismo test siempre produce el mismo resultado en el mismo entorno.
3. **Trazabilidad:** cada prueba referencia al menos un RF o RNF del ERS.
4. **Automatización prioritaria:** toda prueba automatizable debe estarlo; las manuales son la excepción, no la regla.
5. **Fallar rápido:** los tests unitarios corren en segundos; los de integración en minutos.

### 2.3 Nomenclatura de Tests

```
# Go — patrón: NombreFunción_Escenario_ResultadoEsperado
func TestComentarHandler_PayloadValido_Retorna201(t *testing.T)
func TestComentarHandler_TextoVacio_Retorna400(t *testing.T)
func TestValidarComentario_TextoExcedeLimite_RetornaError(t *testing.T)

# TypeScript/Vue — patrón: describe + it con lenguaje de usuario
describe('useStock', () => {
    it('retorna el stock actual cuando el producto existe en Sanity')
    it('retorna -1 cuando la consulta falla')
})
```

---

## 3. Pruebas Unitarias

Las pruebas unitarias verifican componentes individuales de forma aislada, usando mocks para dependencias externas.

**Herramientas:** Go `testing` + `testify` (backend) · Vitest + `@vue/test-utils` (frontend)  
**Cobertura objetivo:** ver Sección 10 (`Criterios de Salida`)  
**Entorno:** local y CI/CD (GitHub Actions / Vercel CI)

---

### 3.1 Módulo: Validación de Entradas (Go)

Archivo objetivo: `api/handlers/validacion.go`

| ID | Nombre del test | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| UT-GO-01 | `TestValidarComentario_TextoValido_RetornaNil` | Texto de 50 chars, productoId válido | `nil` (sin error) | RF-07 |
| UT-GO-02 | `TestValidarComentario_TextoVacio_RetornaError` | Texto vacío `""` | Error "texto no puede estar vacío" | RF-07 |
| UT-GO-03 | `TestValidarComentario_TextoExcede1000Chars_RetornaError` | String de 1001 caracteres | Error de longitud máxima | RF-07, RNF-04 |
| UT-GO-04 | `TestValidarComentario_ProductoIDVacio_RetornaError` | `productoId: ""` | Error "productoId requerido" | RF-07 |
| UT-GO-05 | `TestValidarCalificacion_Valor3_RetornaNil` | valor = 3 | `nil` | RF-06 |
| UT-GO-06 | `TestValidarCalificacion_Valor0_RetornaError` | valor = 0 (fuera del rango 1-5) | Error de rango | RF-06 |
| UT-GO-07 | `TestValidarCalificacion_Valor6_RetornaError` | valor = 6 (fuera del rango 1-5) | Error de rango | RF-06 |
| UT-GO-08 | `TestValidarBusqueda_QueryValida_RetornaNil` | query = "libro" | `nil` | RF-18 |
| UT-GO-09 | `TestValidarBusqueda_QueryVacia_RetornaError` | query = `""` | Error de query vacía | RF-18 |
| UT-GO-10 | `TestValidarBusqueda_QueryConInyeccionGROQ_RetornaError` | query = `*[tipo=="prod"]` | Error de sanitización | RF-18, RNF-04 |

```go
// Ejemplo de implementación (api/handlers/validacion_test.go)
func TestValidarComentario_TextoExcede1000Chars_RetornaError(t *testing.T) {
    payload := ComentarioPayload{
        ProductoID: "abc123",
        Texto:      strings.Repeat("a", 1001),
    }

    err := validarComentario(payload)

    assert.Error(t, err)
    assert.Contains(t, err.Error(), "máximo")
}
```

---

### 3.2 Módulo: Handlers HTTP (Go)

Archivo objetivo: `api/comentar.go`, `api/calificar.go`, `api/buscar.go`

Se usa `httptest` de la stdlib para simular peticiones HTTP sin levantar un servidor real.

| ID | Nombre del test | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| UT-GO-11 | `TestComentarHandler_PayloadJSON_Retorna201` | POST válido con JSON correcto | HTTP 201, `{"ok": true}` | RF-07 |
| UT-GO-12 | `TestComentarHandler_PayloadMalformado_Retorna400` | JSON malformado | HTTP 400, error genérico | RF-07, RNF-04 |
| UT-GO-13 | `TestComentarHandler_MetodoGET_Retorna405` | GET en lugar de POST | HTTP 405 | RF-07 |
| UT-GO-14 | `TestComentarHandler_SinContentType_Retorna400` | Sin header `Content-Type: application/json` | HTTP 400 | RF-07 |
| UT-GO-15 | `TestCalificarHandler_Valor5_Retorna201` | Calificación 5 estrellas | HTTP 201, `{"ok": true}` | RF-06 |
| UT-GO-16 | `TestCalificarHandler_ValorFueraRango_Retorna400` | valor = 7 | HTTP 400 | RF-06 |
| UT-GO-17 | `TestBuscarHandler_QueryValida_Retorna200` | GET con `?q=libro` | HTTP 200 | RF-18 |
| UT-GO-18 | `TestRespuestaError_NuncaExponeTrazas` | Cualquier error interno | El body de respuesta NO contiene "goroutine", "panic", rutas de archivos Go | RNF-04 |

---

### 3.3 Módulo: Middleware (Go)

Archivos: `api/middleware/cors.go`, `api/middleware/ratelimit.go`, `api/middleware/hmac.go`

| ID | Nombre del test | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| UT-GO-19 | `TestCORS_OrigenPermitido_AgregaHeader` | Origin: `https://lectorpobre.com` | Header `Access-Control-Allow-Origin` presente | RNF-04 |
| UT-GO-20 | `TestCORS_OrigenNoPermitido_Retorna403` | Origin: `https://otro-sitio.com` | HTTP 403, sin headers CORS | RNF-04 |
| UT-GO-21 | `TestCORS_SinOrigin_ProcesaNormalmente` | Request sin header Origin (ej. curl directo) | Procesa sin header CORS | RNF-04 |
| UT-GO-22 | `TestRateLimit_BajoLimite_Permite` | 5 peticiones seguidas (límite = 10/min) | Todas procesadas correctamente | RNF-04 |
| UT-GO-23 | `TestRateLimit_SuperaLimite_Retorna429` | 11 peticiones en 1 minuto (límite = 10) | La petición 11 retorna HTTP 429 | RNF-04 |
| UT-GO-24 | `TestHMAC_FirmaCorrecta_RetornaTrue` | Payload + secreto correcto | `true` | Arquitectura §9.10 |
| UT-GO-25 | `TestHMAC_FirmaIncorrecta_RetornaFalse` | Payload con secreto incorrecto | `false` | Arquitectura §9.10 |
| UT-GO-26 | `TestHMAC_FirmaVacia_RetornaFalse` | Firma vacía `""` | `false` | Arquitectura §9.10 |

---

### 3.4 Módulo: Composables Vue (Frontend)

Herramienta: Vitest + `@vue/test-utils` + mock de `$fetch`

#### 3.4.1 `useStock.ts`

| ID | Nombre del test | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| UT-VUE-01 | `useStock retorna stock numérico cuando Sanity responde` | Mock de Sanity retorna `{ stock: 5 }` | `stock.value === 5` | RF-03, RNF-03 |
| UT-VUE-02 | `useStock retorna null inicialmente mientras carga` | Estado inicial antes de la consulta | `stock.value === null` y `cargando.value === true` | RF-03 |
| UT-VUE-03 | `useStock retorna -1 cuando la consulta falla` | Mock de Sanity lanza error de red | `stock.value === -1` | RF-03, RNF-03 |
| UT-VUE-04 | `useStock no expone token privado en la petición` | Inspección del request mockeado | El request no contiene header `Authorization` con token de escritura | RNF-04 |
| UT-VUE-04a | `useStock marca stock bajo con 5 unidades (BVA — umbral exacto)` | `stock = 5` (umbral definido en `implementationPlan.md` §5) | `stockBajo.value === true` | RF-03, RF-14 |
| UT-VUE-04b | `useStock no marca stock bajo con 6 unidades (BVA — umbral + 1)` | `stock = 6` | `stockBajo.value === false` | RF-03, RF-14 |
| UT-VUE-04c | `useStock marca stock bajo con 4 unidades (BVA — umbral - 1)` | `stock = 4` | `stockBajo.value === true` | RF-03, RF-14 |

#### 3.4.2 `useComentario.ts`

| ID | Nombre del test | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| UT-VUE-05 | `enviar comentario válido retorna ok: true` | Mock de `/api/comentar` retorna 201 | `resultado.ok === true` | RF-07 |
| UT-VUE-06 | `enviar comentario con texto vacío retorna error` | Validación client-side | Error antes de llamar a la API | RF-07 |
| UT-VUE-07 | `enviar comentario maneja error de red` | Mock de fetch lanza error | `resultado.ok === false`, error visible en UI | RF-07 |

#### 3.4.3 `useCalificacion.ts`

| ID | Nombre del test | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| UT-VUE-08 | `calificar con valor 4 retorna ok: true` | Mock de `/api/calificar` retorna 201 | `resultado.ok === true` | RF-06 |
| UT-VUE-09 | `calificar con valor 0 retorna error de validación` | Valor fuera de rango | Error antes de llamar a la API | RF-06 |

---

### 3.5 Módulo: Componentes Vue (Frontend)

| ID | Nombre del test | Componente | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|---|
| UT-VUE-10 | `TarjetaProducto renderiza nombre e imagen` | `TarjetaProducto.vue` | Props con nombre e imagenUrl | Texto y `src` correctos en el DOM | RF-01, RF-02 |
| UT-VUE-11 | `TarjetaProducto incluye enlace WhatsApp con wa.me` | `TarjetaProducto.vue` | Producto con número configurado | `href` contiene `wa.me` | RF-17 |
| UT-VUE-12 | `SistemaEstrellas emite calificación al hacer click` | `SistemaEstrellas.vue` | Click en estrella 3 | Evento `calificar` emitido con valor 3 | RF-06 |
| UT-VUE-13 | `SistemaEstrellas tiene atributos ARIA correctos` | `SistemaEstrellas.vue` | Render inicial | `role="radiogroup"` y `aria-label` presentes | RNF-05 |
| UT-VUE-14 | `IndicadorStock muestra "Disponible" con stock > 0` | `IndicadorStock.vue` | `stock=5` | Texto "Disponible" visible | RF-03 |
| UT-VUE-15 | `IndicadorStock muestra "Agotado" con stock = 0` | `IndicadorStock.vue` | `stock=0` | Texto "Agotado" visible | RF-03 |
| UT-VUE-16 | `BotonWhatsApp tiene rel="noopener noreferrer"` | `BotonWhatsApp.vue` | Render básico | Atributo `rel` correcto para seguridad | RF-17 |
| UT-VUE-17 | `FormularioComentario valida longitud máxima client-side` | `FormularioComentario.vue` | Texto de 1001 caracteres | Mensaje de error visible, botón deshabilitado | RF-07 |

---

### 3.6 Módulo: Utilidades TypeScript

| ID | Nombre del test | Función | Escenario | Resultado esperado | RF/RNF |
|---|---|---|---|---|---|
| UT-TS-01 | `construirUrlWhatsApp genera URL correcta` | `construirUrlWhatsApp()` | Producto con nombre y número | URL `wa.me/NUMERO?text=...nombre...` | RF-17 |
| UT-TS-02 | `construirUrlWhatsApp encoda caracteres especiales` | `construirUrlWhatsApp()` | Nombre con espacios y acentos | URL correctamente encodeada | RF-17 |
| UT-TS-03 | `ErrorCode espeja los códigos del backend Go` | Objeto `ErrorCode` en `types/api.ts` | Comparación con `errorcodes.go` | Todos los códigos coinciden | DEVELOPMENT_GUIDELINES |

---

## 4. Pruebas de Integración

Las pruebas de integración verifican la interacción entre dos o más módulos reales. Se usan dobles de prueba solo para dependencias externas de alto costo (Sanity producción).

**Herramientas:** Go `testing` + servidor HTTP real en puerto aleatorio · Vitest con `msw` (Mock Service Worker) para el frontend  
**Entorno:** local (con acceso a Sanity dataset de staging) y CI/CD con dataset de pruebas

---

### 4.1 Integración: Handlers Go ↔ Sanity.io (Staging)

> Se usa un **dataset de staging** de Sanity.io para estas pruebas. **Nunca el dataset de producción.**

| ID | Nombre del test | Flujo | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| IT-01 | `POST /api/comentar crea documento en Sanity staging` | Handler Go recibe payload válido → escribe en dataset staging → verifica documento creado | Documento `comentario` existe en Sanity con los datos correctos | RF-07 |
| IT-02 | `POST /api/calificar actualiza calificación en Sanity staging` | Handler Go → escribe `calificacion` en Sanity | Documento `calificacion` persiste con valor correcto | RF-06 |
| IT-03 | `POST /api/comentar firma petición con token correcto` | Interceptar petición HTTP de Go hacia Sanity | Header `Authorization: Bearer <token>` presente y token es el de escritura privado, NO uno público | RNF-04 |
| IT-04 | `POST /api/comentar con token inválido retorna 401 de Sanity` | Token de Sanity incorrecto configurado en env vars | El handler retorna HTTP 500 con error genérico (no expone el 401 de Sanity crudo) | RNF-04 |
| IT-05 | `GET /api/buscar retorna resultados de Sanity` | Query válida → GROQ parametrizado → resultados | Resultados en formato esperado, sin campos sensibles | RF-18, Arquitectura §10.2 |
| IT-06 | `GET /api/buscar con query parametrizada no es susceptible a inyección GROQ` | Query con metacaracteres GROQ: `*[_type=="categoria"]` | El resultado es la búsqueda literal del texto, no la ejecución de la consulta modificada | RNF-04, Arquitectura §9.11 |

---

### 4.2 Integración: Frontend ↔ Handlers Go (Mock Service Worker)

Se usa `msw` para interceptar las peticiones del frontend a `/api/*` sin levantar los handlers Go reales.

| ID | Nombre del test | Flujo | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| IT-07 | `Página de detalle de producto carga stock desde Sanity` | `useStock` hace fetch a API pública Sanity → stock mostrado en `IndicadorStock` | El valor de stock en el DOM coincide con el mockeado | RF-03, RNF-03 |
| IT-08 | `FormularioComentario envía POST a /api/comentar` | Usuario escribe y envía → `useComentario` hace fetch → msw responde 201 | UI muestra confirmación de éxito | RF-07 |
| IT-09 | `FormularioComentario muestra error cuando /api/comentar retorna 429` | msw responde 429 (rate limit) | UI muestra mensaje de error amigable (no "429") | RF-07, RNF-04 |
| IT-10 | `SistemaEstrellas envía POST a /api/calificar con valor correcto` | Click en estrella 4 → fetch → msw responde 201 | Calificación persiste en UI, valor = 4 | RF-06 |
| IT-11 | `Búsqueda client-side filtra productos correctamente` | Usuario escribe "libro" en campo de búsqueda | Solo productos con "libro" en nombre/descripción visibles | RF-18 |

---

### 4.3 Integración: Webhook Sanity → Vercel Rebuild

| ID | Nombre del test | Flujo | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| IT-12 | `POST /api/webhook/rebuild con firma HMAC válida retorna 200` | Request simulado con firma HMAC correcta | HTTP 200, rebuild disparado (mockeado) | Arquitectura §9.10 |
| IT-13 | `POST /api/webhook/rebuild con firma HMAC inválida retorna 401` | Request con firma incorrecta | HTTP 401, rebuild NO disparado | Arquitectura §9.10 |
| IT-14 | `POST /api/webhook/rebuild sin firma retorna 401` | Request sin header de firma | HTTP 401 | Arquitectura §9.10 |

---

### 4.4 Integración: Build Nuxt.js ↔ Sanity.io (Staging)

| ID | Nombre del test | Flujo | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| IT-15 | `nuxt generate produce HTML con datos de Sanity staging` | `npm run generate` con `SANITY_PROJECT_ID` de staging | Los archivos estáticos en `dist/` contienen datos del catálogo de staging | RF-01, RF-02, RF-04 |
| IT-16 | `Páginas de producto tienen metadatos OG generados` | Inspección del HTML generado para una página de producto | Tags `<meta property="og:title">`, `og:image`, `og:description` presentes | RF-20 |
| IT-17 | `Nuxt genera rutas dinámicas por slug de producto` | Catálogo con 3 productos en staging | 3 archivos HTML estáticos en `dist/producto/` | RF-02 |

---

## 5. Pruebas de Sistema

Las pruebas de sistema validan el comportamiento del sistema completo desplegado en un entorno equivalente a producción (Vercel Preview con dataset de staging).

**Herramienta principal:** Playwright (E2E automatizado)  
**Entorno:** Vercel Preview con dataset de staging de Sanity.io  
**Ejecución:** después de cada despliegue de Preview en CI/CD

---

### 5.1 Flujo: Catálogo y Navegación (RF-01, RF-02, RF-04, RF-19)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-01 | Página principal carga el catálogo | 1. Navegar a la URL de Preview. 2. Esperar carga. | Tarjetas de producto visibles con nombre e imagen. Tiempo de carga < 3s (LCP). | RF-01, RNF-02 |
| ST-02 | Filtrado por categoría funciona | 1. Click en categoría "Libros". | Solo productos de la categoría "Libros" visibles. | RF-04 |
| ST-03 | Página de detalle de producto carga | 1. Click en un producto. 2. Esperar carga. | URL cambia a `/producto/[slug]`. Nombre, descripción e imagen del producto visibles. | RF-02 |
| ST-04 | Paginación / carga diferida se activa con muchos productos | Staging con N+1 productos (N = umbral configurado). | Botón "cargar más" o paginación visible y funcional. | RF-19 |
| ST-05 | Búsqueda por palabra clave filtra productos | 1. Escribir "test" en campo de búsqueda. | Solo productos con "test" en nombre/descripción visibles. | RF-18 |

---

### 5.2 Flujo: Stock en Tiempo Real (RF-03, RNF-03)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-06 | Stock en tiempo real se muestra en página de detalle | 1. Navegar a página de producto. 2. Esperar consulta a Sanity. | `IndicadorStock` muestra un valor numérico (no el del build). | RF-03, RNF-03 |
| ST-07 | Cambio de stock en Sanity se refleja sin rebuild | 1. Modificar stock en Sanity Studio. 2. Recargar página de detalle (sin rebuild). | El nuevo valor de stock se muestra correctamente. | RF-03, RNF-03 |
| ST-08 | Falla de Sanity en stock muestra estado degradado graciosamente | 1. Simular fallo de red en DevTools. 2. Cargar página de detalle. | UI muestra "Stock no disponible" o similar (no error de JavaScript en consola). | RF-03 |

---

### 5.3 Flujo: Comentarios y Calificaciones (RF-06, RF-07)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-09 | Publicar comentario válido | 1. Navegar a detalle de producto. 2. Escribir comentario de 50 chars. 3. Enviar. | Confirmación de éxito visible. Comentario pendiente en Sanity (estado de moderación). | RF-07 |
| ST-10 | Publicar comentario vacío muestra error client-side | 1. Click en "Enviar comentario" con campo vacío. | Mensaje de error visible sin hacer petición al servidor. | RF-07 |
| ST-11 | Calificar producto con 4 estrellas | 1. Click en estrella 4 en página de detalle. | Confirmación de éxito. Calificación registrada en Sanity staging. | RF-06 |
| ST-12 | Rate limiting rechaza peticiones excesivas | 1. Enviar 11 comentarios en 1 minuto desde la misma IP. | A partir del límite, se muestra mensaje de "demasiadas solicitudes". | RNF-04, Arquitectura §9.5 |
| ST-13 | XSS almacenado es prevenido | 1. Enviar comentario con payload `<script>alert(1)</script>`. | El texto se renderiza como texto plano, no se ejecuta JavaScript. | Arquitectura §10.1 |

---

### 5.4 Flujo: Enlace WhatsApp (RF-17)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-14 | Botón WhatsApp tiene URL correcta | 1. Navegar a detalle de producto. 2. Inspeccionar href del botón. | URL contiene `wa.me/` con el número configurado y el nombre del producto en el mensaje. | RF-17 |
| ST-15 | Botón WhatsApp abre en nueva pestaña | 1. Click en botón WhatsApp (con Playwright interceptando). | Se abre nueva pestaña (atributo `target="_blank"`). | RF-17 |

---

### 5.5 Flujo: Redes Sociales (RF-05)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-16 | Iconos de redes sociales visibles en todas las páginas | 1. Navegar a inicio. 2. Navegar a detalle. | Iconos de redes sociales visibles en header o footer en ambas páginas. | RF-05 |
| ST-17 | Cada icono social abre en nueva pestaña | 1. Inspeccionar `href` y `target` de cada icono. | `target="_blank"` y `rel="noopener noreferrer"` presentes. | RF-05 |

---

### 5.6 Flujo: Panel de Administración (RF-08, RF-09, RF-10)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-18 | Acceso al panel sin sesión redirige al login | 1. Navegar a `/admin` sin estar autenticado. | Redirección a `/admin/login`. | RF-10 |
| ST-19 | Login con credenciales correctas da acceso | 1. Ingresar credenciales válidas en `/admin/login`. 2. Submit. | Redirección al panel de administración, sesión activa. | RF-08 |
| ST-20 | Login con credenciales incorrectas muestra error genérico | 1. Ingresar usuario/contraseña erróneos. | Mensaje de error genérico (no indica si el usuario existe o no). | RF-08, RNF-04 |
| ST-21 | Logout invalida la sesión | 1. Iniciar sesión. 2. Click en "Cerrar sesión". 3. Navegar a `/admin`. | Redirección a login, sesión invalidada. | RF-09 |

---

### 5.7 Flujo: SEO y Metadatos (RF-20)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-22 | Página de inicio tiene `<title>` y `<meta description>` | 1. Inspeccionar `<head>` de la página principal. | `<title>` y `<meta name="description">` presentes y descriptivos. | RF-20 |
| ST-23 | Página de producto tiene Open Graph tags correctos | 1. Inspeccionar `<head>` de `/producto/[slug]`. | `og:title`, `og:image`, `og:description` con datos específicos del producto. | RF-20 |
| ST-24 | Lighthouse SEO score ≥ 90 en página principal | 1. Ejecutar Lighthouse CI en URL de Preview. | Score SEO ≥ 90. | RF-20, RNF-02 |

---

### 5.8 Flujo: Sin Autenticación para Usuarios Generales (RNF-01)

| ID | Caso de prueba | Pasos | Resultado esperado | RF/RNF |
|---|---|---|---|---|
| ST-25 | Catálogo accessible sin login | 1. Navegar al sitio en modo incógnito. 2. Navegar por el catálogo, buscar, ver detalle. | Toda la navegación funciona sin solicitar autenticación. | RNF-01 |
| ST-26 | Funciones de comentarios y calificación sin login | 1. Intentar comentar y calificar sin sesión. | Comentarios y calificaciones son posibles sin login (son funciones públicas). | RNF-01, RF-06, RF-07 |

---

## 6. Pruebas de Aceptación

Las pruebas de aceptación validan que el sistema cumple con los criterios de aceptación definidos en el ERS desde la perspectiva del **usuario final** (Usuario General y Administrador). Se realizan sobre el entorno de producción o un entorno de staging idéntico.

**Ejecutor:** equipo de QA + representante del cliente (dueño de LectorPobre)  
**Entorno:** Vercel Preview de staging con datos representativos del catálogo real  
**Formato:** listas de verificación manuales + automatización con Playwright donde sea posible

---

### 6.1 Criterios de Aceptación por Módulo

#### 6.1.1 Catálogo Público (RF-01 a RF-04, RF-18 a RF-20)

| ID | Criterio de aceptación | Verificación | ¿Automatizable? |
|---|---|---|---|
| UAT-01 | Al acceder al sitio, se listan todos los productos activos. Cada tarjeta muestra imagen, nombre y estado de disponibilidad. | Visual + Playwright `expect(locator).toBeVisible()` | ✅ |
| UAT-02 | Al seleccionar un producto, se navega a una vista de detalle con descripción, imágenes y atributos. La URL es única y compartible. | Visual + verificar URL | ✅ |
| UAT-03 | El stock mostrado en la ficha de detalle refleja el valor actual en la base de datos (no el valor del último build). Se valida cambiando el stock en Sanity Studio y recargando sin rebuild. | Manual con cronómetro (< 2s de latencia) | Parcial |
| UAT-04 | El catálogo puede filtrarse por categoría. Las categorías son administrables desde Sanity Studio. | Manual + visual | ✅ |
| UAT-05 | El campo de búsqueda filtra productos por nombre y descripción en tiempo real. | Visual + Playwright | ✅ |
| UAT-06 | Con más de N productos, se activa paginación o carga diferida. El rendimiento no se degrada perceptiblemente. | Manual + Lighthouse | Parcial |
| UAT-07 | Al compartir la URL de un producto en WhatsApp, redes sociales o mensajería, se muestra una vista previa con imagen, título y descripción correctos. | Manual (compartir en WhatsApp de prueba) | ❌ |

#### 6.1.2 Interacción Social (RF-06, RF-07)

| ID | Criterio de aceptación | Verificación | ¿Automatizable? |
|---|---|---|---|
| UAT-08 | El usuario puede seleccionar de 1 a 5 estrellas. La calificación actualiza el promedio visible. Se aplican medidas anti-abuso (rate limiting visible tras múltiples intentos). | Manual + visual | Parcial |
| UAT-09 | El usuario puede escribir y enviar un comentario. El comentario pasa por validación de entrada. Si hay moderación previa, el comentario no es visible hasta ser aprobado. | Manual | ❌ (depende de decisión de negocio UAT-09 abierto) |

#### 6.1.3 Conversión a Venta (RF-17)

| ID | Criterio de aceptación | Verificación | ¿Automatizable? |
|---|---|---|---|
| UAT-10 | Existe un botón "Comprar por WhatsApp" en la ficha de producto. El enlace abre WhatsApp con un mensaje prellenado que referencia el producto. | Manual con dispositivo real | ❌ |

#### 6.1.4 Panel de Administración (RF-08 a RF-16)

| ID | Criterio de aceptación | Verificación | ¿Automatizable? |
|---|---|---|---|
| UAT-11 | El administrador puede iniciar y cerrar sesión correctamente. Credenciales inválidas muestran error genérico. | Manual | ✅ (login/logout) |
| UAT-12 | El administrador puede modificar nombre, descripción e imagen de un producto. Los cambios se reflejan en el sitio tras el rebuild automático (< 5 minutos después del webhook). | Manual con cronómetro | Parcial |
| UAT-13 | El administrador puede crear y eliminar productos. El catálogo se actualiza tras el rebuild. | Manual | Parcial |
| UAT-14 | El administrador puede visualizar el stock de todos los productos en el panel. Puede identificar productos con stock bajo o agotado. | Manual + visual | ✅ |
| UAT-15 | El administrador puede cambiar la paleta de colores del sitio desde el panel. El cambio se refleja tras rebuild. | Manual (si RF-15 está implementado) | Parcial |

#### 6.1.5 Redes Sociales (RF-05)

| ID | Criterio de aceptación | Verificación | ¿Automatizable? |
|---|---|---|---|
| UAT-16 | Los iconos de redes sociales son visibles de forma consistente. Cada icono enlaza correctamente a la red social y se abre en nueva pestaña. | Manual + visual | ✅ |

---

## 7. Pruebas No Funcionales

### 7.1 Rendimiento (RNF-02)

**Herramienta:** Google Lighthouse CI + Vercel Analytics + PageSpeed Insights  
**Frecuencia:** en cada despliegue a Preview y a producción

| ID | Métrica | Umbral | Herramienta |
|---|---|---|---|
| NF-01 | LCP (Largest Contentful Paint) | ≤ 2.5 s | Lighthouse |
| NF-02 | CLS (Cumulative Layout Shift) | ≤ 0.1 | Lighthouse |
| NF-03 | INP (Interaction to Next Paint) | ≤ 200 ms | Lighthouse |
| NF-04 | Performance Score Lighthouse | ≥ 90 en móvil | Lighthouse |
| NF-05 | Peso total de CSS (Tailwind purgeado) | ≤ 30 KB comprimido | Build output |
| NF-06 | Las animaciones CSS no degradan FPS perceptiblemente | Sin jank visual | Manual + DevTools |

### 7.2 Responsividad Móvil (RNF-05)

| ID | Caso de prueba | Viewports | Resultado esperado |
|---|---|---|---|
| NF-07 | Catálogo funcional en móvil | 320px, 375px, 414px | Tarjetas de producto apiladas, texto legible, botones clickeables con pulgar |
| NF-08 | Página de detalle legible en móvil | 375px | Imagen, descripción, stock y botón WhatsApp visibles sin scroll horizontal |
| NF-09 | Búsqueda funcional en móvil | 375px | Campo de búsqueda y resultados accesibles en móvil |
| NF-10 | Panel de administración funcional en tablet | 768px | Formularios y tablas utilizables en tablet |

**Herramienta:** Playwright con `page.setViewportSize()` + inspección manual en dispositivos físicos.

### 7.3 Accesibilidad (RNF-05 implícito, buenas prácticas)

| ID | Caso de prueba | Herramienta | Umbral |
|---|---|---|---|
| NF-11 | Lighthouse Accessibility score | Lighthouse CI | ≥ 90 |
| NF-12 | Contraste de color texto/fondo | axe-core | 4.5:1 mínimo (WCAG AA) |
| NF-13 | Navegación por teclado en catálogo y formularios | Manual + Playwright | Todos los elementos interactivos alcanzables con Tab |
| NF-14 | Atributos ARIA en componentes interactivos | axe-core en CI | 0 violaciones críticas |

### 7.4 Observabilidad (RNF-06)

| ID | Caso de prueba | Resultado esperado |
|---|---|---|
| NF-15 | El script de analítica registra visita a la página principal | Evento de visita visible en el dashboard del servicio de analítica |
| NF-16 | El script de analítica registra click en botón WhatsApp | Evento de conversión visible en analítica |
| NF-17 | Los logs de las funciones Go son visibles en el panel de Vercel | Logs estructurados sin datos sensibles |

---

## 8. Pruebas de Seguridad

Las pruebas de seguridad verifican directamente los controles definidos en la arquitectura (secciones 8, 9 y 10).

| ID | Caso de prueba | Método | Resultado esperado | Referencia arquitectura |
|---|---|---|---|---|
| SEC-01 | El bundle de JavaScript del frontend NO contiene el `SANITY_WRITE_TOKEN` | Búsqueda en `dist/**/*.js` por el valor del token | Sin resultados | §8, RNF-04 |
| SEC-02 | CORS rechaza orígenes no permitidos | `curl -H "Origin: https://atacante.com" -X POST https://lectorpobre.com/api/comentar` | HTTP 403 o ausencia de headers `Access-Control-Allow-Origin` | §9.4, §10.4 |
| SEC-03 | Inyección GROQ en endpoint de búsqueda es rechazada | `GET /api/buscar?q=*[_type=="categoria"]` | El resultado trata la query como texto plano, no la ejecuta | §9.11 |
| SEC-04 | XSS almacenado en comentarios es prevenido | Enviar comentario con `<script>alert('xss')</script>` → verificar renderizado | El texto se escapa correctamente en el DOM | §10.1 |
| SEC-05 | Headers de seguridad HTTP están configurados | `curl -I https://lectorpobre.com` | Presencia de: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Strict-Transport-Security` | §10.3 |
| SEC-06 | Variables de entorno de Preview son distintas de las de producción | Inspección del panel de Vercel | Tokens distintos en cada ambiente | §9.4, Arquitectura §4.4 |
| SEC-07 | Webhook de rebuild con firma inválida retorna 401 | `POST /api/webhook/rebuild` con firma HMAC incorrecta | HTTP 401, rebuild no disparado | §9.10 |
| SEC-08 | Consultas GROQ públicas no exponen campos sensibles | Inspeccionar respuesta de API pública de Sanity | No incluye campos de auditoría, notas administrativas ni precios de costo | §10.2 |
| SEC-09 | Despliegues de Preview de Vercel están protegidos | Intentar acceder a URL de Preview sin contraseña | Solicitud de contraseña o acceso denegado | §10.8 |
| SEC-10 | Rate limiting activo en endpoints de escritura | Enviar 11 peticiones POST en 1 minuto a `/api/comentar` | La petición 11 retorna HTTP 429 | §9.5 |
| SEC-11 | El repositorio no contiene secrets en el historial de Git | `git log -p | grep -i "SANITY_WRITE_TOKEN\|token\|secret"` | Sin resultados con valores reales | §10.8 |

---

## 9. Entornos y Herramientas

### 9.1 Entornos de Prueba

| Entorno | Propósito | Sanity Dataset | URL |
|---|---|---|---|
| **Local (dev)** | Pruebas unitarias y desarrollo | `staging` | `localhost:3000` |
| **Vercel Preview** | Pruebas de integración, sistema y seguridad | `staging` | URL generada por Vercel |
| **Vercel Production** | Pruebas de aceptación finales, smoke tests post-deploy | `production` | `https://lectorpobre.com` |

> **Regla crítica:** Los tests de integración y sistema NUNCA se ejecutan contra el dataset de producción. Solo los smoke tests de aceptación post-deploy son la excepción, y deben ser de solo lectura.

### 9.2 Herramientas por Nivel

| Nivel | Herramienta | Lenguaje / Entorno |
|---|---|---|
| Pruebas unitarias Go | `testing` (stdlib) + `testify/assert` | Go |
| Pruebas unitarias Vue | `Vitest` + `@vue/test-utils` | TypeScript |
| Pruebas de integración frontend | `msw` (Mock Service Worker) | TypeScript |
| Pruebas E2E / Sistema | `Playwright` | TypeScript |
| Cobertura Go | `go test -cover` + reportes HTML | Go |
| Cobertura TypeScript | `Vitest --coverage` (Istanbul/c8) | TypeScript |
| Gestión de calidad y cobertura | SonarQube | Multiplataforma (Go + TypeScript) |
| Análisis de accesibilidad | `axe-core` (integrado en Playwright) | TypeScript |
| Rendimiento | Lighthouse CI (`lhci`) | Node.js / CI |
| Análisis de seguridad de deps | `govulncheck` (Go) + `pnpm audit` | Go / Node.js |

### 9.3 Integración Continua

```yaml
# Ejemplo de pipeline de pruebas en GitHub Actions (ver .github/workflows/ci.yml)
jobs:
  test-backend:
    steps:
      - run: go test ./api/... -v -cover -coverprofile=coverage.out
      - run: go vet ./api/...
      - run: govulncheck ./api/...

  test-frontend:
    steps:
      - run: pnpm run test -- --coverage
      - run: pnpm run lint

  e2e-tests:
    needs: [test-backend, test-frontend]
    steps:
      - run: pnpm exec playwright test
    env:
      BASE_URL: ${{ env.VERCEL_PREVIEW_URL }}

  lighthouse-ci:
    needs: e2e-tests
    steps:
      - run: npx @lhci/cli autorun
```

---

## 10. Criterios de Entrada y Salida

### 10.1 Criterios de Entrada (para iniciar las pruebas)

| Nivel | Criterios de entrada |
|---|---|
| Unitarias | El código compila sin errores. El entorno de testing local está configurado. |
| Integración | Dataset de staging de Sanity.io disponible. Variables de entorno de staging configuradas. |
| Sistema | Despliegue en Vercel Preview exitoso. Dataset de staging con datos representativos cargados. |
| Aceptación | Despliegue en staging idéntico a producción. Representante del cliente disponible. |

### 10.2 Criterios de Salida (para considerar las pruebas exitosas)

> **Umbral mínimo global:** ≥ 85% de cobertura de sentencias en todo el proyecto, verificado por SonarQube y aplicado como gate en CI a partir de la Fase 5.

| Nivel | Criterios de salida |
|---|---|
| **Unitarias Go** | ≥ 80% de cobertura en handlers. ≥ 75% en middleware y utilidades. 0 tests fallidos. |
| **Unitarias Vue/TS** | ≥ 70% de cobertura en composables. ≥ 40% en componentes. 0 tests fallidos. |
| **Integración** | 100% de casos IT-01 a IT-17 pasan. 0 secretos expuestos detectados. |
| **Sistema** | 100% de casos ST-01 a ST-26 pasan. Performance Score ≥ 90 en Lighthouse. 0 violaciones críticas de accesibilidad. |
| **Aceptación** | 100% de criterios UAT-01 a UAT-16 aprobados por el cliente. 0 defectos de severidad alta o crítica abiertos. |
| **Seguridad** | 100% de pruebas SEC-01 a SEC-11 pasan. 0 vulnerabilidades críticas en `pnpm audit` o `govulncheck`. |

### 10.3 Cobertura Diferenciada por Riesgo

Los umbrales de la §10.2 son mínimos globales. La siguiente tabla diferencia el objetivo de cobertura por módulo según su nivel de riesgo, siguiendo la metodología de **pruebas basadas en riesgo** (probabilidad × impacto).

| Módulo | Riesgo | Cobertura objetivo | Tipo | Justificación |
|---|---|---|---|---|
| `api/middleware/*` (CORS, rate limit, HMAC) | Crítico | ≥ 90% | Ramas | Controles de seguridad; falla = exposición directa |
| `api/sanity/client.go` (escritura) | Crítico | ≥ 90% | Ramas | Manipulación de datos con token privado |
| `api/handlers/*` (comentar, calificar, buscar) | Alto | ≥ 85% | Ramas | Entrada pública del usuario, validación obligatoria |
| `composables/useStock.ts`, `useComentario.ts` | Medio | ≥ 70% | Sentencias | Lógica de negocio con dependencias externas |
| `components/*.vue` | Bajo | ≥ 40% | Sentencias | UI declarativa con bajo riesgo lógico |

> **Herramienta de gestión:** SonarQube se utiliza como plataforma centralizada para monitorear la cobertura por módulo, deuda técnica, code smells y vulnerabilidades. Los reportes de cobertura de Go (`coverage.out`) y Vitest (`lcov`) se envían a SonarQube como parte del pipeline de CI.

### 10.4 Clasificación de Defectos

| Severidad | Definición | ¿Bloquea el release? |
|---|---|---|
| **Crítico** | Falla de seguridad (exposición de token, XSS, CORS `*`), pérdida de datos, caída total del sistema | ✅ Sí |
| **Alto** | Funcionalidad principal rota (RF Must no funciona), error sin recovery en flujo principal | ✅ Sí |
| **Medio** | Funcionalidad parcialmente rota, UI con problemas visuales significativos, RF Should no funciona | ⚠️ Depende |
| **Bajo** | Problemas cosméticos menores, RF Could no funciona, mejoras de UX | ❌ No |

---

### 10.5 Matriz de Riesgos (Probabilidad × Impacto)

La siguiente matriz prioriza los riesgos técnicos identificados en `implementationPlan.md` (§ Correcciones y Precisiones) usando la fórmula `Prioridad = Probabilidad × Impacto`.

| ID | Riesgo | Probabilidad (1-5) | Impacto (1-5) | Prioridad | Mitigación | Cobertura asociada |
|---|---|---|---|---|---|---|
| R-01 | Exposición de `SANITY_WRITE_TOKEN` en bundle JS o logs | 2 | 5 | 10 | Token solo en env vars de Vercel; SEC-01 verifica ausencia en bundle | ≥ 90% en `sanity/client.go` |
| R-02 | Inyección GROQ en endpoint de búsqueda | 3 | 5 | 15 | Parámetros tipados en GROQ, sanitización en `handlers/validacion.go`; IT-06, SEC-03 | ≥ 85% en `handlers/*` |
| R-03 | XSS almacenado vía comentarios maliciosos | 3 | 4 | 12 | Sanitización server-side + escape en Vue template; SEC-04, ST-13 | ≥ 90% en middleware |
| R-04 | CORS permisivo permite peticiones desde orígenes no autorizados | 2 | 4 | 8 | `ALLOWED_ORIGIN` restrictivo por ambiente; UT-GO-19 a 21, SEC-02 | ≥ 90% en `middleware/cors.go` |
| R-05 | Abuso masivo de endpoints de escritura (spam de comentarios) | 4 | 3 | 12 | Rate limiting por IP en middleware; UT-GO-22, 23, SEC-10 | ≥ 90% en `middleware/ratelimit.go` |
| R-06 | Webhook de rebuild disparado por atacante sin firma válida | 2 | 4 | 8 | Verificación HMAC obligatoria; UT-GO-24 a 26, IT-12 a 14, SEC-07 | ≥ 90% en `middleware/hmac.go` |
| R-07 | Error off-by-one en umbral de stock bajo (5 unidades) | 3 | 2 | 6 | Tests BVA explícitos: UT-VUE-04a, 04b, 04c (valores 4, 5, 6) | ≥ 70% en composables |
| R-08 | Autenticación admin con JWT mal configurado | 2 | 5 | 10 | Expiración corta (<24h), secreto en env var, validación por petición | ≥ 85% en `handlers/*` |

> **Umbral de acción:** Riesgos con prioridad ≥ 10 requieren cobertura de ramas ≥ 85% y al menos un test de seguridad dedicado (SEC-*).

---

## 11. Matriz de Trazabilidad RF/RNF → Pruebas

| Requisito | Pruebas Unitarias | Pruebas Integración | Pruebas Sistema | Pruebas Aceptación |
|---|---|---|---|---|
| RF-01 (Catálogo) | UT-VUE-10 | IT-15, IT-16 | ST-01 | UAT-01 |
| RF-02 (Detalle producto) | UT-VUE-10 | IT-17 | ST-03 | UAT-02 |
| RF-03 (Stock real) | UT-VUE-01 a 04 | IT-07 | ST-06, ST-07, ST-08 | UAT-03 |
| RF-04 (Categorías) | — | — | ST-02 | UAT-04 |
| RF-05 (Redes sociales) | UT-VUE-16 | — | ST-16, ST-17 | UAT-16 |
| RF-06 (Calificación) | UT-GO-05 a 07, UT-VUE-08, 09 | IT-02, IT-10 | ST-11, ST-12 | UAT-08 |
| RF-07 (Comentarios) | UT-GO-01 a 04, UT-VUE-05 a 07, UT-VUE-17 | IT-01, IT-08, IT-09 | ST-09, ST-10, ST-13 | UAT-09 |
| RF-08 (Login admin) | — | — | ST-19, ST-20 | UAT-11 |
| RF-09 (Logout admin) | — | — | ST-21 | UAT-11 |
| RF-10 (Panel admin) | — | — | ST-18 | UAT-11 |
| RF-11 (Editar producto) | — | — | — | UAT-12 |
| RF-12 (Imagen producto) | — | — | — | UAT-12 |
| RF-13 (Crear/eliminar producto) | — | — | — | UAT-13 |
| RF-14 (Stock admin) | — | — | — | UAT-14 |
| RF-17 (WhatsApp) | UT-TS-01, 02, UT-VUE-11 | — | ST-14, ST-15 | UAT-10 |
| RF-18 (Búsqueda) | UT-GO-08, 09, 10 | IT-05, IT-06, IT-11 | ST-05 | UAT-05 |
| RF-19 (Paginación) | — | — | ST-04 | UAT-06 |
| RF-20 (SEO/OG) | — | IT-16 | ST-22, ST-23, ST-24 | UAT-07 |
| RNF-01 (Sin auth usuarios) | — | — | ST-25, ST-26 | — |
| RNF-02 (Rendimiento UI) | — | — | NF-01 a NF-06 | — |
| RNF-03 (Stock tiempo real) | UT-VUE-01 a 04 | IT-07 | ST-06, ST-07 | UAT-03 |
| RNF-04 (Seguridad) | UT-GO-18 a 26 | IT-03, IT-04, IT-06 | ST-12, ST-20, SEC-01 a SEC-11 | — |
| RNF-05 (Responsividad) | UT-VUE-13 | — | NF-07 a NF-14 | — |
| RNF-06 (Analítica) | — | — | NF-15 a NF-17 | — |

---

*Última actualización: Septiembre 2026 · Aplica a LectorPobre ERS v1.0*
*Este plan debe revisarse cuando se agreguen requisitos al ERS o cambien las decisiones de arquitectura.*
