/**
 * OneSignal Web Push — setup notifikasi.
 *
 * CDN script: index.html → OneSignalSDK.page.js (BUKAN .sw.js)
 * App ID: 42dc03c9-7413-4606-b900-c4deb7ad5ba5
 *
 * Alur:
 *  initOneSignal()       → dipanggil di main.js saat boot
 *  getPlayerId()         → dipanggil di LoginPage setelah login (await)
 *  getCurrentPlayerId()  → dipanggil di MainLayout saat logout (sync)
 */

const APP_ID = '42dc03c9-7413-4606-b900-c4deb7ad5ba5'

/**
 * Init OneSignal SDK + optIn.
 * Dipanggil 1x di main.js.
 */
export function initOneSignal() {
  if (typeof window === 'undefined') return

  window.OneSignalDeferred = window.OneSignalDeferred || []

  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({ appId: APP_ID })

    // Auto optIn — karena user sudah force allow di browser
    if (!OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optIn()
    }

    console.log('[OneSignal] Ready. Player ID:', OneSignal.User.PushSubscription.id)
  })
}

/**
 * Ambil Player ID (async). Tunggu SDK kalau belum ready.
 * Dipanggil saat login — HARUS await.
 */
export function getPlayerId() {
  if (typeof window === 'undefined') return Promise.resolve(null)

  // SDK sudah ready
  if (window.OneSignal?.User?.PushSubscription?.id) {
    return Promise.resolve(window.OneSignal.User.PushSubscription.id)
  }

  // SDK belum ready — tunggu lewat deferred
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push((OneSignal) => {
      resolve(OneSignal.User.PushSubscription.id || null)
    })

    // Timeout 10 detik
    setTimeout(() => resolve(null), 10000)
  })
}

/**
 * Ambil Player ID sync (tanpa tunggu).
 * Dipanggil saat logout.
 */
export function getCurrentPlayerId() {
  if (typeof window === 'undefined') return null
  return window.OneSignal?.User?.PushSubscription?.id || null
}
