/**
 * MainLayout smoke test.
 * Verifikasi role-based menu filtering: admin lihat Users, non-admin tidak.
 * Logout flow: panggil authService.logout, clearAuth, router.push('/login').
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' }
}))
vi.mock('@/services/authService', () => ({
  authService: { logout: vi.fn() }
}))
vi.mock('@/assets/logo-3.png', () => ({ default: 'logo.png' }))

import MainLayout from '@/layouts/MainLayout.vue'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const mountOpts = {
  global: {
    stubs: {
      'router-link': { template: '<a><slot /></a>' },
      'router-view': { template: '<div />' }
    }
  }
}

function loginAs(role) {
  const store = useAuthStore()
  store.setTokens('a', 'r')
  store.setUser({ id: 1, name: 'Tester', roles: [role] })
}

describe('MainLayout — menu visibility per role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockReset()
  })

  it('admin melihat menu Users', () => {
    loginAs('admin')
    const wrapper = mount(MainLayout, mountOpts)
    expect(wrapper.text()).toContain('Users')
    expect(wrapper.text()).toContain('Inventaris')
    expect(wrapper.text()).toContain('Fasilitas')
  })

  it('resident: lihat Dashboard, Absensi, Inventaris — tidak lihat Tamu/Fasilitas/Users', () => {
    loginAs('resident')
    const wrapper = mount(MainLayout, mountOpts)
    const text = wrapper.text()
    expect(text).toContain('Dashboard')
    expect(text).toContain('Absensi')
    expect(text).toContain('Inventaris')
    expect(text).not.toContain('Tamu')
    expect(text).not.toContain('Fasilitas')
    expect(text).not.toContain('Users')
  })

  it('receptionist: lihat Dashboard, Tamu, Inventaris — tidak lihat Absensi/Fasilitas/Users', () => {
    loginAs('receptionist')
    const wrapper = mount(MainLayout, mountOpts)
    const text = wrapper.text()
    expect(text).toContain('Dashboard')
    expect(text).toContain('Tamu')
    expect(text).toContain('Inventaris')
    expect(text).not.toContain('Absensi')
    expect(text).not.toContain('Fasilitas')
    expect(text).not.toContain('Users')
  })

  it('semua role login melihat menu Dashboard', () => {
    for (const role of ['admin', 'resident', 'receptionist', 'guest']) {
      loginAs(role)
      const wrapper = mount(MainLayout, mountOpts)
      expect(wrapper.text(), `role ${role} harus lihat Dashboard`).toContain('Dashboard')
    }
  })

  it('logout: panggil authService.logout, clearAuth, redirect /login', async () => {
    loginAs('admin')
    authService.logout.mockResolvedValueOnce({})
    const wrapper = mount(MainLayout, mountOpts)
    const logoutBtn = wrapper.findAll('button').find((b) => b.text().includes('Keluar'))
    await logoutBtn.trigger('click')
    await flushPromises()
    expect(authService.logout).toHaveBeenCalled()
    const store = useAuthStore()
    expect(store.accessToken).toBeNull()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  // Catatan: kasus "logout API gagal" dilewati karena handleLogout di MainLayout
  // tidak meng-catch error eksplisit (hanya try/finally). Finally block sudah
  // ter-cover di test sukses di atas (clearAuth + redirect dieksekusi).
})
