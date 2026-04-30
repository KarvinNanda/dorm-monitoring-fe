# 🌲 Sistem Internal — Dorm Monitor Frontend

Frontend aplikasi internal untuk monitoring dorm, dibangun dengan **Vue 3**, **Vite**, **Tailwind CSS**, **Vue Router**, dan **Pinia**.

Menu yang sudah aktif:
- 🌿 **Dashboard** — ringkasan info akun & statistik
- 🍃 **Absensi** — tap in / tap out harian + manual entry & status terkini
- 🌱 **Tamu** — manajemen data tamu & catatan kunjungan
- 👥 **Users** — manajemen akun, role, aktivasi
- 📦 **Inventaris** — item, kategori, transaksi stok
- 🏛️ **Fasilitas** — daftar fasilitas + reservasi 
- 👤 **Profil** — kelola akun sendiri & ganti password

---

## 📋 Prasyarat

Pastikan sudah terinstall di komputer kamu:

| Tool | Versi Minimum | Cek dengan |
|------|---------------|------------|
| [Node.js](https://nodejs.org/) | 18.x atau lebih baru | `node -v` |
| npm | 9.x atau lebih baru | `npm -v` |
| Git | versi terbaru | `git --version` |

> 💡 Rekomendasi: install Node.js via [nvm](https://github.com/nvm-sh/nvm) supaya gampang ganti versi.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Clone repository

```bash
git clone <URL_REPOSITORY>
```

### 2. Install dependencies

```bash
npm install
```

Perintah ini akan menginstall semua package yang dibutuhkan (Vue, Vite, Tailwind, Axios, Pinia, dll).

### 3. Jalankan development server

```bash
npm run dev
```

Setelah server jalan, buka browser dan akses:

```
http://localhost:5173
```

Kamu akan langsung diarahkan ke halaman login karena belum ada sesi aktif.

### 4. Login

Gunakan akun yang sudah terdaftar di backend API. Pastikan backend API sudah **berjalan dan bisa diakses** dari mesin kamu sebelum login. (Lihat bagian [Konfigurasi API](#-konfigurasi-api) di bawah.)

---

## 📦 Script NPM

| Perintah | Kegunaan |
|----------|----------|
| `npm run dev` | Jalankan development server (hot reload) |
| `npm run build` | Build aplikasi untuk production ke folder `dist/` |
| `npm run preview` | Preview hasil build production secara lokal |
| `npm test` | Jalankan seluruh suite test (Vitest) sekali |
| `npm run test:watch` | Watch mode untuk TDD |
| `npm run test:coverage` | Generate coverage report (text + html ke `coverage/`) |
| `npm run test:security` | Hanya jalankan security suite (audit + pattern scan) |
| `npm run audit` | Alias untuk `npm audit` |

---

## ⚙️ Konfigurasi API

Base URL API diatur di file `src/services/api.js`:

```js
const BASE_URL = 'http://192.168.75.128:3000/api/v1'
```

Kalau backend kamu jalan di alamat berbeda, ubah nilai `BASE_URL` di file tersebut.

> ⚠️ **Pastikan backend API sudah CORS-enabled** untuk origin `http://localhost:5173`, kalau tidak browser akan memblokir request dari frontend.

---

## 📁 Struktur Folder

```
my-app/
├── public/                      # Static assets
├── src/
│   ├── assets/                  # Gambar, font, dll
│   ├── components/ui/           # Komponen UI reusable
│   ├── layouts/
│   │   ├── MainLayout.vue       # Layout utama (sidebar + konten)
│   │   └── AuthLayout.vue       # Layout halaman login
│   ├── modules/                 # Fitur per modul (lazy-loaded)
│   │   ├── auth/views/          # LoginPage
│   │   ├── dashboard/views/     # DashboardPage
│   │   ├── absen/views/         # AbsenPage (resident + admin section)
│   │   ├── tamu/views/          # TamuPage (visit + guest tabs)
│   │   ├── user/views/          # UserList + ProfilePage
│   │   ├── inventory/views/     # InventoryPage (items + categories + transactions)
│   │   └── facility/views/      # FacilityPage (facilities + reservations)
│   ├── router/
│   │   ├── index.js             # Router config + navigation guard (auth + role)
│   │   └── routes.js            # Daftar route
│   ├── services/                # 1 file per resource API, axios di-mock-able
│   │   ├── api.js               # Axios instance + 401-refresh interceptor
│   │   ├── authService.js       # /auth/login, /auth/refresh, /user/me
│   │   ├── userService.js       # /user, /role
│   │   ├── checkLogService.js   # /check-log
│   │   ├── guestService.js      # /guest
│   │   ├── guestVisitService.js # /guest-visit
│   │   ├── itemService.js       # /item, /item/:id/transactions
│   │   ├── itemCategoryService.js
│   │   ├── itemTransactionService.js  # /item-transaction (admin only)
│   │   ├── facilityService.js
│   │   └── facilityReservationService.js
│   ├── stores/
│   │   └── authStore.js         # Pinia store: user, tokens, hasRole / hasAnyRole
│   ├── utils/
│   │   ├── dateFormat.js        # WIB (Asia/Jakarta) lock
│   │   └── dummyData.js         # Seed lokal untuk dashboard counter
│   ├── App.vue
│   ├── main.js                  # Entry point
│   └── style.css                # Global styles + Tailwind directives
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

---

## 🔐 Flow Autentikasi

1. User input email & password di halaman login
2. Frontend call **POST `/auth/login`** → dapat `accessToken` & `refreshToken`
3. Token disimpan di `localStorage` melalui Pinia store
4. Frontend call **GET `/user/me`** → dapat data user → simpan di store
5. Redirect ke `/dashboard`
6. Setiap request berikutnya otomatis attach `Authorization: Bearer <accessToken>` via axios interceptor
7. Jika ada response `401` → interceptor otomatis coba **POST `/auth/refresh`** dengan refresh token, lalu retry request asli
8. Kalau refresh gagal → clear auth + redirect ke `/login`

---

## 🎨 Tech Stack

- **[Vue 3](https://vuejs.org/)** — Composition API, `<script setup>`
- **[Vite](https://vitejs.dev/)** — Build tool & dev server
- **[Vue Router](https://router.vuejs.org/)** — Routing dengan role-based guard
- **[Pinia](https://pinia.vuejs.org/)** — State management
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first CSS
- **[Axios](https://axios-http.com/)** — HTTP client

---

## 🎯 Status Fitur

| Fitur | Status | Data Source |
|-------|--------|-------------|
| Login / Logout | ✅ Selesai | API real |
| Refresh Token (auto-retry 401) | ✅ Selesai | API real |
| Dashboard | ✅ Selesai | User dari API, counter dari dummy |
| Absensi (tap in/out, manual entry, riwayat) | ✅ Selesai | API real (`/check-log`) |
| Manajemen Tamu (guest + visit + close) | ✅ Selesai | API real (`/guest`, `/guest-visit`) |
| Manajemen User (CRUD, role assign, activate, reset password) | ✅ Selesai | API real (`/user`, `/role`) |
| Profil Saya (update + ganti password) | ✅ Selesai | API real |
| Inventaris (item, kategori, transaksi) | ✅ Selesai | API real (`/item`, `/item-category`, `/item-transaction`) |
| Fasilitas + Reservasi | ✅ Selesai | API real (`/facility`, `/facility-reservation`) |
| Kendaraan | 🔒 Disembunyikan | Menunggu dikembangkan |

---

## 🛡️ Permission Gating

Tiga lapis gating, dari paling longgar ke paling ketat:

1. **Backend** (otoritas final) — sesuai dokumen API V1–V4
2. **Route guard** (`src/router/index.js` + `routes.js`) — cegah direct-URL
   access bila role tidak sesuai
3. **Menu visibility** (`src/layouts/MainLayout.vue`) — sembunyikan menu
   yang biasanya tidak relevan untuk role tersebut, walau secara teknis
   mungkin masih punya read access di backend

### Resource × Role (backend)

| Resource              | Read                          | Write (C/U/D)  |
| --------------------- | ----------------------------- | -------------- |
| User & Role           | Admin                         | Admin          |
| Check Log             | Resident (own), Admin (all)   | Admin (manual) |
| Guest & Guest Visit   | Semua                         | Admin          |
| Item & Item Category  | Admin, Receptionist, Resident | **Admin only** |
| Item Transaction      | **Admin only**                | **Admin only** |
| Facility              | Semua                         | **Admin only** |
| Facility Reservation  | Semua                         | **Admin only** |

### Menu visibility per role (sidebar / bottom-nav)

Menu di-filter di `MainLayout.vue` berdasarkan `meta.roles` per item. Bila
sebuah role tidak relevan secara workflow, menu-nya disembunyikan walau
backend mungkin mengizinkan akses.

| Menu        | Admin | Receptionist | Resident | Guest |
| ----------- | :---: | :----------: | :------: | :---: |
| Dashboard   | ✅    | ✅           | ✅       | ✅    |
| Absensi     | ✅    | —            | ✅       | —     |
| Tamu        | ✅    | ✅           | —        | —     |
| Inventaris  | ✅    | ✅           | ✅       | —     |
| Fasilitas   | ✅    | —            | —        | —     |
| Users       | ✅    | —            | —        | —     |
| Profil      | ✅    | ✅           | ✅       | ✅    |

> Catatan: route guard di `routes.js` lebih longgar dari menu visibility
> untuk beberapa rute (mis. `/facility` di-allow semua role login di route
> guard, tetapi menu hanya muncul untuk admin). Ini disengaja — admin bisa
> share link langsung ke role lain tanpa di-block, tapi normal navigation
> tidak menampilkan menu yang biasanya tidak relevan.

---

## 📱 Mobile Responsive

Semua halaman bertabel punya **dua tampilan**:

- **Desktop (≥ 768px)** — tabel klasik dengan `hidden md:block`
- **Mobile (< 768px)** — daftar kartu vertikal dengan `md:hidden` (no horizontal scroll)

Kartu mobile menampilkan field utama secara vertikal, badge/status di kanan
atas, dan tombol aksi dengan label teks (mis. `✏️ Ubah` bukan hanya `✏️`)
agar nyaman ditekan dengan jari.

---

## 🧪 Test Suite

Stack: **Vitest 4** + happy-dom + @vue/test-utils + @vitest/coverage-v8.

### Layout

```
__tests__/
├── vitest.config.js
├── setup.js                      # reset Pinia + localStorage tiap test
├── utils/dateFormat.test.js
├── stores/authStore.test.js
├── router/routes.test.js
├── services/                     # mock axios per service
│   ├── api.test.js               # request/response interceptor + refresh flow
│   ├── authService.test.js
│   ├── userService.test.js
│   ├── checkLogService.test.js
│   ├── guestService.test.js
│   ├── guestVisitService.test.js
│   ├── itemService.test.js
│   ├── itemCategoryService.test.js
│   ├── itemTransactionService.test.js
│   ├── facilityService.test.js
│   └── facilityReservationService.test.js
├── components/                   # smoke + interaction tests halaman
│   ├── LoginPage.test.js
│   ├── DashboardPage.test.js
│   ├── ProfilePage.test.js
│   ├── TamuPage.test.js
│   ├── AbsenPage.test.js
│   ├── UserList.test.js
│   ├── InventoryPage.test.js     # + permission gating non-admin
│   ├── FacilityPage.test.js      # + permission gating non-admin
│   └── MainLayout.test.js        # role-based menu visibility + logout
└── security/
    ├── dependencies.test.js      # npm audit + lockfile sanity + secret scan
    ├── code-patterns.test.js     # eval / innerHTML / v-html / hardcoded creds
    └── token-handling.test.js    # clearAuth completeness, no console.log(token)
```

### Status

**199 tests / 26 files / 100% passing.** Jalankan `npm test` untuk verifikasi.


### Pola test

- **Service test**: `vi.mock('@/services/api', () => ({ default: { get, post, ... } }))` lalu assert `api.get` dipanggil dengan path + params yang benar.
- **Component test**: `mount` via @vue/test-utils, mock service modules, helper `loginAs(role)` untuk seed authStore.
- **Permission gating test**: tiap halaman dengan tombol RW punya describe block "permission gating (non-admin)" yang verifikasi tombol Create/Update/Delete absen di DOM.
- **Security test**: regex-scan `src/` untuk pola berbahaya; jalankan `npm audit --json` dan fail bila ada vulnerability HIGH/CRITICAL.

---
