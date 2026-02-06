/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#dfe8ff',
          200: '#b8ccff',
          300: '#87a8ff',
          400: '#5580ff',
          500: '#2952e3',
          600: '#1e3fb8',
          700: '#17308f',
          800: '#122568',
          900: '#0c1a45',
          950: '#060d24',
        },
        secondary: {
          50: '#faf8f5',
          100: '#f2ede4',
          200: '#e4d9c6',
          300: '#d3c0a1',
          400: '#c0a37a',
          500: '#b18b5a',
          600: '#9a7349',
          700: '#7d5b3c',
          800: '#664a34',
          900: '#543e2e',
          950: '#2e2018',
        },
        legal: {
          dark: '#1a1f2e',
          darker: '#141824',
          light: '#f8fafc',
          gold: '#d4af37',
          burgundy: '#722f37',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
