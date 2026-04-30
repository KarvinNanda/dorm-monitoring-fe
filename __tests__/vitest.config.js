// Vitest config lives di dalam folder __tests__ (yang di-gitignore),
// supaya seluruh "layer test" ter-isolasi dari source project.
//
// Jalankan via scripts di package.json:
//   npm test                  → run sekali
//   npm run test:watch        → watch mode
//   npm run test:coverage     → coverage report
//   npm run test:security     → hanya suite security
//
// Project root ada di parent folder (../), alias "@" tetap menunjuk ke ../src.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const srcDir = fileURLToPath(new URL('../src', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': srcDir
    }
  },
  test: {
    root: rootDir,
    environment: 'happy-dom',
    globals: true,
    include: ['__tests__/**/*.test.js'],
    setupFiles: ['./__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/main.js',
        'src/App.vue',
        'src/utils/dummyData.js',
        'src/**/*.vue' // komponen di-skip — fokus coverage di logic layer
      ]
    }
  }
})
