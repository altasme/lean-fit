import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'lf-black': '#0D0D0D',
        'lf-charcoal': '#2A2A2A',
        'lf-gold': '#D4AF37',
        'lf-brown': '#6B4E31',
        'lf-cream': '#F2E9DB',
        'lf-white': '#FFFFFF',
        'lf-success': '#3FB950',
        'lf-warning': '#D4AF37',
        'lf-error': '#F85149',
      },
      fontFamily: {
        display: ['"League Gothic"', 'sans-serif'],
        kicker: ['"Bebas Neue"', 'sans-serif'],
        body: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 24px 0 rgba(212, 175, 55, 0.45)',
      },
      letterSpacing: {
        wide2: '0.08em',
        wide3: '0.14em',
      },
    },
  },
  plugins: [],
} satisfies Config;
