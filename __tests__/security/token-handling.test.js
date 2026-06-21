/**
 * Audit penanganan token auth.
 *
 * Memastikan invariant yang penting:
 * 1. Setelah logout / 401 refresh gagal → SEMUA data user + token dibersihkan
 *    dari state dan localStorage. Tidak ada residu.
 * 2. Token TIDAK di-log ke console (grep src/ untuk pattern console.log(token)).
 * 3. api.js baseURL bukan localhost/127.0.0.1 kalau di-deploy (ini cuma warning
 *    karena saat dev wajar, tapi kita assert pakai pola http://192.168.* yang
 *    memang sedang dipakai — kalau berubah jadi https:// itu OK, kalau berubah
 *    jadi localhost di-commit itu accidentally merged dari lokal).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

const srcDir = join(process.cwd(), 'src')

function walk(dir) {
  const results = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) results.push(...walk(p))
    else if (/\.(js|vue)$/.test(e)) results.push(p)
  }
  return results
}

describe('security: token handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('clearAuth membersihkan SEMUA token + user dari localStorage', () => {
    const store = useAuthStore()
    store.setTokens('a', 'r')
    store.setUser({ id: 1, email: 'k@x' })
    expect(localStorage.getItem('accessToken')).toBeTruthy()
    expect(localStorage.getItem('refreshToken')).toBeTruthy()
    expect(localStorage.getItem('user')).toBeTruthy()

    store.clearAuth()

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('token tidak di-log ke console di manapun di src/', () => {
    const files = walk(srcDir)
    const hits = []
    for (const file of files) {
      const rel = file.replace(srcDir, '').replace(/\\/g, '/')
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        // Pola: console.(log|debug|info)(...(token|accessToken|refreshToken)...)
        if (/console\.(log|debug|info)\s*\([^)]*\b(token|accessToken|refreshToken|Bearer)\b/i.test(line)) {
          hits.push({ file: rel, line: idx + 1, snippet: line.trim() })
        }
      })
    }
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([])
  })

  it('Bearer header hanya dibentuk di api.js', () => {
    const files = walk(srcDir)
    const hits = []
    for (const file of files) {
      const rel = file.replace(srcDir, '').replace(/\\/g, '/')
      if (rel.endsWith('/services/api.js')) continue
      const content = readFileSync(file, 'utf-8')
      if (/Authorization\s*[:=]\s*['"`]?Bearer/i.test(content)) {
        hits.push(rel)
      }
    }
    expect(hits, `Authorization header hanya boleh di api.js, ditemukan: ${hits.join(', ')}`).toEqual([])
  })

  it('api.js BASE_URL tidak mengandung protokol berbahaya', () => {
    // BASE_URL boleh berupa relative path (/api/v1) untuk Vite proxy,
    // atau absolute https:// untuk production.
    // Yang dilarang: javascript:, data:, file:, ftp:
    const apiSource = readFileSync(join(srcDir, 'services', 'api.js'), 'utf-8')
    const match = apiSource.match(/BASE_URL\s*=\s*['"`]([^'"`]+)['"`]/)
    expect(match, 'BASE_URL harus di-declare di api.js').not.toBeNull()
    const url = match[1]
    // Boleh relative (/api/...) atau https?:// — yang penting bukan protokol berbahaya
    expect(url).not.toMatch(/^(javascript|data|file|ftp):/i)
    expect(url).not.toMatch(/^http:\/\/localhost/i)
  })
})
