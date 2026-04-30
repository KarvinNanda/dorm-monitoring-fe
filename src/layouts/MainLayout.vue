<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import logoUrl from '@/assets/logo-3.png'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)
// Tampilkan semua role user (admin, resident, receptionist, dst.) sebagai chip,
// bukan cuma primaryRole.
const userRoles = computed(() => authStore.roles)

const menuItems = computed(() => {
  // Semua menu bisa diakses oleh user login
  // (filter per-role bisa diaktifkan lagi setelah role API diketahui)
  const items = [
    { label: 'Dashboard', path: '/dashboard', icon: '🌿' },
    { label: 'Absensi', path: '/absen', icon: '🍃' },
    { label: 'Tamu', path: '/tamu', icon: '🌱' },
    { label: 'Inventaris', path: '/inventory', icon: '📦', roles: ['admin', 'receptionist', 'resident'] },
    { label: 'Fasilitas', path: '/facility', icon: '🏛️' },
    { label: 'Users', path: '/users', icon: '👥', roles: ['admin'] }
  ]
  // Filter menu yang butuh role spesifik
  return items.filter((i) => !i.roles || authStore.hasAnyRole(i.roles))
})

const loggingOut = ref(false)

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authService.logout()
  } finally {
    authStore.clearAuth()
    router.push('/login')
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- ============ SIDEBAR (DESKTOP) ============ -->
    <aside class="w-72 bg-white border-r border-gray-200 flex-col hidden md:flex">
      <!-- Header dengan tema pohon -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <img
            :src="logoUrl"
            alt="Logo Sistem Internal"
            class="w-10 h-10 object-contain animate-sway"
          />
          <div>
            <h1 class="text-lg font-bold text-primary leading-tight">Sistem Internal</h1>
            <p class="text-xs text-gray-400">Tumbuh bersama kami</p>
          </div>
        </div>
      </div>

      <!-- Tree nav -->
      <nav class="flex-1 p-4">
        <!-- Root label -->
        <div class="flex items-center gap-2 mb-2 text-sm font-semibold text-secondary">
          <span>🌳</span>
          <span>Menu Utama</span>
        </div>

        <!-- Tree branches container -->
        <div class="tree">
          <router-link
            v-for="(item, idx) in menuItems"
            :key="item.path"
            :to="item.path"
            :style="{ animationDelay: `${idx * 100}ms` }"
            class="tree-branch group"
            :class="{ 'is-last': idx === menuItems.length - 1 }"
            active-class="tree-branch-active"
          >
            <span class="branch-icon">{{ item.icon }}</span>
            <span class="branch-label">{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <!-- User footer -->
      <div class="p-4 border-t border-gray-200">
        <div class="px-4 py-2 text-sm text-gray-500 mb-2">
          <div class="font-medium text-gray-700">{{ user?.name || 'Pengguna' }}</div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="r in userRoles"
              :key="r"
              class="text-xs bg-green-100 text-primary px-2 py-0.5 rounded-full capitalize"
            >{{ r }}</span>
            <span
              v-if="!userRoles.length"
              class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
            >tanpa role</span>
          </div>
        </div>
        <router-link
          to="/profile"
          class="w-full block px-4 py-2 text-sm text-primary hover:bg-green-50 rounded-lg transition-all duration-200 text-left hover:translate-x-1 mb-1"
          active-class="bg-green-50 font-semibold"
        >
          👤 Profil Saya
        </router-link>
        <button
          @click="handleLogout"
          class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-left hover:translate-x-1"
        >
          → Keluar
        </button>
      </div>
    </aside>

    <!-- ============ HEADER MOBILE ============ -->
    <div class="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 p-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img
          :src="logoUrl"
          alt="Logo Sistem Internal"
          class="w-8 h-8 object-contain animate-sway"
        />
        <h1 class="text-lg font-bold text-primary">Sistem Internal</h1>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/profile" class="text-sm text-primary font-medium">👤 Profil</router-link>
        <button @click="handleLogout" class="text-sm text-red-600">Keluar</button>
      </div>
    </div>

    <!-- ============ NAV BAWAH MOBILE ============ -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="flex-1 py-3 text-center text-xs text-gray-500 hover:text-primary transition-all duration-200"
        active-class="text-primary font-medium mobile-active"
      >
        <div class="text-lg mb-1">{{ item.icon }}</div>
        {{ item.label }}
      </router-link>
    </nav>

    <!-- ============ KONTEN UTAMA ============ -->
    <main class="flex-1 p-6 md:p-8 md:pt-8 pt-20 pb-24 md:pb-8 overflow-x-hidden">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
/* ============ TREE STRUCTURE ============ */
.tree {
  position: relative;
  padding-left: 12px;
}

/* Trunk (garis vertikal utama) */
.tree::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 6px;
  bottom: 24px;
  width: 2px;
  background: linear-gradient(to bottom, #6D4C41, #a1887f);
  border-radius: 2px;
}

/* Branch (setiap menu item) */
.tree-branch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 24px;
  margin-bottom: 4px;
  border-radius: 10px;
  color: #4b5563;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0;
  transform: translateX(-10px);
  animation: branchGrow 0.5s ease forwards;
}

/* Horizontal connector dari trunk ke branch */
.tree-branch::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  width: 20px;
  height: 2px;
  background: #a1887f;
  border-radius: 2px;
  transform-origin: left;
  transition: all 0.3s ease;
}

/* Daun kecil (dot) di ujung branch */
.tree-branch::after {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: #c5e1a5;
  box-shadow: 0 0 0 2px white;
  transition: all 0.3s ease;
}

/* Menutupi sisa trunk di bawah item terakhir */
.tree-branch.is-last {
  position: relative;
}
.tree-branch.is-last::before {
  background: #a1887f;
}

/* Hover state - branch tumbuh */
.tree-branch:hover {
  background: #f1f8e9;
  color: #2E7D32;
  transform: translateX(4px);
}

.tree-branch:hover::before {
  background: #2E7D32;
  width: 24px;
}

.tree-branch:hover::after {
  background: #2E7D32;
  transform: scale(1.4);
}

.tree-branch:hover .branch-icon {
  transform: rotate(-10deg) scale(1.2);
}

/* Active state */
.tree-branch-active {
  background: #e8f5e9 !important;
  color: #2E7D32 !important;
  font-weight: 600;
}

.tree-branch-active::before {
  background: #2E7D32 !important;
  width: 24px !important;
}

.tree-branch-active::after {
  background: #2E7D32 !important;
  transform: scale(1.5) !important;
  box-shadow: 0 0 0 2px white, 0 0 8px rgba(46, 125, 50, 0.4) !important;
}

.branch-icon {
  display: inline-block;
  font-size: 1.1rem;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.branch-label {
  flex: 1;
}

/* Animasi branch muncul saat load */
@keyframes branchGrow {
  0% {
    opacity: 0;
    transform: translateX(-20px) scale(0.9);
  }
  60% {
    opacity: 1;
    transform: translateX(2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Animasi pohon bergoyang pelan */
@keyframes sway {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.animate-sway {
  display: inline-block;
  animation: sway 3s ease-in-out infinite;
  transform-origin: bottom center;
}

/* ============ MOBILE ACTIVE ============ */
.mobile-active {
  background: #e8f5e9;
}

/* ============ PAGE TRANSITIONS ============ */
</style>

<style>
/* Global page transition — pakai style tanpa scoped agar class tersambung ke child */
.page-enter-active,
.page-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
</style>
