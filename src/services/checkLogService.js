import { convertToUtc } from '../utils/dateFormat'
import api from './api'

/**
 * Helper unwrap response - dukung { data, meta } atau flat
 */
function unwrapList(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'data' in body) {
    return { data: body.data, meta: body.meta || null }
  }
  return { data: body, meta: null }
}

function unwrapSingle(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'data' in body && !Array.isArray(body)) {
    return body.data
  }
  return body
}

export const checkLogService = {
  // ============ RESIDENT ============

  /**
   * POST /check-log/in - resident clock-in
   */
  async clockIn(note) {
    const payload = note ? { note } : {}
    const response = await api.post('/check-log/in', payload)
    return unwrapSingle(response)
  },

  /**
   * POST /check-log/out - resident clock-out
   */
  async clockOut(note) {
    const payload = note ? { note } : {}
    const response = await api.post('/check-log/out', payload)
    return unwrapSingle(response)
  },

  /**
   * GET /check-log/me - status absensi terakhir milik user login
   */
  async getMe() {
    const response = await api.get('/check-log/status/me')
    return unwrapSingle(response)
  },

  /**
   * GET /check-log/history/me - riwayat absensi user login
   * @param {object} q { page, limit, from, to }
   */
  async getMyHistory({ page = 1, limit = 10, from, to } = {}) {
    const params = { page, limit }
    if (from) params.from = from
    if (to) params.to = to
    const response = await api.get('/check-log/history/me', { params })
    return unwrapList(response)
  },

  // ============ ADMIN ============

  /**
   * GET /check-log - latest status semua resident (admin)
   * @param {object} q { page, limit, type }
   */
  async listLatest({ page = 1, limit = 10, type } = {}) {
    const params = { page, limit }
    if (type) params.type = type
    const response = await api.get('/check-log', { params })
    return unwrapList(response)
  },

  /**
   * GET /check-log/history/{userId} - riwayat user tertentu (admin)
   */
  async getUserHistory(userId, { page = 1, limit = 10, from, to } = {}) {
    const params = { page, limit }
    if (from) params.from = convertToUtc(from)
    if (to) params.to = convertToUtc(to,true)
    const response = await api.get(`/check-log/history/${userId}`, { params })
    return unwrapList(response)
  },

  /**
   * POST /check-log/manual - buat absensi manual (admin)
   * @param {object} payload { userId, type: 'IN'|'OUT', eventTime, note? }
   */
  async createManual(payload) {
    const response = await api.post('/check-log/manual', payload)
    return unwrapSingle(response)
  }
}
