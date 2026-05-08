<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userDeviceService } from '@/services/userDeviceService'
import { getPlayerId } from '@/utils/oneSignal'
import logoUrl from '@/assets/logo-3.png'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    // 1) POST /auth/login → dapat accessToken & refreshToken
    const tokens = await authService.login(email.value, password.value)

    if (!tokens?.accessToken) {
      throw new Error('Response login tidak valid')
    }

    authStore.setTokens(tokens.accessToken, tokens.refreshToken)

    // 2) GET /user/me → dapat data user
    const userData = await authService.me()
    authStore.setUser(userData)

    // 3) Register OneSignal push token ke backend — HARUS selesai sebelum redirect
    try {
      const playerId = await getPlayerId()
      console.log('[OneSignal] Player ID:', playerId)
      if (playerId) {
        await userDeviceService.register(playerId)
        console.log('[OneSignal] Register berhasil')
      } else {
        console.warn('[OneSignal] Player ID null — token tidak terdaftar ke backend')
      }
    } catch (pushErr) {
      // Gagal register push token tidak boleh menghalangi login
      console.warn('[OneSignal] Register error:', pushErr)
    }

    // 4) Redirect ke dashboard (SETELAH register selesai)
    router.push('/dashboard')
  } catch (err) {
    // Handle error response
    const status = err.response?.status
    const serverMsg = err.response?.data?.message || err.response?.data?.error

    if (status === 401 || status === 400) {
      error.value = serverMsg || 'Email atau kata sandi salah.'
    } else if (err.code === 'ERR_NETWORK') {
      error.value = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
    } else {
      error.value = serverMsg || err.message || 'Terjadi kesalahan. Silakan coba lagi.'
    }

    authStore.clearAuth()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-lg p-8">
    <div class="text-center mb-8">
      <img
        :src="logoUrl"
        alt="Logo Sistem Internal"
        class="w-16 h-16 mx-auto mb-3 object-contain"
      />
      <h1 class="text-2xl font-bold text-primary">Sistem Internal</h1>
      <p class="text-gray-500 mt-2">Masuk ke akun Anda</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
      <div v-if="error" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
        {{ error }}
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          v-model="email"
          type="email"
          required
          placeholder="anda@contoh.com"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Kata Sandi</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {{ loading ? 'Memproses...' : 'Masuk' }}
      </button>
    </form>
  </div>
</template>
