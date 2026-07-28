'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import type { Permission } from '@/lib/firebase/types'
import { ShieldAlert } from 'lucide-react'

interface RouteGuardProps {
  require: Permission | Permission[]
  requireAll?: boolean
  children: React.ReactNode
}

export default function RouteGuard({ require, requireAll = false, children }: RouteGuardProps) {
  const { hasPermission, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

  const perms = Array.isArray(require) ? require : [require]
  const authorized = requireAll 
    ? perms.every(p => hasPermission(p))
    : perms.some(p => hasPermission(p))

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 bg-brand-error/10 rounded-full flex items-center justify-center mb-6 text-brand-error">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-text-secondary max-w-md">
          You do not have the required permissions to view this page. If you believe this is an error, please contact your University Owner.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
