<script setup>
import { ref, computed } from 'vue'

const status = ref('belum-absen') // belum-absen | masuk | keluar
const tapIn = ref(null)
const tapOut = ref(null)
const loading = ref(false)

const tanggalLengkap = computed(() =>
  new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
)

function jamSekarang() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function tapInNow() {
  loading.value = true
  await new Promise((r) => setTimeout(r, 400))
  tapIn.value = jamSekarang()
  status.value = 'masuk'
  loading.value = false
}

async function tapOutNow() {
  loading.value = true
  await new Promise((r) => setTimeout(r, 400))
  tapOut.value = jamSekarang()
  status.value = 'keluar'
  loading.value = false
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6 fade-up">Absensi 🍃</h1>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-xl fade-up card-lift" style="animation-delay: 100ms">
      <!-- Tanggal -->
      <div class="text-center mb-6">
        <p class="text-sm text-gray-400 uppercase tracking-wide mb-1">Hari ini</p>
        <p class="text-lg font-semibold text-gray-800">{{ tanggalLengkap }}</p>
      </div>

      <!-- Status -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
          :class="{
            'bg-gray-100 text-gray-600': status === 'belum-absen',
            'bg-green-100 text-green-700': status === 'masuk',
            'bg-blue-100 text-blue-700': status === 'keluar'
          }"
        >
          {{
            status === 'belum-absen'
              ? 'Belum Absen'
              : status === 'masuk'
                ? 'Sudah Tap In'
                : 'Sudah Tap Out'
          }}
        </div>
      </div>

      <!-- Tap In / Tap Out info -->
      <div class="grid grid-cols-2 gap-4 mb-8">
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Tap In</p>
          <p class="text-2xl font-bold" :class="tapIn ? 'text-primary' : 'text-gray-300'">
            {{ tapIn || '--:--' }}
          </p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Tap Out</p>
          <p class="text-2xl font-bold" :class="tapOut ? 'text-secondary' : 'text-gray-300'">
            {{ tapOut || '--:--' }}
          </p>
        </div>
      </div>

      <!-- Tombol -->
      <div class="flex flex-col sm:flex-row gap-4">
        <button
          @click="tapInNow"
          :disabled="loading || status !== 'belum-absen'"
          class="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Memproses...' : 'Tap In' }}
        </button>
        <button
          @click="tapOutNow"
          :disabled="loading || status !== 'masuk'"
          class="flex-1 bg-secondary text-white py-3 px-6 rounded-lg font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Memproses...' : 'Tap Out' }}
        </button>
      </div>

      <p class="text-xs text-gray-400 text-center mt-6">
        Catatan: data ini hanya informasi. Fitur lengkap akan tersedia pada tahap evaluasi berikutnya.
      </p>
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
  transform: translateY(-4px);
  box-shadow: 0 10px 30px -10px rgba(46, 125, 50, 0.2);
  border-color: #a5d6a7;
}

button {
  transition: all 0.2s ease;
}

button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.15);
}

button:not(:disabled):active {
  transform: translateY(0);
}
</style>
