/**
 * NotificationBell smoke test.
 * Verifikasi: badge unread count, klik lonceng → fetch SEMUA notif terbaru
 * (descending by time, selalu re-fetch tiap dibuka jadi notif baru langsung
 * tampil paling atas), tandai semua dibaca.
 *
 * Dropdown di-Teleport ke <body> supaya lepas dari batasan lebar sidebar —
 * di test kita stub <Teleport> jadi render in-place biar gampang di-assert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/notificationService', () => ({
  notificationService: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    readAll: vi.fn()
  }
}))

import NotificationBell from '@/components/NotificationBell.vue'
import { notificationService } from '@/services/notificationService'

function makeNotif(id, createdAt, overrides = {}) {
  return {
    id,
    title: `Notif ${id}`,
    message: `Pesan ${id}`,
    createdAt,
    isRead: false,
    ...overrides
  }
}

const mountOpts = {
  global: {
    stubs: { teleport: true }
  }
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationService.unreadCount.mockResolvedValue({ count: 0 })
    notificationService.list.mockResolvedValue({ data: [], meta: null })
    notificationService.readAll.mockResolvedValue({ counts: 0 })
  })

  it('mount → fetch unreadCount, tampilkan badge kalau > 0', async () => {
    notificationService.unreadCount.mockResolvedValueOnce({ count: 3 })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    expect(notificationService.unreadCount).toHaveBeenCalled()
    expect(wrapper.text()).toContain('3')
  })

  it('badge tidak tampil kalau unreadCount 0', async () => {
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    expect(wrapper.find('.bg-red-500').exists()).toBe(false)
  })

  it('badge tampil "99+" kalau unreadCount > 99', async () => {
    notificationService.unreadCount.mockResolvedValueOnce({ count: 150 })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    expect(wrapper.text()).toContain('99+')
  })

  it('klik lonceng → panggil list({ page: 1, limit: 20 }) dan tampilkan semua hasil', async () => {
    notificationService.list.mockResolvedValueOnce({
      data: [
        makeNotif(1, '2026-01-01T00:00:00Z'),
        makeNotif(2, '2026-01-02T00:00:00Z')
      ],
      meta: null
    })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()

    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()

    expect(notificationService.list).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(wrapper.text()).toContain('Notif 1')
    expect(wrapper.text()).toContain('Notif 2')
  })

  it('urutan notif descending berdasarkan waktu (terbaru di atas)', async () => {
    notificationService.list.mockResolvedValueOnce({
      data: [
        makeNotif(1, '2026-01-01T00:00:00Z'),
        makeNotif(3, '2026-01-03T00:00:00Z'),
        makeNotif(2, '2026-01-02T00:00:00Z')
      ],
      meta: null
    })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()

    const items = wrapper.findAll('li')
    expect(items[0].text()).toContain('Notif 3')
    expect(items[1].text()).toContain('Notif 2')
    expect(items[2].text()).toContain('Notif 1')
  })

  it('tampilkan SEMUA notif dari backend (tidak dipotong ke 5)', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      makeNotif(i + 1, `2026-01-0${(i % 9) + 1}T00:00:00Z`)
    )
    notificationService.list.mockResolvedValueOnce({ data: many, meta: null })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('li').length).toBe(8)
  })

  it('buka dropdown kedua kali → re-fetch (notif baru langsung tampil paling atas)', async () => {
    notificationService.list
      .mockResolvedValueOnce({ data: [makeNotif(1, '2026-01-01T00:00:00Z')], meta: null })
      .mockResolvedValueOnce({
        data: [
          makeNotif(2, '2026-01-02T00:00:00Z'), // notif baru
          makeNotif(1, '2026-01-01T00:00:00Z')
        ],
        meta: null
      })

    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    const bellBtn = wrapper.find('button[aria-label="Notifikasi"]')

    await bellBtn.trigger('click') // buka → fetch pertama
    await flushPromises()
    expect(wrapper.text()).toContain('Notif 1')

    await bellBtn.trigger('click') // tutup
    await bellBtn.trigger('click') // buka lagi → fetch kedua, notif baru di atas
    await flushPromises()

    expect(notificationService.list).toHaveBeenCalledTimes(2)
    const items = wrapper.findAll('li')
    expect(items[0].text()).toContain('Notif 2')
    expect(items[1].text()).toContain('Notif 1')
  })

  it('list kosong → tampilkan "Belum ada notifikasi"', async () => {
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada notifikasi')
  })

  it('list gagal fetch → tampilkan pesan error', async () => {
    notificationService.list.mockRejectedValueOnce({
      response: { data: { message: 'Server down' } }
    })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Server down')
  })

  it('klik "Tandai semua dibaca" → panggil readAll, badge jadi 0', async () => {
    notificationService.unreadCount.mockResolvedValueOnce({ count: 4 })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    expect(wrapper.text()).toContain('4')

    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()

    const markAllBtn = wrapper.findAll('button').find((b) => b.text().includes('Tandai semua dibaca'))
    await markAllBtn.trigger('click')
    await flushPromises()

    expect(notificationService.readAll).toHaveBeenCalled()
    expect(wrapper.find('.bg-red-500').exists()).toBe(false)
  })

  it('klik di luar dropdown → dropdown tertutup', async () => {
    notificationService.list.mockResolvedValueOnce({
      data: [makeNotif(1, '2026-01-01T00:00:00Z')],
      meta: null
    })
    const wrapper = mount(NotificationBell, { ...mountOpts, attachTo: document.body })
    await flushPromises()
    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Notifikasi Terbaru')

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.text()).not.toContain('Notifikasi Terbaru')
    wrapper.unmount()
  })

  it('notif belum dibaca punya indikator titik hijau, sudah dibaca abu-abu', async () => {
    notificationService.list.mockResolvedValueOnce({
      data: [
        makeNotif(1, '2026-01-02T00:00:00Z', { isRead: false }),
        makeNotif(2, '2026-01-01T00:00:00Z', { isRead: true })
      ],
      meta: null
    })
    const wrapper = mount(NotificationBell, mountOpts)
    await flushPromises()
    await wrapper.find('button[aria-label="Notifikasi"]').trigger('click')
    await flushPromises()

    const items = wrapper.findAll('li')
    expect(items[0].find('.bg-primary').exists()).toBe(true)
    expect(items[1].find('.bg-gray-300').exists()).toBe(true)
  })
})
