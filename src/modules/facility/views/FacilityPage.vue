<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { facilityService } from '@/services/facilityService'
import { facilityReservationService } from '@/services/facilityReservationService'
import { useAuthStore } from '@/stores/authStore'
import {
  formatDate,
  toJakartaDatetimeInput,
  jakartaInputToISO,
  nowJakartaDatetimeInput
} from '@/utils/dateFormat'

// ============ AUTH / PERMISSIONS ============
// Permission matrix per API doc:
//   - Facility & Facility-Reservation list / get : All roles
//   - Facility & Facility-Reservation create / update / delete : Admin only
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasRole('admin'))
const canWriteFacility = isAdmin
const canWriteReservation = isAdmin

// ============ TOAST ============
const toast = ref({ show: false, type: 'success', message: '' })
let toastTimer = null
function showToast(message, type = 'success') {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value.show = false), 2500)
}
function extractError(err, fallback = 'Terjadi kesalahan') {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback
}

// ============ TABS ============
const activeTab = ref('reservations') // reservations | facilities

// ============ FACILITIES ============
const facilities = ref([])
const facilityMeta = ref(null)
const facilityPage = ref(1)
const facilityLimit = ref(10)
const facilitySearch = ref('')
const facilitySortBy = ref('createdAt')
const facilitySortOrder = ref('desc')
const loadingFacilities = ref(false)

async function fetchFacilities() {
  loadingFacilities.value = true
  try {
    const { data, meta } = await facilityService.list({
      page: facilityPage.value,
      limit: facilityLimit.value,
      search: facilitySearch.value || undefined,
      sortBy: facilitySortBy.value,
      sortOrder: facilitySortOrder.value
    })
    facilities.value = Array.isArray(data) ? data : []
    facilityMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat fasilitas'), 'error')
  } finally {
    loadingFacilities.value = false
  }
}
const facilityTotalPages = computed(() => {
  if (!facilityMeta.value) return 1
  return (
    facilityMeta.value.totalPages ||
    facilityMeta.value.total_pages ||
    Math.max(1, Math.ceil((facilityMeta.value.total || 0) / facilityLimit.value))
  )
})
watch(facilityPage, fetchFacilities)
watch([facilitySortBy, facilitySortOrder], () => {
  facilityPage.value = 1
  fetchFacilities()
})
let facilitySearchTimer = null
watch(facilitySearch, () => {
  if (facilitySearchTimer) clearTimeout(facilitySearchTimer)
  facilitySearchTimer = setTimeout(() => {
    facilityPage.value = 1
    fetchFacilities()
  }, 400)
})

// dropdown
const allFacilities = ref([])
async function fetchAllFacilitiesForSelect() {
  try {
    const { data } = await facilityService.list({ page: 1, limit: 200 })
    allFacilities.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Gagal load dropdown fasilitas:', extractError(err))
  }
}
function facilityNameById(id) {
  return allFacilities.value.find((f) => String(f.id) === String(id))?.name || `#${id}`
}

// ============ FACILITY FORM ============
const showFacilityModal = ref(false)
const editingFacility = ref(null)
const facilityForm = ref({ name: '', description: '', note: '' })
const facilityFormError = ref('')
const savingFacility = ref(false)
function openCreateFacility() {
  editingFacility.value = null
  facilityForm.value = { name: '', description: '', note: '' }
  facilityFormError.value = ''
  showFacilityModal.value = true
}
function openEditFacility(f) {
  editingFacility.value = f
  facilityForm.value = {
    name: f.name || '',
    description: f.description || '',
    note: f.note || ''
  }
  facilityFormError.value = ''
  showFacilityModal.value = true
}
async function saveFacility() {
  facilityFormError.value = ''
  if (!facilityForm.value.name?.trim()) {
    facilityFormError.value = 'Nama wajib diisi'
    return
  }
  savingFacility.value = true
  try {
    const payload = {
      name: facilityForm.value.name,
      description: facilityForm.value.description || '',
      note: facilityForm.value.note || undefined
    }
    if (editingFacility.value) {
      await facilityService.update(editingFacility.value.id, payload)
      showToast('Fasilitas diperbarui')
    } else {
      await facilityService.create(payload)
      showToast('Fasilitas ditambahkan')
    }
    showFacilityModal.value = false
    await Promise.all([fetchFacilities(), fetchAllFacilitiesForSelect()])
  } catch (err) {
    facilityFormError.value = extractError(err, 'Gagal menyimpan fasilitas')
  } finally {
    savingFacility.value = false
  }
}
async function removeFacility(f) {
  if (!confirm(`Hapus fasilitas "${f.name}"?`)) return
  try {
    await facilityService.remove(f.id)
    showToast('Fasilitas dihapus')
    await Promise.all([fetchFacilities(), fetchAllFacilitiesForSelect()])
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus fasilitas'), 'error')
  }
}

