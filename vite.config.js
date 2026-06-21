import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: {
    allowedHosts: ['rumahalambahagia.com','www.rumahalambahagia.com'],

    proxy: {
      '/api': {
        target: 'https://192.168.75.128:3000',
        changeOrigin: true,
        secure: false,
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