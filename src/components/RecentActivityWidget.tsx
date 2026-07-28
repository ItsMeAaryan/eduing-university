'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, ChevronRight } from 'lucide-react'
import { subscribeToAuditLogs } from '@/lib/firebase/audit'
import type { AuditLog } from '@/lib/firebase/types'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

export default function RecentActivityWidget() {
  const { userData, user, hasPermission } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userData?.universityId) {
      const unsub = subscribeToAuditLogs(userData.universityId, 5, (data) => {
        setLogs(data)
        setLoading(false)
      })
      return () => unsub()
    } else if (user?.uid) {
      const unsub = subscribeToAuditLogs(user.uid, 5, (data) => {
        setLogs(data)
        setLoading(false)
      })
      return () => unsub()
    }
  }, [userData?.universityId, user?.uid])

  if (loading) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 h-full flex flex-col justify-center items-center">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-muted text-sm">Loading activity...</p>
      </div>
    )
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col h-full relative overflow-hidden group">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-primary/20 transition-colors"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <Activity className="text-brand-primary" size={16} />
          </div>
          <h3 className="font-bold text-white text-lg tracking-tight">Recent Activity</h3>
        </div>
        
        {hasPermission('view_audit_logs' as any) && (
          <Link href="/audit" className="text-xs font-bold text-brand-primary hover:text-indigo-400 flex items-center gap-1 transition-colors">
            View All <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 relative z-10 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <Activity size={32} className="mb-2" />
            <p className="text-sm">No recent activity found.</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-3"
            >
              <div className="relative mt-1">
                <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                {i < logs.length - 1 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-px h-[calc(100%+16px)] bg-brand-border"></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm text-text-secondary leading-tight mb-1">
                  <span className="font-bold text-white">{log.actorName}</span> 
                  {' '}performed{' '} 
                  <span className="font-bold text-brand-primary-text capitalize">{log.actionType.replace(/_/g, ' ')}</span>
                  {' '}on{' '}
                  <span className="text-text-muted capitalize">{log.entityType}</span>
                </p>
                <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                  <Clock size={10} />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
