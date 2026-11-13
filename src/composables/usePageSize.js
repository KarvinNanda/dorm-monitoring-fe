import { ref, getCurrentScope, onScopeDispose } from 'vue'

// Same breakpoint as the `md:` classes that switch the lists from cards
// (mobile) to tables (desktop).
export const DESKTOP_QUERY = '(min-width: 768px)'
export const PAGE_SIZE_DESKTOP = 10
export const PAGE_SIZE_MOBILE = 5

/**
 * Rows per page for paginated lists: 10 on desktop, 5 on mobile.
 * Returns a ref that follows the viewport when it crosses the breakpoint
 * (rotate a tablet, resize a window). Callers watch it to go back to page 1
 * and refetch.
 */
export function usePageSize() {
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(DESKTOP_QUERY) : null
  const size = (desktop) => (desktop ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE)
  const pageSize = ref(size(mql ? mql.matches : true))

  if (mql) {
    const onChange = (e) => {
      pageSize.value = size(e.matches)
    }
    mql.addEventListener('change', onChange)
    if (getCurrentScope()) onScopeDispose(() => mql.removeEventListener('change', onChange))
  }

  return pageSize
}

/**
 * After the page size changes, go back to page 1. If the list is already on
 * page 1 the page watcher will not fire, so refetch directly.
 */
export function resetToFirstPage(pageRef, fetchFn) {
  if (pageRef.value !== 1) pageRef.value = 1
  else fetchFn()
}
