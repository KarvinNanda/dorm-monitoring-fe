<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { dashboardService } from '@/services/dashboardService'
import { formatDate, formatDateLong } from '@/utils/dateFormat'
import {
  CalendarCheck,
  CircleAlert,
  DoorClosed,
  DoorOpen,
  LogIn,
  LogOut,
  RefreshCw,
  StickyNote
} from 'lucide-vue-next'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const userRoles = computed(() => authStore.roles)

// Role flag — DashboardResponse adaptif per role:
//   admin → currentClock + guestVisit + activeReservation
//   receptionist → guestVisit + activeReservation
//   resident → clockStatus
const isAdmin = computed(() => authStore.hasRole('admin'))
const isReceptionist = computed(() => authStore.hasRole('receptionist'))
const isResident = computed(() => authStore.hasRole('resident'))

// "Hari ini" dihitung di zona WIB.
const tanggalHariIni = formatDateLong()

// ============ FETCH /dashboard ============
const data = ref(null)
const loading = ref(false)
const errorMessage = ref('')

async function fetchDashboard() {
  loading.value = true
  errorMessage.value = ''
  try {
    data.value = await dashboardService.get()
  } catch (err) {
    // 404 = user belum punya data terkait (mis. resident belum pernah absen).
    // Bukan error sungguhan — perlakukan sebagai payload kosong supaya panel
    // resident tetap merender "Belum pernah absen" + Info Akun ikut tampil.
    if (err?.response?.status === 404) {
      data.value = isResident.value ? { clockStatus: null } : {}
    } else {
      errorMessage.value =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Gagal memuat ringkasan dashboard'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)

// ============ COMPUTED PER FEATURE ============

// currentClock (admin) → cari count per type
function clockCountByType(type) {
  const arr = data.value?.currentClock
  if (!Array.isArray(arr)) return 0
  const row = arr.find((r) => String(r.type).toUpperCase() === type)
  return row?.count ?? 0
}
const inCount = computed(() => clockCountByType('IN'))
const outCount = computed(() => clockCountByType('OUT'))

// clockStatus (resident) → bisa null
const clockStatus = computed(() => data.value?.clockStatus || null)

// guestVisit (admin/receptionist)
function visitCountByStatus(status) {
  const arr = data.value?.guestVisit
  if (!Array.isArray(arr)) return 0
  const row = arr.find((r) => String(r.status).toUpperCase() === status)
  return row?.count ?? 0
}
const openVisits = computed(() => visitCountByStatus('OPEN'))
const closedVisits = computed(() => visitCountByStatus('CLOSE'))

// activeReservation (admin/receptionist)
const activeReservation = computed(() => data.value?.activeReservation ?? 0)

// Role visibility flags untuk panel masing-masing
const showCurrentClock = computed(
  () => isAdmin.value && Array.isArray(data.value?.currentClock)
)
const showClockStatus = computed(
  () => isResident.value && data.value && 'clockStatus' in data.value
)
const showGuestVisit = computed(
  () => (isAdmin.value || isReceptionist.value) && Array.isArray(data.value?.guestVisit)
)
const showActiveReservation = computed(
  () =>
    (isAdmin.value || isReceptionist.value) &&
    data.value &&
    'activeReservation' in data.value
)

const hasAnyPanel = computed(
  () =>
    showCurrentClock.value ||
    showClockStatus.value ||
    showGuestVisit.value ||
    showActiveReservation.value
)

// Kartu statistik ringkas — urutan tampil mengikuti urutan array.
const tones = {
  brand: 'bg-brand-50 text-brand-700',
  amber: 'bg-amber-50 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  sky: 'bg-sky-50 text-sky-700'
}
const statTiles = computed(() => {
  const tiles = []
  if (showCurrentClock.value) {
    tiles.push({ key: 'in', label: 'Sedang Tap In', value: inCount.value, hint: 'Ada di lokasi', icon: LogIn, tone: tones.brand })
    tiles.push({ key: 'out', label: 'Sudah Tap Out', value: outCount.value, hint: 'Di luar lokasi', icon: LogOut, tone: tones.amber })
  }
  if (showGuestVisit.value) {
    tiles.push({ key: 'open', label: 'Tamu Aktif', value: openVisits.value, hint: 'Belum ditutup', icon: DoorOpen, tone: tones.brand })
    tiles.push({ key: 'closed', label: 'Tamu Selesai', value: closedVisits.value, hint: 'Kunjungan selesai', icon: DoorClosed, tone: tones.gray })
  }
  if (showActiveReservation.value) {
    tiles.push({ key: 'reservation', label: 'Reservasi Aktif', value: activeReservation.value, hint: 'Fasilitas dipakai', icon: CalendarCheck, tone: tones.sky })
  }
  return tiles
})
</script>

<template>
  <div class="space-y-4 md:space-y-6">
    <div>
      <h2 class="text-lg md:text-xl font-semibold text-ink">Selamat datang, {{ user?.name || 'Pengguna' }}</h2>
      <p class="text-sm text-ink-muted">{{ tanggalHariIni }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" aria-busy="true">
      <span class="sr-only">Memuat ringkasan...</span>
      <div v-for="i in 4" :key="i" class="card h-[104px] animate-pulse bg-brand-50/50"></div>
    </div>

    <!-- Error -->
    <div
      v-else-if="errorMessage"
      role="alert"
      class="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm"
    >
      <CircleAlert class="w-5 h-5 shrink-0" aria-hidden="true" />
      <span class="flex-1">{{ errorMessage }}</span>
      <button
        @click="fetchDashboard"
        class="flex items-center gap-1.5 h-9 px-3 -my-1 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-medium shrink-0 hover:bg-red-100"
      >
        <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" />
        Coba lagi
      </button>
    </div>

    <!-- Konten -->
    <template v-else>
      <div class="space-y-3 fade-in">
        <!-- RESIDENT: status absen sendiri -->
        <div v-if="showClockStatus" class="card p-4 flex items-center gap-4">
          <span
            class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            :class="clockStatus?.type === 'IN' ? tones.brand : tones.amber"
          >
            <LogIn v-if="clockStatus?.type === 'IN'" class="w-6 h-6" aria-hidden="true" />
            <LogOut v-else class="w-6 h-6" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-ink-muted">Status Absen</p>
            <p class="text-base font-semibold text-ink">
              <span v-if="!clockStatus">Belum pernah absen</span>
              <span v-else-if="clockStatus.type === 'IN'">Sedang Tap In</span>
              <span v-else>Sudah Tap Out</span>
            </p>
            <p v-if="clockStatus?.time" class="text-xs text-ink-muted">Terakhir: {{ formatDate(clockStatus.time) }}</p>
            <p v-if="clockStatus?.note" class="flex items-start gap-1 text-xs text-ink-muted mt-1 line-clamp-2">
              <StickyNote class="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
              <span>{{ clockStatus.note }}</span>
            </p>
          </div>
        </div>

        <!-- ADMIN / RECEPTIONIST: angka ringkas -->
        <div v-if="statTiles.length" class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div
            v-for="(tile, idx) in statTiles"
            :key="tile.key"
            class="card p-4"
            :class="{ 'col-span-2 lg:col-span-1': statTiles.length % 2 === 1 && idx === statTiles.length - 1 }"
          >
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-xs font-medium text-ink-muted leading-snug">{{ tile.label }}</h3>
              <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="tile.tone">
                <component :is="tile.icon" class="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <p class="mt-2 text-2xl md:text-3xl font-semibold text-ink tabular-nums">{{ tile.value }}</p>
            <p class="text-xs text-ink-muted mt-0.5 truncate">{{ tile.hint }}</p>
          </div>
        </div>

        <!-- Empty state — backend tidak mengirim feature apapun untuk role user ini -->
        <div v-if="!hasAnyPanel" class="card p-6 text-center text-ink-muted text-sm">
          Belum ada ringkasan untuk role Anda.
        </div>

        <!-- Info Akun -->
        <section class="card p-4">
          <h3 class="text-xs font-medium text-ink-muted mb-2">Info Akun</h3>
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold shrink-0">
              {{ user?.name?.charAt(0).toUpperCase() || 'U' }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink truncate">{{ user?.name }}</p>
              <p class="text-xs text-ink-muted truncate">{{ user?.email }}</p>
            </div>
            <div class="flex flex-wrap justify-end gap-1">
              <span
                v-for="r in userRoles"
                :key="r"
                class="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full capitalize font-medium"
              >{{ r }}</span>
              <span v-if="!userRoles.length" class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">tanpa role</span>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fade-in {
  animation: fadeIn 180ms ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
}
</style>
