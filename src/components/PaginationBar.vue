<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const page = defineModel('page', { type: Number, required: true })
defineProps({ totalPages: { type: Number, default: 1 } })
</script>

<template>
  <div class="flex items-center justify-between gap-3 px-4 py-2 border-t border-gray-200 text-xs text-ink-muted">
    <span>Halaman {{ page }} dari {{ totalPages }}</span>
    <div class="flex gap-1">
      <button
        type="button"
        class="icon-btn w-11 h-11 md:w-9 md:h-9 disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Halaman sebelumnya"
        :disabled="page <= 1"
        @click="page--"
      >
        <ChevronLeft class="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="icon-btn w-11 h-11 md:w-9 md:h-9 disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Halaman berikutnya"
        :disabled="page >= totalPages"
        @click="page++"
      >
        <ChevronRight class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
