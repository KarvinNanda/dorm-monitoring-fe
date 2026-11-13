import { vi } from 'vitest'

// Pretend the viewport is phone width (below the md breakpoint), so
// usePageSize() returns the mobile page size.
export function mockMobileViewport() {
  vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
}
