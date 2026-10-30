<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Clock, LogIn, LogOut, Plus, StickyNote } from 'lucide-vue-next'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { checkLogService } from '@/services/checkLogService'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import {
  formatDate,
  formatDateLong,
  nowJakartaDatetimeInput,
  jakartaInputToISO
} from '@/utils/dateFormat'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasRole('admin'))
const isResident = computed(() => authStore.hasRole('resident'))

// ============ COMMON HELPERS ============
function extractError(err, fallback = 'Terjadi kesalahan') {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback
}

// Tanggal "Hari ini" — dirender via util WIB supaya konsisten lintas timezone.
const tanggalLengkap = computed(() => formatDateLong())

// ============ TOAST ============
const toast = ref({ show: false, type: 'success', message: '' })
let toastTimer = null
function showToast(message, type = 'success') {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value.show = false), 2500)
}

// ============ RESIDENT: STATUS + CLOCK ============
const myStatus = ref(null)
const loadingStatus = ref(false)
const clockLoading = ref(false)
const noteInput = ref('')

async function fetchMyStatus() {
  if (!isResident.value) return
  loadingStatus.value = true
  try {
    myStatus.value = await checkLogService.getMe()
  } catch (err) {
    if (err?.response?.status !== 404) {
      showToast(extractError(err, 'Gagal memuat status'), 'error')
    }
    myStatus.value = null
  } finally {
    loadingStatus.value = false
  }
}

const lastType = computed(() => myStatus.value?.type || null)
const canClockIn = computed(() => !lastType.value || lastType.value === 'OUT')
const canClockOut = computed(() => lastType.value === 'IN')
// Satu tombol yang mengikuti status, bukan dua tombol dengan satu disabled.
const nextAction = computed(() => (canClockOut.value ? 'OUT' : 'IN'))
const statusText = computed(() => {
  if (loadingStatus.value) return 'Memuat status...'
  if (lastType.value === 'IN') return 'Sedang Tap In'
  if (lastType.value === 'OUT') return 'Sudah Tap Out'
  return 'Belum pernah absen'
})

async function doClock(action) {
  clockLoading.value = true
  try {
    const result =
      action === 'IN'
        ? await checkLogService.clockIn(noteInput.value || undefined)
        : await checkLogService.clockOut(noteInput.value || undefined)

    // ====== OPTIMISTIC UPDATE ======
    // Pakai respons langsung supaya UI langsung ter-update, tidak perlu reload.
    if (result) {
      myStatus.value = result
      // Tambahkan ke paling atas riwayat (kalau field id unik, hindari duplikasi saat refetch).
      const existingIdx = myHistory.value.findIndex((r) => r.id === result.id)
      if (existingIdx === -1) {
        myHistory.value = [result, ...myHistory.value]
      } else {
        myHistory.value.splice(existingIdx, 1, result)
      }
    }

    showToast(action === 'IN' ? 'Berhasil Tap In' : 'Berhasil Tap Out')
    noteInput.value = ''

    // Sinkronisasi ulang di background untuk konsistensi (tanpa await, biar UI responsif).
    fetchMyStatus()
    fetchMyHistory()
  } catch (err) {
    showToast(extractError(err, 'Gagal memproses absensi'), 'error')
  } finally {
    clockLoading.value = false
  }
}

// ============ RESIDENT: HISTORY ============
const myHistory = ref([])
const myHistoryMeta = ref(null)
const myHistoryPage = ref(1)
const myHistoryLimit = ref(4)
const myHistoryFrom = ref('')
const myHistoryTo = ref('')
const loadingMyHistory = ref(false)

async function fetchMyHistory() {
  if (!isResident.value) return
  loadingMyHistory.value = true
  try {
    const { data, meta } = await checkLogService.getMyHistory({
      page: myHistoryPage.value,
      limit: myHistoryLimit.value,
      from: myHistoryFrom.value || undefined,
      to: myHistoryTo.value || undefined
    })
    myHistory.value = Array.isArray(data) ? data : []
    myHistoryMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat riwayat'), 'error')
  } finally {
    loadingMyHistory.value = false
  }
}

const myHistoryTotalPages = computed(() => {
  if (!myHistoryMeta.value) return 1
  return (
    myHistoryMeta.value.totalPages ||
    myHistoryMeta.value.total_pages ||
    Math.max(1, Math.ceil((myHistoryMeta.value.total || 0) / myHistoryLimit.value))
  )
})

watch(myHistoryPage, fetchMyHistory)

function applyMyFilter() {
  myHistoryPage.value = 1
  fetchMyHistory()
}

