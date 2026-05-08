import api from './api'

function unwrapSingle(response) {
  const body = response?.data
  if (body && typeof body === 'object' && 'data' in body && !Array.isArray(body)) {
    return body.data
  }
  return body
}

/**
 * GET /dashboard — response adaptif per role.
 *
 * Role: ADMIN
 *   {
 *     currentClock: [{ type: 'IN'|'OUT', count: number }, ...],
 *     guestVisit:   [{ status: 'OPEN'|'CLOSE', count: number }, ...],
 *     activeReservation: number
 *   }
 *
 * Role: RECEPTIONIST
 *   {
 *     guestVisit:   [{ status: 'OPEN'|'CLOSE', count: number }, ...],
 *     activeReservation: number
 *   }
 *
 * Role: RESIDENT
 *   {
 *     clockStatus: { id, time, type: 'IN'|'OUT', note } | null
 *   }
 *
 * (User dengan multi-role mendapat union — mis. admin+resident dapat
 *  currentClock + clockStatus + guestVisit + activeReservation, sesuai
 *  contoh respons backend.)
 */
export const dashboardService = {
  async get() {
    const response = await api.get('/dashboard')
    return unwrapSingle(response)
  }
}
