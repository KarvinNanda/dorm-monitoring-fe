<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-vue-next'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { confirmDialog } from '@/composables/useConfirm'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// ============ STATE ============
const users = ref([])
const roles = ref([])
const loadingList = ref(false)
const listError = ref('')

// Pagination & query
const page = ref(1)
const limit = ref(4)
const meta = ref(null) // { total, page, limit, totalPages } (fleksibel)
const search = ref('')
const sortBy = ref('createdAt') // name | createdAt
const sortOrder = ref('desc') // asc | desc

// Modal create/edit
const showModal = ref(false)
const editingUser = ref(null)
const form = ref({
  name: '',
  email: '',
  phoneNumber: '',
  password: '',
  roleIds: []
})
const formError = ref('')
const saving = ref(false)

// Modal ganti password (admin)
const showPasswordModal = ref(false)
const passwordTarget = ref(null)
const passwordForm = ref({ newPassword: '' })
const passwordError = ref('')
const savingPassword = ref(false)

// Modal assign roles
const showRolesModal = ref(false)
const rolesTarget = ref(null)
const rolesForm = ref({ roleIds: [] })
const savingRoles = ref(false)

// Info toast sederhana
const toast = ref({ show: false, type: 'success', message: '' })
let toastTimer = null
function showToast(message, type = 'success') {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value.show = false), 2500)
}

// ============ HELPERS ============
function extractError(err, fallback = 'Terjadi kesalahan') {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  )
}

function roleNames(user) {
  if (!user?.roles) return []
  return user.roles.map((r) => (typeof r === 'string' ? r : r.name || r.code || ''))
}

function isActive(user) {
  if (typeof user?.isActive === 'boolean') return user.isActive
  if (typeof user?.active === 'boolean') return user.active
  if (user?.status) return String(user.status).toLowerCase() === 'active'
  return true
}

const totalPages = computed(() => {
  if (!meta.value) return 1
  return meta.value.totalPages || meta.value.total_pages || Math.max(1, Math.ceil((meta.value.total || 0) / limit.value))
})

// Sembunyikan user yang sedang login dari tabel supaya tidak bisa
// menon-aktifkan / hapus akunnya sendiri dari halaman ini.
// Untuk kelola akun sendiri gunakan halaman /profile.
const visibleUsers = computed(() => {
  const currentId = authStore.user?.id
  if (!currentId) return users.value
  return users.value.filter((u) => String(u.id) !== String(currentId))
})

// ============ LOAD DATA ============
async function fetchUsers() {
  loadingList.value = true
  listError.value = ''
  try {
    const { data, meta: m } = await userService.list({
      page: page.value,
      limit: limit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      search: search.value || undefined
    })
    users.value = Array.isArray(data) ? data : []
    meta.value = m
  } catch (err) {
    listError.value = extractError(err, 'Gagal memuat data user')
  } finally {
    loadingList.value = false
  }
}

async function fetchRoles() {
  try {
    const data = await userService.listRoles()
    roles.value = Array.isArray(data) ? data : data?.data || []
  } catch (err) {
    console.warn('Gagal memuat roles:', extractError(err))
  }
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles()])
})

// Refetch saat page berubah
watch(page, fetchUsers)

// Debounce search
let searchTimer = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchUsers()
  }, 400)
})

watch([sortBy, sortOrder], () => {
  page.value = 1
  fetchUsers()
})

// ============ CREATE / EDIT ============
function openCreate() {
  editingUser.value = null
  form.value = { name: '', email: '', phoneNumber: '', password: '', roleIds: [] }
  formError.value = ''
  showModal.value = true
}

function openEdit(user) {
  editingUser.value = user
  form.value = {
    name: user.name || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || user.phone || '',
    password: '',
    roleIds: (user.roles || []).map((r) => (typeof r === 'object' ? r.id : r)).filter(Boolean)
  }
  formError.value = ''
  showModal.value = true
}

