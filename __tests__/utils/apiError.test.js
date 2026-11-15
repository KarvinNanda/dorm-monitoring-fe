/**
 * apiErrorMessage: one place that turns an axios error into the text the
 * user sees. Backend error body: { success, code, message, path, timestamp,
 * requestId }, and every response carries an X-Request-Id header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiErrorMessage } from '@/utils/apiError'

function httpError(status, body = {}, headers = {}) {
  return { response: { status, data: body, headers }, config: { method: 'post', url: '/auth/login?x=1' } }
}

describe('apiErrorMessage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('kode yang dikenal → pesan Indonesia', () => {
    expect(apiErrorMessage(httpError(429, { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts' }))).toBe(
      'Terlalu banyak percobaan. Coba lagi dalam 1 menit.'
    )
    expect(apiErrorMessage(httpError(409, { code: 'EMAIL_ALREADY_EXISTS' }))).toMatch(/Email ini sudah dipakai/)
    expect(apiErrorMessage(httpError(403, { code: 'CANNOT_MODIFY_SELF' }))).toMatch(/akun sendiri/)
    expect(apiErrorMessage(httpError(403, { code: 'TARGET_USER_NOT_ALLOWED' }))).toMatch(/bukan resident/)
  })

  it('429 tanpa body (mis. dari proxy) tetap "coba lagi dalam 1 menit"', () => {
    expect(apiErrorMessage(httpError(429, {}))).toMatch(/1 menit/)
  })

  it('kode tidak dikenal → pesan dari server, lalu fallback', () => {
    expect(apiErrorMessage(httpError(400, { code: 'VALIDATION_ERROR', message: 'name should not be empty' }))).toBe(
      'name should not be empty'
    )
    expect(apiErrorMessage(httpError(400, { message: ['a must be x', 'b must be y'] }))).toBe('a must be x, b must be y')
    expect(apiErrorMessage(httpError(400, {}), 'Gagal menyimpan')).toBe('Gagal menyimpan')
  })

  it('error 5xx → pesan + ID request supaya bisa dicari di log backend', () => {
    const msg = apiErrorMessage(httpError(500, { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: 'abc-123' }), 'Gagal memuat')
    expect(msg).toBe('Terjadi kesalahan di server. (ID: abc-123)')
  })

  it('ID diambil dari header X-Request-Id kalau body tidak punya requestId', () => {
    const msg = apiErrorMessage(httpError(502, 'Bad Gateway', { 'x-request-id': 'hdr-9' }))
    expect(msg).toContain('(ID: hdr-9)')
  })

  it('error 4xx biasa tidak menampilkan ID', () => {
    expect(apiErrorMessage(httpError(409, { code: 'EMAIL_ALREADY_EXISTS', requestId: 'r1' }))).not.toContain('ID:')
  })

  it('tanpa response (jaringan putus) → pesan koneksi', () => {
    expect(apiErrorMessage({ code: 'ERR_NETWORK', message: 'Network Error' })).toMatch(/Tidak dapat terhubung ke server/)
  })

  it('error non-HTTP (bug di kode) → message error-nya', () => {
    expect(apiErrorMessage(new Error('Response login tidak valid'))).toBe('Response login tidak valid')
  })

  it('log ke console: satu baris JSON, ada request_id, tanpa query string', () => {
    apiErrorMessage(httpError(500, { code: 'INTERNAL_ERROR', requestId: 'abc-123' }))
    expect(console.error).toHaveBeenCalledTimes(1)
    const line = console.error.mock.calls[0][0]
    expect(typeof line).toBe('string')
    expect(JSON.parse(line)).toMatchObject({
      event: 'api_error',
      status: 500,
      code: 'INTERNAL_ERROR',
      request_id: 'abc-123',
      method: 'POST',
      path: '/auth/login'
    })
  })
})
