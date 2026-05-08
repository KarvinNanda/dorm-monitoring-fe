/**
 * LoginPage smoke test.
 * Verifikasi flow login: submit form → authService.login → setTokens →
 * authService.me → setUser → router.push('/dashboard').
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock })
}))

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn()
  }
}))

vi.mock('@/services/userDeviceService', () => ({
  userDeviceService: {
    register: vi.fn(),
    unregister: vi.fn()
  }
}))

vi.mock('@/utils/oneSignal', () => ({
  getPlayerId: vi.fn()
}))

vi.mock('@/assets/logo-3.png', () => ({ default: 'logo.png' }))

import LoginPage from '@/modules/auth/views/LoginPage.vue'
import { authService } from '@/services/authService'
import { userDeviceService } from '@/services/userDeviceService'
import { getPlayerId } from '@/utils/oneSignal'
import { useAuthStore } from '@/stores/authStore'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockReset()
    getPlayerId.mockResolvedValue('player-id-abc-123')
    userDeviceService.register.mockResolvedValue({})
  })

  it('login sukses → set tokens, set user, redirect /dashboard', async () => {
    authService.login.mockResolvedValueOnce({ accessToken: 'A', refreshToken: 'R' })
    authService.me.mockResolvedValueOnce({ id: 1, name: 'Karvin', email: 'k@x' })

    const wrapper = mount(LoginPage)
    await wrapper.find('input[type="email"]').setValue('k@x')
    await wrapper.find('input[type="password"]').setValue('rahasia12')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(authService.login).toHaveBeenCalledWith('k@x', 'rahasia12')
    expect(authService.me).toHaveBeenCalled()
    const store = useAuthStore()
    expect(store.accessToken).toBe('A')
    expect(store.user).toEqual({ id: 1, name: 'Karvin', email: 'k@x' })
    expect(getPlayerId).toHaveBeenCalled()
    expect(userDeviceService.register).toHaveBeenCalledWith('player-id-abc-123')
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('getPlayerId null (user tolak izin) → register tidak dipanggil, login tetap sukses', async () => {
    authService.login.mockResolvedValueOnce({ accessToken: 'A', refreshToken: 'R' })
    authService.me.mockResolvedValueOnce({ id: 1, name: 'Karvin', email: 'k@x' })
    getPlayerId.mockResolvedValueOnce(null)

    const wrapper = mount(LoginPage)
    await wrapper.find('input[type="email"]').setValue('k@x')
    await wrapper.find('input[type="password"]').setValue('rahasia12')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(getPlayerId).toHaveBeenCalled()
    expect(userDeviceService.register).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('register push token gagal → login tetap sukses (fire-and-forget)', async () => {
    authService.login.mockResolvedValueOnce({ accessToken: 'A', refreshToken: 'R' })
    authService.me.mockResolvedValueOnce({ id: 1, name: 'Karvin', email: 'k@x' })
    userDeviceService.register.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mount(LoginPage)
    await wrapper.find('input[type="email"]').setValue('k@x')
    await wrapper.find('input[type="password"]').setValue('rahasia12')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Login tetap berhasil meskipun register gagal
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    const store = useAuthStore()
    expect(store.accessToken).toBe('A')
  })

  it('error 401 → tampilkan pesan kredensial salah', async () => {
    authService.login.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Unauthorized' } }
    })

    const wrapper = mount(LoginPage)
    await wrapper.find('input[type="email"]').setValue('k@x')
    await wrapper.find('input[type="password"]').setValue('salahpass')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Unauthorized')
    expect(pushMock).not.toHaveBeenCalled()
    const store = useAuthStore()
    expect(store.accessToken).toBeNull()
  })

  it('ERR_NETWORK → tampilkan pesan koneksi', async () => {
    authService.login.mockRejectedValueOnce({ code: 'ERR_NETWORK' })
    const wrapper = mount(LoginPage)
    await wrapper.find('input[type="email"]').setValue('k@x')
    await wrapper.find('input[type="password"]').setValue('rahasia12')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Tidak dapat terhubung/i)
  })

  it('response tanpa accessToken → reject + clearAuth', async () => {
    authService.login.mockResolvedValueOnce({})
    const wrapper = mount(LoginPage)
    await wrapper.find('input[type="email"]').setValue('k@x')
    await wrapper.find('input[type="password"]').setValue('rahasia12')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Response login tidak valid')
    expect(pushMock).not.toHaveBeenCalled()
  })
})
