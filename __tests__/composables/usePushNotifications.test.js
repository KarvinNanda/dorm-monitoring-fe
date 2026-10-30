/**
 * usePushNotifications: status izin untuk banner, minta izin lewat klik,
 * dan daftar subscription ke backend (/user-device) setiap kali subscription
 * siap — saat app dibuka atau saat user baru saja menekan Allow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/utils/oneSignal', () => ({ whenOneSignalReady: vi.fn() }))
vi.mock('@/services/userDeviceService', () => ({
  userDeviceService: { register: vi.fn() }
}))

import { usePushNotifications } from '@/composables/usePushNotifications'
import { whenOneSignalReady } from '@/utils/oneSignal'
import { userDeviceService } from '@/services/userDeviceService'

/** SDK v16 palsu: cukup untuk Notifications + User.PushSubscription. */
function fakeSdk({ permission = 'default', id = null, optedIn = false, supported = true } = {}) {
  const listeners = new Set()
  const sub = {
    id,
    optedIn,
    optIn: vi.fn(async () => {
      sub.optedIn = true
    }),
    addEventListener: vi.fn((name, fn) => name === 'change' && listeners.add(fn)),
    removeEventListener: vi.fn((name, fn) => listeners.delete(fn))
  }
  const sdk = {
    Notifications: {
      permissionNative: permission,
      isPushSupported: () => supported,
      requestPermission: vi.fn()
    },
    User: { PushSubscription: sub },
    // Simulasikan SDK yang selesai membuat subscription di server OneSignal.
    subscribe(newId) {
      const previous = { id: sub.id, optedIn: sub.optedIn }
      sub.id = newId
      sub.optedIn = true
      listeners.forEach((fn) => fn({ previous, current: { id: newId, optedIn: true } }))
    },
    listenerCount: () => listeners.size
  }
  return sdk
}

