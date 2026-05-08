/**
 * Test oneSignal utility: initOneSignal, getPlayerId, getCurrentPlayerId.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initOneSignal, getPlayerId, getCurrentPlayerId } from '@/utils/oneSignal'

describe('oneSignal utility', () => {
  beforeEach(() => {
    delete window.OneSignalDeferred
    delete window.OneSignal
  })

  afterEach(() => {
    delete window.OneSignalDeferred
    delete window.OneSignal
  })

  describe('initOneSignal', () => {
    it('push callback ke OneSignalDeferred', () => {
      initOneSignal()
      expect(window.OneSignalDeferred.length).toBe(1)
    })

    it('callback: init dengan appId + optIn', async () => {
      initOneSignal()
      const cb = window.OneSignalDeferred[0]
      const mock = {
        init: vi.fn(),
        User: { PushSubscription: { optedIn: false, optIn: vi.fn(), id: 'p-1' } }
      }
      await cb(mock)
      expect(mock.init).toHaveBeenCalledWith({
        appId: '42dc03c9-7413-4606-b900-c4deb7ad5ba5'
      })
      expect(mock.User.PushSubscription.optIn).toHaveBeenCalled()
    })

    it('skip optIn kalau sudah opted-in', async () => {
      initOneSignal()
      const cb = window.OneSignalDeferred[0]
      const mock = {
        init: vi.fn(),
        User: { PushSubscription: { optedIn: true, optIn: vi.fn(), id: 'p-1' } }
      }
      await cb(mock)
      expect(mock.User.PushSubscription.optIn).not.toHaveBeenCalled()
    })
  })

  describe('getPlayerId', () => {
    it('SDK ready + punya ID → return langsung', async () => {
      window.OneSignal = { User: { PushSubscription: { id: 'player-123' } } }
      expect(await getPlayerId()).toBe('player-123')
    })

    it('SDK belum ready → pakai deferred', async () => {
      const promise = getPlayerId()
      const cb = window.OneSignalDeferred[0]
      cb({ User: { PushSubscription: { id: 'player-456' } } })
      expect(await promise).toBe('player-456')
    })

    it('timeout → return null', async () => {
      vi.useFakeTimers()
      const promise = getPlayerId()
      vi.advanceTimersByTime(10000)
      expect(await promise).toBeNull()
      vi.useRealTimers()
    })
  })

  describe('getCurrentPlayerId', () => {
    it('SDK ready → return ID', () => {
      window.OneSignal = { User: { PushSubscription: { id: 'p-sync' } } }
      expect(getCurrentPlayerId()).toBe('p-sync')
    })

    it('SDK belum ready → null', () => {
      expect(getCurrentPlayerId()).toBeNull()
    })
  })
})
