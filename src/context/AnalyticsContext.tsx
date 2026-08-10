'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { auth, db } from '@/lib/firebase/config'
import type { FirestoreRecord, AuditLog, StaffMember } from '@/lib/firebase/types'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuth } from './AuthContext'

interface AnalyticsContextType {
  apps: FirestoreRecord[]
  programs: FirestoreRecord[]
  staff: StaffMember[]
  auditLogs: AuditLog[]
  loading: boolean
  error: string | null
  permissionDenied: boolean
  refresh: () => Promise<void>
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { userData, user } = useAuth()
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const fetchData = async () => {
    const uniId = userData?.universityId || user?.uid
    if (!uniId) return

    setLoading(true)
    setError(null)
    setPermissionDenied(false)

    let hasPermissionError = false
    let generalError: string | null = null

    // Fetch each collection individually with try/catch for graceful degradation
    const fetchApps = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'applications'), where('universityId', '==', uniId)))
        setApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord)))
      } catch (err: any) {
        console.warn('Analytics applications fetch failed:', err)
        setApps([])
        if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
          hasPermissionError = true
        } else {
          generalError = err.message
        }
      }
    }

    const fetchPrograms = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'programs'), where('universityId', '==', uniId)))
        setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord)))
      } catch (err: any) {
        console.warn('Analytics programs fetch failed:', err)
        setPrograms([])
        if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
          hasPermissionError = true
        } else {
          generalError = generalError || err.message
        }
      }
    }

    const fetchStaff = async () => {
      try {
        const snap = await getDocs(query(collection(db, `universities/${uniId}/staff`)))
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
      } catch (err: any) {
        console.warn('Analytics staff fetch failed:', err)
        setStaff([])
        if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
          hasPermissionError = true
        } else {
          generalError = generalError || err.message
        }
      }
    }

    const fetchAuditLogs = async () => {
      try {
        const snap = await getDocs(query(collection(db, `universities/${uniId}/audit_logs`)))
        setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)))
      } catch (err: any) {
        console.warn('Analytics audit logs fetch failed:', err)
        setAuditLogs([])
        if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
          hasPermissionError = true
        } else {
          generalError = generalError || err.message
        }
      }
    }

    await Promise.all([fetchApps(), fetchPrograms(), fetchStaff(), fetchAuditLogs()])

    if (hasPermissionError) {
      setPermissionDenied(true)
    } else if (generalError) {
      setError(generalError)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (userData?.universityId || user?.uid) {
      fetchData()
    }
  }, [userData?.universityId, user?.uid])

  const value = useMemo(() => ({
    apps,
    programs,
    staff,
    auditLogs,
    loading,
    error,
    permissionDenied,
    refresh: fetchData
  }), [apps, programs, staff, auditLogs, loading, error, permissionDenied])

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
