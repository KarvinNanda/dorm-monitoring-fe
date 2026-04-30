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
    expect(wrapper.text()).toContain('open') // belum outTime
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

  it('hapus visit → confirm + remove + refetch', async () => {
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    guestVisitService.remove.mockResolvedValueOnce({})
    const wrapper = mount(TamuPage)
    await flushPromises()
    const deleteBtn = wrapper.find('button[title="Hapus"]')
    await deleteBtn.trigger('click')
    await flushPromises()
    expect(window.confirm).toHaveBeenCalled()
    expect(guestVisitService.remove).toHaveBeenCalledWith(10)
    window.confirm = originalConfirm
  })
})
