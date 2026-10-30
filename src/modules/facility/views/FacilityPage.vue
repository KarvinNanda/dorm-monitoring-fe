<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Building2, Check, Pencil, Plus, SlidersHorizontal, StickyNote, Trash2, X } from 'lucide-vue-next'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { confirmDialog } from '@/composables/useConfirm'
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
// Mobile: filter disembunyikan di balik tombol supaya daftar langsung terlihat.
const showReservationFilters = ref(false)

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
  const ok = await confirmDialog({ title: 'Hapus fasilitas?', message: `Fasilitas "${f.name}" akan dihapus.` })
  if (!ok) return
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
  const ok = await confirmDialog({ title: 'Hapus reservasi?', message: `Reservasi "${r.title}" akan dihapus.` })
  if (!ok) return
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
    showToast(newStatus === 'APPROVED' ? 'Reservasi disetujui' : 'Reservasi ditolak')
    await fetchReservations()
  } catch (err) {
    showToast(extractError(err, 'Gagal mengubah status'), 'error')
  }
}

// Nilai enum dari API tetap dikirim apa adanya; yang diterjemahkan hanya label.
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'DONE', label: 'Selesai' }
]

function statusInfo(s) {
  const key = (s || '').toUpperCase()
  switch (key) {
    case 'APPROVED':
    case 'CONFIRMED':
      return { label: 'Disetujui', cls: 'chip-brand' }
    case 'PENDING':
      return { label: 'Menunggu', cls: 'chip-amber' }
    case 'REJECTED':
      return { label: 'Ditolak', cls: 'chip-red' }
    case 'CANCELLED':
    case 'CANCELED':
      return { label: 'Dibatalkan', cls: 'chip-red' }
    case 'DONE':
    case 'COMPLETED':
      return { label: 'Selesai', cls: 'chip-gray' }
    default:
      return { label: key || '-', cls: 'chip-gray' }
  }
}

