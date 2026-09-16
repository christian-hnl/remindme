import type { Config } from 'tailwindcss';

// Colors are CSS variables (see app/globals.css), so the light "Rechenpapier" and the
// dark "Blaupause" theme share every class.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        sheet: token('sheet'),
        inset: token('inset'),
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        line: token('line'),
        accent: token('accent'),
        'on-accent': token('on-accent'),
        marker: token('marker'),
        'on-marker': token('on-marker'),
        pen: token('pen'),
        leaf: token('leaf'),
        warn: token('warn'),
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sheet: 'var(--shadow)',
        lift: 'var(--shadow-lift)',
      },
    },
  },
  plugins: [],
};

export default config;
