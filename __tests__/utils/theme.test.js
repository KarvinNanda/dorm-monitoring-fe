/**
 * Theme: pilihan tersimpan > setelan OS; toggle menyimpan pilihan dan
 * memasang / melepas class `dark` di <html>. Pergantian tema dianimasikan
 * (crossfade), kecuali user memilih "reduce motion".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initTheme, toggleTheme, theme } from '@/utils/theme'

function mockSystem(dark, reduceMotion = false) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
    matches: (dark && q.includes('dark')) || (reduceMotion && q.includes('reduce')),
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

describe('theme — transisi saat ganti tema', () => {
  const root = document.documentElement

  beforeEach(() => {
    root.classList.remove('dark', 'theme-transition')
  })

  afterEach(() => {
    delete document.startViewTransition
    vi.useRealTimers()
  })

  it('browser mendukung View Transitions → crossfade, class berganti di dalam transisi', async () => {
    mockSystem(false)
    initTheme()
    let darkInsideCallback = null
    document.startViewTransition = vi.fn(async (update) => {
      await update()
      darkInsideCallback = root.classList.contains('dark')
      return { finished: Promise.resolve() }
    })
    await toggleTheme()
    expect(document.startViewTransition).toHaveBeenCalledTimes(1)
    expect(darkInsideCallback).toBe(true)
    expect(theme.value).toBe('dark')
  })

  it('tanpa View Transitions → warna ditransisikan lewat class sementara', () => {
    vi.useFakeTimers()
    mockSystem(false)
    initTheme()
    toggleTheme()
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.classList.contains('theme-transition')).toBe(true)
    vi.advanceTimersByTime(500)
    expect(root.classList.contains('theme-transition')).toBe(false)
  })

  it('reduce motion → ganti langsung tanpa animasi', () => {
    mockSystem(false, true)
    initTheme()
    document.startViewTransition = vi.fn()
    toggleTheme()
    expect(document.startViewTransition).not.toHaveBeenCalled()
    expect(root.classList.contains('theme-transition')).toBe(false)
    expect(root.classList.contains('dark')).toBe(true)
  })
})
