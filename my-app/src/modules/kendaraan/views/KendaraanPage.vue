<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { dummyKendaraan } from '@/utils/dummyData'

const authStore = useAuthStore()
const kendaraanList = ref(dummyKendaraan.map((k) => ({ ...k })))
const loading = ref(null)

async function toggleStatus(kendaraan) {
  loading.value = kendaraan.id
  await new Promise((r) => setTimeout(r, 400))

  if (kendaraan.status === 'available') {
    kendaraan.status = 'in_use'
    kendaraan.peminjam = authStore.user?.name || 'Unknown'
  } else {
    kendaraan.status = 'available'
    kendaraan.peminjam = null
  }
  loading.value = null
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Kendaraan</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="k in kendaraanList"
        :key="k.id"
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="font-semibold text-gray-800">{{ k.nama }}</h3>
            <p class="text-sm text-gray-500 mt-1">{{ k.plat }}</p>
          </div>
          <span
            class="px-3 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-green-100 text-green-700': k.status === 'available',
              'bg-yellow-100 text-yellow-700': k.status === 'in_use'
            }"
          >
            {{ k.status === 'available' ? 'Available' : 'In Use' }}
          </span>
        </div>

        <p v-if="k.peminjam" class="text-xs text-gray-400 mb-4">
          Dipakai oleh: <span class="text-gray-600 font-medium">{{ k.peminjam }}</span>
        </p>

        <button
          @click="toggleStatus(k)"
          :disabled="loading === k.id"
          class="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          :class="{
            'bg-primary text-white hover:bg-green-700': k.status === 'available',
            'bg-secondary text-white hover:bg-amber-800': k.status === 'in_use'
          }"
        >
          {{ loading === k.id ? 'Loading...' : k.status === 'available' ? 'Pakai' : 'Selesai' }}
        </button>
      </div>
    </div>
  </div>
</template>
