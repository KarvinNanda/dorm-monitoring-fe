/**
 * Smoke test untuk konfigurasi router.
 *
 * Memastikan semua halaman utama (termasuk halaman baru: inventory & facility)
 * ter-register dengan benar — meta.requiresAuth, role gating, dan path konsisten
 * dengan menu di MainLayout.
 */
import { describe, it, expect } from 'vitest'
import routes from '@/router/routes'

function flatten(rs, parent = '') {
  const out = []
  for (const r of rs) {
    const path = r.path?.startsWith('/') ? r.path : `${parent}/${r.path || ''}`.replace(/\/+/g, '/')
    out.push({ ...r, fullPath: path.replace(/\/$/, '') || '/' })
    if (r.children) out.push(...flatten(r.children, path))
  }
  return out
}

const all = flatten(routes)

describe('router routes', () => {
  it('memiliki rute Login publik', () => {
    const login = all.find((r) => r.name === 'Login')
    expect(login).toBeDefined()
    expect(login.meta?.requiresAuth).toBe(false)
  })

  it('rute Dashboard butuh auth', () => {
    const dash = all.find((r) => r.name === 'Dashboard')
    expect(dash).toBeDefined()
    expect(dash.meta?.requiresAuth).toBe(true)
  })

  it('rute Users dibatasi role admin', () => {
    const users = all.find((r) => r.name === 'Users')
    expect(users).toBeDefined()
    expect(users.meta?.roles).toEqual(['admin'])
  })

  it('rute Inventory ada dan dibatasi admin/receptionist/resident', () => {
    const inv = all.find((r) => r.name === 'Inventory')
    expect(inv).toBeDefined()
    expect(inv.fullPath).toBe('/inventory')
    expect(inv.meta?.requiresAuth).toBe(true)
    expect(inv.meta?.roles).toEqual(
      expect.arrayContaining(['admin', 'receptionist', 'resident'])
    )
  })

  it('rute Facility ada dan butuh auth (semua role)', () => {
    const fac = all.find((r) => r.name === 'Facility')
    expect(fac).toBeDefined()
    expect(fac.fullPath).toBe('/facility')
    expect(fac.meta?.requiresAuth).toBe(true)
  })

  it('catch-all redirect ke /dashboard', () => {
    const wildcard = routes.find((r) => r.path?.includes(':pathMatch'))
    expect(wildcard).toBeDefined()
    expect(wildcard.redirect).toBe('/dashboard')
  })

  it('halaman protected menggunakan dynamic import (lazy)', () => {
    const lazyRoutes = ['Dashboard', 'Inventory', 'Facility', 'Users', 'Tamu', 'Absen', 'Profile']
    for (const name of lazyRoutes) {
      const r = all.find((x) => x.name === name)
      expect(r, `route ${name} harus terdaftar`).toBeDefined()
      expect(typeof r.component, `${name} pakai lazy import`).toBe('function')
    }
  })
})
