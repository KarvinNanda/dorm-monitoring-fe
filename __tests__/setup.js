// Setup global untuk semua test file.
// - Pasang Pinia aktif sebelum tiap test (store bisa di-`useAuthStore()` tanpa
//   perlu mount komponen).
// - Reset localStorage dan semua mock di antara test supaya test isolated.
import { beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
  // Bersihkan localStorage — authStore membaca localStorage saat inisialisasi
  // untuk mengisi state awal. Tanpa ini, state bisa bocor antar test.
  if (typeof localStorage !== 'undefined') localStorage.clear()
  vi.restoreAllMocks()
})
