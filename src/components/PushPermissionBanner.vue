<script setup>
/**
 * Ajakan / petunjuk web push. Varian:
 * - enable: prompt izin browser baru muncul setelah user menekan "Aktifkan"
 *   (browser memblokir prompt tanpa klik user).
 * - blocked: izin diblokir, tampilkan cara membukanya.
 * - home-screen: iPhone/iPad di Safari biasa; push hanya jalan dari Layar Utama.
 */
import { computed } from 'vue'
import { Bell, BellOff, Smartphone } from 'lucide-vue-next'

const props = defineProps({
  variant: { type: String, default: 'enable' },
  busy: { type: Boolean, default: false }
})
defineEmits(['enable', 'dismiss'])

const COPY = {
  enable: {
    icon: Bell,
    title: 'Aktifkan notifikasi',
    body: 'Terima pemberitahuan di perangkat ini, walaupun aplikasi sedang ditutup.'
  },
  blocked: {
    icon: BellOff,
    title: 'Notifikasi diblokir',
    body: 'Klik ikon di kiri alamat situs, lalu ubah Notifikasi menjadi Izinkan.'
  },
  'home-screen': {
    icon: Smartphone,
    title: 'Tambahkan ke Layar Utama',
    body: 'Di iPhone, notifikasi hanya bisa aktif dari Layar Utama. Ketuk tombol Bagikan di Safari, pilih "Tambah ke Layar Utama", lalu buka aplikasi dari ikonnya.'
  }
}
const copy = computed(() => COPY[props.variant] || COPY.enable)
const canEnable = computed(() => props.variant === 'enable')
</script>

<template>
  <section class="card p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3" aria-labelledby="push-banner-title" aria-live="polite">
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <span class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
        <component :is="copy.icon" class="w-5 h-5" aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <h2 id="push-banner-title" class="text-sm font-semibold text-ink">{{ copy.title }}</h2>
        <p class="text-sm text-ink-muted mt-0.5">{{ copy.body }}</p>
      </div>
    </div>
    <div class="flex gap-2 sm:shrink-0">
      <button type="button" class="btn btn-secondary flex-1 sm:flex-none" @click="$emit('dismiss')">
        {{ canEnable ? 'Nanti' : 'Tutup' }}
      </button>
      <button
        v-if="canEnable"
        type="button"
        class="btn btn-primary flex-1 sm:flex-none"
        :disabled="busy"
        @click="$emit('enable')"
      >
        Aktifkan
      </button>
    </div>
  </section>
</template>
