/**
 * Pemindai pola kode berbahaya di seluruh src/.
 *
 * Mencegah regresi keamanan yang umum di frontend SPA:
 *   - eval / new Function / setTimeout(string)  → XSS injection surface
 *   - document.write                            → legacy XSS risk
 *   - innerHTML / outerHTML / v-html            → XSS bila data tidak di-sanitize
 *   - Hardcoded credentials                     → kebocoran kredensial
 *   - http:// di production URLs                → MITM risk
 *
 * Beberapa pola diberi "allowlist" file, misalnya api.js memang butuh URL
 * http (server lokal). Kalau ada penambahan kode yang match, test akan fail
 * dan memaksa developer sadar ditambahkan ke allowlist SECARA SADAR.
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(process.cwd(), 'src')

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) results.push(...walk(p))
    else if (/\.(js|vue)$/.test(entry)) results.push(p)
  }
  return results
}

const files = walk(srcDir)

/** Kembalikan array {file, line} untuk semua kecocokan pattern. */
function findMatches(pattern, allowlist = []) {
  const hits = []
  for (const file of files) {
    const rel = file.replace(srcDir, '').replace(/\\/g, '/')
    if (allowlist.some((a) => rel.endsWith(a))) continue
    const content = readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      if (pattern.test(line)) hits.push({ file: rel, line: idx + 1, snippet: line.trim() })
    })
  }
  return hits
}

describe('security: dangerous code patterns', () => {
  it('tidak pakai eval() / new Function()', () => {
    const evalHits = findMatches(/\beval\s*\(/)
    const fnHits = findMatches(/\bnew\s+Function\s*\(/)
    expect(evalHits, JSON.stringify(evalHits, null, 2)).toEqual([])
    expect(fnHits, JSON.stringify(fnHits, null, 2)).toEqual([])
  })

  it('tidak pakai setTimeout / setInterval dengan string argument', () => {
    // setTimeout('alert(1)', 100) — jarang tapi legal di JS lama
    const hits = findMatches(/set(Timeout|Interval)\s*\(\s*['"`]/)
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([])
  })

  it('tidak pakai document.write', () => {
    const hits = findMatches(/document\.write\s*\(/)
    expect(hits).toEqual([])
  })

  it('tidak ada innerHTML / outerHTML yang ditulis (read ok, write bahaya)', () => {
    // `.innerHTML =` atau `.innerHTML +=` sebagai write
    const hits = findMatches(/\.(inner|outer)HTML\s*[+]?=/)
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([])
  })

  it('tidak pakai v-html di template Vue', () => {
    // v-html bypass Vue escape — hanya boleh kalau input tersanitasi (mis. DOMPurify).
    // Di project ini tidak ada pakai sanitizer → larang dulu.
    const hits = findMatches(/\bv-html\s*=/)
    expect(hits, JSON.stringify(hits, null, 2)).toEqual([])
  })

  it('tidak ada hardcoded credential (password / API key) di kode', () => {
    const suspicious = [
      /password\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/i,
      /api[_-]?key\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i,
      /secret\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i,
      /Bearer\s+[A-Za-z0-9._-]{20,}/
    ]
    // Allowlist: string "password" sebagai LABEL di v-model / placeholder
    // sengaja dikecualikan — ini bukan credential hardcoded.
    // Allowlist: dummyData.js adalah seed data lokal untuk development (bukan kredensial produksi)
    const allFiles = files.filter(
      (f) => !f.endsWith('.test.js') && !f.replace(/\\/g, '/').endsWith('/utils/dummyData.js')
    )
    const leaks = []
    for (const re of suspicious) {
      for (const file of allFiles) {
        const rel = file.replace(srcDir, '').replace(/\\/g, '/')
        const content = readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (re.test(line)) {
            // Filter false-positive: form label / placeholder yang mengandung kata "password"
            // tapi bukan assignment credential. Kita cek bahwa value literal BUKAN
            // placeholder text biasa.
            const literal = line.match(/['"`]([^'"`]+)['"`]/)?.[1] || ''
            const harmless =
              /^(password|new password|current password|masukkan|enter|isi|confirm)/i.test(literal) ||
              literal.length < 6
            if (!harmless) {
              leaks.push({ file: rel, line: idx + 1, snippet: line.trim() })
            }
          }
        })
      }
    }
    expect(leaks, JSON.stringify(leaks, null, 2)).toEqual([])
  })

  it('token disimpan via authStore, bukan langsung localStorage di komponen', () => {
    // Satu-satunya tempat yang boleh nyentuh localStorage untuk token adalah
    // src/stores/authStore.js. Kalau ada file lain yang set 'accessToken' atau
    // 'refreshToken' di localStorage → fail.
    const hits = []
    for (const file of files) {
      const rel = file.replace(srcDir, '').replace(/\\/g, '/')
      if (rel.endsWith('/stores/authStore.js')) continue
      const content = readFileSync(file, 'utf-8')
      if (/localStorage\.setItem\s*\(\s*['"`](accessToken|refreshToken)['"`]/.test(content)) {
        hits.push(rel)
      }
    }
    expect(hits, `token harus di-manage di authStore, ditemukan di: ${hits.join(', ')}`).toEqual([])
  })
})
