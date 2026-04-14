<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
const myHistoryLimit = ref(5)
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
const latestLimit = ref(5)
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
const userHistoryLimit = ref(5)
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
    time: nowJakartaDatetimeInput(),
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
  if (!manualForm.value.time) {
    manualError.value = 'Waktu wajib diisi'
    return
  }
  savingManual.value = true
  try {
    const result = await checkLogService.createManual({
      userId: manualForm.value.userId,
      type: manualForm.value.type,
      // Input datetime-local di-interpretasikan sebagai WIB, dikonversi ke UTC ISO.
      time: jakartaInputToISO(manualForm.value.time),
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

function typeBadgeClass(t) {
  return t === 'IN'
    ? 'bg-green-100 text-green-700'
    : t === 'OUT'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600'
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

    <h1 class="text-xl font-bold text-gray-800 mb-3 fade-up">Absensi 🍃</h1>

    <!-- ================= RESIDENT SECTION ================= -->
    <div v-if="isResident" class="space-y-3">
      <!-- Status Card (compact, 2-column) -->
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 fade-up card-lift"
        style="animation-delay: 80ms"
      >
        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
          <!-- Left: status info -->
          <div class="flex items-center gap-3 flex-wrap">
            <div>
              <p class="text-[11px] text-gray-400 uppercase tracking-wide">Hari ini</p>
              <p class="text-sm font-semibold text-gray-800">{{ tanggalLengkap }}</p>
            </div>
            <span class="hidden md:inline text-gray-300">|</span>
            <div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-600': !lastType,
                  'bg-green-100 text-green-700': lastType === 'IN',
                  'bg-amber-100 text-amber-700': lastType === 'OUT'
                }"
              >
                <span v-if="loadingStatus">Memuat...</span>
                <span v-else-if="!lastType">Belum pernah absen</span>
                <span v-else-if="lastType === 'IN'">🟢 Sedang Tap In</span>
                <span v-else>🟡 Sudah Tap Out</span>
              </span>
              <span v-if="myStatus?.time" class="block text-[11px] text-gray-400 mt-0.5">
                Terakhir: {{ formatDate(myStatus.time) }}
              </span>
            </div>
          </div>

          <!-- Right: controls -->
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              v-model="noteInput"
              type="text"
              maxlength="200"
              placeholder="Catatan (opsional)"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary w-full sm:w-56"
            />
            <div class="flex gap-2">
              <button
                @click="doClock('IN')"
                :disabled="clockLoading || !canClockIn"
                class="flex-1 sm:flex-none bg-primary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ clockLoading ? '...' : 'Tap In' }}
              </button>
              <button
                @click="doClock('OUT')"
                :disabled="clockLoading || !canClockOut"
                class="flex-1 sm:flex-none bg-secondary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ clockLoading ? '...' : 'Tap Out' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-up" style="animation-delay: 140ms">
        <!-- Mobile: judul full-width di atas, lalu input grid 2 kolom + tombol full-width.
             Desktop (sm+): kembali ke layout flex inline. -->
        <div class="px-4 py-2.5 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
          <h2 class="col-span-2 font-semibold text-gray-800 text-sm sm:mr-auto sm:col-auto">Riwayat Absensi</h2>
          <input v-model="myHistoryFrom" type="date" title="Dari" class="w-full sm:w-auto px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
          <input v-model="myHistoryTo" type="date" title="Sampai" class="w-full sm:w-auto px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
          <button @click="applyMyFilter" class="col-span-2 sm:col-auto w-full sm:w-auto px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-green-700">
            Filter
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Waktu</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Tipe</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="loadingMyHistory">
                <td colspan="3" class="px-4 py-6 text-center text-gray-400 text-sm">Memuat...</td>
              </tr>
              <tr v-else-if="!myHistory.length">
                <td colspan="3" class="px-4 py-6 text-center text-gray-400 text-sm">Belum ada riwayat.</td>
              </tr>
              <tr v-else v-for="row in myHistory" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-1.5 text-gray-700 whitespace-nowrap">{{ formatDate(row.time) }}</td>
                <td class="px-4 py-1.5 whitespace-nowrap">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="typeBadgeClass(row.type)">
                    {{ row.type }}
                  </span>
                </td>
                <td class="px-4 py-1.5 text-gray-500">{{ row.note || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loadingMyHistory && myHistory.length"
          class="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-500"
        >
          <div>Hal {{ myHistoryPage }} / {{ myHistoryTotalPages }}</div>
          <div class="flex gap-1">
            <button :disabled="myHistoryPage <= 1" @click="myHistoryPage--" class="px-2 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹</button>
            <button :disabled="myHistoryPage >= myHistoryTotalPages" @click="myHistoryPage++" class="px-2 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= ADMIN SECTION ================= -->
    <div v-if="isAdmin" class="fade-up" style="animation-delay: 100ms">
      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-3">
        <nav class="flex gap-4 flex-wrap items-center">
          <button
            @click="adminTab = 'latest'"
            class="py-2 text-sm font-medium border-b-2 transition-colors"
            :class="adminTab === 'latest' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Status Terkini
          </button>
          <button
            @click="adminTab = 'history'"
            class="py-2 text-sm font-medium border-b-2 transition-colors"
            :class="adminTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Riwayat per User
          </button>
          <button
            @click="openManual"
            class="ml-auto my-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-green-700"
          >
            + Absensi Manual
          </button>
        </nav>
      </div>

      <!-- TAB: LATEST -->
      <div v-if="adminTab === 'latest'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-4 py-2.5 border-b border-gray-200 flex flex-wrap gap-2 items-center">
          <span class="text-xs text-gray-500 shrink-0">Filter Tipe:</span>
          <select
            v-model="latestType"
            class="flex-1 sm:flex-initial min-w-0 px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Semua</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Nama</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Waktu</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="loadingLatest">
                <td colspan="4" class="px-4 py-6 text-center text-gray-400 text-sm">Memuat...</td>
              </tr>
              <tr v-else-if="!latestList.length">
                <td colspan="4" class="px-4 py-6 text-center text-gray-400 text-sm">Tidak ada data.</td>
              </tr>
              <tr v-else v-for="row in latestList" :key="row.id || row.userId" class="hover:bg-gray-50">
                <td class="px-4 py-1.5 text-gray-800 font-medium whitespace-nowrap">{{ userNameFromEntry(row) }}</td>
                <td class="px-4 py-1.5 whitespace-nowrap">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="typeBadgeClass(row.type)">
                    {{ row.type || '—' }}
                  </span>
                </td>
                <td class="px-4 py-1.5 text-gray-500 whitespace-nowrap">{{ formatDate(row.time) }}</td>
                <td class="px-4 py-1.5 text-gray-500">{{ row.note || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loadingLatest && latestList.length"
          class="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-500"
        >
          <div>Hal {{ latestPage }} / {{ latestTotalPages }}</div>
          <div class="flex gap-1">
            <button :disabled="latestPage <= 1" @click="latestPage--" class="px-2 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹</button>
            <button :disabled="latestPage >= latestTotalPages" @click="latestPage++" class="px-2 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        </div>
      </div>

      <!-- TAB: HISTORY PER USER -->
      <div v-if="adminTab === 'history'" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-4 py-2.5 border-b border-gray-200 grid grid-cols-2 gap-2 items-center sm:flex sm:flex-wrap">
          <select
            v-model="selectedUserId"
            class="col-span-2 sm:col-auto w-full sm:w-auto px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary sm:min-w-[180px]"
          >
            <option value="">Pilih user</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <input v-model="userHistoryFrom" type="date" title="Dari" class="w-full sm:w-auto px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
          <input v-model="userHistoryTo" type="date" title="Sampai" class="w-full sm:w-auto px-2 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
          <button
            @click="applyUserFilter"
            :disabled="!selectedUserId"
            class="col-span-2 sm:col-auto w-full sm:w-auto px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Filter
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Waktu</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Tipe</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Catatan</th>
                <th class="text-left px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Diproses</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="!selectedUserId">
                <td colspan="4" class="px-4 py-6 text-center text-gray-400 text-sm">Pilih user untuk melihat riwayat.</td>
              </tr>
              <tr v-else-if="loadingUserHistory">
                <td colspan="4" class="px-4 py-6 text-center text-gray-400 text-sm">Memuat...</td>
              </tr>
              <tr v-else-if="!userHistory.length">
                <td colspan="4" class="px-4 py-6 text-center text-gray-400 text-sm">Tidak ada riwayat pada periode ini.</td>
              </tr>
              <tr v-else v-for="row in userHistory" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-1.5 text-gray-700 whitespace-nowrap">{{ formatDate(row.time) }}</td>
                <td class="px-4 py-1.5 whitespace-nowrap">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="typeBadgeClass(row.type)">
                    {{ row.type }}
                  </span>
                </td>
                <td class="px-4 py-1.5 text-gray-500">{{ row.note || '-' }}</td>
                <td class="px-4 py-1.5 text-gray-500">{{ row.processor?.name || row.processedBy?.name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="selectedUserId && !loadingUserHistory && userHistory.length"
          class="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-500"
        >
          <div>Hal {{ userHistoryPage }} / {{ userHistoryTotalPages }}</div>
          <div class="flex gap-1">
            <button :disabled="userHistoryPage <= 1" @click="userHistoryPage--" class="px-2 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹</button>
            <button :disabled="userHistoryPage >= userHistoryTotalPages" @click="userHistoryPage++" class="px-2 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        </div>
      </div>

      <!-- Modal: Manual Entry -->
      <div
        v-if="showManualModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
        @click.self="showManualModal = false"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
          <h3 class="text-base font-bold text-gray-800 mb-3">Absensi Manual</h3>
          <form @submit.prevent="submitManual" class="space-y-3">
            <div v-if="manualError" class="bg-red-50 text-red-600 text-xs p-2 rounded-lg">{{ manualError }}</div>

            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">User</label>
              <select
                v-model="manualForm.userId"
                required
                class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="" disabled>Pilih user</option>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipe</label>
                <div class="flex gap-1">
                  <button
                    type="button"
                    @click="manualForm.type = 'IN'"
                    class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    :class="manualForm.type === 'IN' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                  >
                    IN
                  </button>
                  <button
                    type="button"
                    @click="manualForm.type = 'OUT'"
                    class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    :class="manualForm.type === 'OUT' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                  >
                    OUT
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Waktu</label>
                <input
                  v-model="manualForm.time"
                  type="datetime-local"
                  required
                  class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <textarea
                v-model="manualForm.note"
                rows="2"
                class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              ></textarea>
            </div>

            <div class="flex gap-2 pt-1">
              <button
                type="button"
                @click="showManualModal = false"
                class="flex-1 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="savingManual"
                class="flex-1 bg-primary text-white py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {{ savingManual ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Fallback -->
    <div v-if="!isAdmin && !isResident" class="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
      Halaman absensi hanya tersedia untuk role Resident atau Admin.
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

.card-lift {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.card-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px -8px rgba(46, 125, 50, 0.2);
  border-color: #a5d6a7;
}

button {
  transition: all 0.2s ease;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
}

button:not(:disabled):active {
  transform: translateY(0);
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
</style>
