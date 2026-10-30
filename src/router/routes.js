import MainLayout from '@/layouts/MainLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const routes = [
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/modules/auth/views/LoginPage.vue'),
        meta: { requiresAuth: false }
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/modules/dashboard/views/DashboardPage.vue'),
        // Tidak ada gate role di dashboard — semua user login boleh akses
        // (jangan kunci dashboard, karena ini target fallback dari guard).
        meta: { requiresAuth: true }
      },
      {
        path: 'absen',
        name: 'Absen',
        component: () => import('@/modules/absen/views/AbsenPage.vue'),
        // Backend /check-log: in/out/status hanya Resident, riwayat semua user Admin.
        meta: { requiresAuth: true, roles: ['admin', 'resident'] }
      },
      {
        path: 'tamu',
        name: 'Tamu',
        component: () => import('@/modules/tamu/views/TamuPage.vue'),
        // Backend /guest dan /guest-visit: Admin dan Receptionist.
        meta: { requiresAuth: true, roles: ['admin', 'receptionist'] }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/modules/user/views/UserList.vue'),
        meta: { requiresAuth: true, roles: ['admin'] }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/modules/inventory/views/InventoryPage.vue'),
        meta: { requiresAuth: true, roles: ['admin', 'receptionist', 'resident'] }
      },
      {
        path: 'facility',
        name: 'Facility',
        component: () => import('@/modules/facility/views/FacilityPage.vue'),
        // Baca: semua role. Tulis: hanya admin (tombol aksi disembunyikan di halaman).
        meta: { requiresAuth: true, roles: ['admin', 'receptionist', 'resident'] }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/modules/user/views/ProfilePage.vue'),
        meta: { requiresAuth: true }
      }
      // Kendaraan disembunyikan sementara — akan diaktifkan kembali
      // saat fitur tersebut mulai dikembangkan.
      // {
      //   path: 'kendaraan',
      //   name: 'Kendaraan',
      //   component: () => import('@/modules/kendaraan/views/KendaraanPage.vue'),
      //   meta: { requiresAuth: true, roles: ['admin', 'resident', 'guest'] }
      // }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

export default routes
