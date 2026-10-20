import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff5ff', 100: '#dbe8ff', 200: '#bfd4ff', 300: '#93b4ff', 400: '#6089fb', 500: '#3b66f5', 600: '#2250e8', 700: '#1a40c9', 800: '#1b37a1', 900: '#1c347f' },
        navy: { 700: '#12264d', 800: '#0c1b3a', 900: '#081329', 950: '#050c1c' },
        accent: { 400: '#22d3ee', 500: '#06b6d4' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
}
export default config
