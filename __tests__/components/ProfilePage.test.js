/**
 * ProfilePage smoke test.
 * Verifikasi: fetchMe on mount, save profile, dan validasi modal ganti kata sandi.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/authService', () => ({
  authService: {
    me: vi.fn(),
    resetPassword: vi.fn()
  }
}))
vi.mock('@/services/userService', () => ({
  userService: { updateMe: vi.fn() }
}))

import ProfilePage from '@/modules/user/views/ProfilePage.vue'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

async function openPasswordModal(wrapper) {
  await wrapper.findAll('button').find((b) => b.text().includes('Ganti kata sandi')).trigger('click')
  await flushPromises()
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authService.me.mockResolvedValue({
      id: 1,
      name: 'Karvin',
      email: 'k@x',
      phoneNumber: '0812',
      roles: ['admin']
    })
  })

  it('memanggil authService.me saat mount + render data profil', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    expect(authService.me).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Karvin')
    expect(wrapper.text()).toContain('k@x')
    expect(wrapper.text()).toContain('admin')
  })

  it('save profile memanggil userService.updateMe + sinkron ke store', async () => {
    userService.updateMe.mockResolvedValueOnce({
      id: 1, name: 'Karvin Baru', email: 'k@x', roles: ['admin']
    })
    const wrapper = mount(ProfilePage)
    await flushPromises()
    const nameInput = wrapper.findAll('input').find((i) => i.element.value === 'Karvin')
    await nameInput.setValue('Karvin Baru')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(userService.updateMe).toHaveBeenCalledWith(expect.objectContaining({ name: 'Karvin Baru' }))
    const store = useAuthStore()
    expect(store.user.name).toBe('Karvin Baru')
  })

  it('save profile error → tampilkan pesan', async () => {
    userService.updateMe.mockRejectedValueOnce({
      response: { data: { message: 'Email sudah terpakai' } }
    })
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Email sudah terpakai')
  })

  it('konfirmasi password tidak cocok → blokir submit + pesan', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('current123')
    await inputs[1].setValue('newpass12')
    await inputs[2].setValue('beda1234')
    // Submit form modal (form ke-2)
    const forms = wrapper.findAll('form')
    await forms[forms.length - 1].trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Konfirmasi kata sandi tidak cocok')
    expect(authService.resetPassword).not.toHaveBeenCalled()
  })

  it('password baru < 8 karakter → blokir submit', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('current123')
    await inputs[1].setValue('short')
    await inputs[2].setValue('short')
    const forms = wrapper.findAll('form')
    await forms[forms.length - 1].trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('minimal 8 karakter')
    expect(authService.resetPassword).not.toHaveBeenCalled()
  })

  it('reset password sukses → memanggil authService.resetPassword', async () => {
    authService.resetPassword.mockResolvedValueOnce({})
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('current123')
    await inputs[1].setValue('newpass12')
    await inputs[2].setValue('newpass12')
    const forms = wrapper.findAll('form')
    await forms[forms.length - 1].trigger('submit.prevent')
    await flushPromises()
    expect(authService.resetPassword).toHaveBeenCalledWith('current123', 'newpass12')
  })

  it('modal ganti kata sandi: ketiga field punya tombol mata', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    expect(wrapper.findAll('input[type="password"]').length).toBe(3)
    expect(wrapper.findAll('button[aria-label="Tampilkan kata sandi"]').length).toBe(3)
  })

  it('fetch profile error → tombol "Coba lagi" tampil', async () => {
    authService.me.mockReset()
    authService.me.mockRejectedValueOnce({
      response: { data: { message: 'Server down' } }
    })
    const wrapper = mount(ProfilePage)
    await flushPromises()
    expect(wrapper.text()).toContain('Server down')
    expect(wrapper.text()).toContain('Coba lagi')
  })

  it('tanpa h1 (judul ada di header layout) dan tanpa emoji', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('setiap input punya label yang tersambung (label[for] = input id)', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBe(6)
    for (const input of inputs) {
      const id = input.attributes('id')
      expect(id, 'input tanpa id').toBeTruthy()
      expect(wrapper.find(`label[for="${id}"]`).exists(), `label untuk #${id}`).toBe(true)
    }
  })

  it('ganti kata sandi memakai dialog yang aksesibel', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
  })

  it('save profile sukses → toast "Profil berhasil diperbarui"', async () => {
    userService.updateMe.mockResolvedValueOnce({ id: 1, name: 'Karvin', email: 'k@x', roles: ['admin'] })
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.find('[role="status"]').text()).toContain('Profil berhasil diperbarui')
  })

  it('reset kata sandi sukses → dialog tertutup dan toast tampil', async () => {
    authService.resetPassword.mockResolvedValueOnce({})
    const wrapper = mount(ProfilePage)
    await flushPromises()
    await openPasswordModal(wrapper)
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('current123')
    await inputs[1].setValue('newpass12')
    await inputs[2].setValue('newpass12')
    const forms = wrapper.findAll('form')
    await forms[forms.length - 1].trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').text()).toContain('Kata sandi berhasil diganti')
  })
})
