/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fairway: {
          50:  '#f0f7f0',
          100: '#dceedc',
          200: '#baddbe',
          300: '#8ec490',
          400: '#5fa363',
          500: '#3d8341',
          600: '#2d6a31',
          700: '#235228',
          800: '#1a3d1e',
          900: '#0f2412',
          950: '#071509',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light:   '#e8c76a',
          dark:    '#9c7a28',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'green-felt': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%230f2412'/%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23235228' opacity='0.3'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
