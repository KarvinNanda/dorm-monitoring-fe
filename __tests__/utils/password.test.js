/**
 * New-password rules, same as the backend IsNewPassword():
 * class-validator MinLength(8) (counts characters, an emoji is 1) and
 * IsByteLength(0, 72) (counts UTF-8 bytes, because bcrypt reads 72 bytes).
 */
import { describe, it, expect } from 'vitest'
import { newPasswordError, passwordByteLength, PASSWORD_MAX_BYTES } from '@/utils/password'

describe('newPasswordError', () => {
  it('kosong / kurang dari 8 karakter → pesan minimal', () => {
    expect(newPasswordError('')).toMatch(/minimal 8/)
    expect(newPasswordError('1234567')).toMatch(/minimal 8/)
  })

  it('8 sampai 72 byte → valid', () => {
    expect(newPasswordError('12345678')).toBe('')
    expect(newPasswordError('a'.repeat(72))).toBe('')
  })

  it('73 byte → pesan maksimal', () => {
    expect(newPasswordError('a'.repeat(73))).toMatch(/72/)
  })

  it('menghitung byte, bukan karakter: 25 karakter "é" = 50 byte valid, 37 = 74 byte ditolak', () => {
    expect(passwordByteLength('é')).toBe(2)
    expect(newPasswordError('é'.repeat(25))).toBe('')
    expect(newPasswordError('é'.repeat(37))).toMatch(/72/)
  })

  it('emoji dihitung 1 karakter untuk batas minimal (seperti backend), 4 byte untuk batas maksimal', () => {
    // 4 emoji = 8 UTF-16 units but 4 characters: backend MinLength(8) rejects.
    expect(newPasswordError('😀😀😀😀')).toMatch(/minimal 8/)
    expect(newPasswordError('😀'.repeat(18))).toBe('') // 72 bytes
    expect(newPasswordError('😀'.repeat(19))).toMatch(/72/) // 76 bytes
  })

  it('batas maksimal = 72', () => {
    expect(PASSWORD_MAX_BYTES).toBe(72)
  })
})
