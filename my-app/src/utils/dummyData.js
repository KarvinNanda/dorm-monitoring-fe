// ============================================
// DUMMY USERS (untuk login & host kunjungan)
// ============================================
export const dummyUsers = [
  {
    id: 1,
    name: 'Admin Utama',
    email: 'admin@internal.com',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  },
  {
    id: 2,
    name: 'Budi Santoso',
    email: 'budi@internal.com',
    password: 'resident123',
    role: 'resident',
    status: 'active'
  },
  {
    id: 3,
    name: 'Siti Rahmawati',
    email: 'siti@internal.com',
    password: 'resident123',
    role: 'resident',
    status: 'active'
  },
  {
    id: 4,
    name: 'Guest User',
    email: 'guest@internal.com',
    password: 'guest123',
    role: 'guest',
    status: 'active'
  }
]

// ============================================
// GUEST VISIT TYPE (placeholder — akan diganti
// sesuai enum GuestVisitType dari Postgres)
// ============================================
export const guestVisitTypes = [
  { value: 'KELUARGA', label: 'Keluarga' },
  { value: 'KERABAT', label: 'Kerabat' },
  { value: 'BISNIS', label: 'Bisnis' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'TAMU_RESMI', label: 'Tamu Resmi' },
  { value: 'LAINNYA', label: 'Lainnya' }
]

// ============================================
// GUEST (master data tamu)
// Schema: id, name, phoneNumber, note
// ============================================
export const dummyGuests = [
  {
    id: 1,
    name: 'Rudi Hermawan',
    phoneNumber: '081234567890',
    note: 'Rekan kerja dari kantor cabang Bandung'
  },
  {
    id: 2,
    name: 'Dewi Lestari',
    phoneNumber: '082198765432',
    note: 'Kurir dokumen rutin'
  },
  {
    id: 3,
    name: 'Agus Prasetyo',
    phoneNumber: '085712345678',
    note: 'Pelamar kerja posisi staff IT'
  },
  {
    id: 4,
    name: 'Lina Marlina',
    phoneNumber: '081387654321',
    note: 'Perwakilan vendor katering'
  },
  {
    id: 5,
    name: 'Pak Wayan',
    phoneNumber: '087812345600',
    note: 'Saudara Pak Budi'
  }
]

// ============================================
// GUEST VISIT (catatan kunjungan tamu)
// Schema: id, guestId, hostUserId, type,
//         eventTime, note
// ============================================
export const dummyGuestVisits = [
  {
    id: 1,
    guestId: 1,
    hostUserId: 2,
    type: 'BISNIS',
    eventTime: '2026-04-10T09:00:00',
    note: 'Meeting membahas proyek Q2'
  },
  {
    id: 2,
    guestId: 2,
    hostUserId: 1,
    type: 'VENDOR',
    eventTime: '2026-04-10T10:30:00',
    note: 'Pengiriman dokumen kontrak'
  },
  {
    id: 3,
    guestId: 3,
    hostUserId: 1,
    type: 'TAMU_RESMI',
    eventTime: '2026-04-10T13:00:00',
    note: 'Interview kandidat'
  },
  {
    id: 4,
    guestId: 5,
    hostUserId: 2,
    type: 'KELUARGA',
    eventTime: '2026-04-09T15:30:00',
    note: 'Kunjungan keluarga'
  }
]
