import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()
  }
}))

import api from '@/services/api'
import { userDeviceService } from '@/services/userDeviceService'

describe('userDeviceService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('register → POST /user-device dengan pushToken', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 1, pushToken: 'tok-123' } } })
    await userDeviceService.register('tok-123')
    expect(api.post).toHaveBeenCalledWith('/user-device', { pushToken: 'tok-123' })
  })

  it('unregister → DELETE /user-device dengan body via { data: { pushToken } }', async () => {
    api.delete.mockResolvedValueOnce({ data: { data: { count: 1 } } })
    const result = await userDeviceService.unregister('tok-123')
    expect(api.delete).toHaveBeenCalledWith('/user-device', { data: { pushToken: 'tok-123' } })
    expect(result).toEqual({ count: 1 })
  })
})
