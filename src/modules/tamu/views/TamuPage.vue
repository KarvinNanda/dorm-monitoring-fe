<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { guestService } from '@/services/guestService'
import { guestVisitService } from '@/services/guestVisitService'
import {
  formatDate,
  toJakartaDatetimeInput,
  jakartaInputToISO,
  nowJakartaDatetimeInput
} from '@/utils/dateFormat'

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

// formatDate, toJakartaDatetimeInput, jakartaInputToISO, nowJakartaDatetimeInput
// dipinjam dari @/utils/dateFormat supaya semua tampilan waktu terkunci ke WIB
// (backend mengembalikan waktu dalam timezone "overseas" / UTC).

// ============ TAB ============
const activeTab = ref('kunjungan') // kunjungan | tamu

// ============ GUEST LIST ============
const guests = ref([])
const guestMeta = ref(null)
const guestPage = ref(1)
const guestLimit = ref(5)
const guestSearch = ref('')
const guestSortBy = ref('createdAt')
const guestSortOrder = ref('desc')
const loadingGuests = ref(false)

async function fetchGuests() {
  loadingGuests.value = true
  try {
    const { data, meta } = await guestService.list({
      page: guestPage.value,
      limit: guestLimit.value,
      search: guestSearch.value || undefined,
      sortBy: guestSortBy.value,
      sortOrder: guestSortOrder.value
    })
    guests.value = Array.isArray(data) ? data : []
    guestMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat data tamu'), 'error')
  } finally {
    loadingGuests.value = false
  }
}

const guestTotalPages = computed(() => {
  if (!guestMeta.value) return 1
  return (
    guestMeta.value.totalPages ||
    guestMeta.value.total_pages ||
    Math.max(1, Math.ceil((guestMeta.value.total || 0) / guestLimit.value))
  )
})

watch(guestPage, fetchGuests)
watch([guestSortBy, guestSortOrder], () => {
  guestPage.value = 1
  fetchGuests()
})

// debounce search
let guestSearchTimer = null
watch(guestSearch, () => {
  if (guestSearchTimer) clearTimeout(guestSearchTimer)
  guestSearchTimer = setTimeout(() => {
    guestPage.value = 1
    fetchGuests()
  }, 400)
})

// ============ GUEST FORM (MODAL) ============
const showGuestModal = ref(false)
const editingGuest = ref(null)
const guestForm = ref({ name: '', phoneNumber: '', note: '' })
const guestFormError = ref('')
const savingGuest = ref(false)

function openCreateGuest() {
  editingGuest.value = null
  guestForm.value = { name: '', phoneNumber: '', note: '' }
  guestFormError.value = ''
  showGuestModal.value = true
}

function openEditGuest(guest) {
  editingGuest.value = guest
  guestForm.value = {
    name: guest.name || '',
    phoneNumber: guest.phoneNumber || '',
    note: guest.note || ''
  }
  guestFormError.value = ''
  showGuestModal.value = true
}

async function saveGuest() {
  guestFormError.value = ''
  if (!guestForm.value.name?.trim()) {
    guestFormError.value = 'Nama wajib diisi'
    return
  }
  savingGuest.value = true
  try {
    const payload = {
      name: guestForm.value.name,
      phoneNumber: guestForm.value.phoneNumber || undefined,
      note: guestForm.value.note || undefined
    }
    if (editingGuest.value) {
      await guestService.update(editingGuest.value.id, payload)
      showToast('Data tamu diperbarui')
    } else {
      await guestService.create(payload)
      showToast('Tamu baru ditambahkan')
    }
    showGuestModal.value = false
    await fetchGuests()
    // refresh dropdown tamu di form kunjungan bila sedang dibuka
    await fetchAllGuestsForSelect()
  } catch (err) {
    guestFormError.value = extractError(err, 'Gagal menyimpan tamu')
  } finally {
    savingGuest.value = false
  }
}

async function removeGuest(guest) {
  if (!confirm(`Hapus tamu "${guest.name}"?`)) return
  try {
    await guestService.remove(guest.id)
    showToast('Tamu berhasil dihapus')
    await fetchGuests()
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus tamu'), 'error')
  }
}

