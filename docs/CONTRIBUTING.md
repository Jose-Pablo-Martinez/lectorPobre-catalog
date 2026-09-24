# Guía de Contribución — LectorPobre

> **Versión:** 1.0
> **Complementa:** `DEVELOPMENT_GUIDELINES.md`, `ERS_LectorPobre.md`, `Stack_Tecnologico_LectorPobre.md`
> **Audiencia:** Desarrolladores humanos y agentes IA que contribuyan al proyecto.

Este documento describe **cómo configurar el entorno, el flujo de trabajo de contribución, el proceso de pull request y el checklist de calidad** para el proyecto LectorPobre. Léelo junto con `DEVELOPMENT_GUIDELINES.md`, que define los estándares de código.

---

## Tabla de Contenido

1. [Configuración del Entorno de Desarrollo](#1-configuración-del-entorno-de-desarrollo)
2. [Estructura del Repositorio](#2-estructura-del-repositorio)
3. [Flujo de Trabajo de Desarrollo](#3-flujo-de-trabajo-de-desarrollo)
4. [Proceso de Pull Request](#4-proceso-de-pull-request)
5. [Checklist de Calidad Pre-PR](#5-checklist-de-calidad-pre-pr)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Comandos Útiles](#7-comandos-útiles)
8. [Decisiones de Arquitectura Registradas (ADR)](#8-decisiones-de-arquitectura-registradas-adr)

---

## 1. Configuración del Entorno de Desarrollo

### 1.1 Prerrequisitos

| Herramienta | Versión mínima | Propósito |
|---|---|---|
| **Node.js** | 20 LTS | Frontend Nuxt.js |
| **pnpm** | 9+ | Gestor de paquetes del proyecto (`npm i -g pnpm`) |
| **Go** | 1.22+ | Funciones serverless |
| **Vercel CLI** | Latest | Desarrollo local de funciones y preview |
| **Git** | 2.40+ | Control de versiones |

### 1.2 Clonado e Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/lectorpobre.git
cd lectorpobre

# 2. Ejecutar el script de setup (crea .env.local y muestra los pasos siguientes)
pnpm run setup

# 3. Instalar TODAS las dependencias del workspace (raíz + Sanity Studio)
#    Un solo comando instala ambos proyectos porque pnpm-workspace.yaml los registra:
#    - Raíz: Nuxt, Vue, cliente de Sanity (@nuxtjs/sanity, @sanity/vision)
#    - sanity/: Studio UI (react, react-dom, styled-components) con versiones correctas
pnpm install

# 4. Descargar dependencias de Go
cd api && go mod download && cd ..
```

> El script `pnpm run setup` copia `.env.example` → `.env.local` (sin sobreescribir si ya existe)
> e imprime los pasos pendientes con los comandos exactos.

### 1.3 Configurar Sanity Studio (primer uso)

Antes de poder arrancar el Studio o cargar datos de prueba, debes autenticarte con tu
cuenta de Sanity y crear el dataset `staging`.

> **Servidores locales — puertos distintos:**
> Sanity Studio y el frontend Nuxt son dos servidores independientes que corren en paralelo:
> - `http://localhost:3000` → **Nuxt** (el sitio público que ven los visitantes)
> - `http://localhost:3333` → **Sanity Studio** (la interfaz de administración de contenido)

```bash
# 1. Autenticarse (abre el navegador para login con GitHub/Google)
cd sanity
pnpm exec sanity login
# Alternativa con npx (usa la versión más reciente descargada en el momento):
# npx sanity@latest login

# 2. Crear el dataset de staging (solo la primera vez — elegir "private")
pnpm exec sanity dataset create staging

# 3. Verificar que ambos datasets existen
pnpm exec sanity dataset list
# Deberías ver: production, staging

# 4. Arrancar el Studio apuntando a staging
pnpm dev
# Studio disponible en http://localhost:3333
```

> **¿Por qué staging?**
> El dataset `staging` es el entorno de prueba donde se carga la seed data y se
> verifican las consultas GROQ antes de publicar en `production`. Nunca se cargan
> datos de prueba directamente en `production`.

### 1.4 Levantar el Entorno Local

LectorPobre usa **Vercel CLI** para emular el entorno unificado (frontend + funciones serverless) en local.

```bash
# Levanta el frontend Nuxt + las funciones Go en modo desarrollo
vercel dev

# El sitio estará disponible en http://localhost:3000
# Las funciones Go estarán disponibles en http://localhost:3000/api/*
```

> **Nota:** `vercel dev` emula el entorno de Vercel incluyendo las variables de entorno definidas en `.env.local` y el routing de funciones Go en el directorio `/api`.

### 1.5 Solo el Frontend (sin funciones Go)

```bash
# Útil para trabajar en componentes Vue o páginas Nuxt de forma aislada
pnpm dev
```

### 1.6 Build de Producción Local

```bash
# Genera el sitio estático completo (SSG)
pnpm run generate

# Previsualiza el build generado localmente
pnpm run preview
```

---

## 2. Estructura del Repositorio

```
lectorpobre/
├── api/                        # Funciones serverless en Go (Vercel Functions)
│   ├── comentar.go             # POST /api/comentar (RF-07)
│   ├── calificar.go            # POST /api/calificar (RF-06)
│   ├── buscar.go               # GET /api/buscar (RF-18, opcional)
│   ├── auth/
│   │   ├── login.go            # POST /api/auth/login (RF-08)
│   │   └── logout.go           # POST /api/auth/logout (RF-09)
│   ├── webhook/
│   │   └── rebuild.go          # POST /api/webhook/rebuild (flujo de build)
│   ├── handlers/               # Tipos y helpers compartidos entre handlers
│   │   ├── types.go            # Structs: ComentarioPayload, ApiResponse, etc.
│   │   └── validacion.go       # Funciones de validación reutilizables
│   ├── sanity/                 # Cliente de Sanity para escritura (token privado)
│   │   └── client.go
│   ├── middleware/             # Rate limiting, CORS, verificación HMAC
│   │   ├── ratelimit.go
│   │   ├── cors.go
│   │   └── hmac.go
│   ├── constants/
│   │   └── errorcodes.go       # Registro centralizado de códigos de error
│   └── go.mod
│
├── components/                 # Componentes Vue reutilizables
│   ├── TarjetaProducto.vue     # RF-01, RF-02
│   ├── SistemaEstrellas.vue    # RF-06
│   ├── FormularioComentario.vue# RF-07
│   ├── BotonWhatsApp.vue       # RF-17
│   ├── BotonPrimario.vue
│   └── IndicadorStock.vue      # RF-03, RNF-03
│
├── composables/                # Lógica de negocio del frontend (Vue composables)
│   ├── useStock.ts             # RF-03, RNF-03
│   ├── useCalificacion.ts      # RF-06
│   ├── useComentario.ts        # RF-07
│   └── useCatalogo.ts          # RF-01, RF-04, RF-18
│
├── pages/                      # Rutas del sitio (SSG, Nuxt file-based routing)
│   ├── index.vue               # Catálogo principal (RF-01, RF-04, RF-19)
│   ├── producto/
│   │   └── [slug].vue          # Detalle de producto (RF-02, RF-03, RF-20)
│   └── admin/                  # Rutas protegidas del panel (RF-08 a RF-16)
│       └── login.vue
│
├── types/                      # Tipos TypeScript globales
│   ├── api.ts                  # Contratos de los endpoints Go (espejo de handlers/types.go)
│   └── sanity.ts               # Tipos del modelo de datos de Sanity
│
├── assets/
│   └── css/
│       └── global.css          # Custom properties y tokens de diseño
│
├── public/                     # Assets estáticos (imágenes, favicon, etc.)
├── sanity/                     # Esquemas de Sanity Studio
│   └── schemas/
│       ├── producto.ts
│       ├── categoria.ts
│       ├── comentario.ts
│       └── configuracionGlobal.ts
├── tests/                      # Tests del frontend (Vitest)
├── nuxt.config.ts
├── tailwind.config.ts
├── .env.example
├── vercel.json
├── DEVELOPMENT_GUIDELINES.md   # Estándares de código (leer PRIMERO)
└── CONTRIBUTING.md             # Este archivo
```

---

## 3. Flujo de Trabajo de Desarrollo

### 3.1 Reglas de Ramas

| Rama | Propósito |
|---|---|
| `main` | Producción. **Solo merges via PR aprobado.** Push directo bloqueado. |
| `develop` | Integración. Base para nuevas features. |
| `feature/RF-XX-descripcion` | Nuevas funcionalidades trazadas al ERS. |
| `fix/descripcion-corta` | Correcciones de bugs. |
| `refactor/descripcion-corta` | Refactorizaciones sin cambio de comportamiento. |
| `chore/descripcion-corta` | Tareas de mantenimiento (deps, config). |
| `docs/descripcion-corta` | Actualizaciones de documentación. |

### 3.2 Ciclo de una Feature

```
1. Crea la rama desde `develop`
   git checkout develop && git pull
   git checkout -b feature/RF-07-comentarios-productos

2. Desarrolla con commits atómicos y bien nombrados (ver sección 11.2 de DEVELOPMENT_GUIDELINES.md)
   git commit -m "feat(handlers): implementar ComentarHandler con validación [RF-07, RNF-04]"

3. Asegúrate de que los tests pasen localmente
   go test ./api/...
   npm run test

4. Abre un Pull Request hacia `develop`

5. El PR es revisado (al menos 1 aprobación requerida para merges a `main`)

6. Merge por squash o rebase (nunca merge commit en `main`)
```

### 3.3 Integración Continua (CI/CD)

Cada push a cualquier rama dispara automáticamente en Vercel:

- **Build de Preview:** genera un despliegue de previsualización con URL única.
- **Ejecución de tests:** `go test ./api/...` y `npm run test`.
- **Lint del frontend:** `npm run lint`.

> **Importante:** Los despliegues de **Preview** deben estar protegidos con contraseña en Vercel para evitar que URLs de prueba con datos reales sean públicamente indexables (ver sección 10.8 de la arquitectura).

---

## 4. Proceso de Pull Request

### 4.1 Antes de Abrir el PR

1. El branch está actualizado con `develop` (sin conflictos).
2. Todos los tests pasan localmente.
3. El checklist de la Sección 5 está completo.
4. El PR incluye una descripción clara del cambio y los requisitos RF/RNF relacionados.

### 4.2 Plantilla de PR

```markdown
## ¿Qué cambia este PR?
<!-- Descripción concisa del cambio -->

## Requisitos relacionados
<!-- RF-XX, RNF-XX del ERS -->

## Tipo de cambio
- [ ] Nueva funcionalidad (feat)
- [ ] Corrección de bug (fix)
- [ ] Refactorización (refactor)
- [ ] Documentación (docs)
- [ ] Mantenimiento (chore)

## Checklist
- [ ] Tests agregados/actualizados
- [ ] Documentación GoDoc/JSDoc actualizada
- [ ] No se introdujeron secretos en el código
- [ ] CORS correctamente configurado en handlers nuevos (si aplica)
- [ ] Código referencia RF/RNF del ERS
- [ ] El checklist completo de la Sección 5 de CONTRIBUTING.md fue verificado

## Capturas de pantalla / evidencia (si aplica)
```

### 4.3 Reglas de Revisión

- **1 aprobación** mínima para merge a `develop`.
- **1 aprobación** de un mantenedor del proyecto para merge a `main`.
- El autor **no puede aprobarse a sí mismo**.
- Los comentarios de revisión deben resolverse antes del merge.

---

## 5. Checklist de Calidad Pre-PR

Verifica cada punto antes de enviar tu PR. Este checklist resume las reglas de `DEVELOPMENT_GUIDELINES.md`.

### Frontend (Nuxt / Vue / TypeScript)

- [ ] No se usa `any` en ningún archivo TypeScript nuevo o modificado.
- [ ] Todos los composables tienen un bloque `@file` JSDoc con `@satisfies RF/RNF`.
- [ ] Los componentes Vue nuevos incluyen atributos de accesibilidad (`role`, `aria-label`, `aria-hidden`).
- [ ] Las consultas a la API de Sanity desde el frontend usan **únicamente** el cliente público (sin token de escritura).
- [ ] Los metadatos SEO/OG están configurados con `useSeoMeta` en cada página de detalle de producto (RF-20).
- [ ] No hay estilos inline (`style=""`) para valores expresables con Tailwind.
- [ ] Los grupos de clases Tailwind repetidos 3+ veces están extraídos en componentes.

### Backend (Go Serverless)

- [ ] Todos los handlers exportados tienen GoDoc con `Satisfies: RF-XX`.
- [ ] Toda entrada de usuario es validada al inicio del handler (esquema, tipo, longitud).
- [ ] Las consultas GROQ usan parámetros tipados — sin interpolación de strings con input del usuario.
- [ ] Los mensajes de error al cliente son genéricos; el detalle está en `log.Printf` (interno).
- [ ] CORS restringido al dominio de producción en handlers nuevos.
- [ ] Rate limiting activo en endpoints de escritura (`/api/comentar`, `/api/calificar`).
- [ ] Ninguna variable global mutable almacena datos de petición.

### Seguridad

- [ ] Cero secretos (tokens, claves, contraseñas) en el código fuente o en los tests.
- [ ] El `SANITY_WRITE_TOKEN` no aparece en ningún bundle de frontend.
- [ ] Los endpoints de webhook validan la firma HMAC de Sanity.
- [ ] Las variables de entorno sensibles están segregadas por ambiente (Production/Preview/Development) en Vercel.

### Contratos de API

- [ ] Si se agregó/modificó un endpoint Go: el tipo correspondiente fue actualizado en `types/api.ts`.
- [ ] Si se modificó un schema de Sanity: los tipos en `types/sanity.ts` y los schemas en `sanity/schemas/` están sincronizados.
- [ ] Si se añadió un código de error: `constants/errorcodes.go` y `types/api.ts → ErrorCode` están actualizados.

### Testing

- [ ] Los handlers Go nuevos tienen tests que cubren el caso exitoso y al menos un caso de error.
- [ ] Los composables Vue críticos (useStock, useCalificacion) tienen tests actualizados.
- [ ] No hay rutas absolutas hardcodeadas en los tests de Go.

---

## 6. Variables de Entorno

### 6.1 Crear `.env.local` con el script de setup

```bash
# Crea .env.local desde .env.example e imprime los pasos pendientes
pnpm run setup
```

El script nunca sobreescribe un `.env.local` existente, por lo que es seguro correrlo
en cualquier momento. Si quieres reiniciarlo, elimina `.env.local` primero.

### 6.2 Diccionario de Variables

| Variable | Descripción | Leído por | Requerida |
|---|---|---|---|
| `NUXT_PUBLIC_SANITY_PROJECT_ID` | ID del proyecto en Sanity.io (público) | Nuxt frontend | ✅ |
| `NUXT_PUBLIC_SANITY_DATASET` | Dataset que el frontend consume (`staging` en local) | Nuxt frontend | ✅ |
| `SANITY_STUDIO_PROJECT_ID` | ID del proyecto leído por `sanity.config.ts` y `sanity.cli.ts` | Sanity Studio | ✅ |
| `SANITY_STUDIO_DATASET` | Dataset que el Studio edita (`staging` en local) | Sanity Studio | ✅ |
| `SANITY_WRITE_TOKEN` | Token de escritura privado — **nunca exponer al navegador** | Solo Go (Vercel) | ✅ |
| `SANITY_WEBHOOK_SECRET` | Secreto HMAC para validar webhooks de Sanity | Solo Go (Vercel) | ✅ |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt de la contraseña del administrador | Solo Go (Vercel) | ✅ |
| `ADMIN_JWT_SECRET` | Clave secreta para firmar tokens JWT de sesión de admin | Solo Go (Vercel) | ✅ |
| `ALLOWED_ORIGIN` | Origen permitido en CORS (`http://localhost:3000` en local) | Solo Go (Vercel) | ✅ |
| `NUXT_PUBLIC_PLAUSIBLE_DOMAIN` | Dominio para Plausible Analytics | Nuxt frontend | ⬜ |
| `CAPTCHA_SECRET_KEY` | Clave secreta para validación anti-bot | Solo Go (Vercel) | ⬜ |

### 6.3 Reglas de Gestión de Secretos

- **Nunca** commitear `.env.local` al repositorio (está en `.gitignore`).
- **Nunca** agregar secretos al bundle de frontend (solo variables con prefijo `NUXT_PUBLIC_` llegan al navegador).
- Los secretos de producción se configuran exclusivamente en el panel de Vercel → Settings → Environment Variables.
- Separar las variables por ambiente: **Production**, **Preview** y **Development** en Vercel.
- Rotar el `SANITY_WRITE_TOKEN` y el `ADMIN_JWT_SECRET` ante cualquier sospecha de compromiso.

### 6.4 Cómo generar los secretos

```bash
# SANITY_WEBHOOK_SECRET — 32 bytes aleatorios en hex
openssl rand -hex 32

# ADMIN_JWT_SECRET — 64 bytes aleatorios en hex
openssl rand -hex 64

# ADMIN_PASSWORD_HASH — hash bcrypt de tu contraseña
htpasswd -bnBC 10 "" TU_CONTRASEÑA | tr -d ':\n'

# SANITY_WRITE_TOKEN — generar desde sanity.io/manage
# → tu proyecto → API → Tokens → Add API token (Editor)
```

---

## 7. Comandos Útiles

### 7.1 Frontend (raíz del proyecto)

```bash
pnpm run setup           # Crea .env.local desde .env.example e imprime los pasos de setup
pnpm run seed:staging    # Carga datos de prueba en el dataset staging (idempotente)
pnpm dev                 # Servidor de desarrollo Nuxt (HMR) → http://localhost:3000
pnpm run generate        # Genera el sitio estático completo (SSG)
pnpm run preview         # Previsualiza el build generado localmente
pnpm run test            # Ejecuta tests unitarios con Vitest (excluye *.integration.test.ts)
pnpm run test:integration # Ejecuta tests de integración contra Sanity staging
```

> **`pnpm run seed:staging`** requiere `SANITY_WRITE_TOKEN` en `.env.local`.
> Crea: 1 configuración global, 3 categorías, 6 productos (con distintos niveles de stock),
> 4 comentarios (aprobado/pendiente/rechazado) y 4 calificaciones con patch atómico en productos.
> Es **idempotente**: usa IDs fijos con prefijo `seed-`, por lo que correrlo dos veces actualiza
> los documentos existentes sin crear duplicados.

### 7.2 Backend Go

```bash
cd api
go test ./...                    # Ejecuta todos los tests
go test ./... -v -cover          # Tests con output verboso y reporte de cobertura
go vet ./...                     # Análisis estático de Go
go mod tidy                      # Limpia y sincroniza dependencias
```

### 7.3 Vercel CLI

```bash
vercel dev                       # Entorno local completo (frontend + funciones Go)
vercel env pull .env.local       # Sincroniza variables de entorno desde Vercel
vercel --prod                    # Despliega manualmente a producción (solo mantenedores)
```

### 7.4 Sanity Studio (`cd sanity` primero)

> **¿Por qué hay que hacer `cd sanity` antes de `pnpm dev`?**
> El servidor del Studio es un proyecto Node independiente con su propio `package.json` en `sanity/`.
> Al correr `pnpm dev` desde la raíz, Nuxt arranca (el script `dev` del `package.json` raíz llama a `nuxt dev`).
> El Studio **no se puede iniciar desde la raíz** — hay que pararse en `sanity/` para ejecutarlo.
> Nuxt y el Studio son dos procesos separados que corren en paralelo:
> - Nuxt frontend: `http://localhost:3000` (ejecutar desde la raíz)
> - Sanity Studio: `http://localhost:3333` (ejecutar desde `sanity/`)

> **`sanity/.env.development` — ¿por qué existe?**
> Vite (el bundler que usa Sanity Studio) no busca variables de entorno en directorios padre.
> El archivo `sanity/.env.development` es la forma estándar de Vite para inyectar variables de entorno
> cuando el Studio corre en modo desarrollo. Sin él, `SANITY_STUDIO_DATASET` no se resuelve y el Studio
> cae al valor por defecto `'production'` definido en `sanity.cli.ts`, mostrando un dataset diferente
> al que populaste con el seed script.
> **No commitear este archivo si contiene secretos** (solo tiene `PROJECT_ID` y `DATASET`, que son públicos).

> **`pnpm exec sanity` vs `npx sanity@latest`**
> `pnpm exec sanity` corre la versión de Sanity **ya instalada localmente** en el proyecto —
> reproducible y sin descargas extras. `npx sanity@latest` siempre descarga la última versión
> disponible en npm aunque ya la tengas instalada. Prefiere `pnpm exec`; usa `npx` solo
> cuando quieras forzar la última versión (por ejemplo en `typegen generate`).

```bash
# Autenticarse con cuenta Sanity (abre navegador)
pnpm exec sanity login
# npx sanity@latest login

# Ver datasets disponibles del proyecto
pnpm exec sanity dataset list
# npx sanity@latest dataset list

# Crear dataset staging (solo primera vez — elegir "private")
pnpm exec sanity dataset create staging
# npx sanity@latest dataset create staging

# Iniciar Studio en modo desarrollo → http://localhost:3333  (Nuxt corre en :3000)
# IMPORTANTE: ejecutar desde sanity/, NO desde la raíz del proyecto
pnpm dev

# Desplegar Studio a su URL alojada en sanity.io
pnpm run deploy
# npx sanity@latest deploy

# Regenerar types/sanity.ts desde los schemas (forzar última versión recomendado)
pnpm exec sanity typegen generate
# npx sanity@latest typegen generate   ← preferido en CI (siempre la versión más reciente)
```

### 7.5 Archivos de configuración de Sanity

| Archivo | Ubicación | Propósito |
|---|---|---|
| `sanity.config.ts` | `sanity/` | Configuración principal del Studio: plugins, schemas registrados, estructura del sidebar, singleton pattern de `configuracionGlobal`. Es el punto de entrada de Sanity Studio. |
| `sanity.cli.ts` | `sanity/` | Configuración de la CLI de Sanity (`pnpm exec sanity ...`). Define el `projectId` y `dataset` que usan los comandos de terminal como `deploy`, `dataset list` y `typegen generate`. |
| `schemaTypes/index.ts` | `sanity/schemaTypes/` | Barrel file que agrupa todos los schemas en el array `schemaTypes[]`. Añadir un schema nuevo aquí para que aparezca en el Studio. |
| `schemaTypes/product.ts` | `sanity/schemaTypes/` | Schema del documento `producto` (RF-01, RF-02, RF-11–RF-14). |
| `schemaTypes/category.ts` | `sanity/schemaTypes/` | Schema del documento `categoria` (RF-04). |
| `schemaTypes/comment.ts` | `sanity/schemaTypes/` | Schema del documento `comentario` con workflow de moderación (RF-07). |
| `schemaTypes/rating.ts` | `sanity/schemaTypes/` | Schema del documento `calificacion` con contadores atómicos (RF-06). |
| `schemaTypes/globalConfig.ts` | `sanity/schemaTypes/` | Singleton de configuración global: paleta, variante visual, WhatsApp, redes sociales, umbrales (RF-05, RF-15–RF-17, RF-19). |

---

## 8. Decisiones de Arquitectura Registradas (ADR)

Las decisiones de arquitectura significativas se documentan aquí para preservar el contexto histórico.

| # | Decisión | Alternativas evaluadas | Razón |
|---|---|---|---|
| ADR-01 | **Nuxt.js SSG** como framework frontend | Next.js (React), Astro | SSG maduro sobre Vue 3 con SEO nativo y DX excelente. Stack ya definido por el cliente. |
| ADR-02 | **Go** para funciones serverless | Node.js, Python | Binarios compilados con cold starts mínimos y tipado estricto. Modelo serverless óptimo. |
| ADR-03 | **Sanity.io** como Headless CMS | Contentful, Strapi (self-hosted) | Sanity Studio autogenerado sin código, capa gratuita generosa, GROQ flexible. |
| ADR-04 | **Vercel** como plataforma unificada | Netlify, AWS Amplify | Integración nativa entre frontend estático y funciones Go en un único repositorio/pipeline. |
| ADR-05 | **Consulta directa a API pública de Sanity** para stock en tiempo real (RF-03) | Función serverless Go como proxy | El stock usa la API de solo lectura pública (sin token secreto), por lo que la consulta directa desde el frontend es segura y más eficiente. |
| ADR-06 | **JWT de corta duración** para sesiones de administrador | Sesiones de Sanity Studio nativas | Permite control total sobre la autenticación y validación stateless en cada función Go protegida (RNF-04). |

> Para agregar un nuevo ADR, añade una fila a esta tabla con un número consecutivo e incluye la decisión, las alternativas evaluadas y la razón técnica.

---

## 9. Solución de Problemas Comunes

### 9.1 Sanity Studio no arranca: `styled-components is not installed`

**Síntoma:**
```
Error: Failed to start dev server: Declared dependency `styled-components` is not installed
react (installed: 1924.0.0, want: ^19.2.2)
```

**Causa:** pnpm está resolviendo las dependencias de `sanity/` desde el workspace raíz en lugar de
instalar las versiones correctas de React y styled-components que el Studio necesita.

**Diagnóstico:** verifica que `pnpm-workspace.yaml` incluye `sanity/` como miembro del workspace:
```bash
cat pnpm-workspace.yaml
# Debe mostrar:
# packages:
#   - '.'
#   - 'sanity'
```

**Solución:**
```bash
# Desde la raíz del proyecto — reinstala todos los paquetes del workspace
pnpm install

# Verifica que sanity/node_modules existe
ls sanity/node_modules | head -5

# Arranca el Studio
cd sanity && pnpm dev
```

### 9.2 `pnpm run setup` dice que `.env.local` ya existe

El script nunca sobreescribe `.env.local` existente para proteger tus secretos.
Si quieres reiniciarlo completamente:
```bash
rm .env.local    # o en PowerShell: Remove-Item .env.local
pnpm run setup
```

### 9.3 `pnpm exec sanity login` falla o no abre el navegador

```bash
# Intenta con npx (descarga la última versión de Sanity CLI)
npx sanity@latest login

# O verifica que tienes acceso al proyecto desde sanity.io/manage
```

### 9.4 `pnpm exec sanity dataset list` no muestra `staging`

El dataset hay que crearlo manualmente la primera vez:
```bash
cd sanity
pnpm exec sanity dataset create staging
# Elegir "private" cuando pregunte visibilidad
```

### 9.5 El Studio arranca pero no muestra los documentos creados por `seed:staging`

**Síntoma:** El Studio carga sin errores pero aparece vacío, sin productos ni categorías.

**Causa:** El Studio está apuntando al dataset `production` en lugar de `staging`.
Esto ocurre porque Vite **no hereda variables de entorno del directorio padre**. Si ejecutas
`pnpm dev` desde `sanity/` sin el archivo `sanity/.env.development`, `SANITY_STUDIO_DATASET`
no se resuelve y el Studio usa el valor por defecto `'production'` definido en `sanity.cli.ts`.

**Solución:** Verifica que el archivo `sanity/.env.development` existe y contiene:
```env
SANITY_STUDIO_PROJECT_ID=rbrk7xv9
SANITY_STUDIO_DATASET=staging
```
Si el archivo falta, créalo y reinicia el Studio (`Ctrl+C` + `pnpm dev`).

**Gotcha relacionado — `.env.local` con dos datasets distintos:**
Si `NUXT_PUBLIC_SANITY_DATASET=production` y `SANITY_STUDIO_DATASET=staging` coexisten
en el mismo `.env.local`, el frontend Nuxt consultará `production` y el Studio mostrará
`staging`. Esto produce confusión durante el desarrollo. En local, **ambas variables deben
apuntar a `staging`**. Solo en el entorno de Vercel (producción) se inyecta
`NUXT_PUBLIC_SANITY_DATASET=production` como secret del proyecto.

---

*Última actualización: Septiembre 2026 · Aplica a LectorPobre ERS v1.0*
*Este documento debe revisarse cuando cambie la arquitectura, el stack o el proceso de contribución.*
