/**
 * confirmDialog() + <ConfirmDialog/>: pengganti window.confirm().
 * Promise resolve true hanya saat tombol konfirmasi diklik; Batal, Escape,
 * backdrop → false. Fokus awal di "Batal" supaya Enter tidak langsung menghapus.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { confirmDialog } from '@/composables/useConfirm'

let wrapper
afterEach(() => wrapper?.unmount())

// Mount host lalu buka dialog; return promise hasil konfirmasi.
function ask(opts = { title: 'Hapus tamu?', message: 'Tamu "Bu Sari" akan dihapus.' }) {
  wrapper = mount(ConfirmDialog, { attachTo: document.body })
  return confirmDialog(opts)
}

const button = (label) => wrapper.findAll('button').find((b) => b.text() === label)

describe('ConfirmDialog', () => {
  it('menampilkan judul dan pesan sebagai alertdialog', async () => {
    ask()
    await nextTick()
    await nextTick()
    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('Hapus tamu?')
    expect(dialog.text()).toContain('Tamu "Bu Sari" akan dihapus.')
  })

  it('klik tombol konfirmasi → resolve true dan dialog tertutup', async () => {
    const result = ask()
    await nextTick()
    await nextTick()
    await button('Hapus').trigger('click')
    await expect(result).resolves.toBe(true)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('klik Batal → resolve false', async () => {
    const result = ask()
    await nextTick()
    await nextTick()
    await button('Batal').trigger('click')
    await expect(result).resolves.toBe(false)
  })

  it('Escape → resolve false', async () => {
    const result = ask()
    await nextTick()
    await nextTick()
    await wrapper.find('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })
    await expect(result).resolves.toBe(false)
  })

  it('fokus awal di tombol Batal (aksi aman)', async () => {
    ask()
    await nextTick()
    await nextTick()
    expect(document.activeElement?.textContent.trim()).toBe('Batal')
  })

  it('label tombol konfirmasi bisa diganti', async () => {
    ask({ title: 'Tutup kunjungan?', confirmLabel: 'Tutup' })
    await nextTick()
    await nextTick()
    expect(button('Tutup')).toBeDefined()
  })

  it('panggilan kedua saat dialog masih terbuka → panggilan pertama resolve false', async () => {
    const first = ask()
    await nextTick()
    const second = confirmDialog({ title: 'Lagi?' })
    await expect(first).resolves.toBe(false)
    await nextTick()
    await button('Hapus').trigger('click')
    await expect(second).resolves.toBe(true)
  })
})
