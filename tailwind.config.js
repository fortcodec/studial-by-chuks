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
        'primary-navy': '#1A365D',
        'secondary-green': '#059669',
        'tertiary-orange': '#D97706',
        'neutral-background': '#F8FAFC',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
theme: {
  extend: {
    keyframes: {
      marquee: {
        '0%': { transform: 'translateX(100%)' },
        '100%': { transform: 'translateX(-100%)' },
      }
    }
  }
}
