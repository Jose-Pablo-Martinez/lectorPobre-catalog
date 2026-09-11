# LectorPobre

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com)
[![Nuxt.js](https://img.shields.io/badge/Nuxt.js-3.x-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Sanity](https://img.shields.io/badge/CMS-Sanity.io-F03E2F?logo=sanity&logoColor=white)](https://sanity.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

**LectorPobre** is a product catalog web platform for a physical bookstore. It is built using a **Jamstack architecture**: a statically generated frontend with Nuxt.js (SSG), content managed through Sanity.io (Headless CMS), serverless backend logic written in Go deployed as Vercel Functions, and global delivery via Vercel's CDN.

The platform allows customers to browse books and products by category, search the catalog, view stock availability in real time, rate and comment on products, and contact the store directly through WhatsApp. An admin panel secured with JWT authentication allows the store owner to manage the entire catalog through Sanity Studio without writing code.

### Table of Contents

- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

### Technology Stack

#### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Nuxt.js** | 3.x | Vue framework with SSG (Static Site Generation) and file-based routing |
| **Vue 3** | 3.x | Component-based UI with Composition API |
| **TypeScript** | 5.x | Static typing across the entire frontend codebase |
| **Tailwind CSS** | 3.x | Utility-first CSS framework for styling and responsive design |

#### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Go** | 1.22+ | Serverless functions for comments, ratings, auth and webhooks |
| **Vercel Functions** | — | Serverless hosting for Go handlers (`/api/*` routes) |

#### CMS & Data
| Technology | Version | Purpose |
|---|---|---|
| **Sanity.io** | v3 | Headless CMS storing all catalog data, images and global config |
| **GROQ** | — | Sanity's query language for fetching typed content |

#### Infrastructure & DevOps
| Technology | Purpose |
|---|---|
| **Vercel** | Hosting, CDN, environment variables and automatic deployments |
| **GitHub Actions** | CI/CD pipeline: Go tests, Vitest unit tests, Playwright E2E, Lighthouse CI |
| **Lighthouse CI** | Automated performance and accessibility audits on every deployment |

#### Testing
| Technology | Purpose |
|---|---|
| **Vitest** | Unit tests for Vue composables and components |
| **@vue/test-utils** | Vue component mounting utilities for Vitest |
| **Playwright** | End-to-end browser tests |

---

### Architecture Overview

```
 ┌───────────────────────────────────────────────────────────┐
 │                     User's Browser                        │
 └────────────────────────┬──────────────────────────────────┘
                          │ HTTPS
 ┌────────────────────────▼──────────────────────────────────┐
 │                   Vercel CDN (Global)                     │
 │  ┌─────────────────────────────────────────────────────┐  │
 │  │   Nuxt.js SSG — Static HTML, CSS, JS               │  │
 │  │   (Pre-built at deploy time from Sanity data)       │  │
 │  └─────────────────────────────────────────────────────┘  │
 │  ┌─────────────────────────────────────────────────────┐  │
 │  │   Go Serverless Functions (/api/*)                  │  │
 │  │   comment.go · rating.go · auth/ · webhook/         │  │
 │  └───────────────────────┬─────────────────────────────┘  │
 └──────────────────────────┼────────────────────────────────┘
                            │ Sanity API (with private token)
 ┌──────────────────────────▼────────────────────────────────┐
 │              Sanity.io Content Lake                       │
 │   products · categories · comments · ratings · config     │
 └───────────────────────────────────────────────────────────┘
```

When the store admin publishes a change in **Sanity Studio**, a webhook triggers an automatic rebuild on Vercel, and the updated static site is served worldwide within minutes — no manual deployment required.

---

### Quick Start

#### Prerequisites

- **Node.js** 20 LTS — [nodejs.org](https://nodejs.org)
- **Go** 1.22+ — [go.dev](https://go.dev)
- **Vercel CLI** — `npm install -g vercel`
- A configured [Sanity.io](https://sanity.io) project (see [`docs/implementationPlan.md`](docs/implementationPlan.md) §0.3)

#### Installation

```bash
# 1. Clone the repository
git clone https://github.com/tu-org/lectorpobre.git
cd lectorpobre

# 2. Install frontend dependencies
npm install

# 3. Install Go backend dependencies
cd api && go mod download && cd ..

# 4. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values (see Environment Variables section)

# 5. Start the local development server
vercel dev
```

The site will be available at `http://localhost:3000`.

> **Note:** `vercel dev` simultaneously serves the Nuxt.js frontend and the Go serverless functions, accurately emulating the Vercel production environment locally.

---

### Project Structure

```
lectorpobre/
├── .github/
│   ├── ISSUE_TEMPLATE/          # GitHub issue templates
│   ├── PULL_REQUEST_TEMPLATE.md # PR checklist
│   └── workflows/
│       ├── ci.yml               # Go tests + Vitest + Playwright on every PR
│       └── lighthouse.yml       # Lighthouse CI on every Vercel deployment
│
├── api/                         # Go serverless functions (Vercel Functions)
│   ├── comment.go               # POST /api/comment — user comments (RF-07)
│   ├── rating.go                # POST /api/rating  — star ratings (RF-06)
│   ├── search.go                # GET  /api/search  — server-side search (RF-18)
│   ├── auth/                    # Admin authentication handlers
│   │   ├── login.go             # POST /api/auth/login  (RF-08)
│   │   └── logout.go            # POST /api/auth/logout (RF-09)
│   ├── webhook/
│   │   └── rebuild.go           # POST /api/webhook/rebuild — Sanity → Vercel
│   ├── handlers/                # Shared payload types and validation logic
│   ├── sanity/                  # Sanity write client (uses private token)
│   ├── middleware/              # CORS, rate limiting, HMAC verification
│   └── constants/               # Centralized error codes
│
├── components/                  # Reusable Vue 3 components
│   ├── ProductCard.vue          # Product tile for catalog grid (RF-01)
│   ├── StarRating.vue           # Interactive star rating (RF-06)
│   ├── CommentForm.vue          # Comment submission form (RF-07)
│   ├── WhatsAppButton.vue       # WhatsApp contact CTA (RF-17)
│   ├── PrimaryButton.vue        # Reusable styled button
│   └── StockIndicator.vue       # Real-time stock badge (RF-03)
│
├── composables/                 # Vue 3 business logic (Composition API)
│   ├── useCatalog.ts            # Catalog fetch, filtering, search (RF-01, RF-04, RF-18)
│   ├── useStock.ts              # Real-time stock query to Sanity (RF-03)
│   ├── useRating.ts             # Rating submission (RF-06)
│   └── useComment.ts            # Comment submission (RF-07)
│
├── pages/                       # File-based routes (Nuxt auto-routing)
│   ├── index.vue                # Main catalog page (RF-01, RF-04, RF-18, RF-19)
│   ├── product/[slug].vue       # Product detail page (RF-02, RF-03, RF-20)
│   └── admin/login.vue          # Admin login page (RF-08)
│
├── layouts/
│   ├── default.vue              # Public site layout
│   └── admin.vue                # Admin panel layout
│
├── middleware/
│   └── auth.ts                  # Nuxt route guard — redirects to login (RF-10)
│
├── types/
│   ├── api.ts                   # TypeScript types for API contracts
│   └── sanity.ts                # TypeScript types mirroring Sanity schemas
│
├── sanity/                      # Sanity Studio configuration
│   ├── sanity.config.ts
│   └── schemas/                 # Content schemas (product, category, comment…)
│
├── assets/css/global.css        # CSS custom properties and design tokens
├── tests/                       # Vitest unit tests + Playwright E2E tests
└── docs/                        # Full technical documentation
```

---

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description | Scope | Required |
|---|---|---|---|
| `NUXT_PUBLIC_SANITY_PROJECT_ID` | Sanity.io project ID | Frontend + Backend | ✅ |
| `NUXT_PUBLIC_SANITY_DATASET` | Sanity dataset (`production` or `staging`) | Frontend + Backend | ✅ |
| `SANITY_WRITE_TOKEN` | Sanity write token — **never expose to the browser** | Backend (Go) only | ✅ |
| `SANITY_WEBHOOK_SECRET` | HMAC secret to validate incoming Sanity webhooks | Backend (Go) only | ✅ |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password | Backend (Go) only | ✅ |
| `ADMIN_JWT_SECRET` | Secret key for signing admin JWT tokens | Backend (Go) only | ✅ |
| `ALLOWED_ORIGIN` | CORS allowed origin (`http://localhost:3000` in dev) | Backend (Go) only | ✅ |
| `NUXT_PUBLIC_PLAUSIBLE_DOMAIN` | Domain for Plausible Analytics | Frontend | ⬜ |
| `CAPTCHA_SECRET_KEY` | Secret key for anti-bot validation | Backend (Go) only | ⬜ |

> ⚠️ **Never commit `.env.local` or any real secret values.** The `.gitignore` already excludes all `*.env*.local` files.

---

### Running Tests

```bash
# Backend — Go unit tests
cd api && go test ./... -v

# Frontend — Vitest unit tests
npm run test

# Frontend — Vitest with coverage report
npm run test -- --coverage

# E2E — Playwright (requires a running server or BASE_URL)
npx playwright test

# E2E — Specific test file
npx playwright test tests/e2e/catalog.spec.ts
```

---

### Documentation

Full technical documentation is available in the [`docs/`](docs/) folder:

| Document | Description |
|---|---|
| [`ERS_LectorPobre.md`](docs/ERS_LectorPobre.md) | Software Requirements Specification (SRS) |
| [`Arquitectura_Tecnica_Detallada_LectorPobre.md`](docs/Arquitectura_Tecnica_Detallada_LectorPobre.md) | Detailed technical architecture |
| [`Stack_Tecnologico_LectorPobre.md`](docs/Stack_Tecnologico_LectorPobre.md) | Technology stack rationale |
| [`DEVELOPMENT_GUIDELINES.md`](docs/DEVELOPMENT_GUIDELINES.md) | Coding standards and style guide |
| [`VyV_LectorPobre.md`](docs/VyV_LectorPobre.md) | Verification & Validation (V&V) test plan |
| [`implementationPlan.md`](docs/implementationPlan.md) | Phased implementation plan |

---

### Contributing

1. Read [`docs/DEVELOPMENT_GUIDELINES.md`](docs/DEVELOPMENT_GUIDELINES.md) before contributing.
2. Create a branch from `develop`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make sure all tests pass locally before opening a PR:
   ```bash
   cd api && go test ./...   # Go backend tests
   npm run test              # Vitest frontend unit tests
   npx playwright test       # Playwright E2E tests
   ```
4. Open a Pull Request against `develop` using the provided template.
5. The CI pipeline must pass before any PR can be merged.

---
---

## Español

**LectorPobre** es una plataforma web de catálogo de productos para una librería física. Está construida con **arquitectura Jamstack**: un frontend generado estáticamente con Nuxt.js (SSG), contenido gestionado a través de Sanity.io (Headless CMS), lógica de backend serverless escrita en Go desplegada como Vercel Functions, y distribución global a través de la CDN de Vercel.

La plataforma permite a los clientes explorar libros y productos por categoría, buscar en el catálogo, ver la disponibilidad de stock en tiempo real, calificar y comentar productos, y contactar directamente a la tienda por WhatsApp. Un panel de administración protegido con autenticación JWT le permite al dueño de la tienda gestionar todo el catálogo a través de Sanity Studio sin escribir código.

### Tabla de Contenidos

- [Stack Tecnológico](#stack-tecnológico-1)
- [Visión General de la Arquitectura](#visión-general-de-la-arquitectura)
- [Instalación Rápida](#instalación-rápida)
- [Estructura del Proyecto](#estructura-del-proyecto-1)
- [Variables de Entorno](#variables-de-entorno-1)
- [Ejecución de Tests](#ejecución-de-tests)
- [Documentación](#documentación-1)
- [Contribución](#contribución-1)

---

### Stack Tecnológico

#### Frontend
| Tecnología | Versión | Propósito |
|---|---|---|
| **Nuxt.js** | 3.x | Framework Vue con generación estática (SSG) y enrutamiento basado en archivos |
| **Vue 3** | 3.x | Interfaz de usuario basada en componentes con Composition API |
| **TypeScript** | 5.x | Tipado estático en todo el código del frontend |
| **Tailwind CSS** | 3.x | Framework CSS utilitario para estilos y diseño responsivo |

#### Backend
| Tecnología | Versión | Propósito |
|---|---|---|
| **Go** | 1.22+ | Funciones serverless para comentarios, calificaciones, autenticación y webhooks |
| **Vercel Functions** | — | Hosting serverless para los handlers de Go (rutas `/api/*`) |

#### CMS y Datos
| Tecnología | Versión | Propósito |
|---|---|---|
| **Sanity.io** | v3 | CMS headless que almacena todo el catálogo, imágenes y configuración global |
| **GROQ** | — | Lenguaje de consulta de Sanity para obtener contenido tipado |

#### Infraestructura y DevOps
| Tecnología | Propósito |
|---|---|
| **Vercel** | Hosting, CDN, variables de entorno y despliegues automáticos |
| **GitHub Actions** | Pipeline de CI/CD: tests de Go, Vitest, Playwright E2E y Lighthouse CI |
| **Lighthouse CI** | Auditorías automatizadas de rendimiento y accesibilidad en cada despliegue |

#### Testing
| Tecnología | Propósito |
|---|---|
| **Vitest** | Tests unitarios para composables y componentes Vue |
| **@vue/test-utils** | Utilidades para montar componentes Vue en Vitest |
| **Playwright** | Tests end-to-end en el navegador |

---

### Visión General de la Arquitectura

```
 ┌───────────────────────────────────────────────────────────┐
 │                  Navegador del Usuario                    │
 └────────────────────────┬──────────────────────────────────┘
                          │ HTTPS
 ┌────────────────────────▼──────────────────────────────────┐
 │                CDN de Vercel (Global)                     │
 │  ┌─────────────────────────────────────────────────────┐  │
 │  │   Nuxt.js SSG — HTML, CSS y JS estáticos           │  │
 │  │   (Pre-construidos en el momento del despliegue)    │  │
 │  └─────────────────────────────────────────────────────┘  │
 │  ┌─────────────────────────────────────────────────────┐  │
 │  │   Funciones Go Serverless (/api/*)                  │  │
 │  │   comment.go · rating.go · auth/ · webhook/         │  │
 │  └───────────────────────┬─────────────────────────────┘  │
 └──────────────────────────┼────────────────────────────────┘
                            │ API de Sanity (con token privado)
 ┌──────────────────────────▼────────────────────────────────┐
 │              Content Lake de Sanity.io                    │
 │   products · categories · comments · ratings · config     │
 └───────────────────────────────────────────────────────────┘
```

Cuando el administrador de la tienda publica un cambio en **Sanity Studio**, un webhook dispara una reconstrucción automática en Vercel, y el sitio estático actualizado se sirve a nivel mundial en cuestión de minutos — sin necesidad de ningún despliegue manual.

---

### Instalación Rápida

#### Prerrequisitos

- **Node.js** 20 LTS — [nodejs.org](https://nodejs.org)
- **Go** 1.22+ — [go.dev](https://go.dev)
- **Vercel CLI** — `npm install -g vercel`
- Un proyecto de [Sanity.io](https://sanity.io) configurado (ver [`docs/implementationPlan.md`](docs/implementationPlan.md) §0.3)

#### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/lectorpobre.git
cd lectorpobre

# 2. Instalar dependencias del frontend
npm install

# 3. Instalar dependencias del backend Go
cd api && go mod download && cd ..

# 4. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores reales (ver sección Variables de Entorno)

# 5. Levantar el entorno de desarrollo local
vercel dev
```

El sitio estará disponible en `http://localhost:3000`.

> **Nota:** `vercel dev` levanta simultáneamente el frontend de Nuxt.js y las funciones serverless de Go, emulando con precisión el entorno de producción de Vercel en tu máquina local.

---

### Estructura del Proyecto

```
lectorpobre/
├── .github/
│   ├── ISSUE_TEMPLATE/          # Templates de issues de GitHub
│   ├── PULL_REQUEST_TEMPLATE.md # Checklist de Pull Request
│   └── workflows/
│       ├── ci.yml               # Tests Go + Vitest + Playwright en cada PR
│       └── lighthouse.yml       # Lighthouse CI en cada despliegue de Vercel
│
├── api/                         # Funciones serverless en Go (Vercel Functions)
│   ├── comment.go               # POST /api/comment — comentarios de usuarios (RF-07)
│   ├── rating.go                # POST /api/rating  — calificaciones por estrellas (RF-06)
│   ├── search.go                # GET  /api/search  — búsqueda server-side (RF-18)
│   ├── auth/                    # Handlers de autenticación del administrador
│   │   ├── login.go             # POST /api/auth/login  (RF-08)
│   │   └── logout.go            # POST /api/auth/logout (RF-09)
│   ├── webhook/
│   │   └── rebuild.go           # POST /api/webhook/rebuild — Sanity → Vercel
│   ├── handlers/                # Tipos de payload compartidos y lógica de validación
│   ├── sanity/                  # Cliente de escritura Sanity (usa token privado)
│   ├── middleware/              # CORS, rate limiting, verificación HMAC
│   └── constants/               # Códigos de error centralizados
│
├── components/                  # Componentes Vue 3 reutilizables
│   ├── ProductCard.vue          # Tarjeta de producto para la cuadrícula del catálogo (RF-01)
│   ├── StarRating.vue           # Calificación interactiva por estrellas (RF-06)
│   ├── CommentForm.vue          # Formulario de envío de comentarios (RF-07)
│   ├── WhatsAppButton.vue       # CTA de contacto por WhatsApp (RF-17)
│   ├── PrimaryButton.vue        # Botón reutilizable con estilos
│   └── StockIndicator.vue       # Indicador de stock en tiempo real (RF-03)
│
├── composables/                 # Lógica de negocio Vue 3 (Composition API)
│   ├── useCatalog.ts            # Consulta, filtrado y búsqueda del catálogo (RF-01, RF-04, RF-18)
│   ├── useStock.ts              # Consulta de stock en tiempo real a Sanity (RF-03)
│   ├── useRating.ts             # Envío de calificaciones (RF-06)
│   └── useComment.ts            # Envío de comentarios (RF-07)
│
├── pages/                       # Rutas basadas en archivos (enrutamiento automático de Nuxt)
│   ├── index.vue                # Página principal del catálogo (RF-01, RF-04, RF-18, RF-19)
│   ├── product/[slug].vue       # Página de detalle de producto (RF-02, RF-03, RF-20)
│   └── admin/login.vue          # Página de login del administrador (RF-08)
│
├── layouts/
│   ├── default.vue              # Layout del sitio público
│   └── admin.vue                # Layout del panel de administración
│
├── middleware/
│   └── auth.ts                  # Guardia de rutas Nuxt — redirige a login (RF-10)
│
├── types/
│   ├── api.ts                   # Tipos TypeScript para los contratos de API
│   └── sanity.ts                # Tipos TypeScript que replican los schemas de Sanity
│
├── sanity/                      # Configuración de Sanity Studio
│   ├── sanity.config.ts
│   └── schemas/                 # Schemas de contenido (producto, categoría, comentario…)
│
├── assets/css/global.css        # Custom properties CSS y tokens de diseño
├── tests/                       # Tests unitarios (Vitest) y E2E (Playwright)
└── docs/                        # Documentación técnica completa del proyecto
```

---

### Variables de Entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción | Alcance | Requerida |
|---|---|---|---|
| `NUXT_PUBLIC_SANITY_PROJECT_ID` | ID del proyecto en Sanity.io | Frontend + Backend | ✅ |
| `NUXT_PUBLIC_SANITY_DATASET` | Dataset de Sanity (`production` o `staging`) | Frontend + Backend | ✅ |
| `SANITY_WRITE_TOKEN` | Token de escritura privado — **nunca exponer al navegador** | Solo Backend (Go) | ✅ |
| `SANITY_WEBHOOK_SECRET` | Secreto HMAC para validar webhooks entrantes de Sanity | Solo Backend (Go) | ✅ |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt de la contraseña del administrador | Solo Backend (Go) | ✅ |
| `ADMIN_JWT_SECRET` | Clave secreta para firmar tokens JWT de sesión de admin | Solo Backend (Go) | ✅ |
| `ALLOWED_ORIGIN` | Origen permitido en CORS (`http://localhost:3000` en desarrollo) | Solo Backend (Go) | ✅ |
| `NUXT_PUBLIC_PLAUSIBLE_DOMAIN` | Dominio para Plausible Analytics | Frontend | ⬜ |
| `CAPTCHA_SECRET_KEY` | Clave secreta para validación anti-bot | Solo Backend (Go) | ⬜ |

> ⚠️ **Nunca commitees `.env.local` ni valores reales de variables privadas.** El `.gitignore` ya excluye todos los archivos `*.env*.local`.

---

### Ejecución de Tests

```bash
# Backend — Tests unitarios de Go
cd api && go test ./... -v

# Frontend — Tests unitarios con Vitest
npm run test

# Frontend — Tests con reporte de cobertura
npm run test -- --coverage

# E2E — Playwright (requiere servidor activo o BASE_URL configurada)
npx playwright test

# E2E — Archivo de test específico
npx playwright test tests/e2e/catalog.spec.ts
```

---

### Documentación

La documentación técnica completa se encuentra en la carpeta [`docs/`](docs/):

| Documento | Descripción |
|---|---|
| [`ERS_LectorPobre.md`](docs/ERS_LectorPobre.md) | Especificación de Requisitos del Sistema |
| [`Arquitectura_Tecnica_Detallada_LectorPobre.md`](docs/Arquitectura_Tecnica_Detallada_LectorPobre.md) | Arquitectura técnica detallada |
| [`Stack_Tecnologico_LectorPobre.md`](docs/Stack_Tecnologico_LectorPobre.md) | Justificación del stack tecnológico |
| [`DEVELOPMENT_GUIDELINES.md`](docs/DEVELOPMENT_GUIDELINES.md) | Estándares de código y guía de estilo |
| [`VyV_LectorPobre.md`](docs/VyV_LectorPobre.md) | Plan de Verificación y Validación (V&V) |
| [`implementationPlan.md`](docs/implementationPlan.md) | Plan de implementación por fases |

---

### Contribución

1. Lee [`docs/DEVELOPMENT_GUIDELINES.md`](docs/DEVELOPMENT_GUIDELINES.md) antes de contribuir.
2. Crea una rama a partir de `develop`:
   ```bash
   git checkout -b feat/nombre-de-la-funcionalidad
   ```
3. Asegúrate de que todos los tests pasen localmente antes de abrir un PR:
   ```bash
   cd api && go test ./...   # Tests del backend Go
   npm run test              # Tests unitarios del frontend con Vitest
   npx playwright test       # Tests E2E con Playwright
   ```
4. Abre un Pull Request contra `develop` usando el template proporcionado.
5. El pipeline de CI debe pasar antes de que cualquier PR pueda ser mergeado.
