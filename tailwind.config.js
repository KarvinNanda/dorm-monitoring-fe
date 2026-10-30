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
        // Brand green scale. 600 is the original brand colour (#2E7D32):
        // white text on 600 = 5.1:1, on 700 = 7:1 (WCAG AA for body text).
        brand: {
          50: '#F1F8F1',
          100: '#DCEFDD',
          200: '#B9DFBB',
          300: '#8CC98F',
          400: '#5DAF62',
          500: '#3E9444',
          600: '#2E7D32',
          700: '#256328',
          800: '#1E4F21',
          900: '#173D1A',
        },
        // Page background: white with a faint green tint, cards stay pure white.
        surface: '#F6FAF6',
        // Text colours: ink for body, ink-muted for secondary text (5.7:1 on white).
        ink: {
          DEFAULT: '#1C2B1E',
          muted: '#5B6B5D',
        },
        // Legacy aliases still used by pages not yet revamped.
        primary: "#2E7D32",
        "primary-hover": "#256328",
        secondary: "#6D4C41",
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(23, 61, 26, 0.06)',
        'raised': '0 8px 24px -8px rgba(23, 61, 26, 0.18)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
      },
    }
  },
  plugins: []
}
