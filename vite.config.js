import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: {
    allowedHosts: ['rumahalambahagia.com', 'www.rumahalambahagia.com'],

    proxy: {
      '/api': {
        target: 'https://api.rumahalambahagia.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})