beforeEach(() => {
  vi.clearAllMocks()
  userDeviceService.register.mockResolvedValue({})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('usePushNotifications — start()', () => {
  it('SDK tidak tersedia → status unsupported, tidak daftar apa pun', async () => {
    whenOneSignalReady.mockResolvedValue(null)
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('unsupported')
    expect(userDeviceService.register).not.toHaveBeenCalled()
  })

  it('browser tidak mendukung push (mis. Safari iOS tanpa Add to Home Screen) → unsupported', async () => {
    whenOneSignalReady.mockResolvedValue(fakeSdk({ supported: false }))
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('unsupported')
  })

  it('izin belum pernah ditanya → status default, belum daftar ke backend', async () => {
    whenOneSignalReady.mockResolvedValue(fakeSdk())
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('default')
    expect(userDeviceService.register).not.toHaveBeenCalled()
  })

  it('sudah subscribe sebelumnya → langsung daftar subscription id ke backend', async () => {
    whenOneSignalReady.mockResolvedValue(fakeSdk({ permission: 'granted', id: 'sub-1', optedIn: true }))
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('granted')
    expect(userDeviceService.register).toHaveBeenCalledWith('sub-1')
  })

  it('izin browser granted tapi belum opt-in → optIn tanpa prompt', async () => {
    const sdk = fakeSdk({ permission: 'granted' })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    expect(sdk.User.PushSubscription.optIn).toHaveBeenCalled()
  })

  it('granted + optedIn tapi tanpa subscription id (blokir dibuka lewat setting situs) → requestPermission untuk membuat subscription', async () => {
    const sdk = fakeSdk({ permission: 'granted', optedIn: true })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    expect(sdk.Notifications.requestPermission).toHaveBeenCalledTimes(1)
    expect(sdk.User.PushSubscription.optIn).not.toHaveBeenCalled()
  })

  it('sudah punya subscription id → tidak memanggil requestPermission', async () => {
    const sdk = fakeSdk({ permission: 'granted', id: 'sub-1', optedIn: true })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    expect(sdk.Notifications.requestPermission).not.toHaveBeenCalled()
  })

  it('granted tapi belum opt-in → optIn saja, tanpa requestPermission', async () => {
    const sdk = fakeSdk({ permission: 'granted' })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    expect(sdk.User.PushSubscription.optIn).toHaveBeenCalled()
    expect(sdk.Notifications.requestPermission).not.toHaveBeenCalled()
  })

  it('izin denied → status denied, tidak optIn', async () => {
    const sdk = fakeSdk({ permission: 'denied' })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('denied')
    expect(sdk.User.PushSubscription.optIn).not.toHaveBeenCalled()
  })
})

describe('usePushNotifications — subscription change', () => {
  it('subscription id muncul setelah start → daftar ke backend', async () => {
    const sdk = fakeSdk({ permission: 'granted' })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    sdk.subscribe('sub-new')
    await flushPromises()
    expect(userDeviceService.register).toHaveBeenCalledWith('sub-new')
  })

  it('id yang sama tidak didaftarkan dua kali', async () => {
    const sdk = fakeSdk({ permission: 'granted', id: 'sub-1', optedIn: true })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    sdk.subscribe('sub-1')
    await flushPromises()
    expect(userDeviceService.register).toHaveBeenCalledTimes(1)
  })

  it('register gagal → tidak melempar error, id yang sama dicoba lagi di event berikutnya', async () => {
    const sdk = fakeSdk({ permission: 'granted' })
    whenOneSignalReady.mockResolvedValue(sdk)
    userDeviceService.register.mockRejectedValueOnce(new Error('Network error'))
    const push = usePushNotifications()
    await push.start()
    sdk.subscribe('sub-1')
    await flushPromises()
    sdk.subscribe('sub-1')
    await flushPromises()
    expect(userDeviceService.register).toHaveBeenCalledTimes(2)
  })

  it('stop() melepas listener → event setelah logout tidak mendaftar', async () => {
    const sdk = fakeSdk({ permission: 'granted' })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    push.stop()
    expect(sdk.listenerCount()).toBe(0)
    sdk.subscribe('sub-late')
    await flushPromises()
    expect(userDeviceService.register).not.toHaveBeenCalled()
  })

  it('stop() sebelum SDK siap (logout cepat) → start tidak memasang listener dan tidak mendaftar', async () => {
    const sdk = fakeSdk({ permission: 'granted', id: 'sub-1', optedIn: true })
    let resolveReady
    whenOneSignalReady.mockReturnValue(new Promise((r) => (resolveReady = r)))
    const push = usePushNotifications()
    const started = push.start()
    push.stop()
    resolveReady(sdk)
    await started
    expect(sdk.listenerCount()).toBe(0)
    expect(userDeviceService.register).not.toHaveBeenCalled()
  })
})

describe('usePushNotifications — enable()', () => {
  it('user klik Aktifkan lalu Allow → status granted dan optIn', async () => {
    const sdk = fakeSdk()
    sdk.Notifications.requestPermission.mockImplementation(async () => {
      sdk.Notifications.permissionNative = 'granted'
    })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    await push.enable()
    expect(sdk.Notifications.requestPermission).toHaveBeenCalled()
    expect(push.status.value).toBe('granted')
    expect(sdk.User.PushSubscription.optIn).toHaveBeenCalled()
  })

  it('user klik Aktifkan lalu Block → status denied, tidak optIn', async () => {
    const sdk = fakeSdk()
    sdk.Notifications.requestPermission.mockImplementation(async () => {
      sdk.Notifications.permissionNative = 'denied'
    })
    whenOneSignalReady.mockResolvedValue(sdk)
    const push = usePushNotifications()
    await push.start()
    await push.enable()
    expect(push.status.value).toBe('denied')
    expect(sdk.User.PushSubscription.optIn).not.toHaveBeenCalled()
  })

  it('enable() sebelum SDK siap → tidak melempar error', async () => {
    const push = usePushNotifications()
    await expect(push.enable()).resolves.toBeUndefined()
  })
})

describe('usePushNotifications — log debug di console', () => {
  const infoLines = () => console.info.mock.calls.map((args) => args.join(' '))

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  it('saat start: cetak status izin dan subscription id', async () => {
    whenOneSignalReady.mockResolvedValue(fakeSdk({ permission: 'granted', id: 'sub-1', optedIn: true }))
    await usePushNotifications().start()
    expect(infoLines().some((l) => l.includes('[OneSignal]') && l.includes('granted') && l.includes('sub-1'))).toBe(true)
  })

  it('register ke backend berhasil: cetak subscription id yang terdaftar', async () => {
    whenOneSignalReady.mockResolvedValue(fakeSdk({ permission: 'granted', id: 'sub-1', optedIn: true }))
    await usePushNotifications().start()
    expect(infoLines().some((l) => l.includes('terdaftar') && l.includes('sub-1'))).toBe(true)
  })

  it('SDK tidak tersedia: cetak alasannya', async () => {
    whenOneSignalReady.mockResolvedValue(null)
    await usePushNotifications().start()
    expect(infoLines().some((l) => l.includes('[OneSignal]') && l.includes('tidak tersedia'))).toBe(true)
  })
})

describe('usePushNotifications — iPhone di luar Layar Utama', () => {
  const ua = navigator.userAgent
  const setUA = (value) => Object.defineProperty(navigator, 'userAgent', { value, configurable: true })
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

  afterEach(() => {
    setUA(ua)
    delete navigator.standalone
  })

  it('iPhone, dibuka di Safari biasa, push tidak tersedia → status needs-home-screen', async () => {
    setUA(IPHONE)
    whenOneSignalReady.mockResolvedValue(fakeSdk({ supported: false }))
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('needs-home-screen')
  })

  it('iPhone, sudah dibuka dari Layar Utama tapi push tetap tidak tersedia → unsupported', async () => {
    setUA(IPHONE)
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    whenOneSignalReady.mockResolvedValue(fakeSdk({ supported: false }))
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('unsupported')
  })

  it('bukan iOS → tetap unsupported', async () => {
    whenOneSignalReady.mockResolvedValue(fakeSdk({ supported: false }))
    const push = usePushNotifications()
    await push.start()
    expect(push.status.value).toBe('unsupported')
  })
})
