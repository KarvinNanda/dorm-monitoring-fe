/**
 * AuthLayout: satu kartu di tengah layar (desain login sebelum revamp),
 * tanpa panel brand hijau di samping. Tombol tema tetap ada.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/assets/logo-3.png', () => ({ default: 'logo.png' }))

import AuthLayout from '@/layouts/AuthLayout.vue'

const mountLayout = () =>
  mount(AuthLayout, { global: { stubs: { 'router-view': { template: '<form id="slot" />' } } } })

describe('AuthLayout', () => {
  it('tanpa panel brand dua warna', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.find('.bg-forest').exists()).toBe(false)
  })

  it('konten login dibungkus satu kartu', () => {
    const wrapper = mountLayout()
    const card = wrapper.find('.card')
    expect(card.exists()).toBe(true)
    expect(card.find('#slot').exists()).toBe(true)
  })

  it('tombol ganti tema tetap tersedia', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('button[aria-label^="Ganti ke mode"]').exists()).toBe(true)
  })
})
