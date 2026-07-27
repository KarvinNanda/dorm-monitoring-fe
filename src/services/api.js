import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

// Dev lokal: BASE_URL relative ('/api/v1') → request tetap same-origin,
// diteruskan Vite dev server proxy (lihat vite.config.js) ke backend.
// Ini menghindari CORS sepenuhnya karena hop cross-origin terjadi di Node
// (Vite), bukan di browser.
// Production/tanpa proxy: set VITE_API_BASE_URL ke URL absolute backend
// (mis. https://api.rumahalambahagia.com) — tapi backend WAJIB mengizinkan
// CORS untuk origin frontend saat itu.
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim()
const BASE_URL = RAW_BASE ? `${RAW_BASE.replace(/\/$/, '')}/api/v1` : '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// ============ REQUEST INTERCEPTOR ============
// Selipkan access token ke setiap request
// api.interceptors.request.use((config) => {
//   const authStore = useAuthStore()
//   if (authStore.accessToken) {
//     config.headers.Authorization = `Bearer ${authStore.accessToken}`
//   }
//   return config
// })

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
    config.headers['ngrok-skip-browser-warning'] = true
    config.withCredentials = true
  }
  return config
})

// ============ RESPONSE INTERCEPTOR (REFRESH LOGIC) ============
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    // Jangan coba refresh kalau request-nya sendiri adalah endpoint auth
    const url = originalRequest?.url || ''
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      authStore.refreshToken
    ) {
      if (isRefreshing) {
        // Kalau sudah ada refresh jalan, masuk antrian
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Pakai axios langsung biar tidak masuk loop interceptor
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: authStore.refreshToken
        })

        // Dukung response yang di-wrap { data: {...} } atau flat
        const payload = data?.data || data
        const newAccessToken = payload.accessToken
        const newRefreshToken = payload.refreshToken

        if (!newAccessToken) throw new Error('Refresh token gagal')

        authStore.setTokens(newAccessToken, newRefreshToken)
        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        authStore.clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Kalau 401 tanpa refresh token → langsung logout
    if (error.response?.status === 401 && !isAuthEndpoint) {
      authStore.clearAuth()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
export { BASE_URL }
