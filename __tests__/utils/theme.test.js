/**
 * Theme: pilihan tersimpan > setelan OS; toggle menyimpan pilihan dan
 * memasang / melepas class `dark` di <html>. Pergantian tema dianimasikan
 * (lingkaran yang menyebar dari icon toggle), kecuali user memilih
 * "reduce motion".
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

  // Meniru document.startViewTransition: jalankan callback update, lalu
  // kembalikan objek transisi dengan promise `ready` yang bisa diatur.
  function mockViewTransition({ ready = Promise.resolve() } = {}) {
    const calls = { darkInsideCallback: null }
    document.startViewTransition = vi.fn((update) => {
      const updateDone = Promise.resolve(update()).then(() => {
        calls.darkInsideCallback = root.classList.contains('dark')
      })
      return { ready: updateDone.then(() => ready), finished: updateDone }
    })
    return calls
  }

  // Event klik dari tombol 44x44 dengan pojok kiri atas di (left, top).
  function clickOn(left, top) {
    return {
      currentTarget: {
        getBoundingClientRect: () => ({ left, top, width: 44, height: 44 })
      }
    }
  }

  function setViewport(width, height) {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height)
  }

  it('browser mendukung View Transitions → class berganti di dalam transisi', async () => {
    mockSystem(false)
    initTheme()
    root.animate = vi.fn()
    const calls = mockViewTransition()
    const transition = toggleTheme(clickOn(0, 0))
    await transition.finished
    expect(document.startViewTransition).toHaveBeenCalledTimes(1)
    expect(calls.darkInsideCallback).toBe(true)
    expect(theme.value).toBe('dark')
  })

  it('lingkaran tema baru mulai dari tengah icon dan membesar sampai sudut terjauh', async () => {
    mockSystem(false)
    initTheme()
    setViewport(375, 667) // ukuran iPhone SE
    root.animate = vi.fn()
    mockViewTransition()
    // Icon di pojok kanan atas: tengahnya di (331 + 22, 8 + 22) = (353, 30).
    const transition = toggleTheme(clickOn(331, 8))
    await transition.ready

    // Sudut terjauh dari (353, 30) adalah kiri bawah (0, 667).
    const radius = Math.hypot(353, 667 - 30)
    expect(root.animate).toHaveBeenCalledTimes(1)
    const [keyframes, options] = root.animate.mock.calls[0]
    expect(keyframes).toEqual({
      clipPath: [`circle(0px at 353px 30px)`, `circle(${radius}px at 353px 30px)`]
    })
    expect(options).toMatchObject({
      duration: 500,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      pseudoElement: '::view-transition-new(root)'
    })
  })

  it('arah dark → light juga menyebar keluar dari icon', async () => {
    mockSystem(true)
    localStorage.setItem('theme', 'dark')
    initTheme()
    setViewport(1280, 800)
    root.animate = vi.fn()
    mockViewTransition()
    const transition = toggleTheme(clickOn(1200, 12))
    await transition.ready
    expect(theme.value).toBe('light')
    const [keyframes] = root.animate.mock.calls[0]
    expect(keyframes.clipPath[0]).toBe('circle(0px at 1222px 34px)')
  })

  it('tanpa event klik → lingkaran mulai dari tengah layar', async () => {
    mockSystem(false)
    initTheme()
    setViewport(400, 800)
    root.animate = vi.fn()
    mockViewTransition()
    const transition = toggleTheme()
    await transition.ready
    const [keyframes] = root.animate.mock.calls[0]
    expect(keyframes.clipPath[0]).toBe('circle(0px at 200px 400px)')
  })

  it('transisi dibatalkan (klik cepat dua kali) → tidak ada error yang lolos', async () => {
    mockSystem(false)
    initTheme()
    root.animate = vi.fn()
    const aborted = Promise.reject(new DOMException('Skipped', 'AbortError'))
    aborted.catch(() => {})
    mockViewTransition({ ready: aborted })
    const transition = toggleTheme(clickOn(0, 0))
    await transition.finished
    // Beri kesempatan handler `ready` berjalan; kalau rejection tidak
    // ditangkap, vitest akan melaporkan unhandled rejection.
    await new Promise((r) => setTimeout(r, 0))
    expect(root.animate).not.toHaveBeenCalled()
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
