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

export const itemTransactionService = {
  /**
   * GET /item-transaction
   * Histori transaksi global (semua item).
   * @param {object} q { page, limit, from, to, type, itemId, sortOrder }
   */
  async list({
    page = 1,
    limit = 10,
    from,
    to,
    type,
    itemId,
    sortOrder
  } = {}) {
    const params = { page, limit }
    if (from) params.from = from
    if (to) params.to = to
    if (type) params.type = type
    if (itemId) params.itemId = itemId
    if (sortOrder) params.sortOrder = sortOrder
    const response = await api.get('/item-transaction', { params })
    return unwrapList(response)
  },

  /**
   * POST /item-transaction/bulk
   * @param {object} payload { transactions: [{ id, type, qty, note? }, ...] }
   */
  async bulk(payload) {
    const response = await api.post('/item-transaction/bulk', payload)
    return unwrapSingle(response)
  }
}