// ============ ADMIN: LATEST ============
const adminTab = ref('latest')
const latestList = ref([])
const latestMeta = ref(null)
const latestPage = ref(1)
const latestLimit = ref(4)
const latestType = ref('')
const loadingLatest = ref(false)

async function fetchLatest() {
  if (!isAdmin.value) return
  loadingLatest.value = true
  try {
    const { data, meta } = await checkLogService.listLatest({
      page: latestPage.value,
      limit: latestLimit.value,
      type: latestType.value || undefined
    })
    latestList.value = Array.isArray(data) ? data : []
    latestMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat data'), 'error')
  } finally {
    loadingLatest.value = false
  }
}

const latestTotalPages = computed(() => {
  if (!latestMeta.value) return 1
  return (
    latestMeta.value.totalPages ||
    latestMeta.value.total_pages ||
    Math.max(1, Math.ceil((latestMeta.value.total || 0) / latestLimit.value))
  )
})

watch(latestPage, fetchLatest)
watch(latestType, () => {
  latestPage.value = 1
  fetchLatest()
})

// ============ ADMIN: USER HISTORY ============
const users = ref([])
const selectedUserId = ref('')
const userHistory = ref([])
const userHistoryMeta = ref(null)
const userHistoryPage = ref(1)
const userHistoryLimit = ref(4)
const userHistoryFrom = ref('')
const userHistoryTo = ref('')
const loadingUserHistory = ref(false)

async function fetchUsers() {
  if (!isAdmin.value) return
  try {
    const { data } = await userService.list({ page: 1, limit: 100 })
    users.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Gagal memuat daftar user:', extractError(err))
  }
}

async function fetchUserHistory() {
  if (!isAdmin.value || !selectedUserId.value) return
  loadingUserHistory.value = true
  try {
    const { data, meta } = await checkLogService.getUserHistory(selectedUserId.value, {
      page: userHistoryPage.value,
      limit: userHistoryLimit.value,
      from: userHistoryFrom.value || undefined,
      to: userHistoryTo.value || undefined
    })
    userHistory.value = Array.isArray(data) ? data : []
    userHistoryMeta.value = meta
  } catch (err) {
    showToast(extractError(err, 'Gagal memuat riwayat user'), 'error')
  } finally {
    loadingUserHistory.value = false
  }
}

const userHistoryTotalPages = computed(() => {
  if (!userHistoryMeta.value) return 1
  return (
    userHistoryMeta.value.totalPages ||
    userHistoryMeta.value.total_pages ||
    Math.max(1, Math.ceil((userHistoryMeta.value.total || 0) / userHistoryLimit.value))
  )
})

watch(selectedUserId, () => {
  userHistoryPage.value = 1
  fetchUserHistory()
})
watch(userHistoryPage, fetchUserHistory)

function applyUserFilter() {
  userHistoryPage.value = 1
  fetchUserHistory()
}

// ============ ADMIN: MANUAL ENTRY ============
const showManualModal = ref(false)
const manualForm = ref({ userId: '', type: 'IN', time: '', note: '' })
const manualError = ref('')
const savingManual = ref(false)

function openManual() {
  manualForm.value = {
    userId: '',
    type: 'IN',
    // time: nowJakartaDatetimeInput(),
    eventTime :nowJakartaDatetimeInput(),
    note: ''
  }
  manualError.value = ''
  showManualModal.value = true
}

async function submitManual() {
  manualError.value = ''
  if (!manualForm.value.userId) {
    manualError.value = 'Pilih user'
    return
  }
  if (!manualForm.value.eventTime) {
    manualError.value = 'Waktu wajib diisi'
    return
  }
  savingManual.value = true
  try {
    const result = await checkLogService.createManual({
      userId: manualForm.value.userId,
      type: manualForm.value.type,
      // Input datetime-local di-interpretasikan sebagai WIB, dikonversi ke UTC ISO.
      // time: jakartaInputToISO(manualForm.value.time),
      eventTime: jakartaInputToISO(manualForm.value.eventTime),
      note: manualForm.value.note || undefined
    })

    // ====== OPTIMISTIC UPDATE ======
    // Kalau sedang di tab history user yg sama, langsung prepend ke tabel.
    if (
      result &&
      adminTab.value === 'history' &&
      String(selectedUserId.value) === String(manualForm.value.userId)
    ) {
      const idx = userHistory.value.findIndex((r) => r.id === result.id)
      if (idx === -1) userHistory.value = [result, ...userHistory.value]
      else userHistory.value.splice(idx, 1, result)
    }

    // Kalau di tab "Status Terkini", update/insert entri user tsb secara optimistik.
    if (result && adminTab.value === 'latest') {
      const idx = latestList.value.findIndex(
        (r) => String(r.userId || r.user?.id) === String(manualForm.value.userId)
      )
      if (idx >= 0) latestList.value.splice(idx, 1, { ...latestList.value[idx], ...result })
      else latestList.value = [result, ...latestList.value]
    }

    showToast('Absensi manual tersimpan')
    showManualModal.value = false

    // Background sync
    if (adminTab.value === 'latest') fetchLatest()
    if (adminTab.value === 'history' && selectedUserId.value === manualForm.value.userId) {
      fetchUserHistory()
    }
  } catch (err) {
    manualError.value = extractError(err, 'Gagal menyimpan')
  } finally {
    savingManual.value = false
  }
}

