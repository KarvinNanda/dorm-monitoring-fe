<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { notificationService } from '@/services/notificationService'
import { formatDate } from '@/utils/dateFormat'
import { Bell, CheckCheck, Inbox, LoaderCircle } from 'lucide-vue-next'

const isOpen = ref(false)
const unreadCount = ref(0)
const notifications = ref([])
const loading = ref(false)
const errorMessage = ref('')

const rootEl = ref(null)
const dropdownEl = ref(null)

function notifTitle(n) {
  return n.title || n.subject || 'Notifikasi'
}
function notifMessage(n) {
  return n.message || n.body || n.description || ''
}
function notifTime(n) {
  return n.createdAt || n.time || n.date
}
function notifIsRead(n) {
  return n.isRead ?? n.read ?? false
}

async function fetchUnreadCount() {
  try {
    const res = await notificationService.unreadCount()
    unreadCount.value = res?.count ?? 0
  } catch {
    // Badge gagal dimuat — bukan error fatal, tetap tampilkan lonceng tanpa badge
  }
}

// Ambil semua notifikasi (halaman pertama, urut descending by waktu).
// Setiap kali dropdown dibuka, list di-refresh — jadi notif baru selalu
// tampil paling atas tanpa perlu reload halaman.
async function fetchNotifications() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await notificationService.list({ page: 1, limit: 20 })
    const list = Array.isArray(data) ? [...data] : []
    list.sort((a, b) => new Date(notifTime(b)) - new Date(notifTime(a)))
    notifications.value = list
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || err?.message || 'Gagal memuat notifikasi'
  } finally {
    loading.value = false
  }
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) fetchNotifications()
}

async function markAllRead() {
  try {
    await notificationService.readAll()
    unreadCount.value = 0
  } catch {
    // Gagal tandai semua dibaca — biarkan badge apa adanya
  }
}

function handleClickOutside(event) {
  const clickedRoot = rootEl.value?.contains(event.target)
  const clickedDropdown = dropdownEl.value?.contains(event.target)
  if (!clickedRoot && !clickedDropdown) {
    isOpen.value = false
  }
}

onMounted(() => {
  fetchUnreadCount()
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      @click="toggleDropdown"
      class="relative w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-brand-50 hover:text-brand-700 transition-colors duration-fast"
      :class="{ 'bg-brand-50 text-brand-700': isOpen }"
      aria-label="Notifikasi"
      :aria-expanded="isOpen"
    >
      <Bell class="w-5 h-5" aria-hidden="true" />
      <span
        v-if="unreadCount > 0"
        class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[11px] leading-none font-semibold text-white bg-red-500 rounded-full ring-2 ring-white tabular-nums"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Teleport ke body supaya dropdown tidak terpotong container header.
         Mobile: selebar layar dengan margin 12px. Desktop: panel 384px di kanan. -->
    <Teleport to="body">
      <transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownEl"
          class="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] sm:inset-x-auto sm:right-6 sm:w-96 bg-white rounded-2xl shadow-raised border border-brand-100 z-[100] overflow-hidden"
        >
          <div class="flex items-center justify-between gap-3 px-4 h-12 border-b border-brand-100">
            <h3 class="text-sm font-semibold text-ink">Notifikasi Terbaru</h3>
            <button
              @click="markAllRead"
              class="flex items-center gap-1 h-9 px-2 -mr-2 rounded-lg text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              <CheckCheck class="w-4 h-4" aria-hidden="true" />
              Tandai semua dibaca
            </button>
          </div>

          <div v-if="loading" class="p-6 flex justify-center text-ink-muted">
            <LoaderCircle class="w-5 h-5 animate-spin" aria-hidden="true" />
            <span class="sr-only">Memuat...</span>
          </div>
          <div v-else-if="errorMessage" class="p-4 text-center text-sm text-red-600">
            {{ errorMessage }}
          </div>
          <div v-else-if="!notifications.length" class="p-8 flex flex-col items-center gap-2 text-sm text-ink-muted">
            <Inbox class="w-6 h-6 text-brand-300" aria-hidden="true" />
            Belum ada notifikasi.
          </div>
          <ul v-else class="max-h-[70dvh] sm:max-h-96 overflow-y-auto overscroll-contain divide-y divide-brand-50">
            <li
              v-for="n in notifications"
              :key="n.id"
              class="px-4 py-3"
              :class="{ 'bg-brand-50/60': !notifIsRead(n) }"
            >
              <div class="flex items-start gap-3">
                <span class="mt-1.5 w-2 h-2 rounded-full shrink-0" :class="notifIsRead(n) ? 'bg-gray-300' : 'bg-primary'"></span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink truncate">{{ notifTitle(n) }}</p>
                  <p class="text-xs text-ink-muted line-clamp-2">{{ notifMessage(n) }}</p>
                  <p class="text-xs text-ink-muted/80 mt-1">{{ formatDate(notifTime(n)) }}</p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dropdown-enter-active {
  transition: opacity 140ms ease-out, transform 140ms ease-out;
}
.dropdown-leave-active {
  transition: opacity 100ms ease-in;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-leave-to {
  opacity: 0;
}
</style>
