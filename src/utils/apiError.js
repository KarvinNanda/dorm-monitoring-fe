import { useAuthStore } from '@/stores/authStore'

// Turns an axios error into the text the user sees, and logs it.
//
// Backend error body (global-exception.filter.ts):
//   { success: false, code, message, path, timestamp, requestId }
// `message` is English, so codes the user can act on get an Indonesian text.
// Every response also carries an X-Request-Id header.

const MESSAGES = {
  TOO_MANY_REQUESTS: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.',
  INVALID_CREDENTIALS: 'Email atau kata sandi salah.',
  INVALID_CURRENT_PASSWORD: 'Kata sandi saat ini salah.',
  PASSWORD_UNCHANGED: 'Kata sandi baru harus berbeda dari kata sandi lama.',
  EMAIL_ALREADY_EXISTS: 'Email ini sudah dipakai user lain.',
  CANNOT_MODIFY_SELF: 'Aksi ini tidak bisa dilakukan pada akun sendiri.',
  TARGET_USER_NOT_ALLOWED: 'User ini bukan resident, jadi tidak bisa diabsenkan.',
  USER_NOT_FOUND: 'User tidak ditemukan.'
}

const NETWORK_MESSAGE = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
const SERVER_MESSAGE = 'Terjadi kesalahan di server.'

function requestIdOf(response) {
  const body = response?.data
  return (body && typeof body === 'object' && body.requestId) || response?.headers?.['x-request-id'] || null
}

function serverText(body) {
  if (!body || typeof body !== 'object') return ''
  const msg = body.message ?? body.error
  if (Array.isArray(msg)) return msg.join(', ')
  return typeof msg === 'string' ? msg : ''
}

// One JSON line per error, so it can be matched to the backend log by
// request_id. No query string and no body: those can hold search terms or
// passwords.
function logApiError(err, response, requestId) {
  let userId = null
  try {
    userId = useAuthStore().user?.id ?? null
  } catch {
    // No active Pinia (should not happen in the app). Log without user_id.
  }
  console.error(
    JSON.stringify({
      event: 'api_error',
      status: response?.status ?? null,
      code: response?.data?.code ?? err?.code ?? null,
      request_id: requestId,
      user_id: userId,
      method: err?.config?.method ? err.config.method.toUpperCase() : null,
      path: err?.config?.url ? err.config.url.split('?')[0] : null
    })
  )
}

/**
 * @param {unknown} err  axios error (or any thrown value)
 * @param {string} fallback  text when the server gave nothing useful
 * @returns {string}
 */
export function apiErrorMessage(err, fallback = 'Terjadi kesalahan') {
  const response = err?.response

  // Not an HTTP response: network down, CORS, or a plain JS error.
  if (!response) {
    if (err?.code === 'ERR_NETWORK') {
      logApiError(err, null, null)
      return NETWORK_MESSAGE
    }
    return err?.message || fallback
  }

  const requestId = requestIdOf(response)
  logApiError(err, response, requestId)

  const code = response.data?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (response.status === 429) return MESSAGES.TOO_MANY_REQUESTS

  // 5xx: something broke on the server. The ID lets the backend find it.
  if (response.status >= 500) {
    return requestId ? `${SERVER_MESSAGE} (ID: ${requestId})` : SERVER_MESSAGE
  }

  return serverText(response.data) || fallback
}