// ============ RESERVATIONS ============
const reservations = ref([])
const reservationMeta = ref(null)
const reservationPage = ref(1)
const reservationLimit = ref(10)
const reservationFrom = ref('')
const reservationTo = ref('')
const reservationStatus = ref('')
const reservationFacilityId = ref('')
const reservationSearch = ref('')
const reservationSortOrder = ref('desc')
const loadingReservations = ref(false)

async function fetchReservations() {
  loadingReservations.value = true
  try {
    const { data, meta } = await facilityReservationService.list({
      page: reservationPage.value,
      limit: reservationLimit.value,
      from: reservationFrom.value || undefined,
      to: reservationTo.value || undefined,
      status: reservationStatus.value || undefined,
      facilityId: reservationFacilityId.value || undefined,
      search: reservationSearch.value || undefined,
      sortOrder: reservationSortOrder.value
    })
    reservations.value = Array.isArray(data) ? data : []
    reservationMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat reservasi'), 'error')
  } finally {
    loadingReservations.value = false
  }
}
const reservationTotalPages = computed(() => {
  if (!reservationMeta.value) return 1
  return (
    reservationMeta.value.totalPages ||
    reservationMeta.value.total_pages ||
    Math.max(1, Math.ceil((reservationMeta.value.total || 0) / reservationLimit.value))
  )
})
watch(reservationPage, fetchReservations)
watch([reservationStatus, reservationFacilityId, reservationSortOrder], () => {
  reservationPage.value = 1
  fetchReservations()
})
let reservationSearchTimer = null
watch(reservationSearch, () => {
  if (reservationSearchTimer) clearTimeout(reservationSearchTimer)
  reservationSearchTimer = setTimeout(() => {
    reservationPage.value = 1
    fetchReservations()
  }, 400)
})
function applyReservationDateFilter() {
  reservationPage.value = 1
  fetchReservations()
}

// ============ RESERVATION FORM ============
const showReservationModal = ref(false)
const editingReservation = ref(null)
const reservationForm = ref({
  facilityId: '',
  title: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
  note: '',
  status: ''
})
const reservationFormError = ref('')
const savingReservation = ref(false)

