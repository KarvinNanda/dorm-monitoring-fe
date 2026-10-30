<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userDeviceService } from '@/services/userDeviceService'
import { getPlayerId } from '@/utils/oneSignal'
import logoUrl from '@/assets/logo-3.png'
import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const showPassword = ref(false)
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
  <div>
    <div class="mb-8">
      <img :src="logoUrl" alt="Logo Rumah Alam Bahagia" class="w-14 h-14 object-contain mb-4 lg:hidden" />
      <h1 class="text-2xl font-semibold text-ink">Masuk</h1>
      <p class="text-sm text-ink-muted mt-1">Sistem Internal Rumah Alam Bahagia</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div
        v-if="error"
        role="alert"
        class="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-xl"
      >
        <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>{{ error }}</span>
      </div>

      <div>
        <label for="login-email" class="block text-sm font-medium text-ink mb-1.5">Email</label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-muted pointer-events-none" aria-hidden="true" />
          <input
            id="login-email"
            v-model="email"
            type="email"
            required
            autocomplete="username"
            inputmode="email"
            autocapitalize="none"
            spellcheck="false"
            placeholder="anda@contoh.com"
            class="w-full h-12 pl-11 pr-4 bg-white border border-gray-300 rounded-xl text-base text-ink placeholder:text-gray-400 outline-none transition-colors duration-fast focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      </div>

      <div>
        <label for="login-password" class="block text-sm font-medium text-ink mb-1.5">Kata Sandi</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-muted pointer-events-none" aria-hidden="true" />
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            class="w-full h-12 pl-11 pr-12 bg-white border border-gray-300 rounded-xl text-base text-ink outline-none transition-colors duration-fast focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="button"
            class="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-ink-muted hover:text-brand-700"
            :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-[18px] h-[18px]" aria-hidden="true" />
            <Eye v-else class="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full h-12 flex items-center justify-center gap-2 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors duration-fast disabled:opacity-60 pressable"
      >
        <LoaderCircle v-if="loading" class="w-5 h-5 animate-spin" aria-hidden="true" />
        {{ loading ? 'Memproses...' : 'Masuk' }}
      </button>
    </form>
  </div>
</template>
