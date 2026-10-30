<script setup>
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<template>
  <!-- Satu kartu di tengah, seperti desain login sebelum revamp. -->
  <div class="relative min-h-dvh bg-surface flex items-center justify-center px-4 py-10">
    <div class="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))]">
      <ThemeToggle />
    </div>
    <div class="card w-full max-w-md p-6 sm:p-8 shadow-raised">
      <router-view />
    </div>
  </div>
</template>