// ============ ALL GUESTS (FOR DROPDOWN IN VISIT MODAL) ============
const allGuests = ref([])
async function fetchAllGuestsForSelect() {
  try {
    // Ambil jumlah besar biar kebanyakan tamu muncul di dropdown.
    const { data } = await guestService.list({ page: 1, limit: 200 })
    allGuests.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Gagal memuat dropdown tamu:', extractError(err))
  }
}

function guestNameById(id) {
  return allGuests.value.find((g) => String(g.id) === String(id))?.name || '-'
}

// ============ VISIT LIST ============
const visits = ref([])
const visitMeta = ref(null)
const visitPage = ref(1)
const visitLimit = ref(5)
const visitFrom = ref('')
const visitTo = ref('')
const visitStatus = ref('all') // all | open | closed
const visitSortBy = ref('createdAt') // in | out | createdAt
const visitSortOrder = ref('desc')
const visitGuestId = ref('')
const loadingVisits = ref(false)

async function fetchVisits() {
  loadingVisits.value = true
  try {
    const { data, meta } = await guestVisitService.list({
      page: visitPage.value,
      limit: visitLimit.value,
      from: visitFrom.value || undefined,
      to: visitTo.value || undefined,
      status: visitStatus.value || undefined,
      sortBy: visitSortBy.value,
      sortOrder: visitSortOrder.value,
      guestId: visitGuestId.value || undefined
    })
    visits.value = Array.isArray(data) ? data : []
    visitMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat kunjungan'), 'error')
  } finally {
    loadingVisits.value = false
  }
}

const visitTotalPages = computed(() => {
  if (!visitMeta.value) return 1
  return (
    visitMeta.value.totalPages ||
    visitMeta.value.total_pages ||
    Math.max(1, Math.ceil((visitMeta.value.total || 0) / visitLimit.value))
  )
})

watch(visitPage, fetchVisits)
watch([visitStatus, visitSortBy, visitSortOrder, visitGuestId], () => {
  visitPage.value = 1
  fetchVisits()
})

function applyVisitDateFilter() {
  visitPage.value = 1
  fetchVisits()
}

// ============ VISIT FORM (MODAL) ============
const showVisitModal = ref(false)
const editingVisit = ref(null)
const visitForm = ref({ guestId: '', inTime: '', outTime: '', note: '' })
const visitFormError = ref('')
const savingVisit = ref(false)

function openCreateVisit() {
  editingVisit.value = null
  visitForm.value = {
    guestId: '',
    inTime: nowJakartaDatetimeInput(),
    outTime: '',
    note: ''
  }
  visitFormError.value = ''
  showVisitModal.value = true
}

function openEditVisit(visit) {
  editingVisit.value = visit
  visitForm.value = {
    guestId: visit.guestId || visit.guest?.id || '',
    inTime: toJakartaDatetimeInput(visit.inTime),
    outTime: toJakartaDatetimeInput(visit.outTime),
    note: visit.note || ''
  }
  visitFormError.value = ''
  showVisitModal.value = true
}

async function saveVisit() {
  visitFormError.value = ''
  if (!visitForm.value.guestId) {
    visitFormError.value = 'Pilih tamu'
    return
  }
  savingVisit.value = true
  try {
    // Input datetime-local di-interpretasikan sebagai WIB, dikonversi ke UTC ISO.
    const payload = {
      guestId: visitForm.value.guestId,
      inTime: jakartaInputToISO(visitForm.value.inTime),
      outTime: jakartaInputToISO(visitForm.value.outTime),
      note: visitForm.value.note || undefined
    }
    if (editingVisit.value) {
      await guestVisitService.update(editingVisit.value.id, payload)
      showToast('Kunjungan diperbarui')
    } else {
      await guestVisitService.create(payload)
      showToast('Kunjungan dicatat')
    }
    showVisitModal.value = false
    await fetchVisits()
  } catch (err) {
    visitFormError.value = extractError(err, 'Gagal menyimpan kunjungan')
  } finally {
    savingVisit.value = false
  }
}

