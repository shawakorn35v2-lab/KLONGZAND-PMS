/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
