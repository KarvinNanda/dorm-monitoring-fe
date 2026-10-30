<script setup>
import { CircleAlert, CircleCheck } from 'lucide-vue-next'

// toast: { show, type: 'success' | 'error', message } — state tetap milik halaman.
// Di-Teleport ke <body>: posisinya `fixed`, jadi tidak boleh ikut dihitung
// `space-y-*` halaman (elemen sesudahnya jadi dapat margin ekstra).
defineProps({ toast: { type: Object, required: true } })
</script>

<template>
  <Teleport to="body">
  <div class="fixed inset-x-4 bottom-24 md:inset-x-auto md:right-6 md:bottom-6 z-50 flex justify-center pointer-events-none" role="status" aria-live="polite">
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="flex items-center gap-2 max-w-sm px-4 py-3 rounded-xl shadow-raised text-sm font-medium text-white"
        :class="toast.type === 'error' ? 'bg-red-600' : 'bg-forest'"
      >
        <CircleAlert v-if="toast.type === 'error'" class="w-4 h-4 shrink-0" aria-hidden="true" />
        <CircleCheck v-else class="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}
.toast-leave-active {
  transition: opacity 120ms ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-to {
  opacity: 0;
}
</style>
