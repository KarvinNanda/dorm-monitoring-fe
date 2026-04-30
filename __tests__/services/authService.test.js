/**
 * Test authService — memastikan URL, payload, dan unwrap response benar.
 * Kita mock module '@/services/api' sehingga test tidak menyentuh network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

import api from '@/services/api'
import { authService } from '@/services/authService'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('POST /auth/login dengan email + password dan unwrap token', async () => {
      api.post.mockResolvedValueOnce({
        data: { accessToken: 'AT', refreshToken: 'RT' }
      })
      const out = await authService.login('k@x.com', 'pw')
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'k@x.com',
        password: 'pw'
      })
      expect(out).toEqual({ accessToken: 'AT', refreshToken: 'RT' })
    })

    it('unwrap response {data: {token}} yang di-wrap', async () => {
      api.post.mockResolvedValueOnce({
        data: { data: { accessToken: 'AT' } }
      })
      // authService.unwrap akan tetap kembalikan body kalau ada accessToken di root,
      // tapi kalau dibungkus dan tidak ada accessToken di root, ikut masuk body.data
      const out = await authService.login('k@x.com', 'pw')
      expect(out).toEqual({ accessToken: 'AT' })
    })
  })

  describe('logout', () => {
    it('POST /auth/logout', async () => {
      api.post.mockResolvedValueOnce({ data: null })
      await authService.logout()
      expect(api.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('swallow error — logout di server gagal tetap resolve', async () => {
      api.post.mockRejectedValueOnce(new Error('boom'))
      // Tidak throw
      await expect(authService.logout()).resolves.toBeUndefined()
    })
  })

  describe('refresh', () => {
    it('POST /auth/refresh dengan refreshToken', async () => {
      api.post.mockResolvedValueOnce({
        data: { accessToken: 'new-AT', refreshToken: 'new-RT' }
      })
      const out = await authService.refresh('old-RT')
      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-RT'
      })
      expect(out.accessToken).toBe('new-AT')
    })
  })

  describe('me', () => {
    it('GET /user/me (singular path sesuai konvensi backend)', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: { id: 1, name: 'K', roles: ['admin'] } }
      })
      const out = await authService.me()
      expect(api.get).toHaveBeenCalledWith('/user/me')
      expect(out).toEqual({ id: 1, name: 'K', roles: ['admin'] })
    })
  })

  describe('resetPassword', () => {
    it('POST /auth/reset-password dengan currentPassword + newPassword', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      await authService.resetPassword('old', 'new')
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        currentPassword: 'old',
        newPassword: 'new'
      })
    })
  })

  describe('changePassword (admin)', () => {
    it('POST /auth/change-password dengan userId + newPassword', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } })
      await authService.changePassword('u-99', 'resetpw')
      expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
        userId: 'u-99',
        newPassword: 'resetpw'
      })
    })
  })
})
