// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'wc-bg': '#0a0f1e',
        'wc-card': '#111827',
        'wc-surface': '#1a2234',
        'wc-text': '#f0f4ff',
        'wc-muted': '#8899bb',
        'wc-gold': '#f0b429',
        'wc-gold-dark': '#c48a00',
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
