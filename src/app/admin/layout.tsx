import type { Metadata } from 'next'
import AdminGuard from '@/components/guards/AdminGuard'

export const metadata: Metadata = {
  title: 'Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // AdminGuard runs client-side and silently redirects any non-eduing_admin
  // user to /dashboard before any admin UI is painted.
  return <AdminGuard>{children}</AdminGuard>
}
