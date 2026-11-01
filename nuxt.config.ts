// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    devtools: { enabled: false },
    modules: ['@nuxtjs/tailwindcss', '@nuxtjs/sanity'],

    css: ['~/assets/css/global.css'],

    // Excluir subdirectorios del monorepo (como sanity/node_modules con miles de archivos)
    // y archivos placeholder vacíos para evitar bloqueos del watcher y fallos EPIPE en esbuild.
    ignore: [
        'sanity/**',
        'api/**',
        'internal/**',
        'pkg/**',
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
                /[\\/]internal[\\/]/,
                /[\\/]pkg[\\/]/,
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
                    '**/internal/**',
                    '**/pkg/**',
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
        useCdn: process.env.NODE_ENV === 'production', // Live API en desarrollo sin caché para refresco instantáneo
        apiVersion: '2024-01-01',
    },

    nitro: {
        preset: 'vercel-static', // Prepara el proyecto como Static Site Generation (SSG) en Vercel
        prerender: {
            crawlLinks: process.env.NODE_ENV === 'production',
            routes: ['/', '/sitemap.xml'],
        },
    },

    runtimeConfig: {
        public: {
            plausibleDomain: process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
        },
    },

    app: {
        head: {
            htmlAttrs: { lang: 'es' },
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { property: 'og:image', content: '/logo.png' },
                { name: 'twitter:image', content: '/logo.png' },
            ],
            script: [
                ...(process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN
                    ? [
                          {
                              defer: true,
                              'data-domain': process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN,
                              src: 'https://plausible.io/js/script.tagged-events.js',
                          },
                      ]
                    : []),
            ],
            link: [
                { rel: 'icon', type: 'image/png', href: '/favicon.png' },
                { rel: 'shortcut icon', href: '/favicon.ico' },
                { rel: 'apple-touch-icon', href: '/favicon.png' },
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
