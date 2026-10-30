<script setup>
/**
 * Dialog dasar. Mobile: bottom sheet. Desktop (sm+): di tengah layar.
 *
 * Aksesibilitas: role dialog + aria-modal + aria-labelledby, fokus masuk ke
 * elemen `[data-autofocus]` (atau elemen fokus pertama) saat dibuka, Tab
 * berputar di dalam dialog, Escape / backdrop / tombol X menutup, lalu fokus
 * kembali ke elemen yang membuka dialog.
 *
 * Di-Teleport ke <body> supaya posisi `fixed` tidak terpengaruh CSS halaman
 * (margin dari space-y-*, transform saat transisi halaman).
 */
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'

const open = defineModel('open', { type: Boolean, default: false })
defineProps({
  title: { type: String, required: true },
  // 'alertdialog' untuk konfirmasi yang butuh jawaban user.
  role: { type: String, default: 'dialog' }
})

const titleId = useId()
const panel = ref(null)
let opener = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables() {
  return panel.value ? [...panel.value.querySelectorAll(FOCUSABLE)] : []
}

function close() {
  open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab') return
  const items = focusables()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement
      document.body.style.overflow = 'hidden'
      await nextTick()
      const target =
        panel.value?.querySelector('[data-autofocus]') ||
        focusables().find((el) => el.getAttribute('aria-label') !== 'Tutup') ||
        panel.value
      target?.focus()
    } else {
      document.body.style.overflow = ''
      opener?.focus?.()
      opener = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
  <Transition name="modal">
    <div
      v-if="open"
      data-backdrop
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
      @click.self="close"
    >
      <div
        ref="panel"
        :role="role"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        class="modal-panel w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-card rounded-t-3xl sm:rounded-2xl shadow-raised pb-safe sm:pb-0 outline-none"
        @keydown="onKeydown"
      >
        <div class="flex items-center gap-3 px-5 pt-5 pb-3">
          <h2 :id="titleId" class="flex-1 text-base font-semibold text-ink">{{ title }}</h2>
          <button type="button" class="icon-btn -mr-2" aria-label="Tutup" @click="close">
            <X class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div class="px-5 pb-5">
          <slot />
          <div v-if="$slots.footer" class="flex gap-3 pt-5">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease-out;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.modal-leave-active,
.modal-leave-active .modal-panel {
  transition-duration: 140ms;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(24px);
}
</style>
