/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        lab: {
          teal: '#0d9488',
          emerald: '#059669',
          danger: '#dc2626',
          warning: '#d97706',
          dark: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}


