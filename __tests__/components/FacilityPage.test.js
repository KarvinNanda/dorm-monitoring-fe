/**
 * Smoke test untuk FacilityPage.
 *
 * Verifikasi: mount halaman → service reservation & facility dipanggil,
 * tab default merender data reservasi, dan tombol quick-approve memicu
 * update status PENDING → APPROVED.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { useAuthStore } from '@/stores/authStore'

function loginAs(role) {
  const store = useAuthStore()
  store.setTokens('access', 'refresh')
  store.setUser({ id: 1, name: 'Tester', roles: [role] })
}

vi.mock('@/services/facilityService', () => ({
  facilityService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}))
vi.mock('@/services/facilityReservationService', () => ({
  facilityReservationService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}))

import FacilityPage from '@/modules/facility/views/FacilityPage.vue'
import { facilityService } from '@/services/facilityService'
import { facilityReservationService } from '@/services/facilityReservationService'

describe('FacilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('admin')
    facilityService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Aula', description: 'Aula utama', note: '' }],
      meta: { total: 1, totalPages: 1 }
    })
    facilityReservationService.list.mockResolvedValue({
      data: [{
        id: 10,
        facilityId: 1,
        facility: { id: 1, name: 'Aula' },
        title: 'Rapat bulanan',
        startDateTime: '2026-04-29T03:00:00Z',
        endDateTime: '2026-04-29T05:00:00Z',
        status: 'PENDING'
      }],
      meta: { total: 1, totalPages: 1 }
    })
    facilityReservationService.update.mockResolvedValue({ id: 10, status: 'APPROVED' })
  })

  it('memanggil service saat mount', async () => {
    mount(FacilityPage)
    await flushPromises()
    expect(facilityReservationService.list).toHaveBeenCalled()
    expect(facilityService.list).toHaveBeenCalled()
  })

  it('menampilkan reservasi dengan status PENDING', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Rapat bulanan')
    expect(wrapper.text()).toContain('Aula')
    expect(wrapper.text()).toContain('PENDING')
  })

  it('switch ke tab Daftar Fasilitas menampilkan fasilitas', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    const facilityTab = wrapper.findAll('button').find((b) => b.text() === 'Daftar Fasilitas')
    await facilityTab.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Aula utama')
  })

  it('quick-approve memanggil update dengan status APPROVED', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    // Tombol approve title="Approve" hanya muncul untuk status PENDING
    const approveBtn = wrapper.find('button[title="Approve"]')
    expect(approveBtn.exists()).toBe(true)
    await approveBtn.trigger('click')
    await flushPromises()
    expect(facilityReservationService.update).toHaveBeenCalledWith(10, { status: 'APPROVED' })
  })

  it('quick-reject memanggil update dengan status REJECTED', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    const rejectBtn = wrapper.find('button[title="Reject"]')
    expect(rejectBtn.exists()).toBe(true)
    await rejectBtn.trigger('click')
    await flushPromises()
    expect(facilityReservationService.update).toHaveBeenCalledWith(10, { status: 'REJECTED' })
  })

  it('toast error bila list reservasi gagal', async () => {
    facilityReservationService.list.mockRejectedValueOnce({
      response: { data: { message: 'Network down' } }
    })
    const wrapper = mount(FacilityPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Network down')
  })
})

describe('FacilityPage — permission gating (non-admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('resident')
    facilityService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Aula', description: 'Aula utama', note: '' }],
      meta: { total: 1, totalPages: 1 }
    })
    facilityReservationService.list.mockResolvedValue({
      data: [{
        id: 10,
        facilityId: 1,
        facility: { id: 1, name: 'Aula' },
        title: 'Rapat bulanan',
        startDateTime: '2026-04-29T03:00:00Z',
        endDateTime: '2026-04-29T05:00:00Z',
        status: 'PENDING'
      }],
      meta: { total: 1, totalPages: 1 }
    })
  })

  it('tetap bisa view reservasi (read = all roles)', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Rapat bulanan')
  })

  it('tidak menampilkan tombol "Tambah Reservasi"', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Tambah Reservasi'))
    expect(addBtn).toBeUndefined()
  })

  it('tidak menampilkan tombol Approve / Reject untuk reservasi PENDING', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    expect(wrapper.find('button[title="Approve"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Reject"]').exists()).toBe(false)
  })

  it('tidak menampilkan tombol Edit / Hapus reservasi', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    expect(wrapper.find('button[title="Ubah"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Hapus"]').exists()).toBe(false)
  })

  it('tidak menampilkan tombol aksi pada tab Daftar Fasilitas', async () => {
    const wrapper = mount(FacilityPage)
    await flushPromises()
    const facilityTab = wrapper.findAll('button').find((b) => b.text() === 'Daftar Fasilitas')
    await facilityTab.trigger('click')
    await flushPromises()
    const addFacility = wrapper.findAll('button').find((b) => b.text().includes('Tambah Fasilitas'))
    expect(addFacility).toBeUndefined()
    expect(wrapper.find('button[title="Ubah"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Hapus"]').exists()).toBe(false)
  })
})
