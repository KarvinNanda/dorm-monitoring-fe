<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
const limit = ref(10)
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
    formError.value = 'Password minimal 8 karakter'
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
  if (!confirm(`Hapus user "${user.name}"?`)) return
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
    passwordError.value = 'Password minimal 8 karakter'
    return
  }
  savingPassword.value = true
  try {
    // Import authService dinamis supaya file ini tetap fokus pada user
    const { authService } = await import('@/services/authService')
    await authService.changePassword(passwordTarget.value.id, passwordForm.value.newPassword)
    showToast('Password user berhasil direset')
    showPasswordModal.value = false
  } catch (err) {
    passwordError.value = extractError(err, 'Gagal mengganti password')
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

function toggleRoleId(id, listRef) {
  // console.log(listRef.roleIds.indexOf(id))
  const idx = listRef.roleIds.indexOf(id)
  if (idx === -1) listRef.roleIds.push(id)
  else listRef.roleIds.splice(idx, 1)
}
</script>

<template>
  <div>
    <!-- ============ HEADER ============ -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-800">User Management</h1>
        <p class="text-xs sm:text-sm text-gray-500">Kelola akun pengguna, role, dan aktivasi.</p>
      </div>
      <button
        @click="openCreate"
        class="bg-primary text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors w-full sm:w-auto"
      >
        + Tambah User
      </button>
    </div>

    <!-- ============ FILTER BAR ============ -->
    <!-- Mobile: search full-width, dua select sebar 2 kolom.
         Desktop (sm+): search flex-1, select inline. -->
    <div class="bg-white border border-gray-200 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap sm:gap-3 sm:p-4">
      <input
        v-model="search"
        type="text"
        placeholder="Cari nama atau email..."
        class="col-span-2 sm:col-auto sm:flex-1 sm:min-w-[200px] w-full min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
      />
      <select
        v-model="sortBy"
        title="Urutkan berdasarkan"
        class="w-full sm:w-auto min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="createdAt">Urut: Tanggal Dibuat</option>
        <option value="name">Urut: Nama</option>
      </select>
      <select
        v-model="sortOrder"
        title="Arah"
        class="w-full sm:w-auto min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="desc">Terbaru</option>
        <option value="asc">Terlama</option>
      </select>
    </div>

    <!-- ============ TOAST ============ -->
    <transition name="fade">
      <div
        v-if="toast.show"
        class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm"
        :class="toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>

    <!-- ============ TABLE ============ -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingList">
              <td colspan="5" class="px-6 py-8 text-center text-gray-400 text-sm">Memuat data...</td>
            </tr>
            <tr v-else-if="listError">
              <td colspan="5" class="px-6 py-8 text-center text-red-500 text-sm">{{ listError }}</td>
            </tr>
            <tr v-else-if="!visibleUsers.length">
              <td colspan="5" class="px-6 py-8 text-center text-gray-400 text-sm">Tidak ada user.</td>
            </tr>
            <tr v-else v-for="user in visibleUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm text-gray-800 font-medium">{{ user.name }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ user.email }}</td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="rn in roleNames(user)"
                    :key="rn"
                    class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-primary capitalize"
                  >
                    {{ rn }}
                  </span>
                  <span v-if="!roleNames(user).length" class="text-xs text-gray-400">—</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="text-xs font-medium px-2 py-1 rounded-full"
                  :class="isActive(user) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
                >
                  {{ isActive(user) ? 'active' : 'inactive' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    @click="openEdit(user)"
                    title="Edit user"
                    class="action-btn action-btn-edit"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>
                  <button
                    @click="openRolesModal(user)"
                    title="Atur role"
                    class="action-btn action-btn-role"
                  >
                    <span>🛡️</span>
                    <span>Role</span>
                  </button>
                  <button
                    @click="openPasswordModal(user)"
                    title="Reset password"
                    class="action-btn action-btn-password"
                  >
                    <span>🔑</span>
                    <span>Password</span>
                  </button>
                  <button
                    @click="toggleActivation(user)"
                    :title="isActive(user) ? 'Nonaktifkan user' : 'Aktifkan user'"
                    class="action-btn"
                    :class="isActive(user) ? 'action-btn-deactivate' : 'action-btn-activate'"
                  >
                    <span>{{ isActive(user) ? '⛔' : '✅' }}</span>
                    <span>{{ isActive(user) ? 'Deactivate' : 'Activate' }}</span>
                  </button>
                  <button
                    @click="removeUser(user)"
                    title="Hapus user"
                    class="action-btn action-btn-delete"
                  >
                    <span>🗑️</span>
                    <span>Hapus</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loadingList && visibleUsers.length"
        class="flex items-center justify-between px-6 py-3 border-t border-gray-200 text-sm text-gray-500"
      >
        <div>Halaman {{ page }} dari {{ totalPages }}</div>
        <div class="flex gap-2">
          <button
            :disabled="page <= 1"
            @click="page--"
            class="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ‹ Prev
          </button>
          <button
            :disabled="page >= totalPages"
            @click="page++"
            class="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next ›
          </button>
        </div>
      </div>
    </div>

    <!-- ============ CREATE/EDIT MODAL ============ -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          {{ editingUser ? 'Edit User' : 'Tambah User' }}
        </h3>
        <form @submit.prevent="saveUser" class="space-y-4">
          <div v-if="formError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ formError }}</div>

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
              :required="!editingUser"
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
          <div v-if="!editingUser">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="form.password"
              type="password"
              minlength="8"
              required
              placeholder="Minimal 8 karakter"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div v-if="!editingUser && roles.length">
            <label class="block text-sm font-medium text-gray-700 mb-1">Role (opsional)</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="r in roles"
                :key="r.id"
                type="button"
                @click="toggleRoleId(r.id, form)"
                class="text-xs px-3 py-1 rounded-full border transition-colors"
                :class="
                  form.roleIds.includes(r.id)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                "
              >
                {{ r.name || r.code }}
              </button>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
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
        <h3 class="text-lg font-bold text-gray-800 mb-1">Reset Password</h3>
        <p class="text-sm text-gray-500 mb-4">User: <strong>{{ passwordTarget?.name }}</strong></p>
        <form @submit.prevent="submitPassword" class="space-y-4">
          <div v-if="passwordError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ passwordError }}</div>
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

    <!-- ============ ROLES MODAL ============ -->
    <div
      v-if="showRolesModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showRolesModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Atur Role</h3>
        <p class="text-sm text-gray-500 mb-4">User: <strong>{{ rolesTarget?.name }}</strong></p>
        <div v-if="!roles.length" class="text-sm text-gray-400 mb-4">Daftar role belum tersedia.</div>
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="r in roles"
            :key="r.id"
            type="button"
            @click="toggleRoleId(r.id, rolesForm)"
            class="text-xs px-3 py-1 rounded-full border transition-colors"
            :class="
              rolesForm.roleIds.includes(r.id)
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            "
          >
            {{ r.name || r.code }}
          </button>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            @click="showRolesModal = false"
            class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            @click="submitRoles"
            :disabled="savingRoles"
            class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {{ savingRoles ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ============ ACTION BUTTONS ============ */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn-edit {
  background: #e8f5e9;
  color: #2E7D32;
  border-color: #c8e6c9;
}
.action-btn-edit:hover {
  background: #c8e6c9;
}

.action-btn-role {
  background: #eef2ff;
  color: #4338ca;
  border-color: #e0e7ff;
}
.action-btn-role:hover {
  background: #e0e7ff;
}

.action-btn-password {
  background: #fff7ed;
  color: #b45309;
  border-color: #fde68a;
}
.action-btn-password:hover {
  background: #fde68a;
}

.action-btn-activate {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}
.action-btn-activate:hover {
  background: #a7f3d0;
}

.action-btn-deactivate {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}
.action-btn-deactivate:hover {
  background: #fecaca;
}

.action-btn-delete {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}
.action-btn-delete:hover {
  background: #fca5a5;
  color: white;
}
</style>
