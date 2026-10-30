/**
 * Pengganti window.confirm(): `if (!(await confirmDialog({...}))) return`.
 *
 * State satu untuk seluruh app; <ConfirmDialog/> di MainLayout yang
 * merendernya. Hanya satu dialog terbuka: panggilan baru menjawab
 * panggilan lama dengan false.
 */
import { reactive } from 'vue'

const DEFAULTS = { title: 'Yakin?', message: '', confirmLabel: 'Hapus', cancelLabel: 'Batal' }

export const confirmState = reactive({ open: false, ...DEFAULTS })

let resolver = null

export function settleConfirm(result) {
  confirmState.open = false
  const resolve = resolver
  resolver = null
  resolve?.(result)
}

export function confirmDialog(options = {}) {
  if (resolver) settleConfirm(false)
  Object.assign(confirmState, DEFAULTS, options, { open: true })
  return new Promise((resolve) => {
    resolver = resolve
  })
}
