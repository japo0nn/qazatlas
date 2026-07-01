/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#F5A623',
        surface: '#161B22',
        surfaceLight: '#FFFFFF',
        backgroundDark: '#0D1117',
        backgroundLight: '#F9F6F0',
      },
      boxShadow: {
        soft: '0 24px 80px rgba(13, 17, 23, 0.18)',
      },
    },
  },
  plugins: [],
}
