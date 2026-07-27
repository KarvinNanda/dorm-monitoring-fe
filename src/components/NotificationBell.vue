<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { notificationService } from '@/services/notificationService'
import { formatDate } from '@/utils/dateFormat'

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
      class="relative p-2 rounded-lg hover:bg-green-50 transition-colors"
      aria-label="Notifikasi"
    >
      <span class="text-xl">🔔</span>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Teleport ke body: lepas dari batasan lebar sidebar (288px) supaya
         dropdown tidak menutupi menu tree di bawahnya. Selalu ditempatkan
         fixed di pojok kanan atas viewport. -->
    <Teleport to="body">
      <transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownEl"
          class="fixed top-16 right-4 sm:top-4 sm:right-6 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-200 z-[100] overflow-hidden"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700">Notifikasi Terbaru</h3>
            <button
              @click="markAllRead"
              class="text-xs text-primary hover:underline"
            >
              Tandai semua dibaca
            </button>
          </div>

          <div v-if="loading" class="p-4 text-center text-sm text-gray-400">
            Memuat...
          </div>
          <div v-else-if="errorMessage" class="p-4 text-center text-sm text-red-500">
            {{ errorMessage }}
          </div>
          <div v-else-if="!notifications.length" class="p-6 text-center text-sm text-gray-400">
            Belum ada notifikasi.
          </div>
          <ul v-else class="max-h-96 overflow-y-auto divide-y divide-gray-100">
            <li
              v-for="n in notifications"
              :key="n.id"
              class="px-4 py-3 hover:bg-gray-50 transition-colors"
              :class="{ 'bg-green-50/50': !notifIsRead(n) }"
            >
              <div class="flex items-start gap-2">
                <span class="mt-1 w-2 h-2 rounded-full shrink-0" :class="notifIsRead(n) ? 'bg-gray-300' : 'bg-primary'"></span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ notifTitle(n) }}</p>
                  <p class="text-xs text-gray-500 line-clamp-2">{{ notifMessage(n) }}</p>
                  <p class="text-[11px] text-gray-400 mt-1">{{ formatDate(notifTime(n)) }}</p>
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
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
