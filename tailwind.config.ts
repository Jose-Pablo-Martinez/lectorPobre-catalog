import type { Config } from 'tailwindcss';

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './composables/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      display: ['Outfit', 'system-ui', 'sans-serif'],
      mono: ['"Space Grotesk"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
        whatsapp: {
          DEFAULT: '#25D366',
          hover: '#1EBE5D',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.06)',
        'soft-md': '0 8px 20px rgba(0, 0, 0, 0.1)',
        hard: '4px 4px 0px var(--color-brand-texto, #18181b)',
        'hard-sm': '2px 2px 0px var(--color-brand-texto, #18181b)',
        'hard-lg': '6px 6px 0px var(--color-brand-texto, #18181b)',
      },
    },
  },
  plugins: [],
} satisfies Config;
