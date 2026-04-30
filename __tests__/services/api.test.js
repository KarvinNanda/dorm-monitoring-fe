/**
 * Test axios instance di src/services/api.js.
 *
 * Fokus: memastikan interceptor berfungsi benar (bagian paling berisiko keamanan):
 * 1. Request interceptor: Authorization header terpasang saat ada token.
 * 2. Response interceptor (401 → refresh flow):
 *    - Kalau ada refreshToken → panggil /auth/refresh, simpan token baru,
 *      retry request asli.
 *    - Kalau refresh gagal → clearAuth + redirect ke /login.
 *    - Request ke endpoint auth TIDAK di-refresh (hindari infinite loop).
 *
 * Kita mock axios.create supaya kita kontrol instance, dan mock axios.post
 * untuk request refresh.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

describe('api axios instance', () => {
  let api
  let useAuthStore
  let axiosDefault
  let originalLocation

  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()

    // Mock window.location.href agar bisa di-assert tanpa navigasi beneran
    originalLocation = window.location
    delete window.location
    window.location = { pathname: '/dashboard', href: 'http://localhost/dashboard' }

    // Tidak pakai resetModules — jaga identitas axios agar spyOn() efektif
    // baik di sisi test maupun di sisi api.js. Module-level state (isRefreshing)
    // ter-reset otomatis di finally block.
    axiosDefault = (await import('axios')).default
    const apiModule = await import('@/services/api')
    api = apiModule.default
    useAuthStore = (await import('@/stores/authStore')).useAuthStore
  })

  afterEach(() => {
    window.location = originalLocation
  })

  describe('request interceptor', () => {
    it('tanpa token → request tidak punya Authorization header', () => {
      const config = { headers: {} }
      const handler = api.interceptors.request.handlers[0].fulfilled
      const out = handler(config)
      expect(out.headers.Authorization).toBeUndefined()
    })

    it('dengan token → Authorization Bearer ter-set', () => {
      const store = useAuthStore()
      store.setTokens('abc123', 'refresh')
      const config = { headers: {} }
      const handler = api.interceptors.request.handlers[0].fulfilled
      const out = handler(config)
      expect(out.headers.Authorization).toBe('Bearer abc123')
    })
  })

  describe('response interceptor — 401 tanpa refresh token', () => {
    it('langsung clearAuth + redirect /login', async () => {
      const store = useAuthStore()
      store.setTokens('access', null) // tidak ada refresh
      store.setUser({ id: 1 })

      const handler = api.interceptors.response.handlers[0].rejected
      const err = {
        response: { status: 401 },
        config: { url: '/user', headers: {} }
      }

      await expect(handler(err)).rejects.toBe(err)
      expect(store.accessToken).toBeNull()
      expect(window.location.href).toMatch(/\/login$/)
    })

    it('tidak redirect kalau sudah di /login', async () => {
      window.location.pathname = '/login'
      const store = useAuthStore()
      store.setTokens('access', null)
      const handler = api.interceptors.response.handlers[0].rejected
      const err = { response: { status: 401 }, config: { url: '/user', headers: {} } }

      await expect(handler(err)).rejects.toBe(err)
      // href tidak ditimpa (tetap nilai awal di beforeEach)
      expect(window.location.href).toBe('http://localhost/dashboard')
    })
  })

  describe('response interceptor — endpoint auth tidak di-refresh', () => {
    it('401 di /auth/login → skip refresh, reject langsung', async () => {
      const store = useAuthStore()
      store.setTokens('access', 'refresh')
      const handler = api.interceptors.response.handlers[0].rejected
      const err = {
        response: { status: 401 },
        config: { url: '/auth/login', headers: {} }
      }
      // refresh TIDAK dipanggil → axios.post tidak perlu di-mock
      await expect(handler(err)).rejects.toBe(err)
    })

    it('401 di /auth/refresh → skip refresh (hindari loop)', async () => {
      const store = useAuthStore()
      store.setTokens('access', 'refresh')
      const handler = api.interceptors.response.handlers[0].rejected
      const err = {
        response: { status: 401 },
        config: { url: '/auth/refresh', headers: {} }
      }
      await expect(handler(err)).rejects.toBe(err)
    })
  })

  describe('response interceptor — 401 dengan refresh token', () => {
    it('refresh sukses → setTokens dipanggil dengan payload baru', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-token')
      const setTokensSpy = vi.spyOn(store, 'setTokens')

      // Mock refresh endpoint (axios.post langsung, bukan instance)
      const postSpy = vi.spyOn(axiosDefault, 'post').mockResolvedValueOnce({
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' }
      })
      // Mock retry request (api(originalRequest)) agar tidak hit network.
      // Retry via adapter: kita intercept dengan meng-override originalRequest
      // lewat spyOn api default instance request method.
      const apiRequestSpy = vi.spyOn(api, 'request').mockResolvedValue({ data: 'retried' })

      const handler = api.interceptors.response.handlers[0].rejected
      const originalReq = { url: '/user', headers: {} }
      const err = { response: { status: 401 }, config: originalReq }

      await handler(err).catch(() => {})

      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refreshToken: 'refresh-token' }
      )
      // setTokens dipanggil dengan token baru (bukti refresh flow berjalan)
      expect(setTokensSpy).toHaveBeenCalledWith('new-access', 'new-refresh')
      apiRequestSpy.mockRestore()
    })

    it('refresh gagal → clearAuth + redirect /login', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-token')
      store.setUser({ id: 1 })

      vi.spyOn(axiosDefault, 'post').mockRejectedValueOnce(new Error('boom'))

      const handler = api.interceptors.response.handlers[0].rejected
      const err = { response: { status: 401 }, config: { url: '/user', headers: {} } }

      await expect(handler(err)).rejects.toBeInstanceOf(Error)
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.user).toBeNull()
      expect(window.location.href).toMatch(/\/login$/)
    })
  })

  describe('non-401 error → pass-through', () => {
    it('500 diteruskan tanpa refresh', async () => {
      const store = useAuthStore()
      store.setTokens('access', 'refresh')
      const handler = api.interceptors.response.handlers[0].rejected
      const err = { response: { status: 500 }, config: { url: '/user', headers: {} } }
      await expect(handler(err)).rejects.toBe(err)
      // Token TIDAK disentuh
      expect(store.accessToken).toBe('access')
    })
  })
})
