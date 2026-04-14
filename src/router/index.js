import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

/**
 * Guard untuk memeriksa auth + refresh data /user/me setiap navigasi.
 *
 * Tujuan "refresh /user/me" ini adalah:
 *   - memastikan access token masih valid (antisipasi token dicuri/dicabut)
 *   - sinkronisasi data user + role terbaru ke store
 *
 * Kalau call /user/me mengembalikan 401 dan interceptor (api.js) gagal
 * melakukan refresh, interceptor akan meng-clear auth & redirect ke /login.
 * Kita tetap tangkap error di sini supaya navigasi tidak ter-block.
 */
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Kalau route tidak butuh auth (misal /login), jangan panggil /user/me.
  if (!to.meta.requiresAuth) {
    // Tapi kalau user sudah login dan buka /login, lempar ke dashboard.
    if (to.path === '/login' && authStore.isAuthenticated) {
      return next('/dashboard')
    }
    return next()
  }

  // Butuh auth — harus ada access token.
  if (!authStore.isAuthenticated) {
    return next('/login')
  }

  // Refresh data user setiap pindah halaman.
  try {
    const fresh = await authService.me()
    if (fresh) authStore.setUser(fresh)
  } catch (err) {
    // Interceptor di api.js sudah menangani 401 + refresh + redirect.
    // Di sini kita cukup berhenti kalau auth sudah di-clear.
    if (!authStore.isAuthenticated) {
      return next('/login')
    }
    // Error non-auth (network dll) — biarkan lanjut memakai data cache.
    console.warn('Gagal refresh /user/me:', err?.message || err)
  }

  // Cek role setelah data user ter-update.
  if (to.meta.roles && to.meta.roles.length > 0 && authStore.user) {
    if (!authStore.hasAnyRole(to.meta.roles)) {
      return next('/dashboard')
    }
  }

  next()
})

export default router
