import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Outfit', 'system-ui', 'sans-serif']
    },
    extend: {
      colors: {
        brand: {
          primario: 'var(--color-brand-primario)',
          secundario: 'var(--color-brand-secundario)',
          acento: 'var(--color-brand-acento)',
          fondo: 'var(--color-brand-fondo)',
          texto: 'var(--color-brand-texto)',
        },
      }
    },
  },
  plugins: [],
} satisfies Config
