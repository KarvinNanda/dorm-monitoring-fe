/**
 * usePageSize: 10 rows per page on desktop (md breakpoint, >= 768px),
 * 5 rows on mobile. Follows the viewport when it crosses the breakpoint.
 */
import { describe, it, expect, vi } from 'vitest'
import { effectScope } from 'vue'
import { usePageSize, DESKTOP_QUERY } from '@/composables/usePageSize'

function mockViewport(desktop) {
  const listeners = []
  const mql = {
    matches: desktop,
    media: DESKTOP_QUERY,
    addEventListener: vi.fn((_, fn) => listeners.push(fn)),
    removeEventListener: vi.fn()
  }
  vi.spyOn(window, 'matchMedia').mockImplementation(() => mql)
  return {
    mql,
    change(next) {
      mql.matches = next
      listeners.forEach((fn) => fn({ matches: next }))
    }
  }
}

describe('usePageSize', () => {
  it('uses the md breakpoint query', () => {
    expect(DESKTOP_QUERY).toBe('(min-width: 768px)')
  })

  it('desktop → 10', () => {
    mockViewport(true)
    expect(usePageSize().value).toBe(10)
  })

  it('mobile → 5', () => {
    mockViewport(false)
    expect(usePageSize().value).toBe(5)
  })

  it('follows the viewport when it crosses the breakpoint', () => {
    const vp = mockViewport(true)
    const size = usePageSize()
    vp.change(false)
    expect(size.value).toBe(5)
    vp.change(true)
    expect(size.value).toBe(10)
  })

  it('removes the listener when the component scope is disposed', () => {
    const vp = mockViewport(true)
    const scope = effectScope()
    scope.run(() => usePageSize())
    scope.stop()
    expect(vp.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('no matchMedia → falls back to desktop size', () => {
    const original = window.matchMedia
    // eslint-disable-next-line no-undef
    delete window.matchMedia
    try {
      expect(usePageSize().value).toBe(10)
    } finally {
      window.matchMedia = original
    }
  })
})
