/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Surface palette (page / card / elevated backgrounds + borders) ──────
        surface: {
          950: '#080a0f',   // page background
          900: '#111318',   // card background
          800: '#1a1d24',   // elevated / input background
          700: '#1e2028',   // subtle border
          600: '#2a2d36',   // visible border
          500: '#363a47',   // stronger border / hover
        },
        // ── Brand / accent ────────────────────────────────────────────────────
        brand: {
          DEFAULT: '#00d395',
          hover:   '#00b87d',
          muted:   'rgba(0,211,149,0.1)',
        },
        // ── Semantic: override emerald-400 / red-400 to match design tokens ────
        // pnlClass() returns text-emerald-400 / text-red-400 — overriding these
        // propagates the new colors to every profit/loss number automatically.
        emerald: {
          400: '#00d395',
          500: '#00b87d',
        },
        red: {
          400: '#ff4d4d',
          500: '#e63939',
        },
        amber: {
          400: '#f5a623',
          500: '#e09315',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },                               '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        skeleton: {
          '0%, 100%': { opacity: '0.4' },
          '50%':       { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
