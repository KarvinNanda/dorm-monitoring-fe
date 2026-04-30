import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { facilityService } from '@/services/facilityService'

describe('facilityService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await facilityService.list()
    expect(api.get).toHaveBeenCalledWith('/facility', { params: { page: 1, limit: 10 } })
  })

  it('list dengan filter', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await facilityService.list({ page: 2, limit: 5, sortBy: 'name', sortOrder: 'asc', search: 'aula' })
    expect(api.get).toHaveBeenCalledWith('/facility', {
      params: { page: 2, limit: 5, sortBy: 'name', sortOrder: 'asc', search: 'aula' }
    })
  })

  it('getById → GET /facility/:id', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await facilityService.getById(2)
    expect(api.get).toHaveBeenCalledWith('/facility/2')
  })

  it('create → POST /facility', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await facilityService.create({ name: 'Aula', description: 'Aula utama' })
    expect(api.post).toHaveBeenCalledWith('/facility', { name: 'Aula', description: 'Aula utama' })
  })

  it('update → PUT /facility/:id', async () => {
    api.put.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await facilityService.update(2, { description: 'baru' })
    expect(api.put).toHaveBeenCalledWith('/facility/2', { description: 'baru' })
  })

  it('remove → DELETE /facility/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } })
    await facilityService.remove(7)
    expect(api.delete).toHaveBeenCalledWith('/facility/7')
  })
})
