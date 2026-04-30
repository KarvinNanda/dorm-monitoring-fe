/**
 * Test checkLogService (absensi).
 * - Resident: clockIn, clockOut, getMe (status/me), getMyHistory
 * - Admin: listLatest, getUserHistory, createManual
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
import { checkLogService } from '@/services/checkLogService'

describe('checkLogService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('resident actions', () => {
    it('clockIn tanpa note → body {}', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 1, type: 'IN' } } })
      await checkLogService.clockIn()
      expect(api.post).toHaveBeenCalledWith('/check-log/in', {})
    })

    it('clockIn dengan note', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
      await checkLogService.clockIn('late')
      expect(api.post).toHaveBeenCalledWith('/check-log/in', { note: 'late' })
    })

    it('clockOut tanpa note', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 2, type: 'OUT' } } })
      await checkLogService.clockOut()
      expect(api.post).toHaveBeenCalledWith('/check-log/out', {})
    })

    it('clockOut dengan note', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 2 } } })
      await checkLogService.clockOut('pulang')
      expect(api.post).toHaveBeenCalledWith('/check-log/out', { note: 'pulang' })
    })

    it('getMe → GET /check-log/status/me (endpoint sesuai perubahan linter)', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { type: 'IN' } } })
      const out = await checkLogService.getMe()
      expect(api.get).toHaveBeenCalledWith('/check-log/status/me')
      expect(out).toEqual({ type: 'IN' })
    })

    it('getMyHistory default page=1 limit=10', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
      await checkLogService.getMyHistory()
      expect(api.get).toHaveBeenCalledWith('/check-log/history/me', {
        params: { page: 1, limit: 10 }
      })
    })

    it('getMyHistory dengan from/to', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
      await checkLogService.getMyHistory({ page: 2, limit: 5, from: '2025-04-01', to: '2025-04-30' })
      expect(api.get).toHaveBeenCalledWith('/check-log/history/me', {
        params: { page: 2, limit: 5, from: '2025-04-01', to: '2025-04-30' }
      })
    })
  })

  describe('admin actions', () => {
    it('listLatest default', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
      await checkLogService.listLatest()
      expect(api.get).toHaveBeenCalledWith('/check-log', {
        params: { page: 1, limit: 10 }
      })
    })

    it('listLatest dengan type IN', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
      await checkLogService.listLatest({ page: 1, limit: 10, type: 'IN' })
      expect(api.get).toHaveBeenCalledWith('/check-log', {
        params: { page: 1, limit: 10, type: 'IN' }
      })
    })

    it('getUserHistory → GET /check-log/history/:userId dengan filter', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
      await checkLogService.getUserHistory('u-7', { from: '2025-04-01' })
      expect(api.get).toHaveBeenCalledWith('/check-log/history/u-7', {
        params: { page: 1, limit: 10, from: '2025-04-01' }
      })
    })

    it('createManual → POST /check-log/manual', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
      const payload = { userId: 'u-1', type: 'IN', time: '2025-04-14T01:00:00.000Z', note: 'manual' }
      await checkLogService.createManual(payload)
      expect(api.post).toHaveBeenCalledWith('/check-log/manual', payload)
    })
  })
})
