<script setup>
import { Leaf } from 'lucide-vue-next'
import logoUrl from '@/assets/logo-3.png'
</script>

<template>
  <div class="min-h-dvh grid lg:grid-cols-2 bg-white">
    <!-- Panel brand (desktop) -->
    <aside class="hidden lg:flex flex-col justify-between bg-brand-700 text-white p-12 relative overflow-hidden">
      <div class="flex items-center gap-3 relative">
        <span class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
          <img :src="logoUrl" alt="" class="w-9 h-9 object-contain" />
        </span>
        <span class="text-lg font-semibold">Rumah Alam Bahagia</span>
      </div>

      <div class="relative max-w-md">
        <h2 class="text-3xl font-semibold leading-tight">Asrama yang tertata, tamu dan inventaris tercatat rapi.</h2>
        <p class="mt-3 text-brand-100">Pantau stok perlengkapan, kunjungan tamu, fasilitas, dan absensi dari satu tempat.</p>
      </div>

      <p class="text-sm text-brand-200 relative">Sistem Internal</p>

      <Leaf class="absolute -right-10 -bottom-10 w-80 h-80 text-brand-500/40 rotate-12" :stroke-width="1" aria-hidden="true" />
    </aside>

    <!-- Form -->
    <main class="flex items-center justify-center px-5 py-10 bg-surface lg:bg-white">
      <div class="w-full max-w-sm">
        <router-view />
      </div>
    </main>
  </div>
</template>
