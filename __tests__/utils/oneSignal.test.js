/**
 * Test oneSignal utility: initOneSignal, whenOneSignalReady, getCurrentPlayerId.
 *
 * Modul menyimpan promise "SDK siap" di level modul, jadi tiap test memakai
 * instance modul baru (vi.resetModules + import dinamis).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let mod

beforeEach(async () => {
  delete window.OneSignalDeferred
  delete window.OneSignal
  vi.resetModules()
  mod = await import('@/utils/oneSignal')
})

afterEach(() => {
  vi.useRealTimers()
  delete window.OneSignalDeferred
  delete window.OneSignal
})

function fakeSdk() {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    Notifications: { requestPermission: vi.fn() },
    User: { PushSubscription: { optedIn: false, optIn: vi.fn(), id: null } }
  }
}

describe('initOneSignal', () => {
  it('push callback ke OneSignalDeferred', () => {
    mod.initOneSignal()
    expect(window.OneSignalDeferred.length).toBe(1)
  })

  it('callback: init dengan appId', async () => {
    mod.initOneSignal()
    const sdk = fakeSdk()
    await window.OneSignalDeferred[0](sdk)
    expect(sdk.init).toHaveBeenCalledWith({ appId: '42dc03c9-7413-4606-b900-c4deb7ad5ba5' })
  })

  it('tidak meminta izin notifikasi saat boot (butuh klik user)', async () => {
    mod.initOneSignal()
    const sdk = fakeSdk()
    await window.OneSignalDeferred[0](sdk)
    expect(sdk.User.PushSubscription.optIn).not.toHaveBeenCalled()
    expect(sdk.Notifications.requestPermission).not.toHaveBeenCalled()
  })
})

describe('whenOneSignalReady', () => {
  it('resolve dengan objek SDK setelah init selesai', async () => {
    mod.initOneSignal()
    const ready = mod.whenOneSignalReady()
    const sdk = fakeSdk()
    await window.OneSignalDeferred[0](sdk)
    expect(await ready).toBe(sdk)
  })

  it('init gagal → null', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mod.initOneSignal()
    const ready = mod.whenOneSignalReady()
    const sdk = fakeSdk()
    sdk.init.mockRejectedValueOnce(new Error('Can only be used on: https://x'))
    await window.OneSignalDeferred[0](sdk)
    expect(await ready).toBeNull()
  })

  it('SDK tidak pernah load (mis. diblok adblock) → null setelah timeout', async () => {
    vi.useFakeTimers()
    mod.initOneSignal()
    const ready = mod.whenOneSignalReady(5000)
    vi.advanceTimersByTime(5000)
    expect(await ready).toBeNull()
  })

  it('initOneSignal belum dipanggil → null', async () => {
    expect(await mod.whenOneSignalReady()).toBeNull()
  })
})

describe('getCurrentPlayerId', () => {
  it('SDK ready → return ID', () => {
    window.OneSignal = { User: { PushSubscription: { id: 'p-sync' } } }
    expect(mod.getCurrentPlayerId()).toBe('p-sync')
  })

  it('SDK belum ready → null', () => {
    expect(mod.getCurrentPlayerId()).toBeNull()
  })
})
