<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Building2,
  ChevronRight,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  UserRound,
  Users,
  UsersRound,
  X
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userDeviceService } from '@/services/userDeviceService'
import { getCurrentPlayerId } from '@/utils/oneSignal'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import logoUrl from '@/assets/logo-3.png'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const user = computed(() => authStore.user)
const userRoles = computed(() => authStore.roles)
const userInitial = computed(() => user.value?.name?.charAt(0).toUpperCase() || 'U')

const menuItems = computed(() => {
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Absensi', path: '/absen', icon: Clock, roles: ['admin', 'resident'] },
    { label: 'Tamu', path: '/tamu', icon: UsersRound, roles: ['admin', 'receptionist'] },
    { label: 'Inventaris', path: '/inventory', icon: Package, roles: ['admin', 'receptionist', 'resident'] },
    { label: 'Fasilitas', path: '/facility', icon: Building2, roles: ['admin'] },
    { label: 'Users', path: '/users', icon: Users, roles: ['admin'] }
  ]
  return items.filter((i) => !i.roles || authStore.hasAnyRole(i.roles))
})

// Mobile bottom nav: at most 4 menu tabs + "Lainnya" (5 targets in total).
// Whatever does not fit moves into the "Lainnya" sheet with Profil and Keluar.
const MAX_TABS = 4
const tabItems = computed(() => menuItems.value.slice(0, MAX_TABS))
const overflowItems = computed(() => menuItems.value.slice(MAX_TABS))

function isActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const pageTitle = computed(() => {
  if (isActive('/profile')) return 'Profil Saya'
  return menuItems.value.find((i) => isActive(i.path))?.label || 'Rumah Alam Bahagia'
})

const moreOpen = ref(false)
const moreActive = computed(
  () => isActive('/profile') || overflowItems.value.some((i) => isActive(i.path))
)

watch(() => route.path, () => { moreOpen.value = false })

