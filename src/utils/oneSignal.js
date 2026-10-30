/**
 * OneSignal Web Push — setup notifikasi.
 *
 * CDN script: index.html → OneSignalSDK.page.js (BUKAN .sw.js)
 * App ID: 42dc03c9-7413-4606-b900-c4deb7ad5ba5
 *
 * Alur:
 *  initOneSignal()       → dipanggil di main.js saat boot. Hanya init SDK,
 *                          TIDAK meminta izin: browser memblokir prompt yang
 *                          muncul tanpa klik user.
 *  whenOneSignalReady()  → dipakai usePushNotifications (MainLayout) untuk
 *                          minta izin lewat tombol dan daftar device ke backend
 *  getCurrentPlayerId()  → dipanggil di MainLayout saat logout (sync)
 */

const APP_ID = '42dc03c9-7413-4606-b900-c4deb7ad5ba5'

let ready = null

/**
 * Init OneSignal SDK. Dipanggil 1x di main.js.
 */
export function initOneSignal() {
  if (typeof window === 'undefined') return

  window.OneSignalDeferred = window.OneSignalDeferred || []

  ready = new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({ appId: APP_ID })
        resolve(OneSignal)
      } catch (err) {
        console.warn('[OneSignal] Init gagal:', err?.message || err)
        resolve(null)
      }
    })
  })
}

/**
 * Objek SDK setelah init selesai, atau null kalau SDK gagal init atau tidak
 * pernah load (mis. diblok adblock) dalam `timeoutMs`.
 */
export function whenOneSignalReady(timeoutMs = 10000) {
  if (!ready) return Promise.resolve(null)
  return Promise.race([ready, new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))])
}

/**
 * Ambil Player ID sync (tanpa tunggu).
 * Dipanggil saat logout.
 */
export function getCurrentPlayerId() {
  if (typeof window === 'undefined') return null
  return window.OneSignal?.User?.PushSubscription?.id || null
}