async function removeVisit(visit) {
  if (!confirm('Hapus data kunjungan ini?')) return
  try {
    await guestVisitService.remove(visit.id)
    showToast('Kunjungan dihapus')
    await fetchVisits()
  } catch (err) {
    showToast(extractError(err, 'Gagal menghapus kunjungan'), 'error')
  }
}

// ============ CLOSE VISIT ============
const showCloseModal = ref(false)
const closingVisit = ref(null)
const closeForm = ref({ outTime: '', note: '' })
const closeError = ref('')
const savingClose = ref(false)

function openCloseModal(visit) {
  closingVisit.value = visit
  closeForm.value = {
    outTime: nowJakartaDatetimeInput(),
    note: ''
  }
  closeError.value = ''
  showCloseModal.value = true
}

async function submitClose() {
  closeError.value = ''
  savingClose.value = true
  try {
    // Input datetime-local di-interpretasikan sebagai WIB, dikonversi ke UTC ISO.
    const payload = {
      outTime: jakartaInputToISO(closeForm.value.outTime),
      note: closeForm.value.note || undefined
    }
    await guestVisitService.close(closingVisit.value.id, payload)
    showToast('Kunjungan ditutup')
    showCloseModal.value = false
    await fetchVisits()
  } catch (err) {
    closeError.value = extractError(err, 'Gagal menutup kunjungan')
  } finally {
    savingClose.value = false
  }
}

// ============ DERIVED ============
function visitStatusInfo(v) {
  if (v.outTime) return { label: 'closed', cls: 'bg-gray-100 text-gray-600' }
  return { label: 'open', cls: 'bg-green-100 text-green-700' }
}

function resolvedGuestName(v) {
  return v.guest?.name || guestNameById(v.guestId)
}

// ============ MOUNT ============
onMounted(async () => {
  await Promise.all([fetchVisits(), fetchGuests(), fetchAllGuestsForSelect()])
})
</script>

