import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium Navy Blue Theme
        navy: {
          50: '#E8EAF6',
          100: '#C5CAE9',
          200: '#9FA8DA',
          300: '#7986CB',
          400: '#5C6BC0',
          500: '#3F51B5', // Main navy
          600: '#1A237E', // Deep navy - primary
          700: '#0D1B3E',
          800: '#0A1429',
          900: '#050A14',
          950: '#020509',
        },
        // Premium Gold Accent
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B', // Main gold
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          metallic: '#D4AF37', // Pure gold
        },
        // Supporting Colors
        cream: {
          DEFAULT: '#FDF6E3',
          50: '#FFFEF9',
          100: '#FDF6E3',
        },
        pearl: '#F8F9FA',
        'navy-light': '#2C3E50',
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'premium-lg': '0 20px 60px rgba(212, 175, 55, 0.25)',
        'gold': '0 4px 15px rgba(245, 158, 11, 0.4)',
        'gold-lg': '0 8px 25px rgba(245, 158, 11, 0.6)',
        'navy': '0 4px 15px rgba(26, 35, 126, 0.4)',
        'navy-lg': '0 8px 25px rgba(26, 35, 126, 0.6)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(160deg, #ffffff 0%, #f8fafc 42%, #eef2ff 100%)',
        'gradient-navy': 'linear-gradient(135deg, #1A237E 0%, #0D1B3E 100%)',
        'gradient-gold': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
