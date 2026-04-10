<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import {
  dummyGuests,
  dummyGuestVisits,
  dummyUsers,
  guestVisitTypes
} from '@/utils/dummyData'

const authStore = useAuthStore()

// ====== STATE ======
const activeTab = ref('kunjungan') // kunjungan | tamu

// Clone dummy data sebagai state lokal
const guests = ref(dummyGuests.map((g) => ({ ...g })))
const visits = ref(dummyGuestVisits.map((v) => ({ ...v })))
const hostUsers = dummyUsers // untuk pilih host

// ====== HELPERS ======
function getGuestById(id) {
  return guests.value.find((g) => g.id === id)
}

function getHostById(id) {
  return hostUsers.find((u) => u.id === id)
}

function getTypeLabel(value) {
  return guestVisitTypes.find((t) => t.value === value)?.label || value
}

function formatEventTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ====== VISIT FORM ======
const showVisitModal = ref(false)
const editingVisit = ref(null)
const visitForm = ref({
  guestId: '',
  hostUserId: '',
  type: 'KELUARGA',
  eventTime: '',
  note: ''
})
const visitLoading = ref(false)

function openCreateVisit() {
  editingVisit.value = null
  visitForm.value = {
    guestId: guests.value[0]?.id || '',
    hostUserId: authStore.user?.id || hostUsers[0]?.id || '',
    type: 'KELUARGA',
    eventTime: new Date().toISOString().slice(0, 16),
    note: ''
  }
  showVisitModal.value = true
}

function openEditVisit(visit) {
  editingVisit.value = visit
  visitForm.value = {
    guestId: visit.guestId,
    hostUserId: visit.hostUserId,
    type: visit.type,
    eventTime: visit.eventTime.slice(0, 16),
    note: visit.note || ''
  }
  showVisitModal.value = true
}

async function saveVisit() {
  if (!visitForm.value.guestId || !visitForm.value.hostUserId) return
  visitLoading.value = true
  await new Promise((r) => setTimeout(r, 300))

  const payload = {
    guestId: Number(visitForm.value.guestId),
    hostUserId: Number(visitForm.value.hostUserId),
    type: visitForm.value.type,
    eventTime: visitForm.value.eventTime,
    note: visitForm.value.note
  }

  if (editingVisit.value) {
    Object.assign(editingVisit.value, payload)
  } else {
    visits.value.unshift({ id: Date.now(), ...payload })
  }

  visitLoading.value = false
  showVisitModal.value = false
}

function deleteVisit(id) {
  if (!confirm('Hapus kunjungan ini?')) return
  visits.value = visits.value.filter((v) => v.id !== id)
}

// Visit list sorted terbaru dulu
const sortedVisits = computed(() =>
  [...visits.value].sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime))
)

// ====== GUEST FORM ======
const showGuestModal = ref(false)
const editingGuest = ref(null)
const guestForm = ref({ name: '', phoneNumber: '', note: '' })
const guestLoading = ref(false)

function openCreateGuest() {
  editingGuest.value = null
  guestForm.value = { name: '', phoneNumber: '', note: '' }
  showGuestModal.value = true
}

function openEditGuest(guest) {
  editingGuest.value = guest
  guestForm.value = {
    name: guest.name,
    phoneNumber: guest.phoneNumber,
    note: guest.note || ''
  }
  showGuestModal.value = true
}

async function saveGuest() {
  if (!guestForm.value.name) return
  guestLoading.value = true
  await new Promise((r) => setTimeout(r, 300))

  if (editingGuest.value) {
    Object.assign(editingGuest.value, guestForm.value)
  } else {
    guests.value.push({ id: Date.now(), ...guestForm.value })
  }

  guestLoading.value = false
  showGuestModal.value = false
}

