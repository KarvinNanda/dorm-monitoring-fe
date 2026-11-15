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
    config.withCredentials = true
  }
  return config
})

// ============ RESPONSE INTERCEPTOR (REFRESH LOGIC) ============
// Refresh tokens are single-use: every POST /auth/refresh returns a new pair
// and the old refresh token stops working. Two refreshes with the same token
// (two requests in one tab, or two tabs) would make the second one fail with
// 401 and log the user out. So:
// - inside one tab, all 401s share one in-flight refresh (refreshPromise);
// - across tabs, the refresh runs inside a Web Lock, and before refreshing we
//   reload the tokens from localStorage: if another tab already rotated them,
//   use its new access token instead of refreshing again.
const REFRESH_LOCK = 'dorm-auth-refresh'
let refreshPromise = null

class SessionEndedError extends Error {}

function withRefreshLock(fn) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK, fn)
  }
  // Browsers without Web Locks (Safari < 15.4): single flight per tab only.
  return fn()
}

async function refreshAccessToken(staleAccessToken) {
  const authStore = useAuthStore()
  return withRefreshLock(async () => {
    const latest = authStore.syncTokensFromStorage()
    if (!latest.refreshToken) {
      // Logged out in another tab (or never logged in).
      throw new SessionEndedError('No refresh token')
    }
    if (latest.accessToken && latest.accessToken !== staleAccessToken) {
      // Another tab (or an earlier refresh here) already has a newer token.
      return latest.accessToken
    }

    let data
    try {
      // Plain axios, so this call does not go through this interceptor.
      ;({ data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: latest.refreshToken
      }))
    } catch (err) {
      const status = err?.response?.status
      // 4xx: the refresh token is invalid, expired or already used. Log out.
      // Network error or 5xx: the session may still be fine, keep it.
      if (status >= 400 && status < 500 && status !== 429) {
        throw new SessionEndedError(err.message)
      }
      throw err
    }

    // Dukung response yang di-wrap { data: {...} } atau flat
    const payload = data?.data || data
    if (!payload?.accessToken || !payload?.refreshToken) {
      throw new SessionEndedError('Refresh response without tokens')
    }
    authStore.setTokens(payload.accessToken, payload.refreshToken)
    return payload.accessToken
  })
}

function refreshOnce(staleAccessToken) {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(staleAccessToken).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

function endSession() {
  useAuthStore().clearAuth()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
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
      originalRequest._retry = true
      const sentWith = String(originalRequest.headers?.Authorization || '').replace(/^Bearer /, '')
      try {
        const newAccessToken = await refreshOnce(sentWith)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        if (refreshError instanceof SessionEndedError) endSession()
        return Promise.reject(refreshError)
      }
    }

    // Kalau 401 tanpa refresh token → langsung logout
    if (error.response?.status === 401 && !isAuthEndpoint) {
      endSession()
    }

    return Promise.reject(error)
  }
)

export default api
export { BASE_URL }
