import { useEffect } from 'react'

const EDITABLE_TARGETS = 'input, textarea, select, [contenteditable="true"]'
const PAGE_FRACTION = 0.8

/**
 * Makes Home, End, PageUp and PageDown scroll the given container wherever the focus is.
 * The page itself never scrolls (the container does), so the browser's default handling of
 * these keys would do nothing unless the container happened to be focused.
 */
export function useKeyboardScrolling(scrollerSelector: string) {
  useEffect(() => {
    const scrollWithKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches(EDITABLE_TARGETS)) return
      const scroller = document.querySelector<HTMLElement>(scrollerSelector)
      if (!scroller) return

      if (event.key === 'End') scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' })
      else if (event.key === 'Home') scroller.scrollTo({ top: 0, behavior: 'auto' })
      else if (event.key === 'PageDown') scroller.scrollBy({ top: scroller.clientHeight * PAGE_FRACTION, behavior: 'auto' })
      else if (event.key === 'PageUp') scroller.scrollBy({ top: scroller.clientHeight * -PAGE_FRACTION, behavior: 'auto' })
      else return

      event.preventDefault()
    }

    window.addEventListener('keydown', scrollWithKeyboard)
    return () => window.removeEventListener('keydown', scrollWithKeyboard)
  }, [scrollerSelector])
}
