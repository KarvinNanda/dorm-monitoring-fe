/**
 * Smoke test untuk InventoryPage.
 *
 * Tujuan: mount halaman dan verifikasi:
 *   - Service-service dipanggil saat mount (items, categories, transactions, dropdowns).
 *   - Tab default 'items' merender row data yang di-mock.
 *   - Switching tab tidak crash.
 *
 * Tidak menguji UI styling atau modal CRUD — itu domain e2e.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { useAuthStore } from '@/stores/authStore'

function loginAs(role) {
  const store = useAuthStore()
  store.setTokens('access', 'refresh')
  store.setUser({ id: 1, name: 'Tester', roles: [role] })
}

vi.mock('@/services/itemService', () => ({
  itemService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listTransactions: vi.fn(),
    createTransaction: vi.fn()
  }
}))
vi.mock('@/services/itemCategoryService', () => ({
  itemCategoryService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}))
vi.mock('@/services/itemTransactionService', () => ({
  itemTransactionService: {
    list: vi.fn(),
    bulk: vi.fn()
  }
}))

import InventoryPage from '@/modules/inventory/views/InventoryPage.vue'
import { itemService } from '@/services/itemService'
import { itemCategoryService } from '@/services/itemCategoryService'
import { itemTransactionService } from '@/services/itemTransactionService'

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('admin')
    itemService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Sapu', qty: 5, description: 'Sapu lidi', categoryId: 1, category: { id: 1, name: 'Cleaning' } }],
      meta: { total: 1, totalPages: 1 }
    })
    itemCategoryService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Cleaning', createdAt: '2026-01-01T00:00:00Z' }],
      meta: { total: 1, totalPages: 1 }
    })
    itemTransactionService.list.mockResolvedValue({
      data: [{ id: 1, type: 'ADD', qty: 3, itemId: 1, createdAt: '2026-04-29T00:00:00Z' }],
      meta: { total: 1, totalPages: 1 }
    })
  })

  it('memanggil semua service yang dibutuhkan saat mount', async () => {
    mount(InventoryPage)
    await flushPromises()
    expect(itemService.list).toHaveBeenCalled()
    expect(itemCategoryService.list).toHaveBeenCalled()
    expect(itemTransactionService.list).toHaveBeenCalled()
  })

  it('merender row item di tab default', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Sapu')
    expect(wrapper.text()).toContain('Cleaning')
  })

  it('switch ke tab Kategori menampilkan kategori', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const categoryTab = wrapper.findAll('button').find((b) => b.text() === 'Kategori')
    await categoryTab.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Cleaning')
  })

  it('switch ke tab Transaksi menampilkan badge tipe transaksi', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const txTab = wrapper.findAll('button').find((b) => b.text() === 'Transaksi')
    await txTab.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('ADD')
  })

  it('menampilkan toast error bila itemService.list gagal', async () => {
    itemService.list.mockRejectedValueOnce({
      response: { data: { message: 'Server error' } }
    })
    const wrapper = mount(InventoryPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Server error')
  })
})

describe('InventoryPage — permission gating (non-admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginAs('receptionist')
    itemService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Sapu', qty: 5, description: '-', categoryId: 1 }],
      meta: { total: 1, totalPages: 1 }
    })
    itemCategoryService.list.mockResolvedValue({
      data: [{ id: 1, name: 'Cleaning', createdAt: '2026-01-01T00:00:00Z' }],
      meta: { total: 1, totalPages: 1 }
    })
    itemTransactionService.list.mockResolvedValue({
      data: [],
      meta: { total: 0, totalPages: 1 }
    })
  })

  it('TIDAK fetch transaksi global (admin-only) saat mount', async () => {
    mount(InventoryPage)
    await flushPromises()
    expect(itemTransactionService.list).not.toHaveBeenCalled()
  })

  it('tidak menampilkan tombol "Tambah Item"', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Tambah Item'))
    expect(addBtn).toBeUndefined()
  })

  it('tidak menampilkan tab "Transaksi"', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const txTab = wrapper.findAll('button').find((b) => b.text() === 'Transaksi')
    expect(txTab).toBeUndefined()
  })

  it('tidak menampilkan tombol aksi (edit/hapus/tx) di tabel item', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    expect(wrapper.find('button[title="Catat transaksi"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Ubah"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Hapus"]').exists()).toBe(false)
  })

  it('tidak menampilkan tombol aksi pada tab Kategori', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const categoryTab = wrapper.findAll('button').find((b) => b.text() === 'Kategori')
    await categoryTab.trigger('click')
    await flushPromises()
    const addCategory = wrapper.findAll('button').find((b) => b.text().includes('Tambah Kategori'))
    expect(addCategory).toBeUndefined()
    expect(wrapper.find('button[title="Ubah"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Hapus"]').exists()).toBe(false)
  })
})
