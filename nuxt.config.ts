// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    modules: ['@nuxtjs/tailwindcss', '@nuxtjs/sanity'],

    css: ['~/assets/css/global.css'],

    // Excluir subdirectorios del monorepo (como sanity/node_modules con miles de archivos)
    // y archivos placeholder vacíos para evitar bloqueos del watcher y fallos EPIPE en esbuild.
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

    sanity: {
        projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || 'rbrk7xv9',
        dataset: process.env.NUXT_PUBLIC_SANITY_DATASET || 'staging',
        useCdn: true, // Usa el CDN de Sanity para descargas más rápidas en producción
        apiVersion: '2024-01-01',
    },

    nitro: {
        preset: 'vercel-static', // Prepara el proyecto como Static Site Generation (SSG) en Vercel
        prerender: {
            crawlLinks: true,
            routes: ['/'],
        },
    },

    app: {
        head: {
            htmlAttrs: { lang: 'es' },
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            ],
            link: [
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                {
                    rel: 'preconnect',
                    href: 'https://fonts.gstatic.com',
                    crossorigin: '',
                },
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800&family=Space+Grotesk:wght@500;700&display=swap',
                },
            ],
        },
    },
});
