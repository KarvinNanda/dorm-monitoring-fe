import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { guestService } from '@/services/guestService'

describe('guestService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default → GET /guest page=1 limit=10', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await guestService.list()
    expect(api.get).toHaveBeenCalledWith('/guest', { params: { page: 1, limit: 10 } })
  })

  it('list dengan search + sort', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await guestService.list({ search: 'bayu', sortBy: 'name', sortOrder: 'asc' })
    expect(api.get).toHaveBeenCalledWith('/guest', {
      params: { page: 1, limit: 10, search: 'bayu', sortBy: 'name', sortOrder: 'asc' }
    })
  })

  it('getById → GET /guest/:id', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: 3 } } })
    const out = await guestService.getById(3)
    expect(api.get).toHaveBeenCalledWith('/guest/3')
    expect(out).toEqual({ id: 3 })
  })

  it('create → POST /guest', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestService.create({ name: 'Tamu A' })
    expect(api.post).toHaveBeenCalledWith('/guest', { name: 'Tamu A' })
  })

  it('update → PUT /guest/:id', async () => {
    api.put.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestService.update(1, { name: 'New' })
    expect(api.put).toHaveBeenCalledWith('/guest/1', { name: 'New' })
  })

  it('remove → DELETE /guest/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } })
    await guestService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/guest/1')
  })
})
