import api from './api'

/**
 * Helper unwrap response - dukung { data: ..., meta: ... } atau flat
 */
function unwrap(response) {
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

export const userService = {
  /**
   * GET /users (Admin) - list dengan pagination, sort, search
   */
  async list({ page = 1, limit = 10, sortBy, sortOrder, search } = {}) {
    const params = { page, limit }
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    if (search) params.search = search
    const response = await api.get('/user', { params })
    return unwrap(response)
  },

  /**
   * GET /user/{userId} (Admin)
   */
  async getById(userId) {
    const response = await api.get(`/user/${userId}`)
    return unwrapSingle(response)
  },

  /**
   * PUT /user/me - update profil sendiri
   */
  async updateMe(payload) {
    const response = await api.put('/user/me', payload)
    return unwrapSingle(response)
  },

  /**
   * POST /user (Admin)
   */
  async create(payload) {
    const response = await api.post('/user', payload)
    return unwrapSingle(response)
  },

  /**
   * PUT /user/{userId} (Admin)
   */
  async update(userId, payload) {
    const response = await api.put(`/user/${userId}`, payload)
    return unwrapSingle(response)
  },

  /**
   * DELETE /user/{userId} (Admin)
   */
  async remove(userId) {
    const response = await api.delete(`/user/${userId}`)
    return unwrapSingle(response)
  },

  /**
   * PATCH /user/{userId}/activate (Admin)
   */
  async activate(userId) {
    const response = await api.patch(`/user/${userId}/activate`)
    return unwrapSingle(response)
  },

  /**
   * PATCH /user/{userId}/deactivate (Admin)
   */
  async deactivate(userId) {
    const response = await api.patch(`/user/${userId}/deactivate`)
    return unwrapSingle(response)
  },

  /**
   * PUT /user/{userId}/roles (Admin)
   */
  async assignRoles(userId, roleIds) {
    const response = await api.put(`/user/${userId}/roles`, { roleIds })
    return unwrapSingle(response)
  },

  /**
   * GET /role (Admin) - list semua role
   */
  async listRoles() {
    const response = await api.get('/role')
    return unwrapSingle(response)
  }
}
