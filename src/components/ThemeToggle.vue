<script setup>
import { Moon, Sun } from 'lucide-vue-next'
import { theme, toggleTheme } from '@/utils/theme'
</script>

<template>
  <button
    type="button"
    class="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-brand-50 hover:text-brand-700 transition-colors duration-fast"
    :aria-label="theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" class="w-5 h-5" aria-hidden="true" />
    <Moon v-else class="w-5 h-5" aria-hidden="true" />
  </button>
</template>
