<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { LogOut, Pencil, Phone, Plus, SlidersHorizontal, StickyNote, Trash2 } from 'lucide-vue-next'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { confirmDialog } from '@/composables/useConfirm'
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
// Mobile: filter disembunyikan di balik tombol supaya daftar langsung terlihat.
const showVisitFilters = ref(false)

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
  const ok = await confirmDialog({
    title: 'Hapus tamu?',
    message: `Data tamu "${guest.name}" akan dihapus.`
  })
  if (!ok) return
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
  const ok = await confirmDialog({
    title: 'Hapus kunjungan?',
    message: `Kunjungan ${resolvedGuestName(visit)} (masuk ${formatDate(visit.inTime)}) akan dihapus.`
  })
  if (!ok) return
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
    showToast('Jam keluar tercatat')
    showCloseModal.value = false
    await fetchVisits()
  } catch (err) {
    closeError.value = extractError(err, 'Gagal mencatat jam keluar')
  } finally {
    savingClose.value = false
  }
}

// ============ DERIVED ============
function visitStatusInfo(v) {
  if (v.outTime) return { label: 'Closed', cls: 'chip-gray' }
  return { label: 'Open', cls: 'chip-brand' }
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
  <div class="space-y-4">
    <AppToast :toast="toast" />

    <!-- Toolbar: tab + aksi utama. Judul halaman sudah ada di header layout. -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="tabs grid grid-cols-2 w-full sm:w-auto sm:inline-flex" role="tablist" aria-label="Bagian halaman tamu">
        <button
          type="button"
          role="tab"
          class="tab"
          :aria-selected="activeTab === 'kunjungan'"
          @click="activeTab = 'kunjungan'"
        >Daftar Kunjungan</button>
        <button
          type="button"
          role="tab"
          class="tab"
          :aria-selected="activeTab === 'tamu'"
          @click="activeTab = 'tamu'"
        >Data Tamu</button>
      </div>
      <button
        v-if="activeTab === 'kunjungan'"
        type="button"
        class="btn btn-primary"
        @click="openCreateVisit"
      >
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah Kunjungan
      </button>
      <button v-else type="button" class="btn btn-primary" @click="openCreateGuest">
        <Plus class="w-4 h-4" aria-hidden="true" />
        Tambah Tamu
      </button>
    </div>

    <!-- ============ TAB: KUNJUNGAN ============ -->
    <section v-if="activeTab === 'kunjungan'" class="card overflow-hidden" aria-label="Daftar kunjungan">
      <div class="p-4 border-b border-gray-200">
        <button
          type="button"
          class="btn btn-secondary w-full md:hidden"
          :aria-expanded="showVisitFilters"
          aria-controls="visit-filters"
          @click="showVisitFilters = !showVisitFilters"
        >
          <SlidersHorizontal class="w-4 h-4" aria-hidden="true" />
          {{ showVisitFilters ? 'Sembunyikan filter' : 'Filter & urutan' }}
        </button>
        <div
          id="visit-filters"
          class="gap-3 grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto] items-end"
          :class="showVisitFilters ? 'grid mt-3 md:mt-0' : 'hidden md:grid'"
        >
          <div>
            <label for="visit-status" class="field-label text-xs">Status</label>
            <select id="visit-status" v-model="visitStatus" class="field">
              <option value="all">Semua</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label for="visit-guest" class="field-label text-xs">Tamu</label>
            <select id="visit-guest" v-model="visitGuestId" class="field">
              <option value="">Semua tamu</option>
              <option v-for="g in allGuests" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div>
            <label for="visit-from" class="field-label text-xs">Dari tanggal</label>
            <input id="visit-from" v-model="visitFrom" type="date" class="field" />
          </div>
          <div>
            <label for="visit-to" class="field-label text-xs">Sampai tanggal</label>
            <input id="visit-to" v-model="visitTo" type="date" class="field" />
          </div>
          <div>
            <label for="visit-sort" class="field-label text-xs">Urutkan</label>
            <select id="visit-sort" v-model="visitSortBy" class="field">
              <option value="createdAt">Dibuat</option>
              <option value="in">Jam masuk</option>
              <option value="out">Jam keluar</option>
            </select>
          </div>
          <div>
            <label for="visit-order" class="field-label text-xs">Arah</label>
            <select id="visit-order" v-model="visitSortOrder" class="field">
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
          <button type="button" class="btn btn-primary col-span-2 lg:col-span-1" @click="applyVisitDateFilter">
            Terapkan
          </button>
        </div>
      </div>

      <div v-if="loadingVisits" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!visits.length" class="empty-state">Belum ada kunjungan.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Nama Tamu</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Jam Masuk</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Jam Keluar</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Status</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
                <th scope="col" class="text-right font-medium px-4 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="v in visits" :key="v.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium text-ink whitespace-nowrap">{{ resolvedGuestName(v) }}</td>
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ formatDate(v.inTime) }}</td>
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ formatDate(v.outTime) }}</td>
                <td class="px-4 py-2"><span class="chip" :class="visitStatusInfo(v).cls">{{ visitStatusInfo(v).label }}</span></td>
                <td class="px-4 py-2 text-ink-muted max-w-xs truncate" :title="v.note || ''">{{ v.note || '-' }}</td>
                <td class="px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <button
                      v-if="!v.outTime"
                      type="button"
                      class="icon-btn"
                      title="Catat keluar"
                      :aria-label="`Catat keluar ${resolvedGuestName(v)}`"
                      @click="openCloseModal(v)"
                    ><LogOut class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn"
                      title="Ubah"
                      :aria-label="`Ubah kunjungan ${resolvedGuestName(v)}`"
                      @click="openEditVisit(v)"
                    ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn icon-btn-danger"
                      title="Hapus"
                      :aria-label="`Hapus kunjungan ${resolvedGuestName(v)}`"
                      @click="removeVisit(v)"
                    ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="v in visits" :key="v.id" class="p-4">
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 font-semibold text-ink truncate">{{ resolvedGuestName(v) }}</p>
              <span class="chip" :class="visitStatusInfo(v).cls">{{ visitStatusInfo(v).label }}</span>
            </div>
            <dl class="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-xs text-ink-muted">Masuk</dt>
                <dd class="text-ink tabular-nums">{{ formatDate(v.inTime) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Keluar</dt>
                <dd class="text-ink tabular-nums">{{ formatDate(v.outTime) }}</dd>
              </div>
            </dl>
            <p v-if="v.note" class="mt-2 flex items-start gap-1.5 text-sm text-ink-muted">
              <StickyNote class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span class="line-clamp-2">{{ v.note }}</span>
            </p>
            <div class="mt-3 flex items-center gap-2">
              <button v-if="!v.outTime" type="button" class="btn btn-secondary flex-1" @click="openCloseModal(v)">
                <LogOut class="w-4 h-4" aria-hidden="true" />
                Catat keluar
              </button>
              <div class="flex gap-1 ml-auto">
                <button
                  type="button"
                  class="icon-btn w-11 h-11"
                  :aria-label="`Ubah kunjungan ${resolvedGuestName(v)}`"
                  @click="openEditVisit(v)"
                ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                <button
                  type="button"
                  class="icon-btn icon-btn-danger w-11 h-11"
                  :aria-label="`Hapus kunjungan ${resolvedGuestName(v)}`"
                  @click="removeVisit(v)"
                ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="visitPage" :total-pages="visitTotalPages" />
      </template>
    </section>

    <!-- ============ TAB: DATA TAMU ============ -->
    <section v-else class="card overflow-hidden" aria-label="Data tamu">
      <div class="p-4 border-b border-gray-200 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
        <div class="col-span-2 sm:col-span-1">
          <label for="guest-search" class="field-label text-xs">Cari</label>
          <input
            id="guest-search"
            v-model="guestSearch"
            type="search"
            placeholder="Nama atau nomor telepon"
            class="field"
          />
        </div>
        <div>
          <label for="guest-sort" class="field-label text-xs">Urutkan</label>
          <select id="guest-sort" v-model="guestSortBy" class="field">
            <option value="createdAt">Dibuat</option>
            <option value="name">Nama</option>
          </select>
        </div>
        <div>
          <label for="guest-order" class="field-label text-xs">Arah</label>
          <select id="guest-order" v-model="guestSortOrder" class="field">
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>
        </div>
      </div>

      <div v-if="loadingGuests" class="empty-state" aria-busy="true">Memuat...</div>
      <div v-else-if="!guests.length" class="empty-state">Belum ada tamu.</div>
      <template v-else>
        <!-- DESKTOP table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Nama</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">No. Telepon</th>
                <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
                <th scope="col" class="text-right font-medium px-4 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="g in guests" :key="g.id" class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium text-ink whitespace-nowrap">{{ g.name }}</td>
                <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ g.phoneNumber || '-' }}</td>
                <td class="px-4 py-2 text-ink-muted max-w-md truncate" :title="g.note || ''">{{ g.note || '-' }}</td>
                <td class="px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="icon-btn"
                      title="Ubah"
                      :aria-label="`Ubah tamu ${g.name}`"
                      @click="openEditGuest(g)"
                    ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
                    <button
                      type="button"
                      class="icon-btn icon-btn-danger"
                      title="Hapus"
                      :aria-label="`Hapus tamu ${g.name}`"
                      @click="removeGuest(g)"
                    ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MOBILE list -->
        <ul class="md:hidden divide-y divide-gray-200">
          <li v-for="g in guests" :key="g.id" class="flex items-start gap-3 p-4">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-ink truncate">{{ g.name }}</p>
              <a
                v-if="g.phoneNumber"
                :href="`tel:${g.phoneNumber}`"
                class="mt-0.5 inline-flex items-center gap-1.5 text-sm text-brand-700 tabular-nums"
              >
                <Phone class="w-3.5 h-3.5" aria-hidden="true" />
                {{ g.phoneNumber }}
              </a>
              <p v-if="g.note" class="mt-1 text-sm text-ink-muted line-clamp-2">{{ g.note }}</p>
            </div>
            <div class="flex gap-1 -mr-2 -mt-2">
              <button
                type="button"
                class="icon-btn w-11 h-11"
                :aria-label="`Ubah tamu ${g.name}`"
                @click="openEditGuest(g)"
              ><Pencil class="w-4 h-4" aria-hidden="true" /></button>
              <button
                type="button"
                class="icon-btn icon-btn-danger w-11 h-11"
                :aria-label="`Hapus tamu ${g.name}`"
                @click="removeGuest(g)"
              ><Trash2 class="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </li>
        </ul>

        <PaginationBar v-model:page="guestPage" :total-pages="guestTotalPages" />
      </template>
    </section>

    <!-- ============ VISIT MODAL ============ -->
    <BaseModal v-model:open="showVisitModal" :title="editingVisit ? 'Ubah Kunjungan' : 'Tambah Kunjungan'">
      <form id="visit-form" class="space-y-4" @submit.prevent="saveVisit">
        <p v-if="visitFormError" class="form-error" role="alert">{{ visitFormError }}</p>
        <div>
          <label for="visit-form-guest" class="field-label">Tamu</label>
          <select id="visit-form-guest" v-model="visitForm.guestId" required class="field">
            <option value="" disabled>Pilih tamu</option>
            <option v-for="g in allGuests" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <p class="field-hint">Tamu belum terdaftar? Tambahkan di tab "Data Tamu".</p>
        </div>
        <div>
          <label for="visit-form-in" class="field-label">Jam masuk</label>
          <input id="visit-form-in" v-model="visitForm.inTime" type="datetime-local" class="field" />
        </div>
        <div>
          <label for="visit-form-out" class="field-label">Jam keluar <span class="font-normal text-ink-muted">(opsional)</span></label>
          <input id="visit-form-out" v-model="visitForm.outTime" type="datetime-local" class="field" />
          <p class="field-hint">Kosongkan jika tamu belum keluar. Bisa dicatat nanti lewat tombol "Catat keluar".</p>
        </div>
        <div>
          <label for="visit-form-note" class="field-label">Catatan</label>
          <textarea id="visit-form-note" v-model="visitForm.note" rows="3" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showVisitModal = false">Batal</button>
        <button type="submit" form="visit-form" class="btn btn-primary flex-1" :disabled="savingVisit">
          {{ savingVisit ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ CLOSE (CATAT KELUAR) MODAL ============ -->
    <BaseModal v-model:open="showCloseModal" title="Catat Jam Keluar">
      <form id="close-form" class="space-y-4" @submit.prevent="submitClose">
        <p class="text-sm text-ink-muted">
          Tamu: <strong class="text-ink">{{ resolvedGuestName(closingVisit || {}) }}</strong>
        </p>
        <p v-if="closeError" class="form-error" role="alert">{{ closeError }}</p>
        <div>
          <label for="close-form-out" class="field-label">Jam keluar</label>
          <input id="close-form-out" v-model="closeForm.outTime" type="datetime-local" class="field" />
          <p class="field-hint">Kosongkan untuk memakai waktu server saat ini.</p>
        </div>
        <div>
          <label for="close-form-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="close-form-note" v-model="closeForm.note" rows="2" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showCloseModal = false">Batal</button>
        <button type="submit" form="close-form" class="btn btn-primary flex-1" :disabled="savingClose">
          {{ savingClose ? 'Menyimpan...' : 'Catat Keluar' }}
        </button>
      </template>
    </BaseModal>

    <!-- ============ GUEST MODAL ============ -->
    <BaseModal v-model:open="showGuestModal" :title="editingGuest ? 'Ubah Data Tamu' : 'Tambah Data Tamu'">
      <form id="guest-form" class="space-y-4" @submit.prevent="saveGuest">
        <p v-if="guestFormError" class="form-error" role="alert">{{ guestFormError }}</p>
        <div>
          <label for="guest-form-name" class="field-label">Nama</label>
          <input
            id="guest-form-name"
            v-model="guestForm.name"
            type="text"
            required
            autocomplete="off"
            placeholder="Nama lengkap tamu"
            class="field"
          />
        </div>
        <div>
          <label for="guest-form-phone" class="field-label">No. telepon</label>
          <input
            id="guest-form-phone"
            v-model="guestForm.phoneNumber"
            type="tel"
            inputmode="tel"
            autocomplete="off"
            placeholder="08xxxxxxxxxx"
            class="field"
          />
        </div>
        <div>
          <label for="guest-form-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
          <textarea id="guest-form-note" v-model="guestForm.note" rows="3" class="field"></textarea>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary flex-1" @click="showGuestModal = false">Batal</button>
        <button type="submit" form="guest-form" class="btn btn-primary flex-1" :disabled="savingGuest">
          {{ savingGuest ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
