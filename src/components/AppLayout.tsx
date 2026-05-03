'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import UniversityLayout from './UniversityLayout'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname?.startsWith('/auth')

  if (isAuth) {
    return <>{children}</>
  }

  return <UniversityLayout>{children}</UniversityLayout>
}
