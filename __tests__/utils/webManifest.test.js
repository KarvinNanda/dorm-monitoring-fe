/**
 * Web app manifest (issue #18). iOS hanya mendukung web push untuk situs yang
 * ditambahkan ke Layar Utama, dan itu butuh manifest dengan display standalone.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

// vitest `root` = folder project (lihat __tests__/vitest.config.js).
const root = process.cwd() + '/'
const read = (p) => readFileSync(root + p, 'utf8')

describe('web app manifest', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'))

  it('nama, display standalone, dan start_url di dalam scope', () => {
    expect(manifest.name).toBe('Rumah Alam Bahagia')
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true)
  })

  it('ikon 192 dan 512 (any) plus 512 maskable, semua file-nya ada', () => {
    const bySize = (size, purpose) =>
      manifest.icons.find((i) => i.sizes === size && (i.purpose || 'any').split(' ').includes(purpose))
    expect(bySize('192x192', 'any')).toBeTruthy()
    expect(bySize('512x512', 'any')).toBeTruthy()
    expect(bySize('512x512', 'maskable')).toBeTruthy()
    for (const icon of manifest.icons) {
      expect(existsSync(root + 'public' + icon.src), icon.src).toBe(true)
    }
  })

  it('index.html menautkan manifest dan apple-touch-icon', () => {
    const html = read('index.html')
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/)
    expect(html).toMatch(/<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/)
    expect(existsSync(root + 'public/apple-touch-icon.png')).toBe(true)
  })
})
