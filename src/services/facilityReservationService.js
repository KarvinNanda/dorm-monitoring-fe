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

export const facilityReservationService = {
  /**
   * GET /facility-reservation
   * @param {object} q { page, limit, sortOrder, from, to, search, status, facilityId }
   */
  async list({
    page = 1,
    limit = 10,
    sortOrder,
    from,
    to,
    search,
    status,
    facilityId
  } = {}) {
    const params = { page, limit }
    if (sortOrder) params.sortOrder = sortOrder
    if (from) params.from = from
    if (to) params.to = to
    if (search) params.search = search
    if (status) params.status = status
    if (facilityId) params.facilityId = facilityId
    const response = await api.get('/facility-reservation', { params })
    return unwrapList(response)
  },

  /** GET /facility-reservation/{id} */
  async getById(id) {
    const response = await api.get(`/facility-reservation/${id}`)
    return unwrapSingle(response)
  },

  /**
   * POST /facility-reservation
   * @param {object} payload { facilityId, title, description, startDateTime, endDateTime, note? }
   */
  async create(payload) {
    const response = await api.post('/facility-reservation', payload)
    return unwrapSingle(response)
  },

  /**
   * PATCH /facility-reservation/{id}
   * @param {object} payload { title?, description?, startDateTime?, endDateTime?, note?, status? }
   */
  async update(id, payload) {
    const response = await api.patch(`/facility-reservation/${id}`, payload)
    return unwrapSingle(response)
  },

  /** DELETE /facility-reservation/{id} */
  async remove(id) {
    const response = await api.delete(`/facility-reservation/${id}`)
    return unwrapSingle(response)
  }
}
