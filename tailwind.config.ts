import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Soft Blues (Ocean/Slate)
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98', // Main soft blue
          600: '#486581', 
          700: '#334E68', // Deep blue
          800: '#243B53',
          900: '#102A43',
          950: '#0B1C2D',
        },
        // Warm Earth Tones (Terracotta/Sand)
        gold: {
          50: '#FBF5EC',
          100: '#F6E6D1',
          200: '#EFD1A4',
          300: '#E6BB75',
          400: '#DCA247',
          500: '#D38D1C', // Warm terracotta/gold
          600: '#B47113',
          700: '#91580F',
          800: '#73440B',
          900: '#5F3609',
          metallic: '#C88D36', 
        },
        // Supporting Colors
        cream: {
          DEFAULT: '#FAF8F5',
          50: '#FCFBF9',
          100: '#FAF8F5',
        },
        pearl: '#FDFCFB',
        'navy-light': '#486581',
      },
      fontFamily: {
        heading: ['var(--font-manrope)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 18px 60px rgba(15, 23, 42, 0.10)',
        'premium-lg': '0 28px 80px rgba(15, 23, 42, 0.14)',
        gold: '0 14px 30px rgba(196, 144, 28, 0.18)',
        'gold-lg': '0 18px 40px rgba(196, 144, 28, 0.24)',
        navy: '0 14px 30px rgba(30, 64, 175, 0.18)',
        'navy-lg': '0 18px 40px rgba(30, 64, 175, 0.24)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(160deg, #ffffff 0%, #f8fafc 46%, #eef4ff 100%)',
        'gradient-navy': 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #B88915 100%)',
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
