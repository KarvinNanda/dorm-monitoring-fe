import api from './api'

/**
 * Helper untuk unwrap response - dukung flat response maupun { data: {...} }
 */
function unwrap(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'data' in body && !('accessToken' in body)) {
    return body.data
  }
  return body
}

export const authService = {
  /**
   * POST /auth/login
   * @returns { accessToken, refreshToken }
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    return unwrap(response)
  },

  /**
   * POST /auth/logout
   */
  async logout() {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // Abaikan error logout - tetap clear di client
      console.warn('Logout API error (diabaikan):', err?.message)
    }
  },

  /**
   * POST /auth/refresh
   * @returns { accessToken, refreshToken }
   */
  async refresh(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken })
    return unwrap(response)
  },

  /**
   * GET /user/me - data diri user yang sedang login
   * @returns UserResponse
   */
  async me() {
    const response = await api.get('/user/me')
    return unwrap(response)
  },

  /**
   * POST /auth/reset-password - ganti password sendiri
   */
  async resetPassword(currentPassword, newPassword) {
    const response = await api.post('/auth/reset-password', {
      currentPassword,
      newPassword
    })
    return unwrap(response)
  },

  /**
   * POST /auth/change-password (Admin only) - reset password user lain
   */
  async changePassword(userId, newPassword) {
    const response = await api.post('/auth/change-password', {
      userId,
      newPassword
    })
    return unwrap(response)
  }
}
