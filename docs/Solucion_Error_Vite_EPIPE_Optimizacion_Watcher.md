# Solución al Error Vite EPIPE y Optimización del Watcher de Nuxt

> **Referencia Técnica:** Incidente de Build Local en Fase 3 / Prevención para Fase 6  
> **Archivos Afectados:** `nuxt.config.ts`  
> **Estado:** Resuelto y Validado  

---

## 1. Descripción del Problema

Al ejecutar el servidor de desarrollo (`pnpm run dev` o `nuxt dev`), el proceso se ralentizaba drásticamente y arrojaba la siguiente advertencia crítica de esbuild:

```text
[vite] Failed to run dependency scan... The service was stopped: write EPIPE
```

Este fallo impedía que Vite realizara el pre-empaquetado (*pre-bundling*) adecuado de dependencias en `node_modules/.vite/deps`, provocando que cada importación ESM fuera resuelta y transpilada archivo por archivo en tiempo de ejecución, además de congelar o ralentizar de forma severa el inicio del servidor Nitro.

---

## 2. Causas Raíz Identificadas (3 Factores Combinados)

La investigación y análisis forense determinó que la falla se debía a la conjunción de tres factores:

### Factor 1: Archivos `.vue` y `.ts` vacíos (0 bytes) reservados para la Fase 6
Desde la creación inicial del repositorio, existían archivos vacíos (0 bytes) creados como placeholders estructurales para la Fase 6:
- `layouts/admin.vue`
- `pages/admin/login.vue` (y subdirectorio `pages/admin/`)
- `middleware/auth.ts`

Al iniciar Nuxt, el generador de rutas virtuales (`nuxt/dist/app/entry.js`) registra automáticamente todas las plantillas y páginas presentes en el sistema de archivos. Cuando el escáner de dependencias de `esbuild` analizaba `entry.js`, el plugin `@vue/compiler-sfc` procesaba `layouts/admin.vue`. Al estar vacío, el compilador lanzaba una excepción irrecuperable:

> *At least one `<template>` or `<script>` is required in a single file component.*

Esta excepción abortaba abruptamente el proceso hijo (*child process*) en segundo plano de `esbuild`, cerrando la tubería IPC con el error `write EPIPE` y saltándose silenciosamente el pre-empaquetado de dependencias.

### Factor 2: Escaneo recursivo de `sanity/node_modules` por Chokidar (Watcher de Nuxt)
En entornos Windows, el observador de cambios de archivos de Nuxt (`chokidar`) vigilaba recursivamente todos los subdirectorios del monorepo a partir de la raíz del proyecto. Al descender en la carpeta `sanity/`, el watcher indexaba recursivamente `sanity/node_modules/.pnpm` (que alberga más de 50,000 archivos de dependencias de Sanity Studio), saturando por completo el bucle de eventos (*event loop*) de Node.js durante la fase de *Vite server built / Nitro built*.

### Factor 3: Omisión del pre-empaquetado de `lucide-vue-next` y utilidades pesadas
Al abortarse el escaneo inicial de Vite por el Factor 1, librerías como `lucide-vue-next` (que exporta más de 1,500 componentes de íconos en ESM modular), `fuse.js` y `@sanity/image-url` no eran pre-empaquetadas. Por cada ícono utilizado en la interfaz Neo-Pop, el navegador realizaba solicitudes HTTP individuales durante el renderizado inicial.

---

## 3. Solución Aplicada en `nuxt.config.ts`

Se actualizaron las configuraciones de `ignore`, `watchers` y `vite` en `nuxt.config.ts` para resolver de forma definitiva los tres factores:

```typescript
export default defineNuxtConfig({
    // ...

    // 1. Excluir subdirectorios del monorepo y placeholders vacíos de la Fase 6
    ignore: [
        'sanity/**',
        'api/**',
        'tests/**',
        'coverage/**',
        'scripts/**',
        'docs/**',
        'playwright-report/**',
        'test-results/**',
        'layouts/admin.vue',
        'pages/admin/**',
        'middleware/auth.ts',
    ],

    // 2. Prevenir que Chokidar vigile dependencias de Sanity o carpetas ajenas
    watchers: {
        chokidar: {
            ignored: [
                /[\\/]node_modules[\\/]/,
                /[\\/]\.git[\\/]/,
                /[\\/]\.nuxt[\\/]/,
                /[\\/]sanity[\\/]/,
                /[\\/]api[\\/]/,
                /[\\/]coverage[\\/]/,
                /[\\/]tests[\\/]/,
                /[\\/]scripts[\\/]/,
                /[\\/]docs[\\/]/,
            ],
        },
    },

    // 3. Forzar el pre-empaquetado óptimo de dependencias clave y blindar el watcher de Vite
    vite: {
        optimizeDeps: {
            include: ['lucide-vue-next', 'fuse.js', '@sanity/image-url'],
        },
        server: {
            watch: {
                ignored: [
                    '**/sanity/**',
                    '**/api/**',
                    '**/coverage/**',
                    '**/tests/**',
                    '**/scripts/**',
                    '**/docs/**',
                ],
            },
        },
    },

    // ...
});
```

---

## 4. Resultados y Validación

Tras la implementación de estos ajustes, la ejecución de `pnpm run dev` arrojó métricas inmediatas de alto rendimiento y estabilidad total:

```text
√ Vite client built in 186ms
√ Vite server built in 2395ms
[nitro] √ Nuxt Nitro server built in 4171ms
```

- **Cero errores `write EPIPE`:** El escáner de `esbuild` finaliza limpiamente sin caídas del proceso hijo.
- **Respuesta HTTP 200 OK:** El catálogo público de "Lector Pobre", la búsqueda difusa con sinónimos, las recomendaciones y el carrito de cotización operan con tiempos de recarga instantáneos (HMR).

---

## 5. ⚠️ Guía Mandatoria para la Implementación de la Fase 6

> [!IMPORTANT]
> **RECORDATORIO PARA DESARROLLADORES EN FASE 6 (PANEL DE ADMINISTRACIÓN Y AUTENTICACIÓN):**  
> Una vez que comiences el desarrollo de la Fase 6 e implementes el código real (con etiquetas `<template>` y `<script>`) en los archivos administrativos, **DEBES reactivarlos en Nuxt eliminándolos de la lista `ignore`**.

### Pasos al iniciar la Fase 6:
1. Abrir `nuxt.config.ts`.
2. Ubicar la sección `ignore`.
3. **Eliminar únicamente estas 3 líneas:**
   ```typescript
   // ELIMINAR ESTAS LÍNEAS EN FASE 6:
   'layouts/admin.vue',
   'pages/admin/**',
   'middleware/auth.ts',
   ```
4. **MANTENER INTACTAS** las demás reglas de exclusión:
   ```typescript
   // CONSERVAR SIEMPRE (Protección permanente contra sobrecarga de Chokidar):
   'sanity/**',
   'api/**',
   'tests/**',
   'coverage/**',
   'scripts/**',
   'docs/**',
   'playwright-report/**',
   'test-results/**',
   ```

Esta separación garantiza que al llegar a la Fase 6 no se pierda tiempo investigando por qué las rutas `/admin` devuelven 404 o no se registran en el enrutador de Nuxt.