async function saveUser() {
  formError.value = ''
  if (!form.value.name?.trim()) {
    formError.value = 'Nama wajib diisi'
    return
  }
  if (!editingUser.value && !form.value.email?.trim()) {
    formError.value = 'Email wajib diisi'
    return
  }
  if (!editingUser.value && (!form.value.password || form.value.password.length < 8)) {
    formError.value = 'Kata sandi minimal 8 karakter'
    return
  }

  saving.value = true
  try {
    if (editingUser.value) {
      // PUT /user/{id} → hanya kirim field yg diubah (name, email, phone)
      const payload = {
        name: form.value.name,
        email: form.value.email,
        phoneNumber: form.value.phoneNumber || undefined
      }
      await userService.update(editingUser.value.id, payload)
      showToast('User berhasil diperbarui')
    } else {
      const payload = {
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        phoneNumber: form.value.phoneNumber || undefined,
        roleIds: form.value.roleIds?.length ? form.value.roleIds : undefined
      }
      await userService.create(payload)
      showToast('User baru berhasil dibuat')
    }
    showModal.value = false
    await fetchUsers()
  } catch (err) {
    formError.value = extractError(err, 'Gagal menyimpan user')
  } finally {
    saving.value = false
  }
}

// ============ DELETE ============
async function removeUser(user) {
  const ok = await confirmDialog({ title: 'Hapus user?', message: `User "${user.name}" akan dihapus.` })
  if (!ok) return
  try {
    await userService.remove(user.id)
    showToast('User berhasil dihapus')
    await fetchUsers()
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus user'), 'error')
  }
}

// ============ ACTIVATE / DEACTIVATE ============
async function toggleActivation(user) {
  if (isActive(user)) {
    const ok = await confirmDialog({
      title: 'Nonaktifkan user?',
      message: `${user.name} tidak bisa login sampai diaktifkan lagi.`,
      confirmLabel: 'Nonaktifkan'
    })
    if (!ok) return
  }
  try {
    if (isActive(user)) {
      await userService.deactivate(user.id)
      showToast('User dinonaktifkan')
    } else {
      await userService.activate(user.id)
      showToast('User diaktifkan')
    }
    await fetchUsers()
  } catch (err) {
    showToast(extractError(err, 'Gagal mengubah status'), 'error')
  }
}

// ============ CHANGE PASSWORD (ADMIN) ============
function openPasswordModal(user) {
  passwordTarget.value = user
  passwordForm.value = { newPassword: '' }
  passwordError.value = ''
  showPasswordModal.value = true
}

async function submitPassword() {
  passwordError.value = ''
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 8) {
    passwordError.value = 'Kata sandi minimal 8 karakter'
    return
  }
  savingPassword.value = true
  try {
    // Import authService dinamis supaya file ini tetap fokus pada user
    const { authService } = await import('@/services/authService')
    await authService.changePassword(passwordTarget.value.id, passwordForm.value.newPassword)
    showToast('Kata sandi user berhasil direset')
    showPasswordModal.value = false
  } catch (err) {
    passwordError.value = extractError(err, 'Gagal mereset kata sandi')
  } finally {
    savingPassword.value = false
  }
}

// ============ ASSIGN ROLES ============
function openRolesModal(user) {
  rolesTarget.value = user
  rolesForm.value = {
    roleIds: (user.roles || []).map((r) => (typeof r === 'object' ? r.id : r)).filter(Boolean)
  }
  showRolesModal.value = true
}

async function submitRoles() {
  if (!rolesForm.value.roleIds?.length) {
    showToast('Pilih minimal satu role', 'error')
    return
  }
  savingRoles.value = true
  try {
    // Backend validator expects List<number>. Kalau id datang sebagai string,
    // serialisasi JSON akan mengirim string dan validator menolaknya.
    const ids = rolesForm.value.roleIds
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n))
    await userService.assignRoles(rolesTarget.value.id, ids)
    showToast('Role user berhasil diperbarui')
    showRolesModal.value = false
    await fetchUsers()
  } catch (err) {
    // Log detail supaya lebih mudah debug kalau tetap gagal.
    console.error('assignRoles failed:', err?.response?.status, err?.response?.data)
    showToast(extractError(err, 'Gagal memperbarui role'), 'error')
  } finally {
    savingRoles.value = false
  }
}

function roleLabel(r) {
  return r.name || r.code || `#${r.id}`
}
</script>

