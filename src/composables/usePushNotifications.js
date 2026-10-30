/**
 * Web push untuk user yang sudah login. Dipakai MainLayout.
 *
 * - start(): tunggu SDK, isi `status`, dan daftarkan subscription ke backend
 *   kalau sudah ada. Listener `change` mendaftarkan subscription yang baru
 *   terbentuk (mis. setelah user menekan Allow).
 * - enable(): minta izin browser. Harus dipanggil dari klik user; browser
 *   memblokir prompt tanpa user gesture.
 * - stop(): lepas listener saat layout unmount (logout).
 *
 * status: 'unknown' | 'unsupported' | 'default' | 'granted' | 'denied'
 */
import { ref } from 'vue'
import { whenOneSignalReady } from '@/utils/oneSignal'
import { userDeviceService } from '@/services/userDeviceService'

export function usePushNotifications() {
  const status = ref('unknown')
  let sdk = null
  let registeredId = null
  let stopped = false

  async function register(subscription) {
    const id = subscription?.id
    if (!id || !subscription.optedIn || id === registeredId) return
    registeredId = id
    try {
      await userDeviceService.register(id)
    } catch (err) {
      // Biarkan id ini dicoba lagi di event berikutnya.
      registeredId = null
      console.warn('[OneSignal] Register device gagal:', err?.message || err)
    }
  }

  function onSubscriptionChange(event) {
    register(event.current)
  }

  async function optInIfGranted() {
    status.value = sdk.Notifications.permissionNative
    const subscription = sdk.User.PushSubscription
    if (status.value === 'granted' && !subscription.optedIn) await subscription.optIn()
  }

  async function start() {
    stopped = false
    const ready = await whenOneSignalReady()
    // Layout sudah unmount (logout) sebelum SDK siap.
    if (stopped) return
    sdk = ready
    if (!sdk || !sdk.Notifications.isPushSupported()) {
      sdk = null
      status.value = 'unsupported'
      return
    }
    sdk.User.PushSubscription.addEventListener('change', onSubscriptionChange)
    await optInIfGranted()
    await register(sdk.User.PushSubscription)
  }

  async function enable() {
    if (!sdk) return
    await sdk.Notifications.requestPermission()
    await optInIfGranted()
  }

  function stop() {
    stopped = true
    sdk?.User.PushSubscription.removeEventListener('change', onSubscriptionChange)
    sdk = null
  }

  return { status, start, enable, stop }
}
