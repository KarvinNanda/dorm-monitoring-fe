<script setup>
/**
 * Input password dengan tombol mata (tampilkan / sembunyikan).
 * Atribut lain (id, required, minlength, autocomplete, placeholder, class)
 * diteruskan ke <input>, jadi pemakaiannya sama dengan input biasa.
 */
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: String, default: '' })
const visible = ref(false)
</script>

<template>
  <div class="relative">
    <slot name="icon" />
    <input
      v-bind="$attrs"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      autocapitalize="none"
      spellcheck="false"
    />
    <button
      type="button"
      class="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-ink-muted hover:text-brand-700"
      :aria-label="visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" class="w-[18px] h-[18px]" aria-hidden="true" />
      <Eye v-else class="w-[18px] h-[18px]" aria-hidden="true" />
    </button>
  </div>
</template>
