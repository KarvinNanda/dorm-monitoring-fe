/**
 * Test userService. Backend pakai PATH SINGULAR (/user, /role) sesuai
 * konvensi yang di-verify user — ini ditegakkan lewat assertion URL di bawah.
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
import { userService } from '@/services/userService'

describe('userService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('list', () => {
    it('default params page=1 limit=10, tanpa sort/search', async () => {
      api.get.mockResolvedValueOnce({
        data: { data: [{ id: 1 }], meta: { total: 1 } }
      })
      const out = await userService.list()
      expect(api.get).toHaveBeenCalledWith('/user', { params: { page: 1, limit: 10 } })
      expect(out).toEqual({ data: [{ id: 1 }], meta: { total: 1 } })
    })

    it('merangkai query lengkap hanya kalau ada', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
      await userService.list({ page: 2, limit: 5, sortBy: 'name', sortOrder: 'asc', search: 'karvin' })
      expect(api.get).toHaveBeenCalledWith('/user', {
        params: { page: 2, limit: 5, sortBy: 'name', sortOrder: 'asc', search: 'karvin' }
      })
    })

    it('unwrap flat response (tanpa wrapper data)', async () => {
      api.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
      const out = await userService.list()
      expect(out).toEqual({ data: [{ id: 1 }], meta: null })
    })
  })

  describe('CRUD single-user', () => {
    it('getById → GET /user/:id', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { id: 7 } } })
      const out = await userService.getById(7)
      expect(api.get).toHaveBeenCalledWith('/user/7')
      expect(out).toEqual({ id: 7 })
    })

    it('updateMe → PUT /user/me', async () => {
      api.put.mockResolvedValueOnce({ data: { data: { id: 1, name: 'X' } } })
      await userService.updateMe({ name: 'X' })
      expect(api.put).toHaveBeenCalledWith('/user/me', { name: 'X' })
    })

    it('create → POST /user', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 9 } } })
      await userService.create({ name: 'A', email: 'a@a' })
      expect(api.post).toHaveBeenCalledWith('/user', { name: 'A', email: 'a@a' })
    })

    it('update → PUT /user/:id', async () => {
      api.put.mockResolvedValueOnce({ data: { data: { id: 9 } } })
      await userService.update(9, { name: 'B' })
      expect(api.put).toHaveBeenCalledWith('/user/9', { name: 'B' })
    })

    it('remove → DELETE /user/:id', async () => {
      api.delete.mockResolvedValueOnce({ data: { success: true } })
      await userService.remove(9)
      expect(api.delete).toHaveBeenCalledWith('/user/9')
    })
  })

  describe('activation + roles', () => {
    it('activate → PATCH /user/:id/activate', async () => {
      api.patch.mockResolvedValueOnce({ data: { success: true } })
      await userService.activate(5)
      expect(api.patch).toHaveBeenCalledWith('/user/5/activate')
    })

    it('deactivate → PATCH /user/:id/deactivate', async () => {
      api.patch.mockResolvedValueOnce({ data: { success: true } })
      await userService.deactivate(5)
      expect(api.patch).toHaveBeenCalledWith('/user/5/deactivate')
    })

    it('assignRoles → PUT /user/:id/roles { roleIds }', async () => {
      api.put.mockResolvedValueOnce({ data: { success: true } })
      await userService.assignRoles(5, [1, 2])
      expect(api.put).toHaveBeenCalledWith('/user/5/roles', { roleIds: [1, 2] })
    })

    it('listRoles → GET /role (singular)', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [{ id: 1, name: 'admin' }] } })
      const out = await userService.listRoles()
      expect(api.get).toHaveBeenCalledWith('/role')
      expect(out).toEqual([{ id: 1, name: 'admin' }])
    })
  })
})
