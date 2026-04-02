/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'slide-right':'slideInRight 0.25s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:      { '0%': { opacity: '0' },                                       '100%': { opacity: '1' } },
        slideUp:     { '0%': { opacity: '0', transform: 'translateY(16px)' },        '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight:{ '0%': { opacity: '0', transform: 'translateX(100%)' },        '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulseGlow:   { '0%,100%': { boxShadow: '0 0 8px #6366f155' },               '50%': { boxShadow: '0 0 24px #6366f199' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' },                      '100%': { backgroundPosition: '200% 0' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
