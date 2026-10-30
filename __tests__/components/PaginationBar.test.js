/**
 * PaginationBar: label halaman, batas prev/next, v-model:page.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationBar from '@/components/PaginationBar.vue'

function make(page, totalPages) {
  const wrapper = mount(PaginationBar, {
    props: { page, totalPages, 'onUpdate:page': (v) => wrapper.setProps({ page: v }) }
  })
  return wrapper
}
const prev = (w) => w.find('button[aria-label="Halaman sebelumnya"]')
const next = (w) => w.find('button[aria-label="Halaman berikutnya"]')

describe('PaginationBar', () => {
  it('menampilkan "Halaman X dari Y"', () => {
    expect(make(2, 5).text()).toContain('Halaman 2 dari 5')
  })

  it('halaman pertama: prev disabled, next aktif', () => {
    const w = make(1, 3)
    expect(prev(w).element.disabled).toBe(true)
    expect(next(w).element.disabled).toBe(false)
  })

  it('halaman terakhir: next disabled', () => {
    expect(next(make(3, 3)).element.disabled).toBe(true)
  })

  it('klik next / prev mengubah page', async () => {
    const w = make(2, 3)
    await next(w).trigger('click')
    expect(w.props('page')).toBe(3)
    await prev(w).trigger('click')
    expect(w.props('page')).toBe(2)
  })
})
