import api from './api'

function unwrapSingle(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'data' in body && !Array.isArray(body)) {
    return body.data
  }
  return body
}

export const userDeviceService = {
  /**
   * POST /user-device — daftarkan push token (FCM / APNs / web push) ke akun.
   * Idempotent di backend: aman dipanggil setiap kali app boot.
   */
  async register(pushToken) {
    const response = await api.post('/user-device', { pushToken })
    return unwrapSingle(response)
  },

  /**
   * DELETE /user-device — cabut push token.
   * Backend menerima body via DELETE → axios pakai key `data`.
   * Response: { count: number } — jumlah device yang dihapus.
   */
  async unregister(pushToken) {
    const response = await api.delete('/user-device', { data: { pushToken } })
    return unwrapSingle(response)
  }
}