function onKeydown(event) {
  if (event.key === 'Escape') moreOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const loggingOut = ref(false)

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    try {
      const playerId = getCurrentPlayerId()
      if (playerId) await userDeviceService.unregister(playerId)
    } catch {}
    await authService.logout()
  } finally {
    authStore.clearAuth()
    router.push('/login')
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-surface md:flex">
    <!-- SIDEBAR (desktop) -->
    <aside class="hidden md:flex md:flex-col md:w-60 lg:w-64 md:shrink-0 md:sticky md:top-0 md:h-dvh bg-card border-r border-brand-100">
      <div class="flex items-center gap-3 px-5 h-16 border-b border-brand-100">
        <img :src="logoUrl" alt="" class="w-9 h-9 object-contain dark:bg-[#fff] dark:rounded-lg dark:p-0.5" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-ink leading-tight truncate">Rumah Alam Bahagia</p>
          <p class="text-xs text-ink-muted leading-tight">Sistem Internal</p>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu utama">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          class="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors duration-fast"
          :class="isActive(item.path)
            ? 'bg-brand-600 text-white'
            : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700'"
        >
          <component :is="item.icon" class="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="p-3 border-t border-brand-100 space-y-1">
        <router-link
          to="/profile"
          class="flex items-center gap-3 p-2 rounded-xl transition-colors duration-fast"
          :class="isActive('/profile') ? 'bg-brand-50' : 'hover:bg-brand-50'"
        >
          <span class="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
            {{ userInitial }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-ink truncate">{{ user?.name || 'Pengguna' }}</span>
            <span class="block text-xs text-ink-muted truncate capitalize">
              {{ userRoles.length ? userRoles.join(', ') : 'tanpa role' }}
            </span>
          </span>
          <ChevronRight class="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
        </router-link>

        <button
          type="button"
          :disabled="loggingOut"
          class="flex items-center gap-3 w-full h-10 px-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-fast disabled:opacity-50"
          @click="handleLogout"
        >
          <LogOut class="w-[18px] h-[18px]" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>

    <!-- KONTEN -->
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-brand-100 pt-safe">
        <div class="flex items-center gap-3 h-14 px-4 md:px-6">
          <img :src="logoUrl" alt="" class="w-8 h-8 object-contain md:hidden dark:bg-[#fff] dark:rounded-lg dark:p-0.5" />
          <h1 class="flex-1 min-w-0 text-base md:text-lg font-semibold text-ink truncate">{{ pageTitle }}</h1>
          <div class="flex items-center -mr-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main class="flex-1 w-full max-w-6xl mx-auto px-4 pt-4 pb-28 md:px-6 md:py-6">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- BOTTOM NAV (mobile) -->
    <nav
      class="md:hidden fixed inset-x-0 bottom-0 z-40 bg-card border-t border-brand-100 pb-safe"
      aria-label="Menu utama"
    >
      <div class="flex h-16">
        <router-link
          v-for="item in tabItems"
          :key="item.path"
          :to="item.path"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          class="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-xs font-medium pressable"
          :class="isActive(item.path) ? 'text-brand-700' : 'text-ink-muted'"
        >
          <span
            class="flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-base"
            :class="isActive(item.path) ? 'bg-brand-100' : ''"
          >
            <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
          </span>
          <span class="truncate max-w-full px-1">{{ item.label }}</span>
        </router-link>

        <button
          type="button"
          class="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-xs font-medium pressable"
          :class="moreOpen || moreActive ? 'text-brand-700' : 'text-ink-muted'"
          :aria-expanded="moreOpen"
          aria-controls="more-sheet"
          @click="moreOpen = !moreOpen"
        >
          <span
            class="flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-base"
            :class="moreOpen || moreActive ? 'bg-brand-100' : ''"
          >
            <Menu class="w-5 h-5" aria-hidden="true" />
          </span>
          <span>Lainnya</span>
        </button>
      </div>
    </nav>

    <!-- SHEET "Lainnya" (mobile) -->
    <transition name="fade">
      <div
        v-if="moreOpen"
        class="md:hidden fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="moreOpen = false"
      ></div>
    </transition>
    <transition name="sheet">
      <div
        v-if="moreOpen"
        id="more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Menu lainnya"
        class="md:hidden fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-raised pb-safe"
      >
        <div class="flex items-center justify-between px-5 pt-4 pb-2">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold shrink-0">
              {{ userInitial }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink truncate">{{ user?.name || 'Pengguna' }}</p>
              <p class="text-xs text-ink-muted truncate capitalize">
                {{ userRoles.length ? userRoles.join(', ') : 'tanpa role' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-ink-muted hover:bg-brand-50"
            aria-label="Tutup menu"
            @click="moreOpen = false"
          >
            <X class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div class="px-3 pb-4 space-y-1">
          <router-link
            v-for="item in overflowItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 h-12 px-3 rounded-xl text-sm font-medium"
            :class="isActive(item.path) ? 'bg-brand-50 text-brand-700' : 'text-ink'"
          >
            <component :is="item.icon" class="w-5 h-5 text-brand-700" aria-hidden="true" />
            <span class="flex-1">{{ item.label }}</span>
            <ChevronRight class="w-4 h-4 text-ink-muted" aria-hidden="true" />
          </router-link>
          <router-link
            to="/profile"
            class="flex items-center gap-3 h-12 px-3 rounded-xl text-sm font-medium"
            :class="isActive('/profile') ? 'bg-brand-50 text-brand-700' : 'text-ink'"
          >
            <UserRound class="w-5 h-5 text-brand-700" aria-hidden="true" />
            <span class="flex-1">Profil Saya</span>
            <ChevronRight class="w-4 h-4 text-ink-muted" aria-hidden="true" />
          </router-link>
          <button
            type="button"
            :disabled="loggingOut"
            class="flex items-center gap-3 w-full h-12 px-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
            @click="handleLogout"
          >
            <LogOut class="w-5 h-5" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Satu host untuk confirmDialog() dari halaman mana pun. -->
    <ConfirmDialog />
  </div>
</template>

<style>
/* Page switch: short fade so navigation never feels like waiting. */
.page-enter-active {
  transition: opacity 160ms ease-out, transform 160ms ease-out;
}
.page-leave-active {
  transition: opacity 80ms ease-in;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.page-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 160ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sheet-enter-active {
  transition: transform 220ms cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-leave-active {
  transition: transform 160ms ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

/* Safe areas for notched phones (needs viewport-fit=cover in index.html). */
.pt-safe {
  padding-top: env(safe-area-inset-top);
}
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
