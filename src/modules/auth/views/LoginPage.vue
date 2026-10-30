<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import logoUrl from '@/assets/logo-3.png'
import { CircleAlert, LoaderCircle } from 'lucide-vue-next'
import PasswordInput from '@/components/PasswordInput.vue'

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

    // 3) Redirect ke dashboard. Device push didaftarkan oleh MainLayout.
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
    <div class="text-center mb-8">
      <img
        :src="logoUrl"
        alt="Logo Rumah Alam Bahagia"
        class="w-16 h-16 mx-auto mb-3 object-contain dark:bg-[#fff] dark:rounded-xl dark:p-1"
      />
      <h1 class="text-2xl font-semibold text-brand-700">Sistem Internal</h1>
      <p class="text-sm text-ink-muted mt-1">Masuk ke akun Anda</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-5">
      <p v-if="error" role="alert" class="form-error">
        <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>{{ error }}</span>
      </p>

      <div>
        <label for="login-email" class="field-label">Email</label>
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
          class="field h-12"
        />
      </div>

      <div>
        <label for="login-password" class="field-label">Kata Sandi</label>
        <PasswordInput
          id="login-password"
          v-model="password"
          required
          autocomplete="current-password"
          class="field h-12 pr-12"
        />
      </div>

      <button type="submit" :disabled="loading" class="btn btn-primary w-full h-12 text-base">
        <LoaderCircle v-if="loading" class="w-5 h-5 animate-spin" aria-hidden="true" />
        {{ loading ? 'Memproses...' : 'Masuk' }}
      </button>
    </form>
  </div>
</template>
