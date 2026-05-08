<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { dashboardService } from '@/services/dashboardService'
import { formatDate, formatDateLong } from '@/utils/dateFormat'

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
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-1 fade-up">
      Selamat datang, {{ user?.name || 'Pengguna' }}! 🌿
    </h1>
    <p class="text-gray-500 mb-8 fade-up" style="animation-delay: 80ms">{{ tanggalHariIni }}</p>

    <!-- Loading / Error -->
    <div v-if="loading" class="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm fade-up">
      Memuat ringkasan...
    </div>
    <div
      v-else-if="errorMessage"
      class="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm flex items-start justify-between gap-3 fade-up"
    >
      <span>{{ errorMessage }}</span>
      <button @click="fetchDashboard" class="text-red-700 underline text-xs shrink-0">Coba lagi</button>
    </div>

    <!-- Konten -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- ===== ADMIN: Current Clock (IN) ===== -->
        <div
          v-if="showCurrentClock"
          class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up"
          style="animation-delay: 150ms"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Sedang Tap In</h3>
            <span class="w-3 h-3 bg-green-400 rounded-full pulse-dot"></span>
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ inCount }}</p>
          <p class="text-sm text-gray-500 mt-1">User aktif di lokasi</p>
        </div>

        <!-- ===== ADMIN: Current Clock (OUT) ===== -->
        <div
          v-if="showCurrentClock"
          class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up"
          style="animation-delay: 200ms"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Sudah Tap Out</h3>
            <span class="w-3 h-3 bg-amber-400 rounded-full pulse-dot"></span>
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ outCount }}</p>
          <p class="text-sm text-gray-500 mt-1">User di luar lokasi</p>
        </div>

        <!-- ===== RESIDENT: Clock Status sendiri ===== -->
        <div
          v-if="showClockStatus"
          class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up"
          style="animation-delay: 250ms"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Status Absen</h3>
            <span
              class="w-3 h-3 rounded-full pulse-dot"
              :class="clockStatus?.type === 'IN' ? 'bg-green-400' : 'bg-amber-400'"
            ></span>
          </div>
          <p class="text-2xl font-bold text-gray-800">
            <span v-if="!clockStatus">Belum pernah absen</span>
            <span v-else-if="clockStatus.type === 'IN'">🟢 Sedang Tap In</span>
            <span v-else>🟡 Sudah Tap Out</span>
          </p>
          <p v-if="clockStatus?.time" class="text-sm text-gray-500 mt-1">
            Terakhir: {{ formatDate(clockStatus.time) }}
          </p>
          <p v-if="clockStatus?.note" class="text-xs text-gray-400 mt-1 italic line-clamp-2">📝 {{ clockStatus.note }}</p>
        </div>

        <!-- ===== ADMIN/RECEPTIONIST: Guest Visit (OPEN) ===== -->
        <div
          v-if="showGuestVisit"
          class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up"
          style="animation-delay: 300ms"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Tamu Aktif (Open)</h3>
            <span class="w-3 h-3 bg-secondary rounded-full pulse-dot"></span>
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ openVisits }}</p>
          <p class="text-sm text-gray-500 mt-1">Kunjungan belum ditutup</p>
        </div>

        <!-- ===== ADMIN/RECEPTIONIST: Guest Visit (CLOSED) ===== -->
        <div
          v-if="showGuestVisit"
          class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up"
          style="animation-delay: 350ms"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Tamu Selesai (Closed)</h3>
            <span class="w-3 h-3 bg-gray-400 rounded-full pulse-dot"></span>
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ closedVisits }}</p>
          <p class="text-sm text-gray-500 mt-1">Kunjungan sudah selesai</p>
        </div>

        <!-- ===== ADMIN/RECEPTIONIST: Active Reservation ===== -->
        <div
          v-if="showActiveReservation"
          class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up"
          style="animation-delay: 400ms"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Reservasi Aktif</h3>
            <span class="w-3 h-3 bg-blue-400 rounded-full pulse-dot"></span>
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ activeReservation }}</p>
          <p class="text-sm text-gray-500 mt-1">Reservasi fasilitas berjalan</p>
        </div>
      </div>

      <!-- Empty state — backend tidak mengirim feature apapun untuk role user ini -->
      <div
        v-if="!hasAnyPanel"
        class="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm fade-up"
      >
        Belum ada ringkasan untuk role Anda.
      </div>

      <!-- Info Akun -->
      <div class="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up" style="animation-delay: 450ms">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Info Akun</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p class="text-xs text-gray-400">Nama</p>
            <p class="text-sm font-medium text-gray-800">{{ user?.name }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Email</p>
            <p class="text-sm font-medium text-gray-800">{{ user?.email }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Peran</p>
            <div class="mt-0.5 flex flex-wrap gap-1">
              <span
                v-for="r in userRoles"
                :key="r"
                class="text-xs bg-green-100 text-primary px-2 py-0.5 rounded-full capitalize font-medium"
              >{{ r }}</span>
              <span
                v-if="!userRoles.length"
                class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
              >tanpa role</span>
            </div>
          </div>
        </div>
      </div>
    </template>
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

.card-hover {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px -10px rgba(46, 125, 50, 0.2);
  border-color: #a5d6a7;
}

.pulse-dot {
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}
</style>
