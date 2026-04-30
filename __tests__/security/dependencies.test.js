/**
 * Security check terhadap dependency pihak ketiga.
 *
 * Strategi:
 * 1. Jalankan `npm audit --json` dan parse ringkasan vulnerability per severity.
 * 2. Fail test kalau ada severity 'high' atau 'critical'.
 * 3. Warning (console.warn) untuk 'moderate' — tidak fail, tapi tercatat di output
 *    supaya kelihatan.
 * 4. Lock-file sanity: hanya boleh ada satu lockfile (package-lock.json) —
 *    yarn.lock / pnpm-lock.yaml mengindikasikan pencampuran package manager
 *    yang bisa bikin state tidak deterministik.
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Vitest config set `root` = project root, jadi process.cwd() konsisten
// merujuk ke root project saat test berjalan.
const rootDir = process.cwd()
// eslint-disable-next-line no-unused-vars
const _p = path // keep reference

function runAudit() {
  try {
    const out = execSync('npm audit --json', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return JSON.parse(out)
  } catch (err) {
    // npm audit exits dengan code != 0 kalau ada vulnerability — tetap ambil stdout-nya.
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.toString())
      } catch (_) {
        return null
      }
    }
    return null
  }
}

describe('security: dependencies', () => {
  it('npm audit jalan dan mengembalikan JSON', () => {
    const report = runAudit()
    expect(report).not.toBeNull()
    expect(report).toHaveProperty('metadata')
  }, 60000)

  it('TIDAK ada vulnerability severity high / critical', () => {
    const report = runAudit()
    if (!report) return // sudah di-cover test di atas
    const v = report.metadata?.vulnerabilities || {}

    // Log ringkasan ke console agar kelihatan saat test run
    // eslint-disable-next-line no-console
    console.log('[audit] vulnerabilities:', v)

    expect(v.high || 0, 'ada vulnerability HIGH — jalankan "npm audit fix"').toBe(0)
    expect(v.critical || 0, 'ada vulnerability CRITICAL — jalankan "npm audit fix"').toBe(0)
  }, 60000)

  it('hanya ada satu lockfile (package-lock.json)', () => {
    expect(existsSync(`${rootDir}/package-lock.json`)).toBe(true)
    expect(
      existsSync(`${rootDir}/yarn.lock`),
      'yarn.lock tidak boleh ada bersamaan dengan package-lock.json'
    ).toBe(false)
    expect(
      existsSync(`${rootDir}/pnpm-lock.yaml`),
      'pnpm-lock.yaml tidak boleh ada bersamaan dengan package-lock.json'
    ).toBe(false)
  })

  it('package.json tidak menyimpan secret / URL production hardcoded yang sensitif', () => {
    // Heuristik simpel: cari pola token-like di package.json (jarang ada, tapi
    // sudah pernah terjadi — developer accidentally paste AWS key ke scripts).
    const raw = readFileSync(`${rootDir}/package.json`, 'utf-8')
    const suspicious = [
      /AKIA[0-9A-Z]{16}/, // AWS access key
      /ghp_[A-Za-z0-9]{36}/, // GitHub PAT
      /xox[baprs]-[A-Za-z0-9-]{10,}/ // Slack token
    ]
    for (const re of suspicious) {
      expect(raw, `secret pattern terdeteksi: ${re}`).not.toMatch(re)
    }
  })
})
