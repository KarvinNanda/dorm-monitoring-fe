import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { dashboardService } from '@/services/dashboardService'

describe('dashboardService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('get → GET /dashboard, unwrap data', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          currentClock: [{ type: 'IN', count: 1 }],
          activeReservation: 0
        }
      }
    })
    const result = await dashboardService.get()
    expect(api.get).toHaveBeenCalledWith('/dashboard')
    expect(result).toEqual({
      currentClock: [{ type: 'IN', count: 1 }],
      activeReservation: 0
    })
  })

  it('get → handle response flat (tanpa wrapper data)', async () => {
    api.get.mockResolvedValueOnce({
      data: { clockStatus: { id: 3, type: 'IN' } }
    })
    const result = await dashboardService.get()
    expect(result).toEqual({ clockStatus: { id: 3, type: 'IN' } })
  })
})
