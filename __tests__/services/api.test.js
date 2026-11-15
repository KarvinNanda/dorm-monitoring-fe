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
    it('refresh sukses → setTokens token baru, request asli diulang dengan Authorization baru', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-token')
      const setTokensSpy = vi.spyOn(store, 'setTokens')

      // Mock refresh endpoint (axios.post langsung, bukan instance)
      const postSpy = vi.spyOn(axiosDefault, 'post').mockResolvedValueOnce({
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' }
      })
      // Retry memakai api(originalRequest), yang tidak lewat api.request.
      // Mock di level adapter supaya tidak ada request HTTP sungguhan (issue #11).
      const originalAdapter = api.defaults.adapter
      const adapter = vi.fn(async (config) => ({ data: 'retried', status: 200, statusText: 'OK', headers: {}, config }))
      api.defaults.adapter = adapter

      try {
        const handler = api.interceptors.response.handlers[0].rejected
        // Request interceptor selalu memasang token yang dipakai saat request dikirim.
        const originalReq = { url: '/user', headers: { Authorization: 'Bearer old-access' } }
        const err = { response: { status: 401 }, config: originalReq }

        const result = await handler(err)

        expect(postSpy).toHaveBeenCalledWith(
          expect.stringContaining('/auth/refresh'),
          { refreshToken: 'refresh-token' }
        )
        expect(setTokensSpy).toHaveBeenCalledWith('new-access', 'new-refresh')
        expect(adapter).toHaveBeenCalledTimes(1)
        expect(adapter.mock.calls[0][0].url).toBe('/user')
        expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer new-access')
        expect(result.data).toBe('retried')
      } finally {
        api.defaults.adapter = originalAdapter
      }
    })

    it('refresh ditolak (401 dari /auth/refresh) → clearAuth + redirect /login', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-token')
      store.setUser({ id: 1 })

      const refreshErr = Object.assign(new Error('Unauthorized'), { response: { status: 401, data: {} } })
      vi.spyOn(axiosDefault, 'post').mockRejectedValueOnce(refreshErr)

      const handler = api.interceptors.response.handlers[0].rejected
      const err = { response: { status: 401 }, config: { url: '/user', headers: { Authorization: 'Bearer old-access' } } }

      await expect(handler(err)).rejects.toBeInstanceOf(Error)
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.user).toBeNull()
      expect(window.location.href).toMatch(/\/login$/)
    })
  })

  describe('refresh token sekali pakai (backend rotasi setiap /auth/refresh)', () => {
    let originalAdapter
    let adapter

    beforeEach(() => {
      originalAdapter = api.defaults.adapter
      adapter = vi.fn(async (config) => ({ data: 'retried', status: 200, statusText: 'OK', headers: {}, config }))
      api.defaults.adapter = adapter
    })
    afterEach(() => {
      api.defaults.adapter = originalAdapter
      delete navigator.locks
    })

    const handler = () => api.interceptors.response.handlers[0].rejected
    const unauthorized = (token) => ({
      response: { status: 401 },
      config: { url: '/user', headers: { Authorization: `Bearer ${token}` } }
    })

    it('tiga request 401 bersamaan → hanya SATU POST /auth/refresh, semuanya diulang dengan token baru', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-1')
      let resolveRefresh
      const postSpy = vi.spyOn(axiosDefault, 'post').mockReturnValueOnce(
        new Promise((r) => (resolveRefresh = r))
      )

      const calls = [handler()(unauthorized('old-access')), handler()(unauthorized('old-access')), handler()(unauthorized('old-access'))]
      await Promise.resolve()
      resolveRefresh({ data: { data: { accessToken: 'access-2', refreshToken: 'refresh-2' } } })
      await Promise.all(calls)

      expect(postSpy).toHaveBeenCalledTimes(1)
      expect(adapter).toHaveBeenCalledTimes(3)
      for (const [config] of adapter.mock.calls) expect(config.headers.Authorization).toBe('Bearer access-2')
      expect(store.refreshToken).toBe('refresh-2')
    })

    it('tab lain sudah refresh (localStorage lebih baru dari memori tab ini) → TIDAK refresh lagi, pakai token dari tab lain', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-1')
      // Tab lain merotasi token: localStorage berubah, Pinia di tab ini belum tahu.
      localStorage.setItem('accessToken', 'access-from-other-tab')
      localStorage.setItem('refreshToken', 'refresh-from-other-tab')
      const postSpy = vi.spyOn(axiosDefault, 'post')

      await handler()(unauthorized('old-access'))

      expect(postSpy).not.toHaveBeenCalled()
      expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer access-from-other-tab')
      expect(store.accessToken).toBe('access-from-other-tab')
      expect(store.refreshToken).toBe('refresh-from-other-tab')
    })

    it('refresh memakai refresh token terbaru dari localStorage, bukan salinan lama di memori', async () => {
      const store = useAuthStore()
      store.setTokens('access-1', 'refresh-1')
      // Hanya refresh token yang berbeda (mis. tab lain login ulang dengan akses yang juga sudah kedaluwarsa).
      localStorage.setItem('refreshToken', 'refresh-latest')
      const postSpy = vi.spyOn(axiosDefault, 'post').mockResolvedValueOnce({
        data: { accessToken: 'access-2', refreshToken: 'refresh-2' }
      })

      await handler()(unauthorized('access-1'))

      expect(postSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), { refreshToken: 'refresh-latest' })
    })

    it('refresh berjalan di dalam Web Lock yang sama untuk semua tab', async () => {
      const lockNames = []
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: { request: vi.fn(async (name, fn) => { lockNames.push(name); return fn() }) }
      })
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-1')
      vi.spyOn(axiosDefault, 'post').mockResolvedValueOnce({ data: { accessToken: 'access-2', refreshToken: 'refresh-2' } })

      await handler()(unauthorized('old-access'))

      expect(lockNames).toEqual(['dorm-auth-refresh'])
    })

    it('tab lain sudah logout (refresh token hilang dari localStorage) → logout juga, tanpa memanggil /auth/refresh', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-1')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      const postSpy = vi.spyOn(axiosDefault, 'post')

      await expect(handler()(unauthorized('old-access'))).rejects.toBeTruthy()

      expect(postSpy).not.toHaveBeenCalled()
      expect(store.accessToken).toBeNull()
      expect(window.location.href).toMatch(/\/login$/)
    })

    it('refresh gagal karena jaringan / 5xx → sesi TIDAK dihapus, error diteruskan', async () => {
      const store = useAuthStore()
      store.setTokens('old-access', 'refresh-1')
      vi.spyOn(axiosDefault, 'post').mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))

      await expect(handler()(unauthorized('old-access'))).rejects.toBeTruthy()

      expect(store.refreshToken).toBe('refresh-1')
      expect(window.location.href).toBe('http://localhost/dashboard')
    })
  })

  describe('request interceptor — header tambahan', () => {
    it('tidak mengirim header ngrok (backend CORS hanya mengizinkan Content-Type dan Authorization)', () => {
      const store = useAuthStore()
      store.setTokens('abc123', 'refresh')
      const out = api.interceptors.request.handlers[0].fulfilled({ headers: {} })
      expect(Object.keys(out.headers)).toEqual(['Authorization'])
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
