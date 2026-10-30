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
import { mountWithConfirm, answerConfirm } from '../helpers/confirmDialog'
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
      // Bentuk sesuai model ItemTransaction di backend: beforeQty / changeQty / afterQty.
      data: [{ id: 'tx1', type: 'ADD', beforeQty: 2, changeQty: 3, afterQty: 5, itemId: 1, item: { id: 1, name: 'Sapu' }, createdAt: '2026-04-29T00:00:00Z' }],
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

  it('switch ke tab Transaksi: tipe dalam bahasa Indonesia, perubahan bertanda, stok sebelum → sesudah', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const txTab = wrapper.findAll('button').find((b) => b.text() === 'Transaksi')
    await txTab.trigger('click')
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Tambah')
    expect(text).not.toContain('ADD')
    expect(text).toContain('+3')
    expect(text).toMatch(/2\s*→\s*5/)
  })

  it('tanpa h1 (judul di header layout) dan tanpa emoji', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.html()).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('tab memakai role tab + aria-selected', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['Item', 'Kategori', 'Transaksi'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
  })

  it('tombol aksi ikon punya aria-label yang menyebut itemnya', async () => {
    const wrapper = mount(InventoryPage)
    await flushPromises()
    expect(wrapper.find('button[aria-label="Catat transaksi Sapu"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Hapus item Sapu"]').exists()).toBe(true)
  })

  it('catat transaksi: dialog menyebut item + stok, simpan memanggil createTransaction', async () => {
    itemService.createTransaction.mockResolvedValueOnce({})
    const wrapper = mount(InventoryPage)
    await flushPromises()
    await wrapper.find('button[title="Catat transaksi"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.text()).toContain('Sapu')
    expect(dialog.text()).toContain('5')
    await wrapper.find('#tx-form-qty').setValue(4)
    await wrapper.find('#tx-form').trigger('submit.prevent')
    await flushPromises()
    expect(itemService.createTransaction).toHaveBeenCalledWith(1, { type: 'ADD', qty: 4, note: undefined })
  })

  it('hapus item → dialog konfirmasi → Hapus → remove', async () => {
    itemService.remove.mockResolvedValueOnce({})
    const wrapper = mountWithConfirm(InventoryPage)
    await flushPromises()
    await wrapper.find('button[title="Hapus"]').trigger('click')
    expect(await answerConfirm(wrapper, 'Hapus')).toContain('Sapu')
    expect(itemService.remove).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('hapus kategori → dialog konfirmasi → Hapus → remove', async () => {
    itemCategoryService.remove.mockResolvedValueOnce({})
    const wrapper = mountWithConfirm(InventoryPage)
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text() === 'Kategori').trigger('click')
    await wrapper.find('button[title="Hapus"]').trigger('click')
    expect(await answerConfirm(wrapper, 'Hapus')).toContain('Cleaning')
    expect(itemCategoryService.remove).toHaveBeenCalledWith(1)
    wrapper.unmount()
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
