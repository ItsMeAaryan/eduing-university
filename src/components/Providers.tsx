'use client'

import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/context/AuthContext'

/**
 * Root providers — order matters:
 *   ThemeProvider  → injects class="dark" on <html> before paint
 *   AuthProvider   → listens to Firebase auth state
 *
 * NOTE: ToastProvider is intentionally NOT here — it lives in layout.tsx
 * as the single authoritative instance. Having two ToastProviders creates
 * two separate React contexts; the outer one wins but the inner one
 * renders a dead duplicate toast container.
 *
 * storageKey: persists across refresh, browser restart, and login/logout.
 * attribute="class": drives CSS var switching via :root.dark in globals.css.
 * defaultTheme="system": new users follow their OS preference.
 * enableSystem: wires up matchMedia listener for real-time OS changes.
 * disableTransitionOnChange: prevents colour flash during theme switch —
 *   we apply our own 200ms CSS transitions instead.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="eduing-theme"
        disableTransitionOnChange={false}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
