/**
 * UserList smoke test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, config } from '@vue/test-utils'

vi.mock('@/services/userService', () => ({
  userService: {
    list: vi.fn(),
    listRoles: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    assignRoles: vi.fn()
  }
}))

import UserList from '@/modules/user/views/UserList.vue'
import { mountWithConfirm, answerConfirm } from '../helpers/confirmDialog'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

// UserList links the own-account row to /profile. No router in these tests.
config.global.stubs = { ...config.global.stubs, RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store = useAuthStore()
    store.setUser({ id: 99, name: 'Me', roles: ['admin'] })

    userService.list.mockResolvedValue({
      data: [
        { id: 1, name: 'Andi', email: 'a@x', roles: [{ id: 1, name: 'admin' }], isActive: true },
        { id: 2, name: 'Budi', email: 'b@x', roles: [{ id: 2, name: 'resident' }], isActive: false },
        // user dengan id sama dengan currentUser harus di-hide
        { id: 99, name: 'Me', email: 'me@x', roles: [{ id: 1, name: 'admin' }], isActive: true }
      ],
      meta: { total: 3, totalPages: 1 }
    })
    userService.listRoles.mockResolvedValue([
      { id: 1, name: 'admin' },
      { id: 2, name: 'resident' }
    ])
  })

  it('fetch users + roles saat mount', async () => {
    mount(UserList)
    await flushPromises()
    expect(userService.list).toHaveBeenCalled()
    expect(userService.listRoles).toHaveBeenCalled()
  })

  it('render semua user dari server, termasuk akun sendiri', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Andi')
    expect(text).toContain('Budi')
    expect(text).toContain('me@x')
  })

  it('akun sendiri: tanda "Anda", tanpa tombol role / reset / nonaktifkan / hapus, ada link ke profil', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    expect(wrapper.text()).toContain('Anda')
    const labels = wrapper.findAll('button').map((b) => b.attributes('aria-label') || '')
    expect(labels.some((l) => l.endsWith(' Me'))).toBe(false)
    expect(labels).toContain('Hapus user Andi')
    expect(wrapper.find('a[href="/profile"]').exists()).toBe(true)
  })

  it('regresi: halaman terakhir yang hanya berisi akun sendiri tidak kosong', async () => {
    // 5 user di DB. Dulu limit 4 + filter akun sendiri di client membuat
    // halaman 2 (isinya hanya akun sendiri) tampil "Tidak ada user."
    userService.list.mockResolvedValue({
      data: [{ id: 99, name: 'Me', email: 'me@x', roles: [{ id: 1, name: 'admin' }], isActive: true }],
      meta: { total: 5, totalPages: 2, page: 2 }
    })
    const wrapper = mount(UserList)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Tidak ada user.')
    expect(wrapper.text()).toContain('me@x')
  })

  it('10 user per halaman di desktop', async () => {
    mount(UserList)
    await flushPromises()
    expect(userService.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }))
  })

  it('aktifkan user nonaktif → langsung memanggil activate', async () => {
    userService.activate.mockResolvedValueOnce({})
    const wrapper = mount(UserList)
    await flushPromises()
    await wrapper.find('button[aria-label="Aktifkan Budi"]').trigger('click')
    await flushPromises()
    expect(userService.activate).toHaveBeenCalledWith(2)
  })

  it('nonaktifkan user → dialog konfirmasi → Nonaktifkan → deactivate', async () => {
    userService.deactivate.mockResolvedValueOnce({})
    const wrapper = mountWithConfirm(UserList)
    await flushPromises()
    await wrapper.find('button[aria-label="Nonaktifkan Andi"]').trigger('click')
    expect(await answerConfirm(wrapper, 'Nonaktifkan')).toContain('Andi')
    expect(userService.deactivate).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('nonaktifkan user → Batal → tidak ada request', async () => {
    const wrapper = mountWithConfirm(UserList)
    await flushPromises()
    await wrapper.find('button[aria-label="Nonaktifkan Andi"]').trigger('click')
    await answerConfirm(wrapper, 'Batal')
    expect(userService.deactivate).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('hapus user → dialog konfirmasi → Hapus → remove', async () => {
    userService.remove.mockResolvedValueOnce({})
    const wrapper = mountWithConfirm(UserList)
    await flushPromises()
    await wrapper.find('button[aria-label="Hapus user Andi"]').trigger('click')
    expect(await answerConfirm(wrapper, 'Hapus')).toContain('Andi')
    expect(userService.remove).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('hapus user → Batal → tidak ada request hapus', async () => {
    const wrapper = mountWithConfirm(UserList)
    await flushPromises()
    await wrapper.find('button[aria-label="Hapus user Andi"]').trigger('click')
    await answerConfirm(wrapper, 'Batal')
    expect(userService.remove).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('status tampil dalam bahasa Indonesia', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    expect(wrapper.text()).toContain('Aktif')
    expect(wrapper.text()).toContain('Nonaktif')
    expect(wrapper.text()).not.toMatch(/\b(active|inactive|Deactivate|Activate)\b/)
  })

  it('tanpa h1 (judul di header layout) dan tanpa emoji', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.html()).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('atur role: checkbox per role, simpan mengirim id sebagai number', async () => {
    userService.assignRoles.mockResolvedValueOnce({})
    const wrapper = mount(UserList)
    await flushPromises()
    await wrapper.find('button[aria-label="Atur role Budi"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.find('[role="dialog"]')
    const boxes = dialog.findAll('input[type="checkbox"]')
    expect(boxes.length).toBe(2)
    expect(boxes[1].element.checked).toBe(true) // Budi = resident
    await boxes[0].setValue(true)
    await wrapper.find('#roles-form').trigger('submit.prevent')
    await flushPromises()
    expect(userService.assignRoles).toHaveBeenCalledWith(2, [2, 1])
  })

  it('form tambah user: setiap input punya label tersambung', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text().includes('Tambah User')).trigger('click')
    await flushPromises()
    const inputs = wrapper.find('[role="dialog"]').findAll('input:not([type="checkbox"])')
    expect(inputs.length).toBe(4)
    for (const input of inputs) {
      const id = input.attributes('id')
      expect(wrapper.find(`label[for="${id}"]`).exists(), `label untuk #${id}`).toBe(true)
    }
  })

  it('toolbar mobile: urutan tersembunyi di balik tombol "Urutkan", search tetap punya label', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    expect(wrapper.find('label[for="user-search"]').exists()).toBe(true)
    const toggle = wrapper.find('button[aria-controls="user-sort-fields"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    const fields = wrapper.find('#user-sort-fields')
    expect(fields.classes()).toContain('hidden')
    expect(fields.classes()).toContain('sm:contents')
    expect(fields.find('#user-sort').exists()).toBe(true)
    expect(fields.find('#user-order').exists()).toBe(true)
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#user-sort-fields').classes()).not.toContain('hidden')
  })

  it('list error → tampilkan pesan', async () => {
    userService.list.mockReset()
    userService.list.mockRejectedValueOnce({
      response: { data: { message: 'Server error' } }
    })
    const wrapper = mount(UserList)
    await flushPromises()
    expect(wrapper.text()).toContain('Server error')
  })
})
