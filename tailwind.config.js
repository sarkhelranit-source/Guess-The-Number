/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4f46e5',
        'brand-secondary': '#ec4899',
        'dark-bg': '#0f172a',
        'panel-bg': 'rgba(30, 41, 59, 0.7)',
      },
      fontFamily: {
        'lora': ['Lora', 'serif'],
        'playfair': ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}
