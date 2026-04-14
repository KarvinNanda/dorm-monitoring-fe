/**
 * Date / time helpers yang memaksa timezone Asia/Jakarta (WIB, UTC+7).
 *
 * Backend menyimpan/mengembalikan timestamp dalam timezone "overseas"
 * (umumnya UTC). Supaya tampilan di frontend konsisten untuk user Indonesia
 * tanpa peduli timezone sistem user, semua helper di sini mengunci ke
 * Asia/Jakarta.
 */

const JAKARTA_TZ = 'Asia/Jakarta'

/**
 * Format ISO string ke tanggal + jam WIB yang readable.
 *   "2025-04-14T01:00:00Z" → "14 Apr 2025, 08:00"
 */
export function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    timeZone: JAKARTA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format ISO string ke jam WIB saja (HH:mm).
 */
export function formatTime(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('id-ID', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format ISO string ke "YYYY-MM-DDTHH:mm" dalam WIB,
 * siap dipakai sebagai value untuk <input type="datetime-local">.
 */
export function toJakartaDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d)

  const map = {}
  parts.forEach((p) => (map[p.type] = p.value))
  // en-CA biasanya mengembalikan "24" untuk tengah malam — normalkan jadi "00"
  const hour = map.hour === '24' ? '00' : map.hour
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`
}

/**
 * Nilai <input type="datetime-local"> dianggap dalam timezone WIB,
 * dikonversi ke UTC ISO string untuk dikirim ke backend.
 *
 *   "2025-04-14T08:00" (WIB) → "2025-04-14T01:00:00.000Z"
 */
export function jakartaInputToISO(localStr) {
  if (!localStr) return undefined
  // Paksa interpretasi sebagai +07:00 lalu normalisasi ke UTC via toISOString().
  const d = new Date(`${localStr}:00+07:00`)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/**
 * Waktu sekarang dalam format "YYYY-MM-DDTHH:mm" WIB (untuk default input).
 */
export function nowJakartaDatetimeInput() {
  return toJakartaDatetimeInput(new Date().toISOString())
}

/**
 * Format tanggal panjang berbahasa Indonesia di zona WIB.
 *   "2026-04-13T20:00:00Z" → "Selasa, 14 April 2026"
 * Tanpa argumen → tanggal hari ini (WIB).
 */
export function formatDateLong(iso) {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', {
    timeZone: JAKARTA_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Tanggal hari ini (atau dari ISO) dalam format "YYYY-MM-DD" zona WIB.
 * Berguna untuk filter tanggal / startsWith() pada string ISO.
 */
export function todayJakartaDate(iso) {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)
  const map = {}
  parts.forEach((p) => (map[p.type] = p.value))
  return `${map.year}-${map.month}-${map.day}`
}
