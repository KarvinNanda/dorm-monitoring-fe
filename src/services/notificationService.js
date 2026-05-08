import api from './api'

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

export const notificationService = {
  /**
   * GET /notification
   * @param {object} q { page=1, limit=20, unreadOnly=false }
   */
  async list({ page = 1, limit = 20, unreadOnly } = {}) {
    const params = { page, limit }
    if (unreadOnly !== undefined) params.unreadOnly = unreadOnly
    const response = await api.get('/notification', { params })
    return unwrapList(response)
  },

  /** GET /notification/unread-count → { count } */
  async unreadCount() {
    const response = await api.get('/notification/unread-count')
    return unwrapSingle(response)
  },

  /** PATCH /notification/read-all → { counts } */
  async readAll() {
    const response = await api.patch('/notification/read-all')
    return unwrapSingle(response)
  }
}
