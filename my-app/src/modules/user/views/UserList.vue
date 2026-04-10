<script setup>
import { ref } from 'vue'
import { dummyUsers } from '@/utils/dummyData'

// Clone users without password field
const users = ref(
  dummyUsers.map(({ password, ...u }) => ({ ...u }))
)

const showModal = ref(false)
const editingUser = ref(null)
const form = ref({ name: '', role: 'resident', status: 'active' })
const loading = ref(false)

function openCreate() {
  editingUser.value = null
  form.value = { name: '', role: 'resident', status: 'active' }
  showModal.value = true
}

function openEdit(user) {
  editingUser.value = user
  form.value = { name: user.name, role: user.role, status: user.status }
  showModal.value = true
}

async function saveUser() {
  if (!form.value.name) return
  loading.value = true
  await new Promise((r) => setTimeout(r, 300))

  if (editingUser.value) {
    Object.assign(editingUser.value, form.value)
  } else {
    users.value.push({
      id: Date.now(),
      name: form.value.name,
      email: form.value.name.toLowerCase().replace(/\s+/g, '.') + '@internal.com',
      role: form.value.role,
      status: form.value.status
    })
  }

  loading.value = false
  showModal.value = false
}

async function deactivateUser(user) {
  user.status = 'inactive'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">User Management</h1>
      <button
        @click="openCreate"
        class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah User
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm text-gray-800 font-medium">{{ user.name }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ user.email }}</td>
              <td class="px-6 py-4">
                <span class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-primary capitalize">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="text-xs font-medium px-2 py-1 rounded-full"
                  :class="{
                    'bg-green-100 text-green-700': user.status === 'active',
                    'bg-red-100 text-red-600': user.status === 'inactive'
                  }"
                >
                  {{ user.status }}
                </span>
              </td>
              <td class="px-6 py-4 space-x-2">
                <button @click="openEdit(user)" class="text-sm text-primary hover:underline">Edit</button>
                <button
                  v-if="user.status === 'active'"
                  @click="deactivateUser(user)"
                  class="text-sm text-red-600 hover:underline"
                >
                  Deactivate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          {{ editingUser ? 'Edit User' : 'Tambah User' }}
        </h3>
        <form @submit.prevent="saveUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              v-model="form.role"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="admin">Admin</option>
              <option value="resident">Resident</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="form.status = form.status === 'active' ? 'inactive' : 'active'"
                class="relative w-12 h-6 rounded-full transition-colors"
                :class="form.status === 'active' ? 'bg-primary' : 'bg-gray-300'"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                  :class="{ 'translate-x-6': form.status === 'active' }"
                ></span>
              </button>
              <span class="text-sm text-gray-600 capitalize">{{ form.status }}</span>
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
              :disabled="loading"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {{ loading ? 'Saving...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
