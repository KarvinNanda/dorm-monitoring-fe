/**
 * AbsenPage smoke test.
 * Cover dua persona: resident (clock in/out + history) dan admin (latest list + manual entry).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/checkLogService', () => ({
  checkLogService: {
    getMe: vi.fn(),
    getMyHistory: vi.fn(),
    listLatest: vi.fn(),
    getUserHistory: vi.fn(),
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    createManual: vi.fn()
  }
}))
vi.mock('@/services/userService', () => ({
  userService: { list: vi.fn() }
}))

import AbsenPage from '@/modules/absen/views/AbsenPage.vue'
import { checkLogService } from '@/services/checkLogService'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

function loginAs(role) {
  const store = useAuthStore()
  store.setTokens('a', 'r')
  store.setUser({ id: 1, name: 'Tester', roles: [role] })
}

describe('AbsenPage — resident', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('resident')
    checkLogService.getMe.mockResolvedValue({ type: 'OUT', time: '2026-04-29T01:00:00Z' })
    checkLogService.getMyHistory.mockResolvedValue({
      data: [{ id: 1, type: 'IN', time: '2026-04-29T01:00:00Z', note: '' }],
      meta: { total: 1, totalPages: 1 }
    })
  })

  it('fetch status + history saat mount', async () => {
    mount(AbsenPage)
    await flushPromises()
    expect(checkLogService.getMe).toHaveBeenCalled()
    expect(checkLogService.getMyHistory).toHaveBeenCalled()
  })

  it('status terakhir OUT → boleh tap IN', async () => {
    const wrapper = mount(AbsenPage)
    await flushPromises()
    const tapIn = wrapper.findAll('button').find((b) => b.text().includes('Tap In'))
    expect(tapIn.element.disabled).toBe(false)
  })

  it('clockIn dipanggil dengan note', async () => {
    checkLogService.clockIn.mockResolvedValueOnce({ id: 2, type: 'IN', time: 'x' })
    const wrapper = mount(AbsenPage)
    await flushPromises()
    await wrapper.find('input[type="text"]').setValue('catatan masuk')
    const tapIn = wrapper.findAll('button').find((b) => b.text().includes('Tap In'))
    await tapIn.trigger('click')
    await flushPromises()
    expect(checkLogService.clockIn).toHaveBeenCalledWith('catatan masuk')
  })

  it('TIDAK fetch data admin (latest/users) untuk role resident', async () => {
    mount(AbsenPage)
    await flushPromises()
    expect(checkLogService.listLatest).not.toHaveBeenCalled()
    expect(userService.list).not.toHaveBeenCalled()
  })
})

describe('AbsenPage — admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('admin')
    checkLogService.listLatest.mockResolvedValue({
      data: [{ id: 1, userId: 5, user: { id: 5, name: 'Andi' }, type: 'IN', time: '2026-04-29T01:00:00Z' }],
      meta: { total: 1, totalPages: 1 }
    })
    userService.list.mockResolvedValue({
      data: [{ id: 5, name: 'Andi' }],
      meta: { total: 1, totalPages: 1 }
    })
  })

  it('fetch latest + users saat mount, TIDAK fetch resident endpoints', async () => {
    mount(AbsenPage)
    await flushPromises()
    expect(checkLogService.listLatest).toHaveBeenCalled()
    expect(userService.list).toHaveBeenCalled()
    expect(checkLogService.getMe).not.toHaveBeenCalled()
  })

  it('render row latest dengan nama user', async () => {
    const wrapper = mount(AbsenPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Andi')
  })

  it('manual modal: validasi user wajib dipilih', async () => {
    const wrapper = mount(AbsenPage)
    await flushPromises()
    const openBtn = wrapper.findAll('button').find((b) => b.text().includes('Absensi Manual'))
    await openBtn.trigger('click')
    await flushPromises()
    const submitBtn = wrapper.findAll('button').find((b) => b.text() === 'Simpan')
    await submitBtn.trigger('submit') // submit langsung tanpa pilih user
    // form submit-event juga ditrigger via @submit.prevent — pakai form trigger:
    const forms = wrapper.findAll('form')
    await forms[forms.length - 1].trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Pilih user/i)
    expect(checkLogService.createManual).not.toHaveBeenCalled()
  })
})

describe('AbsenPage — fallback non-admin/resident', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('receptionist')
  })

  it('menampilkan pesan akses terbatas', async () => {
    const wrapper = mount(AbsenPage)
    await flushPromises()
    expect(wrapper.text()).toMatch(/hanya tersedia untuk role/i)
  })
})
