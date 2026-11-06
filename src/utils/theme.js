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
 *  - View Transitions API (Chrome, Edge, Safari 18+): tema baru
 *    muncul sebagai lingkaran dari tengah icon yang diklik, lalu membesar
 *    sampai menutup seluruh layar. Berlaku untuk dua arah (light <-> dark).
 *  - Browser lain: class `theme-transition` sementara mentransisikan warna.
 *  - "Reduce motion" di OS: langsung ganti tanpa animasi.
 */
import { nextTick, ref } from 'vue'

const STORAGE_KEY = 'theme'
const THEME_COLORS = { light: '#ffffff', dark: '#161e18' }
// Harus sama dengan durasi .theme-transition di style.css.
const FALLBACK_MS = 400
// Cukup lama untuk terlihat menyebar, cukup cepat untuk tidak mengganggu.
const REVEAL_MS = 500
// Cepat di awal, melambat di akhir. Luas lingkaran tumbuh kuadrat terhadap
// radius, jadi easing ini menjaga akhir animasi tidak terasa menyentak.
const REVEAL_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'
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

// Titik awal lingkaran: tengah tombol yang diklik. Posisi tombol dipakai,
// bukan koordinat klik, supaya tap di mobile dan Enter/Space dari keyboard
// (clientX/Y = 0) tetap mulai dari icon. Tanpa event: tengah layar.
function revealOrigin(event) {
  const rect = event?.currentTarget?.getBoundingClientRect?.()
  if (rect) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

// `event` dari @click di ThemeToggle.vue; harus dibaca sebelum await apa pun,
// karena currentTarget dikosongkan browser setelah handler selesai.
export function toggleTheme(event) {
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
    const { x, y } = revealOrigin(event)
    // Jarak ke sudut layar terjauh: lingkaran pasti menutup seluruh layar.
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    // Tunggu Vue merender ulang (ikon matahari/bulan) sebelum snapshot baru diambil.
    const transition = document.startViewTransition(async () => {
      apply(next)
      await nextTick()
    })
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]
          },
          { duration: REVEAL_MS, easing: REVEAL_EASING, pseudoElement: '::view-transition-new(root)' }
        )
      })
      // Transisi dibatalkan (misalnya klik cepat dua kali): tema tetap
      // berganti, hanya animasinya yang dilewati.
      .catch(() => {})
    return transition
  }

  const root = document.documentElement
  root.classList.add('theme-transition')
  apply(next)
  clearTimeout(fallbackTimer)
  fallbackTimer = setTimeout(() => root.classList.remove('theme-transition'), FALLBACK_MS)
}
