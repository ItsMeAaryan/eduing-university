'use client'

import React from 'react'
import { usePermissions } from '@/context/AuthContext'
import type { Permission } from '@/lib/firebase/types'

interface PermissionGuardProps {
  require: Permission | Permission[]
  fallback?: React.ReactNode
  children: React.ReactNode
  requireAll?: boolean
}

export default function PermissionGuard({ require, fallback = null, children, requireAll = false }: PermissionGuardProps) {
  const { hasPermission } = usePermissions()

  const perms = Array.isArray(require) ? require : [require]

  const isAllowed = requireAll 
    ? perms.every(p => hasPermission(p))
    : perms.some(p => hasPermission(p))

  if (isAllowed) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
