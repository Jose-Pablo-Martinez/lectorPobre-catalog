// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    modules: ['@nuxtjs/tailwindcss', '@nuxtjs/sanity'],
    
    css: ['~/assets/css/global.css'],
    
    sanity: {
        projectId: process.env.NUXT_PUBLIC_SANITY_PROJECT_ID || '',
        dataset: process.env.NUXT_PUBLIC_SANITY_DATASET || 'staging',
        useCdn: true,           // Usa el CDN de Sanity para descargas más rápidas en producción
        apiVersion: '2024-01-01',
    },
    
    nitro: {
        preset: 'vercel-static' // Prepara el proyecto como Static Site Generation (SSG) en Vercel
    },
    
    app: {
        head: {
            htmlAttrs: { lang: 'es' },
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1' }
            ]
        }
    }
});
