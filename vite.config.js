import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  server: {
    allowedHosts: ['barber-bath-showman.ngrok-free.dev'],

    proxy: {
      '/api': {
        target: 'https://6a75-125-161-49-230.ngrok-free.app',
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