function deleteGuest(id) {
  const hasVisits = visits.value.some((v) => v.guestId === id)
  if (hasVisits) {
    alert('Tamu ini masih memiliki catatan kunjungan. Hapus kunjungannya terlebih dahulu.')
    return
  }
  if (!confirm('Hapus data tamu ini?')) return
  guests.value = guests.value.filter((g) => g.id !== id)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3 fade-up">
      <h1 class="text-2xl font-bold text-gray-800">Manajemen Tamu 🌱</h1>
      <button
        v-if="activeTab === 'kunjungan'"
        @click="openCreateVisit"
        class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah Kunjungan
      </button>
      <button
        v-else
        @click="openCreateGuest"
        class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah Tamu
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6 fade-up" style="animation-delay: 80ms">
      <nav class="flex gap-6">
        <button
          @click="activeTab = 'kunjungan'"
          class="py-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'kunjungan' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Daftar Kunjungan
        </button>
        <button
          @click="activeTab = 'tamu'"
          class="py-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'tamu' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Data Tamu
        </button>
      </nav>
    </div>

    <!-- ================= TAB: KUNJUNGAN ================= -->
    <div v-if="activeTab === 'kunjungan'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up tab-panel" style="animation-delay: 150ms">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama Tamu</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">No. Telepon</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Jenis</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Host</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Waktu</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="visit in sortedVisits" :key="visit.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">
                {{ getGuestById(visit.guestId)?.name || '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                {{ getGuestById(visit.guestId)?.phoneNumber || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-primary">
                  {{ getTypeLabel(visit.type) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                {{ getHostById(visit.hostUserId)?.name || '-' }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                {{ formatEventTime(visit.eventTime) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{{ visit.note || '-' }}</td>
              <td class="px-6 py-4 space-x-2 whitespace-nowrap">
                <button @click="openEditVisit(visit)" class="text-sm text-primary hover:underline">Ubah</button>
                <button @click="deleteVisit(visit.id)" class="text-sm text-red-600 hover:underline">Hapus</button>
              </td>
            </tr>
            <tr v-if="sortedVisits.length === 0">
              <td colspan="7" class="px-6 py-8 text-center text-gray-400">Belum ada data kunjungan</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= TAB: DATA TAMU ================= -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up tab-panel" style="animation-delay: 150ms">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">No. Telepon</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="guest in guests" :key="guest.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{{ guest.name }}</td>
              <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{{ guest.phoneNumber || '-' }}</td>
              <td class="px-6 py-4 text-sm text-gray-500 max-w-md truncate">{{ guest.note || '-' }}</td>
              <td class="px-6 py-4 space-x-2 whitespace-nowrap">
                <button @click="openEditGuest(guest)" class="text-sm text-primary hover:underline">Ubah</button>
                <button @click="deleteGuest(guest.id)" class="text-sm text-red-600 hover:underline">Hapus</button>
              </td>
            </tr>
            <tr v-if="guests.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-gray-400">Belum ada data tamu</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= MODAL: VISIT ================= -->
    <div
      v-if="showVisitModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showVisitModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          {{ editingVisit ? 'Ubah Kunjungan' : 'Tambah Kunjungan' }}
        </h3>
        <form @submit.prevent="saveVisit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tamu</label>
            <select
              v-model="visitForm.guestId"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="" disabled>Pilih tamu</option>
              <option v-for="g in guests" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">
              Tamu belum terdaftar? Tambahkan di tab "Data Tamu".
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Host (Penerima)</label>
            <select
              v-model="visitForm.hostUserId"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="" disabled>Pilih host</option>
              <option v-for="u in hostUsers" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jenis Kunjungan</label>
            <select
              v-model="visitForm.type"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option v-for="t in guestVisitTypes" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Kunjungan</label>
            <input
              v-model="visitForm.eventTime"
              type="datetime-local"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              v-model="visitForm.note"
              rows="3"
              placeholder="Catatan tambahan (opsional)"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            ></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showVisitModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="visitLoading"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {{ visitLoading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL: GUEST ================= -->
    <div
      v-if="showGuestModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showGuestModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          {{ editingGuest ? 'Ubah Data Tamu' : 'Tambah Data Tamu' }}
        </h3>
        <form @submit.prevent="saveGuest" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              v-model="guestForm.name"
              type="text"
              required
              placeholder="Nama lengkap tamu"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <input
              v-model="guestForm.phoneNumber"
              type="tel"
              placeholder="08xxxxxxxxxx"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              v-model="guestForm.note"
              rows="3"
              placeholder="Informasi tambahan tentang tamu (opsional)"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            ></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showGuestModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="guestLoading"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {{ guestLoading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-up {
  opacity: 0;
  transform: translateY(16px);
  animation: fadeUp 0.5s ease forwards;
}

@keyframes fadeUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Baris tabel muncul satu per satu */
tbody tr {
  animation: rowFade 0.4s ease backwards;
}
tbody tr:nth-child(1) { animation-delay: 200ms; }
tbody tr:nth-child(2) { animation-delay: 260ms; }
tbody tr:nth-child(3) { animation-delay: 320ms; }
tbody tr:nth-child(4) { animation-delay: 380ms; }
tbody tr:nth-child(5) { animation-delay: 440ms; }
tbody tr:nth-child(n+6) { animation-delay: 500ms; }

@keyframes rowFade {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Modal fade in */
.fixed.inset-0 {
  animation: modalBgFade 0.25s ease;
}

.fixed.inset-0 > div {
  animation: modalPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalBgFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Tab panel transition */
.tab-panel {
  transition: all 0.3s ease;
}

/* Button lift on hover */
button {
  transition: all 0.2s ease;
}
</style>