function openCreateReservation() {
  editingReservation.value = null
  reservationForm.value = {
    facilityId: '',
    title: '',
    description: '',
    startDateTime: nowJakartaDatetimeInput(),
    endDateTime: '',
    note: '',
    status: ''
  }
  reservationFormError.value = ''
  showReservationModal.value = true
}
function openEditReservation(r) {
  editingReservation.value = r
  reservationForm.value = {
    facilityId: r.facilityId || r.facility?.id || '',
    title: r.title || '',
    description: r.description || '',
    startDateTime: toJakartaDatetimeInput(r.startDateTime),
    endDateTime: toJakartaDatetimeInput(r.endDateTime),
    note: r.note || '',
    status: r.status || ''
  }
  reservationFormError.value = ''
  showReservationModal.value = true
}
async function saveReservation() {
  reservationFormError.value = ''
  const f = reservationForm.value
  if (!f.facilityId) {
    reservationFormError.value = 'Pilih fasilitas'
    return
  }
  if (!f.title?.trim()) {
    reservationFormError.value = 'Judul wajib diisi'
    return
  }
  if (!f.startDateTime || !f.endDateTime) {
    reservationFormError.value = 'Tanggal mulai dan selesai wajib diisi'
    return
  }
  savingReservation.value = true
  try {
    const payload = {
      facilityId: Number(f.facilityId),
      title: f.title,
      description: f.description || '',
      startDateTime: jakartaInputToISO(f.startDateTime),
      endDateTime: jakartaInputToISO(f.endDateTime),
      note: f.note || undefined
    }
    if (editingReservation.value) {
      if (f.status) payload.status = f.status
      await facilityReservationService.update(editingReservation.value.id, payload)
      showToast('Reservasi diperbarui')
    } else {
      await facilityReservationService.create(payload)
      showToast('Reservasi dibuat')
    }
    showReservationModal.value = false
    await fetchReservations()
  } catch (err) {
    reservationFormError.value = extractError(err, 'Gagal menyimpan reservasi')
  } finally {
    savingReservation.value = false
  }
}
async function removeReservation(r) {
  if (!confirm(`Hapus reservasi "${r.title}"?`)) return
  try {
    await facilityReservationService.remove(r.id)
    showToast('Reservasi dihapus')
    await fetchReservations()
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus reservasi'), 'error')
  }
}

async function quickUpdateStatus(r, newStatus) {
  try {
    await facilityReservationService.update(r.id, { status: newStatus })
    showToast(`Status: ${newStatus}`)
    await fetchReservations()
  } catch (err) {
    showToast(extractError(err, 'Gagal update status'), 'error')
  }
}

