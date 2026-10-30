<script setup>
/**
 * Ajakan mengaktifkan web push. Prompt izin browser baru muncul setelah user
 * menekan "Aktifkan" (browser memblokir prompt tanpa klik user).
 * `blocked`: user baru saja menekan Block, tampilkan cara membukanya.
 */
import { Bell, BellOff } from 'lucide-vue-next'

defineProps({
  blocked: { type: Boolean, default: false },
  busy: { type: Boolean, default: false }
})
defineEmits(['enable', 'dismiss'])
</script>

<template>
  <section class="card p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3" aria-labelledby="push-banner-title" aria-live="polite">
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <span class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
        <component :is="blocked ? BellOff : Bell" class="w-5 h-5" aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <h2 id="push-banner-title" class="text-sm font-semibold text-ink">
          {{ blocked ? 'Notifikasi diblokir' : 'Aktifkan notifikasi' }}
        </h2>
        <p class="text-sm text-ink-muted mt-0.5">
          <template v-if="blocked">
            Klik ikon di kiri alamat situs, lalu ubah Notifikasi menjadi Izinkan.
          </template>
          <template v-else>
            Terima pemberitahuan di perangkat ini, walaupun aplikasi sedang ditutup.
          </template>
        </p>
      </div>
    </div>
    <div class="flex gap-2 sm:shrink-0">
      <button type="button" class="btn btn-secondary flex-1 sm:flex-none" @click="$emit('dismiss')">
        {{ blocked ? 'Tutup' : 'Nanti' }}
      </button>
      <button
        v-if="!blocked"
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
