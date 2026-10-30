/**
 * AppToast: region status untuk screen reader, dan di-Teleport ke <body>
 * supaya tidak ikut dihitung `space-y-*` halaman (toast-nya `fixed`, jadi
 * kalau tetap di dalam halaman, elemen sesudahnya dapat margin ekstra).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppToast from '@/components/AppToast.vue'

let wrapper
afterEach(() => wrapper?.unmount())

const Page = {
  components: { AppToast },
  props: ['toast'],
  template: '<div class="space-y-4"><AppToast :toast="toast" /><section id="first">Konten</section></div>'
}

describe('AppToast', () => {
  it('menampilkan pesan di region role="status"', () => {
    wrapper = mount(AppToast, { props: { toast: { show: true, type: 'success', message: 'Tersimpan' } } })
    expect(wrapper.find('[role="status"]').text()).toContain('Tersimpan')
  })

  it('dirender di <body> lewat Teleport, bukan di dalam halaman', () => {
    wrapper = mount(Page, {
      attachTo: document.body,
      props: { toast: { show: true, type: 'success', message: 'Tersimpan' } },
      global: { stubs: { teleport: false } }
    })
    const region = document.body.querySelector('[role="status"]')
    expect(region?.textContent).toContain('Tersimpan')
    expect(wrapper.element.contains(region)).toBe(false)
    // Konten pertama halaman jadi anak elemen pertama: space-y tidak memberi margin.
    expect(wrapper.element.firstElementChild.id).toBe('first')
  })
})
