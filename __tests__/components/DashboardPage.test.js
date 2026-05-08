/**
 * DashboardPage smoke test.
 * Verifikasi rendering panel adaptif berdasar role + bentuk respons /dashboard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/dashboardService', () => ({
  dashboardService: { get: vi.fn() }
}))

import DashboardPage from '@/modules/dashboard/views/DashboardPage.vue'
import { dashboardService } from '@/services/dashboardService'
import { useAuthStore } from '@/stores/authStore'

function loginAs(role) {
  const store = useAuthStore()
  store.setTokens('a', 'r')
  store.setUser({ id: 1, name: 'Karvin', email: 'k@x', roles: Array.isArray(role) ? role : [role] })
}

describe('DashboardPage — common', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dashboardService.get.mockResolvedValue({})
  })

  it('panggil dashboardService.get saat mount', async () => {
    loginAs('admin')
    mount(DashboardPage)
    await flushPromises()
    expect(dashboardService.get).toHaveBeenCalled()
  })

  it('greeting menggunakan nama user', async () => {
    loginAs('admin')
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Selamat datang, Karvin')
  })

  it('error fetch → tampilkan pesan + tombol "Coba lagi"', async () => {
    loginAs('admin')
    dashboardService.get.mockReset()
    dashboardService.get.mockRejectedValueOnce({
      response: { data: { message: 'Server down' } }
    })
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Server down')
    expect(wrapper.text()).toContain('Coba lagi')
  })

  it('fallback "Pengguna" bila user tidak ada', async () => {
    const store = useAuthStore()
    store.setUser(null)
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Selamat datang, Pengguna')
  })
})

describe('DashboardPage — admin payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('admin')
    dashboardService.get.mockResolvedValue({
      currentClock: [
        { type: 'IN', count: 5 },
        { type: 'OUT', count: 2 }
      ],
      guestVisit: [
        { status: 'OPEN', count: 3 },
        { status: 'CLOSE', count: 7 }
      ],
      activeReservation: 4
    })
  })

  it('render panel currentClock IN/OUT dengan count yang benar', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Sedang Tap In')
    expect(text).toContain('Sudah Tap Out')
    expect(text).toContain('5')
    expect(text).toContain('2')
  })

  it('render panel guestVisit OPEN/CLOSE', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Tamu Aktif')
    expect(text).toContain('Tamu Selesai')
    expect(text).toContain('3')
    expect(text).toContain('7')
  })

  it('render activeReservation count', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Reservasi Aktif')
    expect(wrapper.text()).toContain('4')
  })

  it('TIDAK render clockStatus (hanya untuk resident)', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Status Absen')
  })
})

describe('DashboardPage — resident payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('resident')
    dashboardService.get.mockResolvedValue({
      clockStatus: {
        id: 3,
        time: '2026-04-30T14:20:00.000Z',
        type: 'IN',
        note: 'Dibantu absen'
      }
    })
  })

  it('render Status Absen + waktu + note', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Status Absen')
    expect(text).toContain('Sedang Tap In')
    expect(text).toContain('Dibantu absen')
  })

  it('TIDAK render panel admin/receptionist (currentClock, guestVisit, activeReservation)', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    // Header panel admin currentClock OUT — string ini eksklusif admin
    // (resident hanya menampilkan "Sudah Tap Out" sebagai value via emoji 🟡).
    expect(text).not.toContain('Sudah Tap Out')
    expect(text).not.toContain('Tamu Aktif')
    expect(text).not.toContain('Reservasi Aktif')
  })

  it('clockStatus null → tampilkan "Belum pernah absen"', async () => {
    dashboardService.get.mockReset()
    dashboardService.get.mockResolvedValue({ clockStatus: null })
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Belum pernah absen')
  })

  it('API 404 (resident belum pernah absen) → render "Belum pernah absen", BUKAN error', async () => {
    dashboardService.get.mockReset()
    dashboardService.get.mockRejectedValue({
      response: { status: 404, data: { message: 'No clock log yet' } }
    })
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Belum pernah absen')
    expect(text).toContain('Status Absen')
    expect(text).toContain('Info Akun')           // info akun tetap tampil
    expect(text).not.toContain('Coba lagi')       // bukan error state
    expect(text).not.toContain('No clock log yet')
  })

  it('API 500 tetap tampil sebagai error', async () => {
    dashboardService.get.mockReset()
    dashboardService.get.mockRejectedValue({
      response: { status: 500, data: { message: 'Server crash' } }
    })
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Server crash')
    expect(wrapper.text()).toContain('Coba lagi')
  })
})

describe('DashboardPage — receptionist payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('receptionist')
    dashboardService.get.mockResolvedValue({
      guestVisit: [
        { status: 'OPEN', count: 2 },
        { status: 'CLOSE', count: 1 }
      ],
      activeReservation: 5
    })
  })

  it('render guestVisit + activeReservation', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Tamu Aktif')
    expect(text).toContain('2')
    expect(text).toContain('Reservasi Aktif')
    expect(text).toContain('5')
  })

  it('TIDAK render currentClock atau clockStatus', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).not.toContain('Sudah Tap Out') // header panel admin
    expect(text).not.toContain('Status Absen')  // header panel resident
  })
})

describe('DashboardPage — multi-role (admin+resident)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs(['admin', 'resident'])
    // Sesuai contoh respons backend: union dari kedua role
    dashboardService.get.mockResolvedValue({
      currentClock: [{ type: 'IN', count: 1 }, { type: 'OUT', count: 1 }],
      clockStatus: { id: 5, time: '2026-05-04T12:51:59.692Z', type: 'OUT', note: 'pergi latihan' },
      guestVisit: [{ status: 'OPEN', count: 1 }, { status: 'CLOSE', count: 1 }],
      activeReservation: 0
    })
  })

  it('render gabungan panel admin + resident', async () => {
    const wrapper = mount(DashboardPage)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Sudah Tap Out')   // admin currentClock panel
    expect(text).toContain('Status Absen')    // resident clockStatus panel
    expect(text).toContain('pergi latihan')   // note resident
    expect(text).toContain('Tamu Aktif')      // admin guestVisit
  })
})

describe('DashboardPage — empty / unknown role', () => {
  it('tidak ada panel relevan → tampilkan empty state', async () => {
    loginAs('guest')
    dashboardService.get.mockResolvedValue({})
    const wrapper = mount(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada ringkasan untuk role Anda')
  })
})
