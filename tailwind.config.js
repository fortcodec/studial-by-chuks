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
        // Fintech Dark Mode Palette
        'fintech-black': '#0F0F12',
        'fintech-card': '#1A1A1F',
        'fintech-surface': '#24242B',
        'fintech-border': '#2E2E38',
        'neon-green': '#00FF7F',
        'neon-purple': '#B026FF',
        'neon-purple-soft': '#A855F7',
        
        // Crisp Light Mode Accents
        'electric-blue': '#2563EB',
        'primary-navy': '#1A365D',
        'secondary-green': '#059669',
        'tertiary-orange': '#D97706',
        'neutral-background': '#F8FAFC',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-green': '0 0 14px rgba(0, 255, 127, 0.25)',
        'neon-purple': '0 0 16px rgba(176, 38, 255, 0.25)',
        'blue-glow': '0 0 14px rgba(37, 99, 235, 0.25)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.6, transform: 'scale(1.15)' },
        },
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
