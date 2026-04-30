/**
 * UserList smoke test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

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
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

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

  it('render baris user lain & menyembunyikan akun sendiri', async () => {
    const wrapper = mount(UserList)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Andi')
    expect(text).toContain('Budi')
    // current user "Me" disembunyikan dari tabel
    expect(text).not.toContain('me@x')
  })

  it('toggle status user inactive → memanggil activate', async () => {
    userService.activate.mockResolvedValueOnce({})
    const wrapper = mount(UserList)
    await flushPromises()
    // cari tombol "Activate" (Budi inactive)
    const activateBtn = wrapper.findAll('button').find((b) => b.text().includes('Activate') && !b.text().includes('Deactivate'))
    expect(activateBtn).toBeDefined()
    await activateBtn.trigger('click')
    await flushPromises()
    expect(userService.activate).toHaveBeenCalledWith(2)
  })

  it('toggle status user active → memanggil deactivate', async () => {
    userService.deactivate.mockResolvedValueOnce({})
    const wrapper = mount(UserList)
    await flushPromises()
    const deactivateBtn = wrapper.findAll('button').find((b) => b.text().includes('Deactivate'))
    await deactivateBtn.trigger('click')
    await flushPromises()
    expect(userService.deactivate).toHaveBeenCalledWith(1)
  })

  it('hapus user → confirm + remove', async () => {
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    userService.remove.mockResolvedValueOnce({})
    const wrapper = mount(UserList)
    await flushPromises()
    const deleteBtn = wrapper.findAll('button').find((b) => b.text().includes('Hapus'))
    await deleteBtn.trigger('click')
    await flushPromises()
    expect(window.confirm).toHaveBeenCalled()
    expect(userService.remove).toHaveBeenCalled()
    window.confirm = originalConfirm
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