function statusBadge(s) {
  switch ((s || '').toUpperCase()) {
    case 'APPROVED':
    case 'CONFIRMED':
      return 'bg-green-100 text-green-700'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'REJECTED':
    case 'CANCELLED':
    case 'CANCELED':
      return 'bg-red-100 text-red-700'
    case 'DONE':
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

function resolvedFacilityName(r) {
  return r.facility?.name || facilityNameById(r.facilityId)
}

// ============ MOUNT ============
onMounted(async () => {
  await Promise.all([
    fetchReservations(),
    fetchFacilities(),
    fetchAllFacilitiesForSelect()
  ])
})
</script>

<template>
  <div>
    <transition name="fade-up">
      <div
        v-if="toast.show"
        class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm"
        :class="toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      >{{ toast.message }}</div>
    </transition>

    <div class="flex items-center justify-between mb-3 flex-wrap gap-3 fade-up">
      <h1 class="text-xl font-bold text-gray-800">Fasilitas 🏛️</h1>
      <button
        v-if="activeTab === 'reservations' && canWriteReservation"
        @click="openCreateReservation"
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >+ Tambah Reservasi</button>
      <button
        v-else-if="activeTab === 'facilities' && canWriteFacility"
        @click="openCreateFacility"
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >+ Tambah Fasilitas</button>
    </div>

    <div class="border-b border-gray-200 mb-3 fade-up" style="animation-delay: 80ms">
      <nav class="flex gap-6">
        <button
          @click="activeTab = 'reservations'"
          class="py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'reservations' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >Reservasi</button>
        <button
          @click="activeTab = 'facilities'"
          class="py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'facilities' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >Daftar Fasilitas</button>
      </nav>
    </div>

    <!-- ============ TAB: RESERVATIONS ============ -->
    <div v-if="activeTab === 'reservations'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <div class="px-3 py-2 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
        <input v-model="reservationSearch" type="text" placeholder="Cari judul..." class="col-span-2 sm:col-auto sm:flex-1 sm:min-w-[180px] w-full min-w-0 px-3 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <select v-model="reservationStatus" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="">Semua status</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="DONE">DONE</option>
        </select>
        <select v-model="reservationFacilityId" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="">Semua fasilitas</option>
          <option v-for="f in allFacilities" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <input v-model="reservationFrom" type="date" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <input v-model="reservationTo" type="date" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <select v-model="reservationSortOrder" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
        <button @click="applyReservationDateFilter" class="col-span-2 sm:col-auto w-full sm:w-auto px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-green-700">Filter</button>
      </div>

      <!-- DESKTOP table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Judul</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Fasilitas</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Mulai</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Selesai</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th v-if="canWriteReservation" class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingReservations"><td :colspan="canWriteReservation ? 6 : 5" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td></tr>
            <tr v-else-if="!reservations.length"><td :colspan="canWriteReservation ? 6 : 5" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada reservasi.</td></tr>
            <tr v-else v-for="r in reservations" :key="r.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium" :title="r.description || ''">{{ r.title }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ resolvedFacilityName(r) }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(r.startDateTime) }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(r.endDateTime) }}</td>
              <td class="px-3 py-1.5 whitespace-nowrap">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="statusBadge(r.status)">{{ r.status || '-' }}</span>
              </td>
              <td v-if="canWriteReservation" class="px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <button v-if="(r.status || '').toUpperCase() === 'PENDING'" @click="quickUpdateStatus(r, 'APPROVED')" class="action-btn action-btn-approve" title="Approve">✓</button>
                  <button v-if="(r.status || '').toUpperCase() === 'PENDING'" @click="quickUpdateStatus(r, 'REJECTED')" class="action-btn action-btn-reject" title="Reject">✗</button>
                  <button @click="openEditReservation(r)" class="action-btn action-btn-edit" title="Ubah">✏️</button>
                  <button @click="removeReservation(r)" class="action-btn action-btn-delete" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingReservations" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!reservations.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada reservasi.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="r in reservations" :key="r.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ r.title }}</div>
                <div class="mt-0.5 text-xs text-primary truncate">🏛️ {{ resolvedFacilityName(r) }}</div>
              </div>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="statusBadge(r.status)">{{ r.status || '-' }}</span>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
              <div><span class="text-gray-400">Mulai</span><br /><span class="text-gray-700">{{ formatDate(r.startDateTime) }}</span></div>
              <div><span class="text-gray-400">Selesai</span><br /><span class="text-gray-700">{{ formatDate(r.endDateTime) }}</span></div>
            </div>
            <div v-if="r.description" class="mt-1 text-xs text-gray-500 line-clamp-2">{{ r.description }}</div>
            <div v-if="canWriteReservation" class="mt-2 flex flex-wrap gap-1">
              <button v-if="(r.status || '').toUpperCase() === 'PENDING'" @click="quickUpdateStatus(r, 'APPROVED')" class="action-btn action-btn-approve" title="Approve">✓ Approve</button>
              <button v-if="(r.status || '').toUpperCase() === 'PENDING'" @click="quickUpdateStatus(r, 'REJECTED')" class="action-btn action-btn-reject" title="Reject">✗ Reject</button>
              <button @click="openEditReservation(r)" class="action-btn action-btn-edit" title="Ubah">✏️ Ubah</button>
              <button @click="removeReservation(r)" class="action-btn action-btn-delete" title="Hapus">🗑️ Hapus</button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="!loadingReservations && reservations.length" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500">
        <div>Halaman {{ reservationPage }} dari {{ reservationTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="reservationPage <= 1" @click="reservationPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="reservationPage >= reservationTotalPages" @click="reservationPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ TAB: FACILITIES ============ -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <div class="px-3 py-2 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
        <input v-model="facilitySearch" type="text" placeholder="Cari nama fasilitas..." class="col-span-2 sm:col-auto sm:flex-1 sm:min-w-[180px] w-full min-w-0 px-3 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <select v-model="facilitySortBy" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="createdAt">Urut: Dibuat</option>
          <option value="name">Urut: Nama</option>
        </select>
        <select v-model="facilitySortOrder" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>

      <!-- DESKTOP table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Deskripsi</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              <th v-if="canWriteFacility" class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingFacilities"><td :colspan="canWriteFacility ? 4 : 3" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td></tr>
            <tr v-else-if="!facilities.length"><td :colspan="canWriteFacility ? 4 : 3" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada fasilitas.</td></tr>
            <tr v-else v-for="f in facilities" :key="f.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium whitespace-nowrap">{{ f.name }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 max-w-md truncate" :title="f.description || ''">{{ f.description || '-' }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 max-w-xs truncate" :title="f.note || ''">{{ f.note || '-' }}</td>
              <td v-if="canWriteFacility" class="px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <button @click="openEditFacility(f)" class="action-btn action-btn-edit" title="Ubah">✏️</button>
                  <button @click="removeFacility(f)" class="action-btn action-btn-delete" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingFacilities" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!facilities.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada fasilitas.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="f in facilities" :key="f.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ f.name }}</div>
                <div v-if="f.description" class="mt-0.5 text-xs text-gray-600 line-clamp-2">{{ f.description }}</div>
                <div v-if="f.note" class="mt-1 text-xs text-gray-400 italic line-clamp-2">📝 {{ f.note }}</div>
              </div>
            </div>
            <div v-if="canWriteFacility" class="mt-2 flex flex-wrap gap-1">
              <button @click="openEditFacility(f)" class="action-btn action-btn-edit" title="Ubah">✏️ Ubah</button>
              <button @click="removeFacility(f)" class="action-btn action-btn-delete" title="Hapus">🗑️ Hapus</button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="!loadingFacilities && facilities.length" class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500">
        <div>Halaman {{ facilityPage }} dari {{ facilityTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="facilityPage <= 1" @click="facilityPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="facilityPage >= facilityTotalPages" @click="facilityPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ FACILITY MODAL ============ -->
    <div v-if="showFacilityModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" @click.self="showFacilityModal = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">{{ editingFacility ? 'Ubah Fasilitas' : 'Tambah Fasilitas' }}</h3>
        <form @submit.prevent="saveFacility" class="space-y-4">
          <div v-if="facilityFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ facilityFormError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input v-model="facilityForm.name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea v-model="facilityForm.description" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea v-model="facilityForm.note" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showFacilityModal = false" class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" :disabled="savingFacility" class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{{ savingFacility ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ RESERVATION MODAL ============ -->
    <div v-if="showReservationModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" @click.self="showReservationModal = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">{{ editingReservation ? 'Ubah Reservasi' : 'Tambah Reservasi' }}</h3>
        <form @submit.prevent="saveReservation" class="space-y-4">
          <div v-if="reservationFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ reservationFormError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fasilitas</label>
            <select v-model="reservationForm.facilityId" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option value="" disabled>Pilih fasilitas</option>
              <option v-for="f in allFacilities" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Judul</label>
            <input v-model="reservationForm.title" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea v-model="reservationForm.description" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
              <input v-model="reservationForm.startDateTime" type="datetime-local" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
              <input v-model="reservationForm.endDateTime" type="datetime-local" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div v-if="editingReservation">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select v-model="reservationForm.status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option value="">(tidak diubah)</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="DONE">DONE</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea v-model="reservationForm.note" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showReservationModal = false" class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
            <button type="submit" :disabled="savingReservation" class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{{ savingReservation ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-up { opacity: 0; transform: translateY(16px); animation: fadeUp 0.5s ease forwards; }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.fade-up-enter-active, .fade-up-leave-active { transition: all 0.25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(-6px); }

.action-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 8px;
  font-size: 0.72rem; font-weight: 600;
  border: 1px solid transparent; cursor: pointer;
  transition: transform 0.15s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.action-btn-edit { background: #e8f5e9; color: #2E7D32; border-color: #c8e6c9; }
.action-btn-edit:hover { background: #c8e6c9; }
.action-btn-approve { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.action-btn-approve:hover { background: #bbf7d0; }
.action-btn-reject { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.action-btn-reject:hover { background: #fca5a5; color: white; }
.action-btn-delete { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.action-btn-delete:hover { background: #fca5a5; color: white; }
</style>
