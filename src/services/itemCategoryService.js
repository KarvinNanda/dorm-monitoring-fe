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

export const itemCategoryService = {
  /**
   * GET /item-category
   * @param {object} q { page, limit, sortBy: 'name'|'createdAt', sortOrder: 'asc'|'desc' }
   */
  async list({ page = 1, limit = 10, sortBy, sortOrder } = {}) {
    const params = { page, limit }
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    const response = await api.get('/item-category', { params })
    return unwrapList(response)
  },

  /** GET /item-category/{id} */
  async getById(id) {
    const response = await api.get(`/item-category/${id}`)
    return unwrapSingle(response)
  },

  /** POST /item-category — body: { name } */
  async create(payload) {
    const response = await api.post('/item-category', payload)
    return unwrapSingle(response)
  },

  /** PUT /item-category/{id} — body: { name? } */
  async update(id, payload) {
    const response = await api.put(`/item-category/${id}`, payload)
    return unwrapSingle(response)
  },

  /** DELETE /item-category/{id} */
  async remove(id) {
    const response = await api.delete(`/item-category/${id}`)
    return unwrapSingle(response)
  }
}
