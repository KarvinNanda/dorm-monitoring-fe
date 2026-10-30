// Colours that change between light and dark mode are CSS variables
// (RGB channels, defined in src/style.css) so `bg-gray-50/80` style
// opacity modifiers keep working.
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`
const scale = (name, steps) =>
  Object.fromEntries(steps.map((s) => [s, themed(`${name}-${s}`)]))
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        // Brand green scale. 500/600 are the same in both modes (buttons,
        // focus ring); tints (50-300) and text shades (700-900) flip in dark.
        // White text on 600 = 5.1:1.
        brand: scale('brand', STEPS),
        // Neutral scale used heavily by pages not yet revamped. Inverted in
        // dark mode so text-gray-800 becomes light text, bg-gray-50 a dark panel.
        gray: scale('gray', STEPS),
        // Fixed dark green: button hover and the login brand panel.
        // White text on it = 7.3:1 in both modes.
        forest: '#256328',
        surface: themed('surface'),
        card: themed('card'),
        // Text: ink for body, ink-muted for secondary (>= 5.3:1 in both modes).
        ink: {
          DEFAULT: themed('ink'),
          muted: themed('ink-muted'),
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
