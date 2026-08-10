/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: "#2E7D32",
        "primary-hover": "#256328",
        secondary: "#6D4C41",
        "glass-white": "rgba(255, 255, 255, 0.7)",
        "glass-border": "rgba(255, 255, 255, 0.3)",
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium': '0 10px 25px -5px rgba(46, 125, 50, 0.15)',
      }
    }
  },
  plugins: []
}
