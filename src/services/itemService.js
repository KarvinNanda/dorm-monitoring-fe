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

export const itemService = {
  /**
   * GET /item
   * @param {object} q { page, limit, sortBy, sortOrder, search, categoryId }
   */
  async list({
    page = 1,
    limit = 10,
    sortBy,
    sortOrder,
    search,
    categoryId
  } = {}) {
    const params = { page, limit }
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    if (search) params.search = search
    if (categoryId) params.categoryId = categoryId
    const response = await api.get('/item', { params })
    return unwrapList(response)
  },

  /** GET /item/{id} */
  async getById(id) {
    const response = await api.get(`/item/${id}`)
    return unwrapSingle(response)
  },

  /** POST /item — body: { name, description, qty, note?, categoryId } */
  async create(payload) {
    const response = await api.post('/item', payload)
    return unwrapSingle(response)
  },

  /** PATCH /item/{id} — body: { name?, description?, note?, categoryId? } */
  async update(id, payload) {
    const response = await api.patch(`/item/${id}`, payload)
    return unwrapSingle(response)
  },

  /** DELETE /item/{id} */
  async remove(id) {
    const response = await api.delete(`/item/${id}`)
    return unwrapSingle(response)
  },

  /**
   * GET /item/{id}/transactions
   * Histori transaksi item tertentu.
   */
  async listTransactions(id, { page = 1, limit = 10 } = {}) {
    const response = await api.get(`/item/${id}/transactions`, {
      params: { page, limit }
    })
    return unwrapList(response)
  },

  /**
   * POST /item/{id}/transactions
   * @param {object} payload { type: 'ADJUST'|'ADD'|'MINUS', qty, note? }
   */
  async createTransaction(id, payload) {
    const response = await api.post(`/item/${id}/transactions`, payload)
    return unwrapSingle(response)
  }
}
