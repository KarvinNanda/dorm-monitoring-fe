/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2E7D32",
        secondary: "#6D4C41"
      }
    }
  },
  plugins: []
}
