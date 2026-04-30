import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { facilityReservationService } from '@/services/facilityReservationService'

describe('facilityReservationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list default → GET /facility-reservation', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await facilityReservationService.list()
    expect(api.get).toHaveBeenCalledWith('/facility-reservation', { params: { page: 1, limit: 10 } })
  })

  it('list dengan semua filter', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [], meta: null } })
    await facilityReservationService.list({
      page: 2, limit: 5,
      sortOrder: 'asc',
      from: '2026-04-01', to: '2026-04-30',
      search: 'rapat', status: 'PENDING', facilityId: 3
    })
    expect(api.get).toHaveBeenCalledWith('/facility-reservation', {
      params: {
        page: 2, limit: 5,
        sortOrder: 'asc',
        from: '2026-04-01', to: '2026-04-30',
        search: 'rapat', status: 'PENDING', facilityId: 3
      }
    })
  })

  it('getById → GET /facility-reservation/:id', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await facilityReservationService.getById(4)
    expect(api.get).toHaveBeenCalledWith('/facility-reservation/4')
  })

  it('create → POST /facility-reservation', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    const payload = {
      facilityId: 1, title: 'Rapat',
      description: 'Rapat bulanan',
      startDateTime: '2026-04-29T10:00:00Z',
      endDateTime: '2026-04-29T12:00:00Z'
    }
    await facilityReservationService.create(payload)
    expect(api.post).toHaveBeenCalledWith('/facility-reservation', payload)
  })

  it('update → PATCH /facility-reservation/:id (bukan PUT)', async () => {
    api.patch.mockResolvedValueOnce({ data: { data: { id: 1 } } })
    await facilityReservationService.update(2, { status: 'APPROVED' })
    expect(api.patch).toHaveBeenCalledWith('/facility-reservation/2', { status: 'APPROVED' })
  })

  it('remove → DELETE /facility-reservation/:id', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } })
    await facilityReservationService.remove(6)
    expect(api.delete).toHaveBeenCalledWith('/facility-reservation/6')
  })
})
