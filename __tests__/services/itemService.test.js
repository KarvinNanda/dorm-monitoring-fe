import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { itemService } from '@/services/itemService'

describe('itemService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemService.list()
    expect(api.get).toHaveBeenCalledWith('/item', { params: { page: 1, limit: 10 } })
  })

  it('list dengan filter lengkap', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemService.list({
      page: 2, limit: 25,
      sortBy: 'name', sortOrder: 'asc',
      search: 'sapu', categoryId: 4
    })
    expect(api.get).toHaveBeenCalledWith('/item', {
      params: { page: 2, limit: 25, sortBy: 'name', sortOrder: 'asc', search: 'sapu', categoryId: 4 }
    })
  })

  it('getById → GET /item/:id', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await itemService.getById(11)
    expect(api.get).toHaveBeenCalledWith('/item/11')
  })

  it('create → POST /item', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    const payload = { name: 'Sapu', description: 'Sapu lidi', qty: 10, categoryId: 1 }
    await itemService.create(payload)
    expect(api.post).toHaveBeenCalledWith('/item', payload)
  })

  it('update → PATCH /item/:id (bukan PUT)', async () => {
    api.patch.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await itemService.update(5, { name: 'Sapu baru' })
    expect(api.patch).toHaveBeenCalledWith('/item/5', { name: 'Sapu baru' })
  })

  it('remove → DELETE /item/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } })
    await itemService.remove(8)
    expect(api.delete).toHaveBeenCalledWith('/item/8')
  })

  it('listTransactions → GET /item/:id/transactions', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemService.listTransactions(3, { page: 2, limit: 5 })
    expect(api.get).toHaveBeenCalledWith('/item/3/transactions', { params: { page: 2, limit: 5 } })
  })

  it('createTransaction → POST /item/:id/transactions', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await itemService.createTransaction(3, { type: 'ADD', qty: 5, note: 'restok' })
    expect(api.post).toHaveBeenCalledWith('/item/3/transactions', { type: 'ADD', qty: 5, note: 'restok' })
  })
})
