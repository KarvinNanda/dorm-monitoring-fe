<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { dummyGuestVisits, dummyGuests } from '@/utils/dummyData'
import { formatDateLong, todayJakartaDate } from '@/utils/dateFormat'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
// Tampilkan SEMUA role yang dimiliki user (admin / resident / receptionist / dll.)
const userRoles = computed(() => authStore.roles)

// "Hari ini" dihitung di zona WIB supaya konsisten untuk user Indonesia,
// bukan timezone sistem user / UTC.
const today = todayJakartaDate()

const kunjunganHariIni = computed(() =>
  dummyGuestVisits.filter((v) => todayJakartaDate(v.eventTime) === today).length
)

const totalTamuTerdaftar = computed(() => dummyGuests.length)

const tanggalHariIni = formatDateLong()
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-1 fade-up">
      Selamat datang, {{ user?.name || 'Pengguna' }}! 🌿
    </h1>
    <p class="text-gray-500 mb-8 fade-up" style="animation-delay: 80ms">{{ tanggalHariIni }}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Status Absen -->
      <div class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up" style="animation-delay: 150ms">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Status Absen</h3>
          <span class="w-3 h-3 bg-green-400 rounded-full pulse-dot"></span>
        </div>
        <p class="text-2xl font-bold text-gray-800">Hadir</p>
        <p class="text-sm text-gray-500 mt-1">Silakan cek menu Absen</p>
      </div>

      <!-- Kunjungan Hari Ini -->
      <div class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up" style="animation-delay: 250ms">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Kunjungan Hari Ini</h3>
          <span class="w-3 h-3 bg-secondary rounded-full pulse-dot"></span>
        </div>
        <p class="text-2xl font-bold text-gray-800">{{ kunjunganHariIni }}</p>
        <p class="text-sm text-gray-500 mt-1">Tamu terjadwal hari ini</p>
      </div>

      <!-- Total Tamu Terdaftar -->
      <div class="card-hover bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-up" style="animation-delay: 350ms">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Tamu Terdaftar</h3>
          <span class="w-3 h-3 bg-blue-400 rounded-full pulse-dot"></span>
        </div>
        <p class="text-2xl font-bold text-gray-800">{{ totalTamuTerdaftar }}</p>
        <p class="text-sm text-gray-500 mt-1">Data master tamu</p>
      </div>
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
