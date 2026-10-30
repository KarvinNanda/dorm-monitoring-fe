/**
 * TamuPage smoke test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/guestService', () => ({
  guestService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}))
vi.mock('@/services/guestVisitService', () => ({
  guestVisitService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    close: vi.fn(),
    remove: vi.fn()
  }
}))

import TamuPage from '@/modules/tamu/views/TamuPage.vue'
import { mountWithConfirm, answerConfirm } from '../helpers/confirmDialog'
import { guestService } from '@/services/guestService'
import { guestVisitService } from '@/services/guestVisitService'

describe('TamuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    guestService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Bu Sari', phoneNumber: '08123', note: 'tetangga' }],
      meta: { total: 1, totalPages: 1 }
    })
    guestVisitService.list.mockResolvedValue({
      data: [{
        id: 10,
        guestId: 1,
        guest: { id: 1, name: 'Bu Sari' },
        inTime: '2026-04-29T03:00:00Z',
        outTime: null,
        note: 'silaturahmi'
      }],
      meta: { total: 1, totalPages: 1 }
    })
  })

  it('memanggil service kunjungan + tamu saat mount', async () => {
    mount(TamuPage)
    await flushPromises()
    expect(guestVisitService.list).toHaveBeenCalled()
    expect(guestService.list).toHaveBeenCalled()
  })

  it('render tab default (kunjungan) menampilkan nama tamu + status open', async () => {
    const wrapper = mount(TamuPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Bu Sari')
    expect(wrapper.find('.chip').text()).toBe('Open') // belum outTime
  })

  it('switch ke tab Data Tamu → tampil daftar tamu', async () => {
    const wrapper = mount(TamuPage)
    await flushPromises()
    const guestTab = wrapper.findAll('button').find((b) => b.text() === 'Data Tamu')
    await guestTab.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Bu Sari')
    expect(wrapper.text()).toContain('08123')
  })

  it('error fetch visits → toast', async () => {
    guestVisitService.list.mockReset()
    guestVisitService.list.mockRejectedValueOnce({
      response: { data: { message: 'Boom' } }
    })
    const wrapper = mount(TamuPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Boom')
  })

  it('hapus visit → dialog konfirmasi → Hapus → remove + refetch', async () => {
    guestVisitService.remove.mockResolvedValueOnce({})
    const wrapper = mountWithConfirm(TamuPage)
    await flushPromises()
    await wrapper.find('button[title="Hapus"]').trigger('click')
    expect(await answerConfirm(wrapper, 'Hapus')).toContain('Bu Sari')
    expect(guestVisitService.remove).toHaveBeenCalledWith(10)
    expect(guestVisitService.list).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('hapus visit → Batal → tidak ada request hapus', async () => {
    const wrapper = mountWithConfirm(TamuPage)
    await flushPromises()
    await wrapper.find('button[title="Hapus"]').trigger('click')
    await answerConfirm(wrapper, 'Batal')
    expect(guestVisitService.remove).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('hapus tamu (tab Data Tamu) juga lewat dialog konfirmasi', async () => {
    guestService.remove.mockResolvedValueOnce({})
    const wrapper = mountWithConfirm(TamuPage)
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text() === 'Data Tamu').trigger('click')
    await wrapper.find('button[title="Hapus"]').trigger('click')
    await answerConfirm(wrapper, 'Hapus')
    expect(guestService.remove).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('tidak punya h1 sendiri (judul sudah di header layout) dan tanpa emoji', async () => {
    const wrapper = mount(TamuPage)
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('tombol aksi ikon punya aria-label', async () => {
    const wrapper = mount(TamuPage)
    await flushPromises()
    const iconButtons = wrapper.findAll('button.icon-btn')
    expect(iconButtons.length).toBeGreaterThan(0)
    for (const b of iconButtons) expect(b.attributes('aria-label')).toBeTruthy()
  })
})