<template>
  <div class="space-y-4">
    <AppToast :toast="toast" />

    <!-- Toolbar. Judul halaman sudah ada di header layout. -->
    <section class="card p-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end" aria-label="Cari dan urutkan user">
      <div class="col-span-2 sm:col-span-1">
        <label for="user-search" class="field-label text-xs">Cari</label>
        <input id="user-search" v-model="search" type="search" placeholder="Nama atau email" class="field" />
      </div>
      <div>
        <label for="user-sort" class="field-label text-xs">Urutkan</label>
        <select id="user-sort" v-model="sortBy" class="field">
          <option value="createdAt">Dibuat</option>
          <option value="name">Nama</option>
        </select>
      </div>
      <div>
        <label for="user-order" class="field-label text-xs">Arah</label>
        <select id="user-order" v-model="sortOrder" class="field">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>
      <button type="button" class="btn btn-primary col-span-2 sm:col-span-1" @click="openCreate">
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah User
      </button>
    </section>

    <section class="card overflow-hidden" aria-label="Daftar user">
      <div v-if="loadingList" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="listError" class="p-4">
        <div class="form-error items-center justify-between" role="alert">
          <span>{{ listError }}</span>
          <button type="button" class="btn btn-secondary h-9 shrink-0" @click="fetchUsers">Coba lagi</button>
        </div>
      </div>
      <div v-else-if="!visibleUsers.length" class="empty-state">Tidak ada user.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Nama</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Role</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Status</th>
                <th scope="col" class="text-right font-medium px-4 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="user in visibleUsers" :key="user.id" class="hover:bg-gray-50">
                <td class="px-4 py-2.5">
                  <p class="font-medium text-ink">{{ user.name }}</p>
                  <p class="text-xs text-ink-muted">{{ user.email }}</p>
                </td>
                <td class="px-4 py-2.5">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="rn in roleNames(user)" :key="rn" class="chip chip-brand capitalize">{{ rn }}</span>
                    <span v-if="!roleNames(user).length" class="text-ink-muted">-</span>
                  </div>
                </td>
                <td class="px-4 py-2.5">
                  <span class="chip" :class="isActive(user) ? 'chip-brand' : 'chip-gray'">{{ isActive(user) ? 'Aktif' : 'Nonaktif' }}</span>
                </td>
                <td class="px-4 py-2.5">
                  <div class="flex justify-end gap-1">
                    <button type="button" class="icon-btn" title="Ubah" :aria-label="`Ubah ${user.name}`" @click="openEdit(user)">
                      <Pencil class="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button type="button" class="icon-btn" title="Atur role" :aria-label="`Atur role ${user.name}`" @click="openRolesModal(user)">
                      <ShieldCheck class="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button type="button" class="icon-btn" title="Reset kata sandi" :aria-label="`Reset kata sandi ${user.name}`" @click="openPasswordModal(user)">
                      <KeyRound class="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      class="icon-btn"
                      :class="{ 'icon-btn-danger': isActive(user) }"
                      :title="isActive(user) ? 'Nonaktifkan' : 'Aktifkan'"
                      :aria-label="`${isActive(user) ? 'Nonaktifkan' : 'Aktifkan'} ${user.name}`"
                      @click="toggleActivation(user)"
                    >
                      <UserX v-if="isActive(user)" class="w-4 h-4" aria-hidden="true" />
                      <UserCheck v-else class="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button type="button" class="icon-btn icon-btn-danger" title="Hapus" :aria-label="`Hapus user ${user.name}`" @click="removeUser(user)">
                      <Trash2 class="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="user in visibleUsers" :key="user.id" class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-ink truncate">{{ user.name }}</p>
                <p class="text-sm text-ink-muted truncate">{{ user.email }}</p>
              </div>
              <span class="chip" :class="isActive(user) ? 'chip-brand' : 'chip-gray'">{{ isActive(user) ? 'Aktif' : 'Nonaktif' }}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
              <span v-for="rn in roleNames(user)" :key="rn" class="chip chip-brand capitalize">{{ rn }}</span>
              <span v-if="!roleNames(user).length" class="text-sm text-ink-muted">Tanpa role</span>
            </div>
            <div class="mt-3 flex items-center gap-1">
              <button type="button" class="btn btn-secondary flex-1 mr-1" @click="openEdit(user)">
                <Pencil class="w-4 h-4" aria-hidden="true" />
                Ubah
              </button>
              <button type="button" class="icon-btn w-11 h-11" :aria-label="`Atur role ${user.name}`" @click="openRolesModal(user)">
                <ShieldCheck class="w-4 h-4" aria-hidden="true" />
              </button>
              <button type="button" class="icon-btn w-11 h-11" :aria-label="`Reset kata sandi ${user.name}`" @click="openPasswordModal(user)">
                <KeyRound class="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="icon-btn w-11 h-11"
                :class="{ 'icon-btn-danger': isActive(user) }"
                :aria-label="`${isActive(user) ? 'Nonaktifkan' : 'Aktifkan'} ${user.name}`"
                @click="toggleActivation(user)"
              >
                <UserX v-if="isActive(user)" class="w-4 h-4" aria-hidden="true" />
                <UserCheck v-else class="w-4 h-4" aria-hidden="true" />
              </button>
              <button type="button" class="icon-btn icon-btn-danger w-11 h-11" :aria-label="`Hapus user ${user.name}`" @click="removeUser(user)">
                <Trash2 class="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="page" :total-pages="totalPages" />
      </template>
    </section>

    <!-- ============ CREATE / EDIT MODAL ============ -->
    <BaseModal v-model:open="showModal" :title="editingUser ? 'Ubah User' : 'Tambah User'">
      <form id="user-form" class="space-y-4" @submit.prevent="saveUser">
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div>
          <label for="user-form-name" class="field-label">Nama</label>
          <input id="user-form-name" v-model="form.name" type="text" required autocomplete="off" class="field" />
        </div>
        <div>
          <label for="user-form-email" class="field-label">Email</label>
          <input id="user-form-email" v-model="form.email" type="email" :required="!editingUser" autocomplete="off" class="field" />
        </div>
        <div>
          <label for="user-form-phone" class="field-label">No. telepon <span class="font-normal text-ink-muted">(opsional)</span></label>
          <input
            id="user-form-phone"
            v-model="form.phoneNumber"
            type="tel"
            inputmode="tel"
            autocomplete="off"
            placeholder="08xxxxxxxxxx"
            class="field"
          />
        </div>
        <div v-if="!editingUser">
          <label for="user-form-password" class="field-label">Kata sandi</label>
          <PasswordInput
            id="user-form-password"
            v-model="form.password"
            required
            minlength="8"
            autocomplete="new-password"
            aria-describedby="user-form-password-hint"
            class="field pr-12"
          />
          <p id="user-form-password-hint" class="field-hint">Minimal 8 karakter.</p>
        </div>
        <fieldset v-if="!editingUser && roles.length">
          <legend class="field-label">Role <span class="font-normal text-ink-muted">(opsional)</span></legend>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="r in roles"
              :key="r.id"
              class="flex items-center gap-2 h-11 px-3 rounded-xl border border-gray-300 text-sm text-ink capitalize cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input v-model="form.roleIds" type="checkbox" :value="r.id" class="w-4 h-4 accent-brand-600" />
              {{ roleLabel(r) }}
            </label>
          </div>
        </fieldset>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showModal = false">Batal</button>
        <button type="submit" form="user-form" class="btn btn-primary flex-1" :disabled="saving">
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ RESET PASSWORD MODAL ============ -->
    <BaseModal v-model:open="showPasswordModal" title="Reset Kata Sandi">
      <form id="password-form" class="space-y-4" @submit.prevent="submitPassword">
        <p class="text-sm text-ink-muted">
          User: <strong class="text-ink">{{ passwordTarget?.name }}</strong>
        </p>
        <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
        <div>
          <label for="password-form-new" class="field-label">Kata sandi baru</label>
          <PasswordInput
            id="password-form-new"
            v-model="passwordForm.newPassword"
            required
            minlength="8"
            autocomplete="new-password"
            aria-describedby="password-form-hint"
            class="field pr-12"
          />
          <p id="password-form-hint" class="field-hint">Minimal 8 karakter. Sampaikan ke user lewat jalur yang aman.</p>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showPasswordModal = false">Batal</button>
        <button type="submit" form="password-form" class="btn btn-primary flex-1" :disabled="savingPassword">
          {{ savingPassword ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ ROLES MODAL ============ -->
    <BaseModal v-model:open="showRolesModal" title="Atur Role">
      <form id="roles-form" class="space-y-4" @submit.prevent="submitRoles">
        <p class="text-sm text-ink-muted">
          User: <strong class="text-ink">{{ rolesTarget?.name }}</strong>
        </p>
        <p v-if="!roles.length" class="text-sm text-ink-muted">Daftar role belum tersedia.</p>
        <fieldset v-else>
          <legend class="sr-only">Role untuk {{ rolesTarget?.name }}</legend>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="r in roles"
              :key="r.id"
              class="flex items-center gap-2 h-11 px-3 rounded-xl border border-gray-300 text-sm text-ink capitalize cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input v-model="rolesForm.roleIds" type="checkbox" :value="r.id" class="w-4 h-4 accent-brand-600" />
              {{ roleLabel(r) }}
            </label>
          </div>
        </fieldset>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showRolesModal = false">Batal</button>
        <button type="submit" form="roles-form" class="btn btn-primary flex-1" :disabled="savingRoles">
          {{ savingRoles ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
