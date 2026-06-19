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
        'brand-accent': '#06b6d4',
        'brand-gold': '#f59e0b',
        'dark-bg': '#0a0e1a',
        'dark-surface': '#111827',
        'dark-elevated': '#1e293b',
        'panel-bg': 'rgba(17, 24, 39, 0.65)',
      },
      fontFamily: {
        'space': ['"Playfair Display"', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'mesh-shift': 'mesh-shift 15s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 0.4s ease-out',
        'neon-flicker': 'neon-flicker 3s ease-in-out infinite',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(79, 70, 229, 0.3), 0 0 20px rgba(79, 70, 229, 0.1)' },
          '50%': { boxShadow: '0 0 15px rgba(79, 70, 229, 0.6), 0 0 40px rgba(79, 70, 229, 0.2)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'mesh-shift': {
          '0%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
          '25%, 75%': { opacity: '0.95' },
        },
      },
      backgroundSize: {
        '200%': '200% 200%',
        '400%': '400% 400%',
      },
    },
  },
  plugins: [],
}
