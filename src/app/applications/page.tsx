'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToApplications, updateApplicationStatus } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { MoreVertical, CheckSquare, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import ApplicationPanel from '@/components/ApplicationPanel'

export default function ApplicationsPage() {
  const { toast } = useToast()
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [viewingApp, setViewingApp] = useState<FirestoreRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubApps = subscribeToApplications(user.uid, (data) => {
          setApps(data)
          setLoading(false)
        })
        const unsubProgs = subscribeToPrograms(user.uid, setPrograms)
        return () => {
          unsubApps()
          unsubProgs()
        }
      }
    })
    return () => unsubscribeAuth()
  }, [])

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           app.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter
      const matchesProgram = programFilter === 'all' || app.programId === programFilter
      return matchesSearch && matchesStatus && matchesProgram
    })
  }, [apps, searchTerm, statusFilter, programFilter])

  const handleSelectAll = () => {
    if (selectedApps.length === filteredApps.length) {
      setSelectedApps([])
    } else {
      setSelectedApps(filteredApps.map(a => a.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const handleBulkUpdate = async (status: string) => {
    if (selectedApps.length === 0) return
    const promise = Promise.all(
      selectedApps.map(async (id) => {
        const app = apps.find(a => a.id === id)
        if (app) await updateApplicationStatus(id, app.studentId, status)
      })
    )
    toast.promise(promise, {
      loading: `Updating ${selectedApps.length} applications...`,
      success: `Updated ${selectedApps.length} applications to ${status}`,
      error: 'Failed to update some applications'
    })
    setSelectedApps([])
  }

  const exportCSV = () => {
    const headers = ['Student Name', 'Email', 'Program', 'Status', 'Applied Date']
    const rows = filteredApps.map(app => [
      app.studentName,
      app.studentEmail,
      app.programName,
      app.status,
      app.appliedAt?.seconds ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString() : ''
    ])

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white sr-only">Applications</h1>
      {/* Filters row - compact inline */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px',
        background: 'var(--bg-card)', padding: '14px 18px',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.4 }}>🔍</span>
          <input 
            placeholder="Search students..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="focus:ring-2 focus:ring-brand-primary"
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px',
            }} 
          />
        </div>
        
        {/* Status dropdown */}
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '9px 14px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
          }}
          className="focus:ring-2 focus:ring-brand-primary"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="selected">Selected</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Program dropdown */}
        <select 
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          style={{
            padding: '9px 14px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
          }}
          className="focus:ring-2 focus:ring-brand-primary"
        >
          <option value="all">All Programs</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Export button */}
        <button 
          onClick={exportCSV}
          style={{
            padding: '9px 18px', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
            border: 'none', borderRadius: 'var(--radius-sm)', color: 'white',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedApps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-brand-primary">
                {selectedApps.length} selected
              </span>
              <div className="h-4 w-px bg-brand-primary/20" />
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleBulkUpdate('under_review')}
                  className="px-3 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary text-xs font-bold hover:bg-brand-primary/20 transition-colors"
                >
                  Set Under Review
                </button>
                <button 
                  onClick={() => handleBulkUpdate('selected')}
                  className="px-3 py-1.5 rounded-lg bg-brand-success/10 text-brand-success text-xs font-bold hover:bg-brand-success/20 transition-colors"
                >
                  Select All
                </button>
                <button 
                  onClick={() => handleBulkUpdate('rejected')}
                  className="px-3 py-1.5 rounded-lg bg-brand-error/10 text-brand-error text-xs font-bold hover:bg-brand-error/20 transition-colors"
                >
                  Reject All
                </button>
              </div>
            </div>
            <button 
              onClick={() => setSelectedApps([])}
              className="text-xs text-text-muted hover:text-white"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="px-6 py-4 w-10">
                  <button onClick={handleSelectAll} className="text-text-muted hover:text-brand-primary">
                    {selectedApps.length === filteredApps.length && filteredApps.length > 0 ? (
                      <CheckSquare size={18} className="text-brand-primary" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Student</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Program</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Applied</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Status</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filteredApps.map((app) => (
                <tr 
                  key={app.id} 
                  className={`hover:bg-white/2 transition-colors group cursor-pointer ${selectedApps.includes(app.id) ? 'bg-brand-primary/5' : ''}`}
                  onClick={() => setViewingApp(app)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelect(app.id)} className="text-text-muted" aria-label={selectedApps.includes(app.id) ? 'Deselect application' : 'Select application'}>
                      {selectedApps.includes(app.id) ? (
                        <CheckSquare size={18} className="text-brand-primary" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {app.studentName?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{app.studentName}</p>
                        <p className="text-xs text-text-muted">{app.studentEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-text-secondary">{app.programName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-text-muted whitespace-nowrap">
                      {app.appliedAt?.seconds ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setViewingApp(app)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted text-sm italic">
                    No applications found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ApplicationPanel 
        app={viewingApp} 
        onClose={() => setViewingApp(null)} 
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-brand-primary/10 text-brand-primary',
    under_review: 'bg-brand-warning/10 text-brand-warning',
    selected: 'bg-brand-success/10 text-brand-success',
    waitlisted: 'bg-orange-500/10 text-orange-500',
    rejected: 'bg-brand-error/10 text-brand-error'
  }
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.submitted}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
