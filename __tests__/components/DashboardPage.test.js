/**
 * DashboardPage smoke test.
 * Verifikasi nama user, daftar role, dan stat counter dari dummy data.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardPage from '@/modules/dashboard/views/DashboardPage.vue'
import { useAuthStore } from '@/stores/authStore'

describe('DashboardPage', () => {
  beforeEach(() => {
    const store = useAuthStore()
    store.setUser({ id: 1, name: 'Karvin', email: 'k@x', roles: ['admin', 'resident'] })
  })

  it('menampilkan greeting dengan nama user', () => {
    const wrapper = mount(DashboardPage)
    expect(wrapper.text()).toContain('Selamat datang, Karvin')
  })

  it('menampilkan semua role user sebagai chip', () => {
    const wrapper = mount(DashboardPage)
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('resident')
  })

  it('fallback "Pengguna" bila user tidak ada', () => {
    const store = useAuthStore()
    store.setUser(null)
    const wrapper = mount(DashboardPage)
    expect(wrapper.text()).toContain('Selamat datang, Pengguna')
  })

  it('fallback "tanpa role" bila roles kosong', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, name: 'X', roles: [] })
    const wrapper = mount(DashboardPage)
    expect(wrapper.text()).toContain('tanpa role')
  })

  it('menampilkan section Status Absen, Kunjungan, dan Total Tamu', () => {
    const wrapper = mount(DashboardPage)
    const text = wrapper.text()
    expect(text).toContain('Status Absen')
    expect(text).toContain('Kunjungan Hari Ini')
    expect(text).toContain('Total Tamu Terdaftar')
  })
})
