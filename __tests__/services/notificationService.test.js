import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { notificationService } from '@/services/notificationService'

describe('notificationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default → page=1, limit=20', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await notificationService.list()
    expect(api.get).toHaveBeenCalledWith('/notification', { params: { page: 1, limit: 20 } })
  })

  it('list dengan unreadOnly=true', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await notificationService.list({ page: 2, limit: 50, unreadOnly: true })
    expect(api.get).toHaveBeenCalledWith('/notification', {
      params: { page: 2, limit: 50, unreadOnly: true }
    })
  })

  it('unreadCount → GET /notification/unread-count', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { count: 3 } } })
    const result = await notificationService.unreadCount()
    expect(api.get).toHaveBeenCalledWith('/notification/unread-count')
    expect(result).toEqual({ count: 3 })
  })

  it('readAll → PATCH /notification/read-all (no body)', async () => {
    api.patch.mockResolvedValueOnce({ data: { data: { counts: 5 } } })
    const result = await notificationService.readAll()
    expect(api.patch).toHaveBeenCalledWith('/notification/read-all')
    expect(result).toEqual({ counts: 5 })
  })
})
