/**
 * Theme: pilihan tersimpan > setelan OS; toggle menyimpan pilihan dan
 * memasang / melepas class `dark` di <html>.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initTheme, toggleTheme, theme } from '@/utils/theme'

function mockSystem(dark) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
    matches: dark && q.includes('dark'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
}

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('tanpa pilihan tersimpan → ikut OS (dark)', () => {
    mockSystem(true)
    initTheme()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('tanpa pilihan tersimpan → ikut OS (light)', () => {
    mockSystem(false)
    initTheme()
    expect(theme.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('pilihan tersimpan menang atas setelan OS', () => {
    mockSystem(true)
    localStorage.setItem('theme', 'light')
    initTheme()
    expect(theme.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('nilai tersimpan yang tidak dikenal diabaikan', () => {
    mockSystem(false)
    localStorage.setItem('theme', '<script>')
    initTheme()
    expect(theme.value).toBe('light')
  })

  it('toggle → simpan pilihan + ganti class', () => {
    mockSystem(false)
    initTheme()
    toggleTheme()
    expect(theme.value).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    toggleTheme()
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
