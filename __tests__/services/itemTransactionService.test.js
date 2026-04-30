import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { itemTransactionService } from '@/services/itemTransactionService'

describe('itemTransactionService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default → GET /item-transaction', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemTransactionService.list()
    expect(api.get).toHaveBeenCalledWith('/item-transaction', { params: { page: 1, limit: 10 } })
  })

  it('list dengan semua filter', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await itemTransactionService.list({
      page: 2, limit: 20,
      from: '2026-01-01', to: '2026-04-29',
      type: 'ADD', itemId: 3,
      sortOrder: 'asc'
    })
    expect(api.get).toHaveBeenCalledWith('/item-transaction', {
      params: {
        page: 2, limit: 20,
        from: '2026-01-01', to: '2026-04-29',
        type: 'ADD', itemId: 3,
        sortOrder: 'asc'
      }
    })
  })

  it('bulk → POST /item-transaction/bulk', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { processed: 2 } } })
    const payload = { transactions: [
      { id: 1, type: 'ADD', qty: 3 },
      { id: 2, type: 'MINUS', qty: 1, note: 'rusak' }
    ]}
    await itemTransactionService.bulk(payload)
    expect(api.post).toHaveBeenCalledWith('/item-transaction/bulk', payload)
  })
})
