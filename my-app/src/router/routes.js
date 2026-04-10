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
        meta: { requiresAuth: true, roles: ['admin', 'resident', 'guest'] }
      },
      {
        path: 'absen',
        name: 'Absen',
        component: () => import('@/modules/absen/views/AbsenPage.vue'),
        meta: { requiresAuth: true, roles: ['admin', 'resident', 'guest'] }
      },
      {
        path: 'tamu',
        name: 'Tamu',
        component: () => import('@/modules/tamu/views/TamuPage.vue'),
        meta: { requiresAuth: true, roles: ['admin', 'resident', 'guest'] }
      }
      // Kendaraan & Users disembunyikan sementara — akan diaktifkan kembali
      // saat fitur tersebut mulai dikembangkan.
      // {
      //   path: 'kendaraan',
      //   name: 'Kendaraan',
      //   component: () => import('@/modules/kendaraan/views/KendaraanPage.vue'),
      //   meta: { requiresAuth: true, roles: ['admin', 'resident', 'guest'] }
      // },
      // {
      //   path: 'users',
      //   name: 'Users',
      //   component: () => import('@/modules/user/views/UserList.vue'),
      //   meta: { requiresAuth: true, roles: ['admin'] }
      // }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

export default routes
