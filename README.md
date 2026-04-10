# 🌲 Sistem Internal — Dorm Monitor Frontend

Frontend aplikasi internal untuk monitoring dorm, dibangun dengan **Vue 3**, **Vite**, **Tailwind CSS**, **Vue Router**, dan **Pinia**.

Saat ini fokus pengembangan ada di tiga menu utama:
- 🌿 **Dashboard** — ringkasan info akun & statistik
- 🍃 **Absensi** — tap in / tap out harian
- 🌱 **Tamu** — manajemen data tamu & catatan kunjungan

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
│   ├── modules/                 # Fitur per modul
│   │   ├── auth/views/          # LoginPage
│   │   ├── dashboard/views/     # DashboardPage
│   │   ├── absen/views/         # AbsenPage
│   │   └── tamu/views/          # TamuPage
│   ├── router/
│   │   ├── index.js             # Router config + navigation guard
│   │   └── routes.js             # Daftar route
│   ├── services/
│   │   ├── api.js               # Axios instance + interceptor
│   │   ├── authService.js       # Auth API (login, logout, refresh, me)
│   │   └── userService.js       # User management API
│   ├── stores/
│   │   └── authStore.js         # Pinia store untuk auth
│   ├── utils/
│   │   └── dummyData.js         # Data dummy (Guest, GuestVisit)
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
| Refresh Token | ✅ Selesai | API real |
| Dashboard | ✅ Selesai | Sebagian dummy |
| Absensi (tap in/out) | 🟡 UI only | Dummy (belum ada endpoint) |
| Manajemen Tamu | 🟡 UI only | Dummy (belum ada endpoint) |
| Manajemen User | 🔒 Disembunyikan | Menunggu dikembangkan |
| Kendaraan | 🔒 Disembunyikan | Menunggu dikembangkan |

---

## 🛠️ Troubleshooting

### Error: `Cannot find module` saat `npm run dev`
Hapus `node_modules` dan install ulang:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Halaman kosong / CSS tidak keluar
Bersihkan cache Vite:
```bash
rm -rf node_modules/.vite
npm run dev
```
Lalu hard refresh browser: **Ctrl + Shift + R**

### Error CORS saat login
Backend belum mengizinkan origin frontend. Minta tim backend untuk enable CORS untuk `http://localhost:5173`.

### Error: `Network Error` saat login
- Pastikan backend API sudah jalan
- Cek base URL di `src/services/api.js` sesuai alamat backend kamu
- Coba ping alamat backend dari browser: `http://192.168.75.128:3000/api/v1/`

### Port 5173 sudah dipakai
Jalankan dengan port lain:
```bash
npm run dev -- --port 5174
```

---

## 🤝 Kontribusi

1. Buat branch baru dari `main`:
   ```bash
   git checkout -b feat/nama-fitur
   ```
2. Commit perubahan dengan pesan yang jelas
3. Push ke repository:
   ```bash
   git push origin feat/nama-fitur
   ```
4. Buat Pull Request ke `main`

### Konvensi Commit

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — fitur baru
- `fix:` — bug fix
- `refactor:` — refactoring code
- `style:` — perubahan UI/styling
- `docs:` — update dokumentasi
- `chore:` — maintenance, config, dll

Contoh:
```
feat: tambah halaman manajemen kunjungan tamu
fix: perbaiki token refresh loop saat session expired
```

---

## 📝 Catatan Pengembangan

- Semua teks UI menggunakan **Bahasa Indonesia**
- Primary color: `#2E7D32` (hijau), Secondary: `#6D4C41` (coklat)
- Tema visual sidebar menggunakan nuansa pohon (tree structure)
- Menu Kendaraan & Users disembunyikan sementara sampai fitur tersebut mulai dikembangkan
- Data dummy Tamu & Absen ada di `src/utils/dummyData.js` — hapus & ganti dengan service API kalau endpoint sudah tersedia

---

## 📄 License

Internal use only — Dorm Monitoring System