function isPending(r) {
  return (r.status || '').toUpperCase() === 'PENDING'
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
  <div class="space-y-4">
    <AppToast :toast="toast" />

    <!-- Toolbar: tab + aksi utama. Judul halaman sudah ada di header layout. -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="tabs grid grid-cols-2 w-full sm:w-auto sm:inline-flex" role="tablist" aria-label="Bagian halaman fasilitas">
        <button
          type="button"
          role="tab"
          class="tab"
          :aria-selected="activeTab === 'reservations'"
          @click="activeTab = 'reservations'"
        >Reservasi</button>
        <button
          type="button"
          role="tab"
          class="tab"
          :aria-selected="activeTab === 'facilities'"
          @click="activeTab = 'facilities'"
        >Daftar Fasilitas</button>
      </div>
      <button
        v-if="activeTab === 'reservations' && canWriteReservation"
        type="button"
        class="btn btn-primary"
        @click="openCreateReservation"
      >
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah Reservasi
      </button>
      <button
        v-else-if="activeTab === 'facilities' && canWriteFacility"
        type="button"
        class="btn btn-primary"
        @click="openCreateFacility"
      >
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah Fasilitas
      </button>
    </div>

    <!-- ============ TAB: RESERVASI ============ -->
    <section v-if="activeTab === 'reservations'" class="card overflow-hidden" aria-label="Daftar reservasi">
      <div class="p-4 border-b border-gray-200 space-y-3">
        <div>
          <label for="reservation-search" class="field-label text-xs">Cari</label>
          <input
            id="reservation-search"
            v-model="reservationSearch"
            type="search"
            placeholder="Judul reservasi"
            class="field"
          />
        </div>
        <button
          type="button"
          class="btn btn-secondary w-full md:hidden"
          :aria-expanded="showReservationFilters"
          aria-controls="reservation-filters"
          @click="showReservationFilters = !showReservationFilters"
        >
          <SlidersHorizontal class="w-4 h-4" aria-hidden="true" />
          {{ showReservationFilters ? 'Sembunyikan filter' : 'Filter & urutan' }}
        </button>
        <div
          id="reservation-filters"
          class="gap-3 grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] items-end"
          :class="showReservationFilters ? 'grid' : 'hidden md:grid'"
        >
          <div>
            <label for="reservation-status" class="field-label text-xs">Status</label>
            <select id="reservation-status" v-model="reservationStatus" class="field">
              <option value="">Semua status</option>
              <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label for="reservation-facility" class="field-label text-xs">Fasilitas</label>
            <select id="reservation-facility" v-model="reservationFacilityId" class="field">
              <option value="">Semua fasilitas</option>
              <option v-for="f in allFacilities" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>
          <div>
            <label for="reservation-from" class="field-label text-xs">Dari tanggal</label>
            <input id="reservation-from" v-model="reservationFrom" type="date" class="field" />
          </div>
          <div>
            <label for="reservation-to" class="field-label text-xs">Sampai tanggal</label>
            <input id="reservation-to" v-model="reservationTo" type="date" class="field" />
          </div>
          <div>
            <label for="reservation-order" class="field-label text-xs">Urutan</label>
            <select id="reservation-order" v-model="reservationSortOrder" class="field">
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
          <button type="button" class="btn btn-primary col-span-2 lg:col-span-1" @click="applyReservationDateFilter">
            Terapkan
          </button>
        </div>
      </div>

      <div v-if="loadingReservations" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!reservations.length" class="empty-state">Belum ada reservasi.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Judul</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Fasilitas</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Mulai</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Selesai</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Status</th>
                <th v-if="canWriteReservation" scope="col" class="text-right font-medium px-4 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="r in reservations" :key="r.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium text-ink max-w-xs truncate" :title="r.description || ''">{{ r.title }}</td>
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap">{{ resolvedFacilityName(r) }}</td>
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ formatDate(r.startDateTime) }}</td>
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ formatDate(r.endDateTime) }}</td>
                <td class="px-4 py-2"><span class="chip" :class="statusInfo(r.status).cls">{{ statusInfo(r.status).label }}</span></td>
                <td v-if="canWriteReservation" class="px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <template v-if="isPending(r)">
                      <button
                        type="button"
                        class="icon-btn text-brand-700"
                        title="Setujui"
                        :aria-label="`Setujui reservasi ${r.title}`"
                        @click="quickUpdateStatus(r, 'APPROVED')"
                      ><Check class="w-4 h-4" aria-hidden="true" /></button>
                      <button
                        type="button"
                        class="icon-btn icon-btn-danger"
                        title="Tolak"
                        :aria-label="`Tolak reservasi ${r.title}`"
                        @click="quickUpdateStatus(r, 'REJECTED')"
                      ><X class="w-4 h-4" aria-hidden="true" /></button>
                    </template>
                    <button
                      type="button"
                      class="icon-btn"
                      title="Ubah"
                      :aria-label="`Ubah reservasi ${r.title}`"
                      @click="openEditReservation(r)"
                    ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn icon-btn-danger"
                      title="Hapus"
                      :aria-label="`Hapus reservasi ${r.title}`"
                      @click="removeReservation(r)"
                    ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="r in reservations" :key="r.id" class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-ink truncate">{{ r.title }}</p>
                <p class="mt-0.5 flex items-center gap-1.5 text-sm text-brand-700 truncate">
                  <Building2 class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {{ resolvedFacilityName(r) }}
                </p>
              </div>
              <span class="chip" :class="statusInfo(r.status).cls">{{ statusInfo(r.status).label }}</span>
            </div>
            <dl class="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-xs text-ink-muted">Mulai</dt>
                <dd class="text-ink tabular-nums">{{ formatDate(r.startDateTime) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Selesai</dt>
                <dd class="text-ink tabular-nums">{{ formatDate(r.endDateTime) }}</dd>
              </div>
            </dl>
            <p v-if="r.description" class="mt-2 text-sm text-ink-muted line-clamp-2">{{ r.description }}</p>
            <div v-if="canWriteReservation" class="mt-3 flex items-center gap-2">
              <template v-if="isPending(r)">
                <button type="button" class="btn btn-primary flex-1" @click="quickUpdateStatus(r, 'APPROVED')">
                  <Check class="w-4 h-4" aria-hidden="true" />
                  Setujui
                </button>
                <button type="button" class="btn btn-secondary flex-1" @click="quickUpdateStatus(r, 'REJECTED')">
                  <X class="w-4 h-4" aria-hidden="true" />
                  Tolak
                </button>
              </template>
              <div class="flex gap-1 ml-auto">
                <button
                  type="button"
                  class="icon-btn w-11 h-11"
                  :aria-label="`Ubah reservasi ${r.title}`"
                  @click="openEditReservation(r)"
                ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                <button
                  type="button"
                  class="icon-btn icon-btn-danger w-11 h-11"
                  :aria-label="`Hapus reservasi ${r.title}`"
                  @click="removeReservation(r)"
                ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="reservationPage" :total-pages="reservationTotalPages" />
      </template>
    </section>

    <!-- ============ TAB: DAFTAR FASILITAS ============ -->
    <section v-else class="card overflow-hidden" aria-label="Daftar fasilitas">
      <div class="p-4 border-b border-gray-200 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
        <div class="col-span-2 sm:col-span-1">
          <label for="facility-search" class="field-label text-xs">Cari</label>
          <input
            id="facility-search"
            v-model="facilitySearch"
            type="search"
            placeholder="Nama fasilitas"
            class="field"
          />
        </div>
        <div>
          <label for="facility-sort" class="field-label text-xs">Urutkan</label>
          <select id="facility-sort" v-model="facilitySortBy" class="field">
            <option value="createdAt">Dibuat</option>
            <option value="name">Nama</option>
          </select>
        </div>
        <div>
          <label for="facility-order" class="field-label text-xs">Arah</label>
          <select id="facility-order" v-model="facilitySortOrder" class="field">
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>
        </div>
      </div>

      <div v-if="loadingFacilities" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!facilities.length" class="empty-state">Belum ada fasilitas.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Nama</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Deskripsi</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
                <th v-if="canWriteFacility" scope="col" class="text-right font-medium px-4 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="f in facilities" :key="f.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium text-ink whitespace-nowrap">{{ f.name }}</td>
                <td class="px-4 py-2 text-ink-muted max-w-md truncate" :title="f.description || ''">{{ f.description || '-' }}</td>
                <td class="px-4 py-2 text-ink-muted max-w-xs truncate" :title="f.note || ''">{{ f.note || '-' }}</td>
                <td v-if="canWriteFacility" class="px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="icon-btn"
                      title="Ubah"
                      :aria-label="`Ubah fasilitas ${f.name}`"
                      @click="openEditFacility(f)"
                    ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn icon-btn-danger"
                      title="Hapus"
                      :aria-label="`Hapus fasilitas ${f.name}`"
                      @click="removeFacility(f)"
                    ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="f in facilities" :key="f.id" class="flex items-start gap-3 p-4">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-ink truncate">{{ f.name }}</p>
              <p v-if="f.description" class="mt-0.5 text-sm text-ink-muted line-clamp-2">{{ f.description }}</p>
              <p v-if="f.note" class="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                <StickyNote class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span class="line-clamp-2">{{ f.note }}</span>
              </p>
            </div>
            <div v-if="canWriteFacility" class="flex gap-1 -mr-2 -mt-2">
              <button
                type="button"
                class="icon-btn w-11 h-11"
                :aria-label="`Ubah fasilitas ${f.name}`"
                @click="openEditFacility(f)"
              ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
              <button
                type="button"
                class="icon-btn icon-btn-danger w-11 h-11"
                :aria-label="`Hapus fasilitas ${f.name}`"
                @click="removeFacility(f)"
              ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="facilityPage" :total-pages="facilityTotalPages" />
      </template>
    </section>

    <!-- ============ FACILITY MODAL ============ -->
    <BaseModal v-model:open="showFacilityModal" :title="editingFacility ? 'Ubah Fasilitas' : 'Tambah Fasilitas'">
      <form id="facility-form" class="space-y-4" @submit.prevent="saveFacility">
        <p v-if="facilityFormError" class="form-error" role="alert">{{ facilityFormError }}</p>
        <div>
          <label for="facility-form-name" class="field-label">Nama</label>
          <input id="facility-form-name" v-model="facilityForm.name" type="text" required autocomplete="off" class="field" />
        </div>
        <div>
          <label for="facility-form-desc" class="field-label">Deskripsi</label>
          <textarea id="facility-form-desc" v-model="facilityForm.description" rows="3" class="field"></textarea>
        </div>
        <div>
          <label for="facility-form-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="facility-form-note" v-model="facilityForm.note" rows="2" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showFacilityModal = false">Batal</button>
        <button type="submit" form="facility-form" class="btn btn-primary flex-1" :disabled="savingFacility">
          {{ savingFacility ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ RESERVATION MODAL ============ -->
    <BaseModal v-model:open="showReservationModal" :title="editingReservation ? 'Ubah Reservasi' : 'Tambah Reservasi'">
      <form id="reservation-form" class="space-y-4" @submit.prevent="saveReservation">
        <p v-if="reservationFormError" class="form-error" role="alert">{{ reservationFormError }}</p>
        <div>
          <label for="reservation-form-facility" class="field-label">Fasilitas</label>
          <select id="reservation-form-facility" v-model="reservationForm.facilityId" required class="field">
            <option value="" disabled>Pilih fasilitas</option>
            <option v-for="f in allFacilities" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>
        <div>
          <label for="reservation-form-title" class="field-label">Judul</label>
          <input id="reservation-form-title" v-model="reservationForm.title" type="text" required autocomplete="off" class="field" />
        </div>
        <div>
          <label for="reservation-form-desc" class="field-label">Deskripsi <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="reservation-form-desc" v-model="reservationForm.description" rows="2" class="field"></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
          <div>
            <label for="reservation-form-start" class="field-label">Mulai</label>
            <input id="reservation-form-start" v-model="reservationForm.startDateTime" type="datetime-local" required class="field" />
          </div>
          <div>
            <label for="reservation-form-end" class="field-label">Selesai</label>
            <input id="reservation-form-end" v-model="reservationForm.endDateTime" type="datetime-local" required class="field" />
          </div>
        </div>
        <div v-if="editingReservation">
          <label for="reservation-form-status" class="field-label">Status</label>
          <select id="reservation-form-status" v-model="reservationForm.status" class="field">
            <option value="">(tidak diubah)</option>
            <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label for="reservation-form-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="reservation-form-note" v-model="reservationForm.note" rows="2" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showReservationModal = false">Batal</button>
        <button type="submit" form="reservation-form" class="btn btn-primary flex-1" :disabled="savingReservation">
          {{ savingReservation ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
