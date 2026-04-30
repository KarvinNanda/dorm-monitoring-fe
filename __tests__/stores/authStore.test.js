/**
 * Unit test untuk Pinia store auth di src/stores/authStore.js.
 *
 * Verifikasi:
 * - Normalisasi roles (string / object, mixed case) → array lowercase.
 * - hasRole / hasAnyRole logic.
 * - setTokens / setUser / clearAuth persistensi ke localStorage.
 * - isAuthenticated bergantung pada accessToken.
 * - logout alias → clearAuth.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('roles normalization', () => {
    it('string roles → lowercase array', () => {
      const store = useAuthStore()
      store.setUser({ name: 'A', roles: ['Admin', 'Resident'] })
      expect(store.roles).toEqual(['admin', 'resident'])
    })

    it('object roles (dengan .name / .code) → lowercase', () => {
      const store = useAuthStore()
      store.setUser({ name: 'A', roles: [{ name: 'ADMIN' }, { code: 'Receptionist' }] })
      expect(store.roles).toEqual(['admin', 'receptionist'])
    })

    it('user null → roles kosong', () => {
      const store = useAuthStore()
      expect(store.roles).toEqual([])
    })

    it('primaryRole default "user" kalau kosong', () => {
      const store = useAuthStore()
      expect(store.primaryRole).toBe('user')
    })
  })

  describe('hasRole / hasAnyRole', () => {
    it('hasRole case-insensitive', () => {
      const store = useAuthStore()
      store.setUser({ roles: ['admin'] })
      expect(store.hasRole('ADMIN')).toBe(true)
      expect(store.hasRole('resident')).toBe(false)
    })

    it('hasRole dengan input falsy → false', () => {
      const store = useAuthStore()
      store.setUser({ roles: ['admin'] })
      expect(store.hasRole('')).toBe(false)
      expect(store.hasRole(null)).toBe(false)
      expect(store.hasRole(undefined)).toBe(false)
    })

    it('hasAnyRole dengan list', () => {
      const store = useAuthStore()
      store.setUser({ roles: ['resident'] })
      expect(store.hasAnyRole(['admin', 'resident'])).toBe(true)
      expect(store.hasAnyRole(['admin', 'receptionist'])).toBe(false)
      expect(store.hasAnyRole([])).toBe(false)
    })
  })

  describe('token lifecycle', () => {
    it('setTokens menyimpan access + refresh ke localStorage', () => {
      const store = useAuthStore()
      store.setTokens('access-123', 'refresh-456')
      expect(store.accessToken).toBe('access-123')
      expect(store.refreshToken).toBe('refresh-456')
      expect(localStorage.getItem('accessToken')).toBe('access-123')
      expect(localStorage.getItem('refreshToken')).toBe('refresh-456')
    })

    it('setTokens dengan access null → menghapus accessToken', () => {
      const store = useAuthStore()
      store.setTokens('a', 'r')
      store.setTokens(null, 'r')
      expect(store.accessToken).toBeNull()
      expect(localStorage.getItem('accessToken')).toBeNull()
    })

    it('setTokens tanpa argumen kedua → refreshToken tidak disentuh', () => {
      const store = useAuthStore()
      store.setTokens('a', 'r')
      store.setTokens('new-a') // refresh tidak dipass → tidak diubah
      expect(store.accessToken).toBe('new-a')
      expect(store.refreshToken).toBe('r')
    })

    it('isAuthenticated tracks accessToken', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
      store.setTokens('a', 'r')
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('setUser persistence', () => {
    it('setUser menyimpan JSON ke localStorage', () => {
      const store = useAuthStore()
      store.setUser({ id: 1, name: 'Karvin' })
      expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, name: 'Karvin' })
    })

    it('setUser null → menghapus dari localStorage', () => {
      const store = useAuthStore()
      store.setUser({ id: 1 })
      store.setUser(null)
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('clearAuth / logout', () => {
    it('clearAuth menghapus semua state + localStorage', () => {
      const store = useAuthStore()
      store.setTokens('a', 'r')
      store.setUser({ id: 1 })
      store.clearAuth()
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.user).toBeNull()
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('logout adalah alias clearAuth', () => {
      const store = useAuthStore()
      store.setTokens('a', 'r')
      store.logout()
      expect(store.accessToken).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })
})
