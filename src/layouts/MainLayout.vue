<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userDeviceService } from '@/services/userDeviceService'
import { getCurrentPlayerId } from '@/utils/oneSignal'
import NotificationBell from '@/components/NotificationBell.vue'
import logoUrl from '@/assets/logo-3.png'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)
const userRoles = computed(() => authStore.roles)

const menuItems = computed(() => {
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: '🌿' },
    { label: 'Absensi', path: '/absen', icon: '🍃',roles: ['admin', 'resident'] },
    { label: 'Tamu', path: '/tamu', icon: '🌱' ,roles: ['admin', 'receptionist']},
    { label: 'Inventaris', path: '/inventory', icon: '📦', roles: ['admin', 'receptionist', 'resident'] },
    { label: 'Fasilitas', path: '/facility', icon: '🏛️' ,roles: ['admin']},
    { label: 'Users', path: '/users', icon: '👥', roles: ['admin'] }
  ]
  return items.filter((i) => !i.roles || authStore.hasAnyRole(i.roles))
})

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
  <div class="flex h-screen bg-[#f4f7f6] overflow-hidden">
    <!-- SIDEBAR (DESKTOP) -->
    <aside class="w-72 glass-panel hidden md:flex flex-col m-4 rounded-3xl overflow-hidden z-20 border-white/60">
      <!-- Header / Logo -->
      <div class="p-6">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <img :src="logoUrl" alt="Logo" class="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-800 leading-tight">Sistem Internal</h1>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-2 overflow-y-auto">
        <div class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">Menu Utama</div>
        <div class="space-y-1">
          <router-link
            v-for="(item, idx) in menuItems"
            :key="item.path"
            :to="item.path"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-gray-500 transition-all duration-300 hover:bg-white hover:shadow-soft hover:text-primary hover:translate-x-1 relative overflow-hidden"
            active-class="active-nav-item"
            :style="{ animationDelay: `${idx * 50}ms` }"
          >
            <!-- Background highlight (active) -->
            <div class="absolute inset-0 bg-gradient-to-r from-green-50 to-transparent opacity-0 group-[.active-nav-item]:opacity-100 transition-opacity duration-300"></div>
            
            <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50/50 group-hover:bg-green-50 group-[.active-nav-item]:bg-green-100 transition-colors z-10 shadow-sm border border-transparent group-[.active-nav-item]:border-green-200/50">
              <span class="text-lg group-hover:scale-110 transition-transform duration-300">{{ item.icon }}</span>
            </div>
            <span class="font-medium z-10">{{ item.label }}</span>
            
            <!-- Active Indicator -->
            <div class="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-[.active-nav-item]:opacity-100 transition-opacity z-10"></div>
          </router-link>
        </div>
      </nav>

      <!-- User Profile / Footer -->
      <div class="p-4 mt-auto">
        <div class="bg-white/60 backdrop-blur-md rounded-2xl p-3 shadow-soft mb-3 border border-white">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-primary flex items-center justify-center font-bold text-lg shadow-inner">
              {{ user?.name?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-gray-800 truncate">{{ user?.name || 'Pengguna' }}</div>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="r in userRoles"
                  :key="r"
                  class="text-[10px] bg-white text-primary px-2 py-0.5 rounded-md capitalize font-medium shadow-sm border border-green-100"
                >{{ r }}</span>
                <span
                  v-if="!userRoles.length"
                  class="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md shadow-sm border border-gray-100"
                >tanpa role</span>
              </div>
            </div>
          </div>
          
          <router-link
            to="/profile"
            class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-white rounded-xl transition-all duration-200 shadow-sm border border-transparent hover:border-gray-100"
          >
            <span class="text-base">👤</span> Profil Saya
          </router-link>
        </div>
        
        <button
          @click="handleLogout"
          class="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all duration-200 shadow-sm border border-gray-100 hover:border-red-100 hover:shadow-soft"
        >
          <span>Keluar</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>
    </aside>

    <!-- MOBILE HEADER -->
    <div class="md:hidden fixed top-0 left-0 right-0 glass-header z-50 p-4 flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-2">
        <img :src="logoUrl" alt="Logo" class="w-8 h-8 object-contain" />
        <h1 class="text-base font-bold text-gray-800">Sistem Internal</h1>
      </div>
      <div class="flex items-center gap-3">
        <NotificationBell />
        <button @click="handleLogout" class="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>
    </div>

    <!-- MOBILE BOTTOM NAV -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-50 flex px-2 py-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="flex-1 py-1.5 flex flex-col items-center justify-center text-gray-400 transition-colors relative group"
        active-class="text-primary mobile-active-item"
      >
        <!-- Active Pill Background -->
        <div class="absolute inset-0 bg-green-50/80 rounded-2xl opacity-0 group-[.mobile-active-item]:opacity-100 transition-opacity scale-90 group-[.mobile-active-item]:scale-100 duration-300 mx-1"></div>
        
        <div class="text-xl mb-0.5 z-10 group-[.mobile-active-item]:-translate-y-1 transition-transform duration-300 drop-shadow-sm">{{ item.icon }}</div>
        <span class="text-[10px] font-semibold z-10">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- KONTEN UTAMA -->
    <div class="flex-1 flex flex-col min-w-0 md:pt-2 md:pb-4 md:pr-4 relative">
      <!-- Top navbar (Desktop) -->
      <header class="hidden md:flex items-center justify-end px-2 pb-2 pt-0 bg-transparent z-10 w-full relative">
        <div class="glass-panel px-4 py-2 rounded-2xl flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      <main class="flex-1 bg-white md:rounded-3xl shadow-soft border border-white overflow-hidden relative flex flex-col pt-20 md:pt-0 pb-24 md:pb-0 z-10 mx-0 md:mx-0">
        <!-- Decorative subtle background element -->
        <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-50 to-transparent rounded-full blur-3xl opacity-60 -z-10 -translate-y-1/2 translate-x-1/4"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-gray-50 to-transparent rounded-full blur-2xl opacity-60 -z-10 translate-y-1/3 -translate-x-1/4"></div>
        
        <div class="flex-1 overflow-auto p-4 md:p-5 scroll-smooth">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/* Global page transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.99);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.99);
}

/* Safe area padding for mobile iOS devices */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 12px);
}

/* Staggered animation for sidebar items */
.group {
  animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Custom Scrollbar for inner content */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent; 
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0; 
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1; 
}
</style>
