import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { guestVisitService } from '@/services/guestVisitService'

describe('guestVisitService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await guestVisitService.list()
    expect(api.get).toHaveBeenCalledWith('/guest-visit', { params: { page: 1, limit: 10 } })
  })

  it('list dengan semua filter', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await guestVisitService.list({
      page: 2, limit: 5,
      from: '2025-04-01', to: '2025-04-30',
      sortBy: 'in', sortOrder: 'desc',
      status: 'open', guestId: 'g-1'
    })
    expect(api.get).toHaveBeenCalledWith('/guest-visit', {
      params: {
        page: 2, limit: 5,
        from: '2025-04-01', to: '2025-04-30',
        sortBy: 'in', sortOrder: 'desc',
        status: 'open', guestId: 'g-1'
      }
    })
  })

  it('getById → GET /guest-visit/:id', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestVisitService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/guest-visit/1')
  })

  it('create → POST /guest-visit', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestVisitService.create({ guestId: 'g-1', inTime: 't' })
    expect(api.post).toHaveBeenCalledWith('/guest-visit', { guestId: 'g-1', inTime: 't' })
  })

  it('close → PATCH /guest-visit/:id/close dengan payload default {}', async () => {
    api.patch.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestVisitService.close(1)
    expect(api.patch).toHaveBeenCalledWith('/guest-visit/1/close', {})
  })

  it('close dengan payload', async () => {
    api.patch.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestVisitService.close(1, { outTime: 't', note: 'ok' })
    expect(api.patch).toHaveBeenCalledWith('/guest-visit/1/close', { outTime: 't', note: 'ok' })
  })

  it('update → PUT /guest-visit/:id', async () => {
    api.put.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await guestVisitService.update(1, { note: 'new' })
    expect(api.put).toHaveBeenCalledWith('/guest-visit/1', { note: 'new' })
  })

  it('remove → DELETE /guest-visit/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } })
    await guestVisitService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/guest-visit/1')
  })
})
