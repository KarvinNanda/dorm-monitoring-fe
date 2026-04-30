import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Route fallback yang DIJAMIN bisa diakses semua user login (tidak punya
// gate role). Dipakai sebagai tujuan redirect bila user mencoba akses
// route yang ia tidak punya izin role-nya — JANGAN pakai /dashboard sebagai
// fallback kalau dashboard juga punya gate role: bisa infinite loop.
const SAFE_FALLBACK = '/dashboard'

/**
 * Guard auth + role.
 *
 * Memakai sintaks return-value (vue-router 4) — sintaks `next(...)` lama
 * sudah deprecated dan menghasilkan warning di console.
 *
 * Refresh /user/me hanya dilakukan saat navigasi ke route yang BERBEDA
 * dengan from. Tanpa pengecekan ini, setiap redirect internal (mis. role
 * gate gagal) akan men-trigger fetch /user/me lagi, dan kalau redirect
 * targetnya juga gagal role-check, terjadi loop tak berhingga +
 * spam /user/me.
 */
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  // Route publik (mis. /login).
  if (!to.meta.requiresAuth) {
    if (to.path === '/login' && authStore.isAuthenticated) {
      return '/dashboard'
    }
    return true
  }

  // Butuh auth — harus ada access token.
  if (!authStore.isAuthenticated) {
    return '/login'
  }

  // Refresh /user/me hanya saat path benar-benar berubah, bukan saat
  // redirect ke path yang sama (mencegah loop dan request spam).
  if (to.path !== from.path) {
    try {
      const fresh = await authService.me()
      if (fresh) authStore.setUser(fresh)
    } catch (err) {
      // Interceptor di api.js sudah menangani 401 + refresh + redirect.
      if (!authStore.isAuthenticated) {
        return '/login'
      }
      // Error non-auth (network dll) — biarkan lanjut memakai data cache.
      console.warn('Gagal refresh /user/me:', err?.message || err)
    }
  }

  // Cek role setelah data user ter-update.
  if (to.meta.roles && to.meta.roles.length > 0 && authStore.user) {
    if (!authStore.hasAnyRole(to.meta.roles)) {
      // Hindari redirect-ke-diri-sendiri (yang akan loop).
      if (to.path === SAFE_FALLBACK) {
        // User bahkan tidak boleh masuk fallback — paksa logout.
        authStore.clearAuth()
        return '/login'
      }
      return SAFE_FALLBACK
    }
  }

  return true
})

export default router
