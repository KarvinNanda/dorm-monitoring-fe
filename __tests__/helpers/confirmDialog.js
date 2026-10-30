/**
 * Helper untuk halaman yang memakai confirmDialog(): mount halaman bersama
 * host <ConfirmDialog/> (seperti di MainLayout), lalu jawab dialognya.
 */
import { mount, flushPromises } from '@vue/test-utils'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

export function mountWithConfirm(Page) {
  return mount(
    { components: { Page, ConfirmDialog }, template: '<Page /><ConfirmDialog />' },
    { attachTo: document.body }
  )
}

// Klik tombol berlabel `label` di dialog konfirmasi yang sedang terbuka.
// Return teks dialog supaya test bisa cek pesannya.
export async function answerConfirm(wrapper, label) {
  await flushPromises()
  const dialog = wrapper.find('[role="alertdialog"]')
  if (!dialog.exists()) throw new Error('Dialog konfirmasi tidak terbuka')
  const text = dialog.text()
  await dialog.findAll('button').find((b) => b.text() === label).trigger('click')
  await flushPromises()
  return text
}
