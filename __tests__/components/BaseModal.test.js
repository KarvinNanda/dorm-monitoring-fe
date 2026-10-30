/**
 * BaseModal: dialog yang aksesibel — role/aria, Escape, klik backdrop,
 * fokus masuk ke dialog saat dibuka dan kembali ke pemicu saat ditutup,
 * Tab tidak keluar dari dialog.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const Host = {
  components: { BaseModal },
  data: () => ({ open: false }),
  template: `
    <div>
      <button id="opener" @click="open = true">Buka</button>
      <BaseModal v-model:open="open" title="Ubah Tamu">
        <input id="first" />
        <template #footer><button id="save">Simpan</button></template>
      </BaseModal>
    </div>`
}

let wrapper
afterEach(() => wrapper?.unmount())

async function openModal() {
  wrapper = mount(Host, { attachTo: document.body })
  const opener = wrapper.find('#opener')
  opener.element.focus()
  await opener.trigger('click')
  await nextTick()
  await nextTick()
  return wrapper
}

describe('BaseModal', () => {
  it('tidak merender apa pun saat tertutup', () => {
    wrapper = mount(Host, { attachTo: document.body })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('role dialog, aria-modal, dan aria-labelledby menunjuk ke judul', async () => {
    await openModal()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    const titleId = dialog.attributes('aria-labelledby')
    expect(wrapper.find(`#${titleId}`).text()).toBe('Ubah Tamu')
  })

  it('fokus pindah ke elemen pertama di dalam dialog', async () => {
    await openModal()
    expect(document.activeElement?.id).toBe('first')
  })

  it('Escape menutup dialog dan fokus kembali ke tombol pemicu', async () => {
    await openModal()
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('opener')
  })

  it('klik backdrop menutup, klik di dalam panel tidak', async () => {
    await openModal()
    await wrapper.find('#first').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    await wrapper.find('[data-backdrop]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('tombol X punya aria-label dan menutup dialog', async () => {
    await openModal()
    await wrapper.find('button[aria-label="Tutup"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('dirender di <body> lewat Teleport, lepas dari CSS halaman (mis. margin dari space-y)', async () => {
    wrapper = mount(Host, { attachTo: document.body, global: { stubs: { teleport: false } } })
    await wrapper.find('#opener').trigger('click')
    await nextTick()
    const backdrop = document.body.querySelector('[data-backdrop]')
    expect(backdrop).not.toBeNull()
    // Bukan turunan elemen halaman, jadi CSS halaman tidak ikut menggeser.
    expect(wrapper.element.contains(backdrop)).toBe(false)
  })

  it('Tab dari elemen terakhir kembali ke elemen pertama (focus trap)', async () => {
    await openModal()
    const save = wrapper.find('#save')
    save.element.focus()
    await save.trigger('keydown', { key: 'Tab' })
    // Urutan fokus di dialog: X (header) → input → Simpan → kembali ke X.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Tutup')
  })
})
