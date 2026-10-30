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
  useRoute: () => ({ path: '/dashboard' }),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' }
}))
vi.mock('@/services/authService', () => ({
  authService: { logout: vi.fn() }
}))
vi.mock('@/services/userDeviceService', () => ({
  userDeviceService: {
    register: vi.fn(),
    unregister: vi.fn()
  }
}))
vi.mock('@/utils/oneSignal', () => ({
  getCurrentPlayerId: vi.fn()
}))
vi.mock('@/services/notificationService', () => ({
  notificationService: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    readAll: vi.fn()
  }
}))
vi.mock('@/assets/logo-3.png', () => ({ default: 'logo.png' }))

import MainLayout from '@/layouts/MainLayout.vue'
import { authService } from '@/services/authService'
import { userDeviceService } from '@/services/userDeviceService'
import { getCurrentPlayerId } from '@/utils/oneSignal'
import { notificationService } from '@/services/notificationService'
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
    userDeviceService.unregister.mockResolvedValue({})
    getCurrentPlayerId.mockReturnValue('player-id-abc-123')
    notificationService.unreadCount.mockResolvedValue({ count: 0 })
    notificationService.list.mockResolvedValue({ data: [], meta: null })
    notificationService.readAll.mockResolvedValue({ counts: 0 })
  })

  it('admin melihat menu Users', () => {
    loginAs('admin')
    const wrapper = mount(MainLayout, mountOpts)
    expect(wrapper.text()).toContain('Users')
    expect(wrapper.text()).toContain('Inventaris')
    expect(wrapper.text()).toContain('Fasilitas')
  })

  it('resident: lihat Dashboard, Absensi, Inventaris, Fasilitas — tidak lihat Tamu/Users', () => {
    loginAs('resident')
    const wrapper = mount(MainLayout, mountOpts)
    const text = wrapper.text()
    expect(text).toContain('Dashboard')
    expect(text).toContain('Absensi')
    expect(text).toContain('Inventaris')
    expect(text).toContain('Fasilitas')
    expect(text).not.toContain('Tamu')
    expect(text).not.toContain('Users')
  })

  it('receptionist: lihat Dashboard, Tamu, Inventaris, Fasilitas — tidak lihat Absensi/Users', () => {
    loginAs('receptionist')
    const wrapper = mount(MainLayout, mountOpts)
    const text = wrapper.text()
    expect(text).toContain('Dashboard')
    expect(text).toContain('Tamu')
    expect(text).toContain('Inventaris')
    expect(text).toContain('Fasilitas')
    expect(text).not.toContain('Absensi')
    expect(text).not.toContain('Users')
  })

  it('semua role login melihat menu Dashboard', () => {
    for (const role of ['admin', 'resident', 'receptionist', 'guest']) {
      loginAs(role)
      const wrapper = mount(MainLayout, mountOpts)
      expect(wrapper.text(), `role ${role} harus lihat Dashboard`).toContain('Dashboard')
    }
  })

  it('logout: unregister push token (Player ID), panggil authService.logout, clearAuth, redirect /login', async () => {
    loginAs('admin')
    authService.logout.mockResolvedValueOnce({})
    const wrapper = mount(MainLayout, mountOpts)
    const logoutBtn = wrapper.findAll('button').find((b) => b.text().includes('Keluar'))
    await logoutBtn.trigger('click')
    await flushPromises()
    expect(userDeviceService.unregister).toHaveBeenCalledWith('player-id-abc-123')
    expect(authService.logout).toHaveBeenCalled()
    const store = useAuthStore()
    expect(store.accessToken).toBeNull()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('OneSignal belum init (no Player ID) → skip unregister, logout tetap jalan', async () => {
    loginAs('admin')
    getCurrentPlayerId.mockReturnValue(null)
    authService.logout.mockResolvedValueOnce({})
    const wrapper = mount(MainLayout, mountOpts)
    const logoutBtn = wrapper.findAll('button').find((b) => b.text().includes('Keluar'))
    await logoutBtn.trigger('click')
    await flushPromises()
    expect(userDeviceService.unregister).not.toHaveBeenCalled()
    expect(authService.logout).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('unregister push token gagal → logout tetap berjalan (fire-and-forget)', async () => {
    loginAs('admin')
    userDeviceService.unregister.mockRejectedValueOnce(new Error('Network error'))
    authService.logout.mockResolvedValueOnce({})
    const wrapper = mount(MainLayout, mountOpts)
    const logoutBtn = wrapper.findAll('button').find((b) => b.text().includes('Keluar'))
    await logoutBtn.trigger('click')
    await flushPromises()
    // Logout tetap berjalan meskipun unregister gagal
    expect(authService.logout).toHaveBeenCalled()
    const store = useAuthStore()
    expect(store.accessToken).toBeNull()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('mobile bottom nav admin: maksimal 4 tab menu + "Lainnya"', () => {
    loginAs('admin')
    const wrapper = mount(MainLayout, mountOpts)
    const bottomNav = wrapper.findAll('nav').find((n) => n.text().includes('Lainnya'))
    const tabs = bottomNav.findAll('a')
    expect(tabs.map((t) => t.text())).toEqual(['Dashboard', 'Absensi', 'Tamu', 'Inventaris'])
    expect(bottomNav.text()).not.toContain('Fasilitas')
    expect(bottomNav.text()).not.toContain('Users')
  })

  it('klik "Lainnya" → sheet berisi menu sisa (Fasilitas, Users), Profil, Keluar', async () => {
    loginAs('admin')
    const wrapper = mount(MainLayout, mountOpts)
    expect(wrapper.find('#more-sheet').exists()).toBe(false)
    const moreBtn = wrapper.findAll('button').find((b) => b.text().includes('Lainnya'))
    await moreBtn.trigger('click')
    const sheet = wrapper.find('#more-sheet')
    expect(sheet.exists()).toBe(true)
    expect(sheet.text()).toContain('Fasilitas')
    expect(sheet.text()).toContain('Users')
    expect(sheet.text()).toContain('Profil Saya')
    expect(sheet.text()).toContain('Keluar')
  })

  it('resident (4 menu) → semua menu muat di bottom nav, sheet hanya Profil + Keluar', async () => {
    loginAs('resident')
    const wrapper = mount(MainLayout, mountOpts)
    const bottomNav = wrapper.findAll('nav').find((n) => n.text().includes('Lainnya'))
    expect(bottomNav.findAll('a').map((t) => t.text())).toEqual(['Dashboard', 'Absensi', 'Inventaris', 'Fasilitas'])
    await wrapper.findAll('button').find((b) => b.text().includes('Lainnya')).trigger('click')
    const sheetLinks = wrapper.find('#more-sheet').findAll('a').map((a) => a.text())
    expect(sheetLinks).toEqual(['Profil Saya'])
  })

  it('judul halaman di header mengikuti route aktif', () => {
    loginAs('admin')
    const wrapper = mount(MainLayout, mountOpts)
    expect(wrapper.find('header h1').text()).toBe('Dashboard')
  })
})
