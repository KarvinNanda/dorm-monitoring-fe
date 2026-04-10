import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // ============ STATE ============
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const accessToken = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)

  // ============ GETTERS ============
  const isAuthenticated = computed(() => !!accessToken.value)

  // Normalisasi roles - support string atau object ({name, code, ...})
  const roles = computed(() => {
    if (!user.value?.roles) return []
    return user.value.roles.map((r) =>
      (typeof r === 'string' ? r : r.name || r.code || '').toLowerCase()
    )
  })

  const primaryRole = computed(() => roles.value[0] || 'user')

  function hasRole(roleName) {
    if (!roleName) return false
    return roles.value.includes(String(roleName).toLowerCase())
  }

  function hasAnyRole(roleList = []) {
    return roleList.some((r) => hasRole(r))
  }

  // ============ ACTIONS ============
  function setTokens(access, refresh) {
    accessToken.value = access || null
    if (access) {
      localStorage.setItem('accessToken', access)
    } else {
      localStorage.removeItem('accessToken')
    }

    if (refresh !== undefined) {
      refreshToken.value = refresh || null
      if (refresh) {
        localStorage.setItem('refreshToken', refresh)
      } else {
        localStorage.removeItem('refreshToken')
      }
    }
  }

  function setUser(userData) {
    user.value = userData
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }

  function clearAuth() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  // Alias kompatibilitas lama
  function logout() {
    clearAuth()
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    roles,
    primaryRole,
    hasRole,
    hasAnyRole,
    setTokens,
    setUser,
    clearAuth,
    logout
  }
})
