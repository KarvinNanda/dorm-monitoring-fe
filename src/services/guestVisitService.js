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

export const guestVisitService = {
  /**
   * GET /guest-visit
   * @param {object} q { page, limit, from, to, sortBy, sortOrder, status, guestId }
   *   status: 'all' | 'open' | 'closed'
   *   sortBy: 'in' | 'out' | 'createdAt'
   */
  async list({
    page = 1,
    limit = 10,
    from,
    to,
    sortBy,
    sortOrder,
    status,
    guestId
  } = {}) {
    const params = { page, limit }
    if (from) params.from = from
    if (to) params.to = to
    if (sortBy) params.sortBy = sortBy
    // if (sortOrder) params.sortOrder = sortOrder
    if (status) params.status = status
    if (guestId) params.guestId = guestId
    const response = await api.get('/guest-visit', { params })
    return unwrapList(response)
  },

  /**
   * GET /guest-visit/{id}
   */
  async getById(id) {
    const response = await api.get(`/guest-visit/${id}`)
    return unwrapSingle(response)
  },

  /**
   * POST /guest-visit
   * @param {object} payload { guestId, inTime?, outTime?, note? }
   */
  async create(payload) {
    const response = await api.post('/guest-visit', payload)
    return unwrapSingle(response)
  },

  /**
   * PATCH /guest-visit/{id}/close
   * @param {object} payload { outTime?, note? }
   */
  async close(id, payload = {}) {
    const response = await api.patch(`/guest-visit/${id}/close`, payload)
    return unwrapSingle(response)
  },

  /**
   * PUT /guest-visit/{id}
   * @param {object} payload { inTime?, outTime?, note? }
   */
  async update(id, payload) {
    const response = await api.put(`/guest-visit/${id}`, payload)
    return unwrapSingle(response)
  },

  /**
   * DELETE /guest-visit/{id}
   */
  async remove(id) {
    const response = await api.delete(`/guest-visit/${id}`)
    return unwrapSingle(response)
  }
}
