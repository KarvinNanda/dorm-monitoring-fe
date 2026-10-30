<script setup>
import BaseModal from '@/components/BaseModal.vue'
import { confirmState, settleConfirm } from '@/composables/useConfirm'

// Ditutup lewat X / Escape / backdrop = batal.
function onOpenChange(isOpen) {
  if (!isOpen) settleConfirm(false)
}
</script>

<template>
  <BaseModal
    :open="confirmState.open"
    :title="confirmState.title"
    role="alertdialog"
    @update:open="onOpenChange"
  >
    <p v-if="confirmState.message" class="text-sm text-ink-muted">{{ confirmState.message }}</p>
    <template #footer>
      <button type="button" class="btn btn-secondary flex-1" data-autofocus @click="settleConfirm(false)">
        {{ confirmState.cancelLabel }}
      </button>
      <button type="button" class="btn btn-danger flex-1" @click="settleConfirm(true)">
        {{ confirmState.confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>
