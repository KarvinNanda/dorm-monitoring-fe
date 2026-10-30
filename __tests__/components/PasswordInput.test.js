/**
 * PasswordInput: tombol mata toggle type password <-> text, v-model jalan,
 * atribut (id, required, minlength, autocomplete, class) diteruskan ke <input>.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from '@/components/PasswordInput.vue'

describe('PasswordInput', () => {
  it('default tersembunyi (type="password")', () => {
    const wrapper = mount(PasswordInput)
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('klik mata → type text, klik lagi → password; aria-label & aria-pressed ikut', async () => {
    const wrapper = mount(PasswordInput)
    const btn = wrapper.find('button')
    expect(btn.attributes('type')).toBe('button') // tidak submit form
    expect(btn.attributes('aria-label')).toBe('Tampilkan kata sandi')

    await btn.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(btn.attributes('aria-label')).toBe('Sembunyikan kata sandi')
    expect(btn.attributes('aria-pressed')).toBe('true')

    await btn.trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('v-model dua arah', async () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: 'awal', 'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v }) }
    })
    expect(wrapper.find('input').element.value).toBe('awal')
    await wrapper.find('input').setValue('baru123')
    expect(wrapper.props('modelValue')).toBe('baru123')
  })

  it('atribut diteruskan ke <input>, bukan ke wrapper', () => {
    const wrapper = mount(PasswordInput, {
      attrs: { id: 'pw', required: '', minlength: '8', autocomplete: 'new-password', class: 'pr-12' }
    })
    const input = wrapper.find('input')
    expect(input.attributes('id')).toBe('pw')
    expect(input.attributes('minlength')).toBe('8')
    expect(input.attributes('autocomplete')).toBe('new-password')
    expect(input.classes()).toContain('pr-12')
    expect(wrapper.element.getAttribute('id')).toBeNull()
  })
})
