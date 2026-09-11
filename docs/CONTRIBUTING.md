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
| **Go** | 1.22+ | Funciones serverless |
| **Vercel CLI** | Latest | Desarrollo local de funciones y preview |
| **Git** | 2.40+ | Control de versiones |

### 1.2 Clonado e Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/lectorpobre.git
cd lectorpobre

# 2. Instalar dependencias del frontend
npm install

# 3. Descargar dependencias de Go
cd api
go mod download
cd ..

# 4. Copiar variables de entorno de desarrollo
cp .env.example .env.local
# Editar .env.local con los valores de desarrollo (ver Sección 6)
```

### 1.3 Levantar el Entorno Local

LectorPobre usa **Vercel CLI** para emular el entorno unificado (frontend + funciones serverless) en local.

```bash
# Levanta el frontend Nuxt + las funciones Go en modo desarrollo
vercel dev

# El sitio estará disponible en http://localhost:3000
# Las funciones Go estarán disponibles en http://localhost:3000/api/*
```

> **Nota:** `vercel dev` emula el entorno de Vercel incluyendo las variables de entorno definidas en `.env.local` y el routing de funciones Go en el directorio `/api`.

### 1.4 Solo el Frontend (sin funciones Go)

```bash
# Útil para trabajar en componentes Vue o páginas Nuxt de forma aislada
npm run dev
```

### 1.5 Build de Producción Local

```bash
# Genera el sitio estático completo (SSG)
npm run generate

# Previsualiza el sitio generado localmente
npm run preview
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

### 6.1 Variables Requeridas

Copia `.env.example` a `.env.local` y completa los valores para desarrollo.

```bash
# .env.example

# ── Sanity.io ──────────────────────────────────────────────────────────────
# Proyecto y dataset públicos (seguros para el frontend)
NUXT_PUBLIC_SANITY_PROJECT_ID=tu_project_id
NUXT_PUBLIC_SANITY_DATASET=production

# Token de ESCRITURA PRIVADO — solo accesible por las funciones Go en Vercel
# ⚠️ NUNCA exponer al frontend ni commitear este valor
SANITY_WRITE_TOKEN=

# Secreto compartido para verificar la firma de los webhooks de Sanity
SANITY_WEBHOOK_SECRET=

# ── Autenticación del Administrador ────────────────────────────────────────
# Secreto para firmar JWT de administrador (RF-08)
# ⚠️ Usar una cadena aleatoria larga y segura
ADMIN_JWT_SECRET=

# ── Anti-bot (opcional) ────────────────────────────────────────────────────
# Token del servicio CAPTCHA/desafío elegido (hCaptcha, Turnstile, etc.)
CAPTCHA_SECRET_KEY=
```

### 6.2 Reglas de Gestión de Secretos

- **Nunca** commitear `.env.local` al repositorio (está en `.gitignore`).
- **Nunca** agregar secretos al bundle de frontend (variables sin prefijo `NUXT_PUBLIC_`).
- Los secretos de producción se configuran exclusivamente en el panel de Vercel → Settings → Environment Variables.
- Separar las variables por ambiente: **Production**, **Preview** y **Development** en Vercel.
- Rotar el `SANITY_WRITE_TOKEN` y el `ADMIN_JWT_SECRET` ante cualquier sospecha de compromiso.

---

## 7. Comandos Útiles

### Frontend

```bash
npm run dev          # Servidor de desarrollo Nuxt (HMR)
npm run generate     # Genera el sitio estático completo (SSG)
npm run preview      # Previsualiza el build generado localmente
npm run lint         # Ejecuta ESLint sobre el código TypeScript/Vue
npm run test         # Ejecuta todos los tests con Vitest
npm run test:ui      # Tests con interfaz visual de Vitest
npm run typecheck    # Verifica tipos TypeScript sin compilar
```

### Backend Go

```bash
cd api

go test ./...                    # Ejecuta todos los tests
go test ./handlers/... -v        # Tests de handlers con output verboso
go test -cover ./...             # Tests con reporte de cobertura
go vet ./...                     # Análisis estático de Go
go mod tidy                      # Limpia y sincroniza dependencias
```

### Vercel CLI

```bash
vercel dev                       # Entorno local completo (frontend + funciones)
vercel env pull .env.local       # Sincroniza variables de entorno desde Vercel
vercel --prod                    # Despliega manualmente a producción (solo mantenedores)
```

### Sanity Studio

```bash
cd sanity
npm run dev                      # Inicia Sanity Studio en modo desarrollo
npm run deploy                   # Despliega Sanity Studio a su URL alojada
```

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

*Última actualización: Septiembre 2026 · Aplica a LectorPobre ERS v1.0*
*Este documento debe revisarse cuando cambie la arquitectura, el stack o el proceso de contribución.*
