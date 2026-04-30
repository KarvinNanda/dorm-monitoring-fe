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

export const facilityService = {
  /** GET /facility */
  async list({ page = 1, limit = 10, sortBy, sortOrder, search } = {}) {
    const params = { page, limit }
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    if (search) params.search = search
    const response = await api.get('/facility', { params })
    return unwrapList(response)
  },

  /** GET /facility/{id} */
  async getById(id) {
    const response = await api.get(`/facility/${id}`)
    return unwrapSingle(response)
  },

  /** POST /facility — body: { name, description, note? } */
  async create(payload) {
    const response = await api.post('/facility', payload)
    return unwrapSingle(response)
  },

  /** PUT /facility/{id} — body: { name?, description?, note? } */
  async update(id, payload) {
    const response = await api.put(`/facility/${id}`, payload)
    return unwrapSingle(response)
  },

  /** DELETE /facility/{id} */
  async remove(id) {
    const response = await api.delete(`/facility/${id}`)
    return unwrapSingle(response)
  }
}