function userNameFromEntry(entry) {
  return (
    entry?.user?.name ||
    entry?.userName ||
    entry?.name ||
    users.value.find((u) => String(u.id) === String(entry?.userId))?.name ||
    entry?.userId ||
    '-'
  )
}

function typeChipClass(t) {
  return t === 'IN' ? 'chip-brand' : t === 'OUT' ? 'chip-amber' : 'chip-gray'
}

function typeLabel(t) {
  return t === 'IN' ? 'Tap In' : t === 'OUT' ? 'Tap Out' : '-'
}

// ============ MOUNT ============
onMounted(async () => {
  if (isResident.value) {
    await Promise.all([fetchMyStatus(), fetchMyHistory()])
  }
  if (isAdmin.value) {
    await Promise.all([fetchLatest(), fetchUsers()])
  }
})
</script>

<template>
  <div class="space-y-4">
    <AppToast :toast="toast" />

    <!-- ================= RESIDENT ================= -->
    <template v-if="isResident">
      <section class="card p-4 md:p-5" aria-labelledby="clock-status">
        <div class="flex items-center gap-4">
          <span
            class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            :class="lastType === 'IN' ? 'chip-brand' : lastType === 'OUT' ? 'chip-amber' : 'chip-gray'"
          >
            <LogIn v-if="lastType === 'IN'" class="w-6 h-6" aria-hidden="true" />
            <LogOut v-else-if="lastType === 'OUT'" class="w-6 h-6" aria-hidden="true" />
            <Clock v-else class="w-6 h-6" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="text-xs font-medium text-ink-muted">{{ tanggalLengkap }}</p>
            <p id="clock-status" class="text-base font-semibold text-ink" aria-live="polite">{{ statusText }}</p>
            <p v-if="myStatus?.time" class="text-xs text-ink-muted">Terakhir: {{ formatDate(myStatus.time) }}</p>
          </div>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label for="clock-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
            <input
              id="clock-note"
              v-model="noteInput"
              type="text"
              maxlength="200"
              autocomplete="off"
              placeholder="Contoh: pulang ke rumah orang tua"
              class="field"
            />
          </div>
          <button
            type="button"
            class="btn btn-primary w-full sm:w-auto sm:min-w-[140px]"
            :disabled="clockLoading || loadingStatus || (!canClockIn && !canClockOut)"
            :aria-busy="clockLoading"
            @click="doClock(nextAction)"
          >
            <LogOut v-if="nextAction === 'OUT'" class="w-4 h-4" aria-hidden="true" />
            <LogIn v-else class="w-4 h-4" aria-hidden="true" />
            {{ clockLoading ? 'Memproses...' : nextAction === 'OUT' ? 'Tap Out' : 'Tap In' }}
          </button>
        </div>
      </section>

      <section class="card overflow-hidden" aria-labelledby="my-history-title">
        <div class="p-4 border-b border-gray-200 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
          <h2 id="my-history-title" class="col-span-2 sm:col-span-1 sm:self-center font-semibold text-ink">Riwayat Absensi</h2>
          <div>
            <label for="my-from" class="field-label text-xs">Dari tanggal</label>
            <input id="my-from" v-model="myHistoryFrom" type="date" class="field" />
          </div>
          <div>
            <label for="my-to" class="field-label text-xs">Sampai tanggal</label>
            <input id="my-to" v-model="myHistoryTo" type="date" class="field" />
          </div>
          <button type="button" class="btn btn-secondary col-span-2 sm:col-span-1" @click="applyMyFilter">Terapkan</button>
        </div>

        <div v-if="loadingMyHistory" class="empty-state" aria-busy="true">Memuat...</div>
        <div v-else-if="!myHistory.length" class="empty-state">Belum ada riwayat.</div>
        <template v-else>
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs text-ink-muted">
                <tr>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Waktu</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Tipe</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="row in myHistory" :key="row.id" class="hover:bg-gray-50">
                  <td class="px-4 py-2 text-ink whitespace-nowrap tabular-nums">{{ formatDate(row.time) }}</td>
                  <td class="px-4 py-2"><span class="chip" :class="typeChipClass(row.type)">{{ typeLabel(row.type) }}</span></td>
                  <td class="px-4 py-2 text-ink-muted">{{ row.note || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="md:hidden divide-y divide-gray-200">
            <li v-for="row in myHistory" :key="row.id" class="p-4">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-ink tabular-nums">{{ formatDate(row.time) }}</span>
                <span class="chip" :class="typeChipClass(row.type)">{{ typeLabel(row.type) }}</span>
              </div>
              <p v-if="row.note" class="mt-1.5 flex items-start gap-1.5 text-sm text-ink-muted">
                <StickyNote class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span class="line-clamp-2">{{ row.note }}</span>
              </p>
            </li>
          </ul>
          <PaginationBar v-model:page="myHistoryPage" :total-pages="myHistoryTotalPages" />
        </template>
      </section>
    </template>

    <!-- ================= ADMIN ================= -->
    <template v-if="isAdmin">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="tabs grid grid-cols-2 w-full sm:w-auto sm:inline-flex" role="tablist" aria-label="Tampilan absensi">
          <button type="button" role="tab" class="tab" :aria-selected="adminTab === 'latest'" @click="adminTab = 'latest'">
            Status Terkini
          </button>
          <button type="button" role="tab" class="tab" :aria-selected="adminTab === 'history'" @click="adminTab = 'history'">
            Riwayat per User
          </button>
        </div>
        <button type="button" class="btn btn-primary" @click="openManual">
          <Plus class="w-4 h-4" aria-hidden="true" />
          Absensi Manual
        </button>
      </div>

      <!-- TAB: STATUS TERKINI -->
      <section v-if="adminTab === 'latest'" class="card overflow-hidden" aria-label="Status terkini">
        <div class="p-4 border-b border-gray-200 sm:flex sm:items-end sm:gap-3">
          <div class="sm:w-48">
            <label for="latest-type" class="field-label text-xs">Tipe</label>
            <select id="latest-type" v-model="latestType" class="field">
              <option value="">Semua</option>
              <option value="IN">Tap In</option>
              <option value="OUT">Tap Out</option>
            </select>
          </div>
        </div>

        <div v-if="loadingLatest" class="empty-state" aria-busy="true">Memuat...</div>
        <div v-else-if="!latestList.length" class="empty-state">Tidak ada data.</div>
        <template v-else>
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs text-ink-muted">
                <tr>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Nama</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Status</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Waktu</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="row in latestList" :key="row.id || row.userId" class="hover:bg-gray-50">
                  <td class="px-4 py-2 font-medium text-ink whitespace-nowrap">{{ userNameFromEntry(row) }}</td>
                  <td class="px-4 py-2"><span class="chip" :class="typeChipClass(row.type)">{{ typeLabel(row.type) }}</span></td>
                  <td class="px-4 py-2 text-ink-muted whitespace-nowrap tabular-nums">{{ formatDate(row.time) }}</td>
                  <td class="px-4 py-2 text-ink-muted">{{ row.note || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="md:hidden divide-y divide-gray-200">
            <li v-for="row in latestList" :key="row.id || row.userId" class="p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-ink truncate">{{ userNameFromEntry(row) }}</p>
                  <p class="text-sm text-ink-muted tabular-nums">{{ formatDate(row.time) }}</p>
                </div>
                <span class="chip" :class="typeChipClass(row.type)">{{ typeLabel(row.type) }}</span>
              </div>
              <p v-if="row.note" class="mt-1.5 flex items-start gap-1.5 text-sm text-ink-muted">
                <StickyNote class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span class="line-clamp-2">{{ row.note }}</span>
              </p>
            </li>
          </ul>
          <PaginationBar v-model:page="latestPage" :total-pages="latestTotalPages" />
        </template>
      </section>

      <!-- TAB: RIWAYAT PER USER -->
      <section v-if="adminTab === 'history'" class="card overflow-hidden" aria-label="Riwayat per user">
        <div class="p-4 border-b border-gray-200 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] items-end">
          <div class="col-span-2 sm:col-span-1">
            <label for="history-user" class="field-label text-xs">User</label>
            <select id="history-user" v-model="selectedUserId" class="field">
              <option value="">Pilih user</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>
          <div>
            <label for="history-from" class="field-label text-xs">Dari tanggal</label>
            <input id="history-from" v-model="userHistoryFrom" type="date" class="field" />
          </div>
          <div>
            <label for="history-to" class="field-label text-xs">Sampai tanggal</label>
            <input id="history-to" v-model="userHistoryTo" type="date" class="field" />
          </div>
          <button
            type="button"
            class="btn btn-secondary col-span-2 sm:col-span-1"
            :disabled="!selectedUserId"
            @click="applyUserFilter"
          >Terapkan</button>
        </div>

        <div v-if="!selectedUserId" class="empty-state">Pilih user untuk melihat riwayat.</div>
        <div v-else-if="loadingUserHistory" class="empty-state" aria-busy="true">Memuat...</div>
        <div v-else-if="!userHistory.length" class="empty-state">Tidak ada riwayat pada periode ini.</div>
        <template v-else>
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-xs text-ink-muted">
                <tr>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Waktu</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Tipe</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Catatan</th>
                  <th scope="col" class="text-left font-medium px-4 py-2.5">Diproses oleh</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="row in userHistory" :key="row.id" class="hover:bg-gray-50">
                  <td class="px-4 py-2 text-ink whitespace-nowrap tabular-nums">{{ formatDate(row.time) }}</td>
                  <td class="px-4 py-2"><span class="chip" :class="typeChipClass(row.type)">{{ typeLabel(row.type) }}</span></td>
                  <td class="px-4 py-2 text-ink-muted">{{ row.note || '-' }}</td>
                  <td class="px-4 py-2 text-ink-muted">{{ row.processor?.name || row.processedBy?.name || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="md:hidden divide-y divide-gray-200">
            <li v-for="row in userHistory" :key="row.id" class="p-4">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-ink tabular-nums">{{ formatDate(row.time) }}</span>
                <span class="chip" :class="typeChipClass(row.type)">{{ typeLabel(row.type) }}</span>
              </div>
              <p v-if="row.note" class="mt-1.5 flex items-start gap-1.5 text-sm text-ink-muted">
                <StickyNote class="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span class="line-clamp-2">{{ row.note }}</span>
              </p>
              <p class="mt-1 text-xs text-ink-muted">Diproses oleh: {{ row.processor?.name || row.processedBy?.name || '-' }}</p>
            </li>
          </ul>
          <PaginationBar v-model:page="userHistoryPage" :total-pages="userHistoryTotalPages" />
        </template>
      </section>

      <!-- Modal: Absensi Manual -->
      <BaseModal v-model:open="showManualModal" title="Absensi Manual">
        <form id="manual-form" class="space-y-4" @submit.prevent="submitManual">
          <p v-if="manualError" class="form-error" role="alert">{{ manualError }}</p>
          <div>
            <label for="manual-user" class="field-label">User</label>
            <select id="manual-user" v-model="manualForm.userId" required class="field">
              <option value="" disabled>Pilih user</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>
          <div>
            <span id="manual-type-label" class="field-label">Tipe</span>
            <div class="tabs grid grid-cols-2 w-full" role="group" aria-labelledby="manual-type-label">
              <button type="button" class="tab" :aria-pressed="manualForm.type === 'IN'" @click="manualForm.type = 'IN'">
                Tap In
              </button>
              <button type="button" class="tab" :aria-pressed="manualForm.type === 'OUT'" @click="manualForm.type = 'OUT'">
                Tap Out
              </button>
            </div>
          </div>
          <div>
            <label for="manual-time" class="field-label">Waktu</label>
            <input id="manual-time" v-model="manualForm.eventTime" type="datetime-local" required class="field" />
          </div>
          <div>
            <label for="manual-note" class="field-label">Catatan <span class="font-normal text-ink-muted">(opsional)</span></label>
            <textarea id="manual-note" v-model="manualForm.note" rows="2" class="field"></textarea>
          </div>
        </form>
        <template #footer>
          <button type="button" class="btn btn-secondary flex-1" @click="showManualModal = false">Batal</button>
          <button type="submit" form="manual-form" class="btn btn-primary flex-1" :disabled="savingManual">
            {{ savingManual ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </template>
      </BaseModal>
    </template>

    <!-- Fallback -->
    <div v-if="!isAdmin && !isResident" class="card p-6 text-center text-sm text-ink-muted">
      Halaman absensi hanya tersedia untuk role Resident atau Admin.
    </div>
  </div>
</template>
