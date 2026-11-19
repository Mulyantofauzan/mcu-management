/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.html",
    "./js/**/*.js"
  ],
  // ✅ Enable dark mode using 'class' strategy (toggle via 'dark' class on html element)
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef8f6',
          100: '#dff2ee',
          200: '#bfe5de',
          300: '#8fd2c7',
          400: '#4fbfae',
          500: '#14a08c',
          600: '#0e8576',
          700: '#0a6b5e',
          800: '#0a554c',
          900: '#0b453f',
          950: '#062b27'
        },
        success: {
          light: '#86efac',
          DEFAULT: '#22c55e',
          dark: '#16a34a'
        },
        warning: {
          light: '#fde047',
          DEFAULT: '#eab308',
          dark: '#ca8a04'
        },
        danger: {
          light: '#fca5a5',
          DEFAULT: '#ef4444',
          dark: '#dc2626'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