<template>
  <div>
    <!-- Toast -->
    <transition name="fade-up">
      <div
        v-if="toast.show"
        class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm"
        :class="toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      >
        {{ toast.message }}
      </div>
    </transition>

    <div class="flex items-center justify-between mb-3 flex-wrap gap-3 fade-up">
      <h1 class="text-xl font-bold text-gray-800">Manajemen Tamu 🌱</h1>
      <button
        v-if="activeTab === 'kunjungan'"
        @click="openCreateVisit"
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah Kunjungan
      </button>
      <button
        v-else
        @click="openCreateGuest"
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        + Tambah Tamu
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-3 fade-up" style="animation-delay: 80ms">
      <nav class="flex gap-6">
        <button
          @click="activeTab = 'kunjungan'"
          class="py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'kunjungan' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Daftar Kunjungan
        </button>
        <button
          @click="activeTab = 'tamu'"
          class="py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'tamu' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Data Tamu
        </button>
      </nav>
    </div>

    <!-- ============ TAB: KUNJUNGAN ============ -->
    <div v-if="activeTab === 'kunjungan'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <!-- Filter bar.
           Mobile: grid 2 kolom supaya control rapi rata, tombol Filter full-width.
           Desktop (sm+): kembali ke flex-wrap inline. -->
      <div class="px-3 py-2 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
        <select v-model="visitStatus" title="Status" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="all">Status: Semua</option>
          <option value="open">Status: Open</option>
          <option value="closed">Status: Closed</option>
        </select>
        <select v-model="visitGuestId" title="Tamu" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="">Semua tamu</option>
          <option v-for="g in allGuests" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <input v-model="visitFrom" type="date" title="Tanggal dari" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <input v-model="visitTo" type="date" title="Tanggal sampai" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
        <select v-model="visitSortBy" title="Urutkan berdasarkan" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="createdAt">Urut: Dibuat</option>
          <option value="in">Urut: Jam Masuk</option>
          <option value="out">Urut: Jam Keluar</option>
        </select>
        <select v-model="visitSortOrder" title="Arah" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
        <button @click="applyVisitDateFilter" class="col-span-2 sm:col-auto w-full sm:w-auto px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-green-700">
          Filter
        </button>
      </div>

      <!-- DESKTOP table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Nama Tamu</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Jam Masuk</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Jam Keluar</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingVisits">
              <td colspan="6" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td>
            </tr>
            <tr v-else-if="!visits.length">
              <td colspan="6" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada kunjungan.</td>
            </tr>
            <tr v-else v-for="v in visits" :key="v.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium whitespace-nowrap">{{ resolvedGuestName(v) }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(v.inTime) }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(v.outTime) }}</td>
              <td class="px-3 py-1.5 whitespace-nowrap">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="visitStatusInfo(v).cls">
                  {{ visitStatusInfo(v).label }}
                </span>
              </td>
              <td class="px-3 py-1.5 text-sm text-gray-500 max-w-xs truncate" :title="v.note || ''">{{ v.note || '-' }}</td>
              <td class="px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <button v-if="!v.outTime" @click="openCloseModal(v)" class="action-btn action-btn-close" title="Tutup kunjungan">🔒</button>
                  <button @click="openEditVisit(v)" class="action-btn action-btn-edit" title="Ubah">✏️</button>
                  <button @click="removeVisit(v)" class="action-btn action-btn-delete" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingVisits" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!visits.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada kunjungan.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="v in visits" :key="v.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ resolvedGuestName(v) }}</div>
              </div>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="visitStatusInfo(v).cls">
                {{ visitStatusInfo(v).label }}
              </span>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
              <div><span class="text-gray-400">Masuk</span><br /><span class="text-gray-700">{{ formatDate(v.inTime) }}</span></div>
              <div><span class="text-gray-400">Keluar</span><br /><span class="text-gray-700">{{ formatDate(v.outTime) }}</span></div>
            </div>
            <div v-if="v.note" class="mt-1 text-xs text-gray-500 line-clamp-2">📝 {{ v.note }}</div>
            <div class="mt-2 flex flex-wrap gap-1">
              <button v-if="!v.outTime" @click="openCloseModal(v)" class="action-btn action-btn-close">🔒 Tutup</button>
              <button @click="openEditVisit(v)" class="action-btn action-btn-edit">✏️ Ubah</button>
              <button @click="removeVisit(v)" class="action-btn action-btn-delete">🗑️ Hapus</button>
            </div>
          </li>
        </ul>
      </div>

      <div
        v-if="!loadingVisits && visits.length"
        class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500"
      >
        <div>Halaman {{ visitPage }} dari {{ visitTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="visitPage <= 1" @click="visitPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="visitPage >= visitTotalPages" @click="visitPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ TAB: DATA TAMU ============ -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 150ms">
      <!-- Mobile: search di atas full-width, 2 select sebar 2 kolom.
           Desktop: search flex-1, select inline. -->
      <div class="px-3 py-2 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
        <input
          v-model="guestSearch"
          type="text"
          placeholder="Cari nama / nomor..."
          class="col-span-2 sm:col-auto sm:flex-1 sm:min-w-[180px] w-full min-w-0 px-3 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary"
        />
        <select v-model="guestSortBy" title="Urutkan berdasarkan" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
          <option value="createdAt">Urut: Dibuat</option>
          <option value="name">Urut: Nama</option>
        </select>
        <select v-model="guestSortOrder" title="Arah" class="w-full sm:w-auto min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary">
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
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">No. Telepon</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loadingGuests">
              <td colspan="4" class="px-3 py-4 text-center text-gray-400 text-sm">Memuat...</td>
            </tr>
            <tr v-else-if="!guests.length">
              <td colspan="4" class="px-3 py-4 text-center text-gray-400 text-sm">Belum ada tamu.</td>
            </tr>
            <tr v-else v-for="g in guests" :key="g.id" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 text-sm text-gray-800 font-medium whitespace-nowrap">{{ g.name }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 whitespace-nowrap">{{ g.phoneNumber || '-' }}</td>
              <td class="px-3 py-1.5 text-sm text-gray-500 max-w-md truncate" :title="g.note || ''">{{ g.note || '-' }}</td>
              <td class="px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <button @click="openEditGuest(g)" class="action-btn action-btn-edit" title="Ubah">✏️</button>
                  <button @click="removeGuest(g)" class="action-btn action-btn-delete" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE card list -->
      <div class="md:hidden">
        <div v-if="loadingGuests" class="px-3 py-6 text-center text-gray-400 text-sm">Memuat...</div>
        <div v-else-if="!guests.length" class="px-3 py-6 text-center text-gray-400 text-sm">Belum ada tamu.</div>
        <ul v-else class="divide-y divide-gray-200">
          <li v-for="g in guests" :key="g.id" class="px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-800 truncate">{{ g.name }}</div>
                <div v-if="g.phoneNumber" class="mt-0.5 text-xs text-gray-500">📞 {{ g.phoneNumber }}</div>
                <div v-if="g.note" class="mt-1 text-xs text-gray-500 line-clamp-2">{{ g.note }}</div>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
              <button @click="openEditGuest(g)" class="action-btn action-btn-edit">✏️ Ubah</button>
              <button @click="removeGuest(g)" class="action-btn action-btn-delete">🗑️ Hapus</button>
            </div>
          </li>
        </ul>
      </div>

      <div
        v-if="!loadingGuests && guests.length"
        class="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-xs text-gray-500"
      >
        <div>Halaman {{ guestPage }} dari {{ guestTotalPages }}</div>
        <div class="flex gap-2">
          <button :disabled="guestPage <= 1" @click="guestPage--" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
          <button :disabled="guestPage >= guestTotalPages" @click="guestPage++" class="px-2 py-0.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next ›</button>
        </div>
      </div>
    </div>

    <!-- ============ VISIT MODAL ============ -->
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
          <div v-if="visitFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ visitFormError }}</div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tamu</label>
            <select
              v-model="visitForm.guestId"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="" disabled>Pilih tamu</option>
              <option v-for="g in allGuests" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">Tamu belum terdaftar? Tambahkan di tab "Data Tamu".</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jam Masuk</label>
            <input
              v-model="visitForm.inTime"
              type="datetime-local"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jam Keluar (opsional)</label>
            <input
              v-model="visitForm.outTime"
              type="datetime-local"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <p class="text-xs text-gray-400 mt-1">Biarkan kosong jika tamu belum keluar — bisa ditutup nanti lewat tombol "Close".</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              v-model="visitForm.note"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            ></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showVisitModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingVisit"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {{ savingVisit ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ CLOSE MODAL ============ -->
    <div
      v-if="showCloseModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showCloseModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Tutup Kunjungan</h3>
        <p class="text-sm text-gray-500 mb-4">
          Tamu: <strong>{{ resolvedGuestName(closingVisit || {}) }}</strong>
        </p>
        <form @submit.prevent="submitClose" class="space-y-4">
          <div v-if="closeError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ closeError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jam Keluar</label>
            <input
              v-model="closeForm.outTime"
              type="datetime-local"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <p class="text-xs text-gray-400 mt-1">Kosong = pakai waktu server sekarang.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              v-model="closeForm.note"
              rows="2"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            ></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showCloseModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingClose"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {{ savingClose ? 'Menutup...' : 'Tutup Kunjungan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ GUEST MODAL ============ -->
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
          <div v-if="guestFormError" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{{ guestFormError }}</div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              v-model="guestForm.name"
              type="text"
              required
              placeholder="Nama lengkap tamu"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <input
              v-model="guestForm.phoneNumber"
              type="tel"
              placeholder="08xxxxxxxxxx"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              v-model="guestForm.note"
              rows="3"
              placeholder="Informasi tambahan (opsional)"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            ></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showGuestModal = false"
              class="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingGuest"
              class="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {{ savingGuest ? 'Menyimpan...' : 'Simpan' }}
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

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.25s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
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
  transition: transform 0.15s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}
.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.action-btn-edit {
  background: #e8f5e9;
  color: #2E7D32;
  border-color: #c8e6c9;
}
.action-btn-edit:hover {
  background: #c8e6c9;
}
.action-btn-close {
  background: #eef2ff;
  color: #4338ca;
  border-color: #e0e7ff;
}
.action-btn-close:hover {
  background: #e0e7ff;
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
