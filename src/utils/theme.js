/**
 * Light / dark theme.
 *
 * Urutan prioritas:
 *  1. Pilihan user yang tersimpan (localStorage 'theme': 'light' | 'dark')
 *  2. Setelan OS (prefers-color-scheme)
 *
 * index.html memasang class `dark` sebelum app di-mount supaya tidak ada
 * kedip putih; modul ini hanya menyamakan state dan menangani toggle.
 *
 * Toggle dianimasikan supaya layar tidak langsung berubah putih/hitam:
 *  - View Transitions API (Chrome, Edge, Safari 18+): crossfade seluruh halaman.
 *  - Browser lain: class `theme-transition` sementara mentransisikan warna.
 *  - "Reduce motion" di OS: langsung ganti tanpa animasi.
 */
import { nextTick, ref } from 'vue'

const STORAGE_KEY = 'theme'
const THEME_COLORS = { light: '#ffffff', dark: '#161e18' }
// Harus sama dengan durasi .theme-transition di style.css.
const FALLBACK_MS = 400
let fallbackTimer = null

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const theme = ref('light')

function apply(value) {
  theme.value = value
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[value])
}

export function initTheme() {
  if (typeof window === 'undefined') return
  apply(readStored() || systemTheme())

  // Ikuti perubahan setelan OS selama user belum memilih sendiri.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    if (!readStored()) apply(e.matches ? 'dark' : 'light')
  })
}

export function toggleTheme() {
  const next = theme.value === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Private mode / storage diblokir: tema tetap berganti untuk sesi ini.
  }

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    apply(next)
    return
  }

  if (typeof document.startViewTransition === 'function') {
    // Tunggu Vue merender ulang (ikon matahari/bulan) sebelum snapshot baru diambil.
    return document.startViewTransition(async () => {
      apply(next)
      await nextTick()
    })
  }

  const root = document.documentElement
  root.classList.add('theme-transition')
  apply(next)
  clearTimeout(fallbackTimer)
  fallbackTimer = setTimeout(() => root.classList.remove('theme-transition'), FALLBACK_MS)
}
