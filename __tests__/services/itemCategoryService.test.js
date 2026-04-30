import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { itemCategoryService } from '@/services/itemCategoryService'

describe('itemCategoryService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default → GET /item-category dengan page/limit', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemCategoryService.list()
    expect(api.get).toHaveBeenCalledWith('/item-category', { params: { page: 1, limit: 10 } })
  })

  it('list dengan sort', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemCategoryService.list({ page: 3, limit: 5, sortBy: 'name', sortOrder: 'asc' })
    expect(api.get).toHaveBeenCalledWith('/item-category', {
      params: { page: 3, limit: 5, sortBy: 'name', sortOrder: 'asc' }
    })
  })

  it('getById → GET /item-category/:id', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await itemCategoryService.getById(7)
    expect(api.get).toHaveBeenCalledWith('/item-category/7')
  })

  it('create → POST /item-category', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await itemCategoryService.create({ name: 'Cleaning' })
    expect(api.post).toHaveBeenCalledWith('/item-category', { name: 'Cleaning' })
  })

  it('update → PUT /item-category/:id', async () => {
    api.put.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await itemCategoryService.update(2, { name: 'Renamed' })
    expect(api.put).toHaveBeenCalledWith('/item-category/2', { name: 'Renamed' })
  })

  it('remove → DELETE /item-category/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } })
    await itemCategoryService.remove(9)
    expect(api.delete).toHaveBeenCalledWith('/item-category/9')
  })
})
