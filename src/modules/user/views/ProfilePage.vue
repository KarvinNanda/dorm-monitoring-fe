<script setup>
import { ref, computed, onMounted } from 'vue'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// ============ STATE ============
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const successMessage = ref('')

const profile = ref(null)
const form = ref({ name: '', email: '', phoneNumber: '' })

// Modal ganti password sendiri
const showPasswordModal = ref(false)
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordError = ref('')
const savingPassword = ref(false)
const passwordSuccess = ref('')

// ============ HELPERS ============
function extractError(err, fallback = 'Terjadi kesalahan') {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback
}

const roleLabels = computed(() => {
  if (!profile.value?.roles) return []
  return profile.value.roles.map((r) => (typeof r === 'string' ? r : r.name || r.code || ''))
})

const isActive = computed(() => {
  if (!profile.value) return false
  if (typeof profile.value.isActive === 'boolean') return profile.value.isActive
  if (typeof profile.value.active === 'boolean') return profile.value.active
  if (profile.value.status) return String(profile.value.status).toLowerCase() === 'active'
  return true
})

// ============ LOAD ============
async function fetchMe() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await authService.me()
    profile.value = data
    form.value = {
      name: data?.name || '',
      email: data?.email || '',
      phoneNumber: data?.phoneNumber || data?.phone || ''
    }
    // Sinkronkan ke store supaya sidebar ikut update
    authStore.setUser(data)
  } catch (err) {
    loadError.value = extractError(err, 'Gagal memuat profil')
  } finally {
    loading.value = false
  }
}

onMounted(fetchMe)

// ============ UPDATE ============
async function saveProfile() {
  saveError.value = ''
  successMessage.value = ''

  if (!form.value.name?.trim()) {
    saveError.value = 'Nama wajib diisi'
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      email: form.value.email,
      phoneNumber: form.value.phoneNumber || undefined
    }
    const updated = await userService.updateMe(payload)
    profile.value = updated || profile.value
    if (updated) authStore.setUser(updated)
    successMessage.value = 'Profil berhasil diperbarui'
    setTimeout(() => (successMessage.value = ''), 2500)
  } catch (err) {
    saveError.value = extractError(err, 'Gagal memperbarui profil')
  } finally {
    saving.value = false
  }
}

// ============ RESET PASSWORD ============
function openPasswordModal() {
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  passwordError.value = ''
  passwordSuccess.value = ''
  showPasswordModal.value = true
}

async function submitPassword() {
  passwordError.value = ''
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword) {
    passwordError.value = 'Password saat ini wajib diisi'
    return
  }
  if (!newPassword || newPassword.length < 8) {
    passwordError.value = 'Password baru minimal 8 karakter'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordError.value = 'Konfirmasi password tidak cocok'
    return
  }

  savingPassword.value = true
  try {
    await authService.resetPassword(currentPassword, newPassword)
    passwordSuccess.value = 'Password berhasil diganti'
    setTimeout(() => {
      showPasswordModal.value = false
    }, 1200)
  } catch (err) {
    passwordError.value = extractError(err, 'Gagal mengganti password')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Profil Saya</h1>
      <p class="text-sm text-gray-500">Kelola informasi akun Anda.</p>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
      Memuat profil...
    </div>
    <div v-else-if="loadError" class="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm flex items-start justify-between gap-3">
      <span>{{ loadError }}</span>
      <button @click="fetchMe" class="text-red-700 underline text-xs shrink-0">Coba lagi</button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Identity Card -->
      <div class="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
          {{ (profile?.name || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-lg font-semibold text-gray-800 truncate">{{ profile?.name || '—' }}</div>
          <div class="text-sm text-gray-500 truncate">{{ profile?.email || '—' }}</div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="rn in roleLabels"
              :key="rn"
              class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-primary capitalize"
            >
              {{ rn }}
            </span>
            <span
              class="text-xs font-medium px-2 py-0.5 rounded-full"
              :class="isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
            >
              {{ isActive ? 'active' : 'inactive' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div class="bg-white border border-gray-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-800">Informasi Akun</h2>
          <button
            @click="openPasswordModal"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            🔑 Ganti Password
          </button>
        </div>

        <form @submit.prevent="saveProfile" class="space-y-4">
          <div v-if="saveError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ saveError }}</div>
          <div v-if="successMessage" class="bg-green-50 text-green-700 text-sm p-3 rounded-lg">{{ successMessage }}</div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">No. Telepon (opsional)</label>
            <input
              v-model="form.phoneNumber"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ PASSWORD MODAL ============ -->
    <div
      v-if="showPasswordModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showPasswordModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Ganti Password</h3>
        <p class="text-sm text-gray-500 mb-4">Masukkan password saat ini, lalu password baru.</p>
        <form @submit.prevent="submitPassword" class="space-y-4">
          <div v-if="passwordError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ passwordError }}</div>
          <div v-if="passwordSuccess" class="bg-green-50 text-green-700 text-sm p-3 rounded-lg">{{ passwordSuccess }}</div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              minlength="8"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              minlength="8"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showPasswordModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingPassword"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {{ savingPassword ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
