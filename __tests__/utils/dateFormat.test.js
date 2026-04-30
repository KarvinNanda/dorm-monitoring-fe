/**
 * Unit test untuk util WIB di src/utils/dateFormat.js.
 *
 * Tujuan utama:
 * 1. Memastikan semua helper mengunci output ke Asia/Jakarta (UTC+7), terlepas
 *    dari timezone mesin yang menjalankan test.
 * 2. Roundtrip input <datetime-local> (anggapan WIB) ↔ ISO UTC konsisten.
 * 3. Handling input invalid / kosong tidak throw — mengembalikan sentinel.
 */
import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatTime,
  toJakartaDatetimeInput,
  jakartaInputToISO,
  nowJakartaDatetimeInput,
  formatDateLong,
  todayJakartaDate
} from '@/utils/dateFormat'

describe('dateFormat util (Asia/Jakarta lock)', () => {
  describe('formatDate', () => {
    it('render tanggal+jam WIB dari ISO UTC', () => {
      // 01:00Z = 08:00 WIB pada 14 April 2025
      const out = formatDate('2025-04-14T01:00:00Z')
      expect(out).toMatch(/14 Apr(\.)? 2025/)
      expect(out).toContain('08.00')
    })

    it('mengembalikan "-" untuk input kosong / invalid', () => {
      expect(formatDate('')).toBe('-')
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
      expect(formatDate('not-a-date')).toBe('-')
    })

    it('cross-midnight: 20:00 UTC = 03:00 WIB keesokan hari', () => {
      // 2025-04-13 20:00Z → 2025-04-14 03:00 WIB
      const out = formatDate('2025-04-13T20:00:00Z')
      expect(out).toMatch(/14 Apr/)
      expect(out).toContain('03.00')
    })
  })

  describe('formatTime', () => {
    it('render HH:mm WIB', () => {
      expect(formatTime('2025-04-14T01:00:00Z')).toBe('08.00')
      expect(formatTime('2025-04-13T23:30:00Z')).toBe('06.30')
    })

    it('fallback "--:--" untuk invalid', () => {
      expect(formatTime('')).toBe('--:--')
      expect(formatTime('nope')).toBe('--:--')
    })
  })

  describe('toJakartaDatetimeInput', () => {
    it('return "YYYY-MM-DDTHH:mm" dalam zona WIB', () => {
      expect(toJakartaDatetimeInput('2025-04-14T01:00:00Z')).toBe('2025-04-14T08:00')
    })

    it('handle pergantian hari antar UTC dan WIB', () => {
      expect(toJakartaDatetimeInput('2025-04-13T20:00:00Z')).toBe('2025-04-14T03:00')
    })

    it('return "" untuk input kosong / invalid', () => {
      expect(toJakartaDatetimeInput('')).toBe('')
      expect(toJakartaDatetimeInput(null)).toBe('')
      expect(toJakartaDatetimeInput('xxx')).toBe('')
    })
  })

  describe('jakartaInputToISO', () => {
    it('interpretasi input sebagai WIB → UTC ISO', () => {
      // 08:00 WIB = 01:00 UTC
      expect(jakartaInputToISO('2025-04-14T08:00')).toBe('2025-04-14T01:00:00.000Z')
    })

    it('roundtrip: toJakartaDatetimeInput(jakartaInputToISO(x)) == x', () => {
      const input = '2025-04-14T08:30'
      const iso = jakartaInputToISO(input)
      expect(toJakartaDatetimeInput(iso)).toBe(input)
    })

    it('return undefined untuk kosong / invalid', () => {
      expect(jakartaInputToISO('')).toBeUndefined()
      expect(jakartaInputToISO(null)).toBeUndefined()
      expect(jakartaInputToISO('bukan-tanggal')).toBeUndefined()
    })
  })

  describe('nowJakartaDatetimeInput', () => {
    it('return string format "YYYY-MM-DDTHH:mm"', () => {
      const out = nowJakartaDatetimeInput()
      expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })

  describe('formatDateLong', () => {
    it('render tanggal panjang id-ID zona WIB', () => {
      // Senin, 14 April 2025 WIB (input 01:00Z dipakai di WIB = 14 April)
      const out = formatDateLong('2025-04-14T01:00:00Z')
      expect(out).toContain('2025')
      expect(out).toMatch(/April/)
      expect(out).toContain('14')
    })

    it('tanpa argumen → pakai now, tetap valid string', () => {
      const out = formatDateLong()
      expect(typeof out).toBe('string')
      expect(out.length).toBeGreaterThan(0)
      expect(out).not.toBe('-')
    })

    it('invalid → "-"', () => {
      expect(formatDateLong('not-a-date')).toBe('-')
    })
  })

  describe('todayJakartaDate', () => {
    it('return YYYY-MM-DD zona WIB dari ISO', () => {
      expect(todayJakartaDate('2025-04-14T01:00:00Z')).toBe('2025-04-14')
      expect(todayJakartaDate('2025-04-13T20:00:00Z')).toBe('2025-04-14')
      expect(todayJakartaDate('2025-04-13T16:59:59Z')).toBe('2025-04-13')
    })

    it('tanpa argumen → tanggal hari ini format YYYY-MM-DD', () => {
      expect(todayJakartaDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('invalid → ""', () => {
      expect(todayJakartaDate('xxx')).toBe('')
    })
  })
})
