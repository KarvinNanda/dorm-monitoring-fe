<script setup>
import { ref, computed, onMounted } from 'vue'
import { KeyRound } from 'lucide-vue-next'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// ============ TOAST ============
const toast = ref({ show: false, type: 'success', message: '' })
let toastTimer = null
function showToast(message, type = 'success') {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value.show = false), 2500)
}

// ============ STATE ============
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')

const profile = ref(null)
const form = ref({ name: '', email: '', phoneNumber: '' })

// Modal ganti kata sandi sendiri
const showPasswordModal = ref(false)
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordError = ref('')
const savingPassword = ref(false)

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

const initial = computed(() => (profile.value?.name || '?').charAt(0).toUpperCase())

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
    showToast('Profil berhasil diperbarui')
  } catch (err) {
    saveError.value = extractError(err, 'Gagal memperbarui profil')
  } finally {
    saving.value = false
  }
}

// ============ GANTI KATA SANDI ============
function openPasswordModal() {
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  passwordError.value = ''
  showPasswordModal.value = true
}

async function submitPassword() {
  passwordError.value = ''
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword) {
    passwordError.value = 'Kata sandi saat ini wajib diisi'
    return
  }
  if (!newPassword || newPassword.length < 8) {
    passwordError.value = 'Kata sandi baru minimal 8 karakter'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordError.value = 'Konfirmasi kata sandi tidak cocok'
    return
  }

  savingPassword.value = true
  try {
    await authService.resetPassword(currentPassword, newPassword)
    showPasswordModal.value = false
    showToast('Kata sandi berhasil diganti')
  } catch (err) {
    passwordError.value = extractError(err, 'Gagal mengganti kata sandi')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-4">
    <AppToast :toast="toast" />

    <div v-if="loading" class="card empty-state" aria-busy="true">Memuat profil...</div>
    <div v-else-if="loadError" class="form-error items-center justify-between" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="btn btn-secondary h-9 shrink-0" @click="fetchMe">Coba lagi</button>
    </div>

    <template v-else>
      <!-- Identitas -->
      <section class="card p-4 sm:p-5 flex items-center gap-4" aria-label="Identitas akun">
        <span
          class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl sm:text-2xl font-semibold shrink-0"
          aria-hidden="true"
        >{{ initial }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-base sm:text-lg font-semibold text-ink truncate">{{ profile?.name || '-' }}</p>
          <p class="text-sm text-ink-muted truncate">{{ profile?.email || '-' }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-for="rn in roleLabels" :key="rn" class="chip chip-brand capitalize">{{ rn }}</span>
            <span class="chip" :class="isActive ? 'chip-brand' : 'chip-gray'">{{ isActive ? 'Aktif' : 'Nonaktif' }}</span>
          </div>
        </div>
      </section>

      <!-- Informasi akun -->
      <section class="card p-4 sm:p-5" aria-labelledby="profile-info-title">
        <h2 id="profile-info-title" class="text-base font-semibold text-ink mb-4">Informasi akun</h2>
        <form class="space-y-4" @submit.prevent="saveProfile">
          <p v-if="saveError" class="form-error" role="alert">{{ saveError }}</p>
          <div>
            <label for="profile-name" class="field-label">Nama</label>
            <input id="profile-name" v-model="form.name" type="text" required autocomplete="name" class="field" />
          </div>
          <div>
            <label for="profile-email" class="field-label">Email</label>
            <input id="profile-email" v-model="form.email" type="email" autocomplete="email" class="field" />
          </div>
          <div>
            <label for="profile-phone" class="field-label">No. telepon <span class="font-normal text-ink-muted">(opsional)</span></label>
            <input
              id="profile-phone"
              v-model="form.phoneNumber"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="08xxxxxxxxxx"
              class="field"
            />
          </div>
          <div class="pt-1">
            <button type="submit" class="btn btn-primary w-full sm:w-auto" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan perubahan' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Keamanan -->
      <section class="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3" aria-labelledby="profile-security-title">
        <div class="flex-1 min-w-0">
          <h2 id="profile-security-title" class="text-base font-semibold text-ink">Kata sandi</h2>
          <p class="text-sm text-ink-muted mt-0.5">Ganti kata sandi secara berkala dan jangan bagikan ke orang lain.</p>
        </div>
        <button type="button" class="btn btn-secondary w-full sm:w-auto" @click="openPasswordModal">
          <KeyRound class="w-4 h-4" aria-hidden="true" />
          Ganti kata sandi
        </button>
      </section>
    </template>

    <!-- ============ MODAL GANTI KATA SANDI ============ -->
    <BaseModal v-model:open="showPasswordModal" title="Ganti Kata Sandi">
      <form id="password-form" class="space-y-4" @submit.prevent="submitPassword">
        <p class="text-sm text-ink-muted">Masukkan kata sandi saat ini, lalu kata sandi baru.</p>
        <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
        <div>
          <label for="password-current" class="field-label">Kata sandi saat ini</label>
          <PasswordInput
            id="password-current"
            v-model="passwordForm.currentPassword"
            required
            autocomplete="current-password"
            class="field pr-12"
          />
        </div>
        <div>
          <label for="password-new" class="field-label">Kata sandi baru</label>
          <PasswordInput
            id="password-new"
            v-model="passwordForm.newPassword"
            required
            minlength="8"
            autocomplete="new-password"
            aria-describedby="password-new-hint"
            class="field pr-12"
          />
          <p id="password-new-hint" class="field-hint">Minimal 8 karakter.</p>
        </div>
        <div>
          <label for="password-confirm" class="field-label">Konfirmasi kata sandi baru</label>
          <PasswordInput
            id="password-confirm"
            v-model="passwordForm.confirmPassword"
            required
            minlength="8"
            autocomplete="new-password"
            class="field pr-12"
          />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showPasswordModal = false">Batal</button>
        <button type="submit" form="password-form" class="btn btn-primary flex-1" :disabled="savingPassword">
          {{ savingPassword ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
