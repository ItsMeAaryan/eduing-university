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

  const fetchData = async () => {
    const uniId = userData?.universityId || user?.uid
    if (!uniId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all required collections in parallel for analytics
      // In a true massive-scale enterprise app this would be powered by a backend aggregator
      // But for CRM MVP, we fetch the documents to calculate client-side aggregations
      const [appsSnap, progsSnap, staffSnap, auditSnap] = await Promise.all([
        getDocs(query(collection(db, 'applications'), where('universityId', '==', uniId))),
        getDocs(query(collection(db, 'programs'), where('universityId', '==', uniId))),
        getDocs(query(collection(db, `universities/${uniId}/staff`))),
        getDocs(query(collection(db, `universities/${uniId}/audit_logs`)))
      ])

      setApps(appsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord)))
      setPrograms(progsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord)))
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)))
      setAuditLogs(auditSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)))
      
    } catch (err: any) {
      console.error('Analytics fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
    refresh: fetchData
  }), [apps, programs, staff, auditLogs, loading, error])

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
