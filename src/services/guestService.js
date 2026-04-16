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

export const guestService = {
  /**
   * GET /guest - list guest dengan pagination, search, sort
   * @param {object} q { page, limit, search, sortBy, sortOrder }
   */
  async list({ page = 1, limit = 10, search, sortBy, sortOrder } = {}) {
    const params = { page, limit }
    if (search) params.search = search
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    const response = await api.get('/guest', { params })
    return unwrapList(response)
  },

  /**
   * GET /guest/{id}
   */
  async getById(id) {
    const response = await api.get(`/guest/${id}`)
    return unwrapSingle(response)
  },

  /**
   * POST /guest
   * @param {object} payload { name, note?, phoneNumber? }
   */
  async create(payload) {
    const response = await api.post('/guest', payload)
    return unwrapSingle(response)
  },

  /**
   * PUT /guest/{id}
   * @param {object} payload { name?, note?, phoneNumber? }
   */
  async update(id, payload) {
    const response = await api.put(`/guest/${id}`, payload)
    return unwrapSingle(response)
  },

  /**
   * DELETE /guest/{id}
   */
  async remove(id) {
    const response = await api.delete(`/guest/${id}`)
    return unwrapSingle(response)
  }
}
