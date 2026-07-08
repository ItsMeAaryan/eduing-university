import { useEffect, useRef, RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * useFocusTrap — WCAG 2.4.3 Focus Order
 *
 * Traps keyboard focus inside a modal/panel while it's open:
 * - Moves focus to the first focusable element on open
 * - Cycles focus within the container on Tab / Shift+Tab
 * - Returns focus to the previously-focused element on close
 * - Closes the modal on Escape
 *
 * Usage:
 *   const ref = useFocusTrap(isOpen, onClose)
 *   <div ref={ref} role="dialog" aria-modal="true">...</div>
 */
export function useFocusTrap(
  isOpen: boolean,
  onClose?: () => void
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save current focus so we can restore it on close
    previousFocusRef.current = document.activeElement

    // Move focus into the dialog on next tick (after animation starts)
    const timer = setTimeout(() => {
      const container = containerRef.current
      if (!container) return
      const first = container.querySelectorAll<HTMLElement>(FOCUSABLE)[0]
      first?.focus()
    }, 50)

    return () => {
      clearTimeout(timer)
      // Return focus to the element that had it before the dialog opened
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return containerRef
}
