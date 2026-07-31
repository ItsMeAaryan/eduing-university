'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { getApplicationsPage, updateApplicationStatus } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { Search, CheckSquare, Square, Download, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import ApplicationPanel from '@/components/ApplicationPanel'
import type { DocumentSnapshot } from 'firebase/firestore'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'badge badge-info' },
  under_review: { label: 'In Review', cls: 'badge badge-warning' },
  selected: { label: 'Selected', cls: 'badge badge-success' },
  waitlisted: { label: 'Waitlisted', cls: 'badge badge-orange' },
  rejected: { label: 'Rejected', cls: 'badge badge-error' },
}

// ─── Page ──────────────────────────────────────────────────────────────────────

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
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadApps = async (isLoadMore = false) => {
    const user = auth.currentUser
    if (!user) return

    if (!isLoadMore) {
      setLoading(true)
      setApps([])
      setLastDoc(null)
    }

    try {
      const res = await getApplicationsPage(user.uid, 15, isLoadMore ? lastDoc : null, {
        status: statusFilter,
        searchTerm,
      })
      setApps(prev => isLoadMore ? [...prev, ...res.apps] : res.apps)
      setLastDoc(res.lastDoc)
      setHasMore(res.apps.length === 15)
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        loadApps()
        const unsubProgs = subscribeToPrograms(user.uid, setPrograms)
        return () => unsubProgs()
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadApps(), 400)
    return () => clearTimeout(t)
  }, [searchTerm, statusFilter, programFilter])

  const handleSelectAll = () => {
    setSelectedApps(selectedApps.length === apps.length ? [] : apps.map(a => a.id))
  }

  const toggleSelect = (id: string) => {
    setSelectedApps(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const handleBulkUpdate = async (status: string) => {
    if (!selectedApps.length) return
    const user = auth.currentUser
    if (!user) return
    const p = Promise.all(
      selectedApps.map(id => {
        const app = apps.find(a => a.id === id)
        if (app) return updateApplicationStatus(
          user.uid, id, app.studentId as string, status,
          { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
        )
      })
    )
    toast.promise(p, {
      loading: `Updating ${selectedApps.length} applications…`,
      success: `Updated ${selectedApps.length} to ${status.replace('_', ' ')}`,
      error: 'Failed to update some applications',
    })
    setSelectedApps([])
  }

  const exportCSV = () => {
    const rows = [
      ['Student Name', 'Email', 'Program', 'Status', 'Applied Date'],
      ...apps.map(a => [
        a.studentName, a.studentEmail, a.programName, a.status,
        a.appliedAt?.seconds ? new Date(a.appliedAt.seconds * 1000).toLocaleDateString() : '',
      ]),
    ]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `applications_${new Date().toISOString().split('T')[0]}.csv` }).click()
    URL.revokeObjectURL(url)
  }

  const allSelected = apps.length > 0 && selectedApps.length === apps.length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Review and manage student applications</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary" style={{ gap: '6px' }}>
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={13} style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none',
          }} />
          <input
            placeholder="Search students…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '30px' }}
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ minWidth: '130px', cursor: 'pointer' }}>
          <option value="all">All status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">In Review</option>
          <option value="selected">Selected</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className="input-field" style={{ minWidth: '130px', cursor: 'pointer' }}>
          <option value="all">All programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name as string}</option>)}
        </select>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedApps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--accent)' }}>
                {selectedApps.length} selected
              </span>
              <div style={{ width: '1px', height: '16px', background: 'var(--accent-border)' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: 'Mark In Review', value: 'under_review' },
                  { label: 'Select', value: 'selected' },
                  { label: 'Reject', value: 'rejected' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleBulkUpdate(opt.value)}
                    className="btn-ghost"
                    style={{
                      height: '28px',
                      fontSize: '12px',
                      color: opt.value === 'rejected' ? 'var(--red)' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelectedApps([])}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {/* Checkbox col */}
                <th style={{ width: '44px', paddingLeft: '16px', paddingRight: '8px' }}>
                  <button
                    onClick={handleSelectAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
                    aria-label={allSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allSelected
                      ? <CheckSquare size={15} style={{ color: 'var(--accent)' }} />
                      : <Square size={15} />
                    }
                  </button>
                </th>
                <th>Student</th>
                <th>Program</th>
                <th>Applied</th>
                <th>Status</th>
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Search size={18} />
                      </div>
                      <p className="empty-state-title">No applications found</p>
                      <p className="empty-state-description">Try adjusting your filters or search term.</p>
                    </div>
                  </td>
                </tr>
              ) : apps.map(app => {
                const s = STATUS[app.status as string] || STATUS.submitted
                const isSelected = selectedApps.includes(app.id)
                const date = app.appliedAt?.seconds
                  ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'

                return (
                  <tr
                    key={app.id}
                    onClick={() => setViewingApp(app)}
                    style={{ background: isSelected ? 'var(--accent-bg)' : undefined }}
                  >
                    {/* Checkbox */}
                    <td style={{ paddingLeft: '16px', paddingRight: '8px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(app.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
                        aria-label={isSelected ? 'Deselect' : 'Select'}
                      >
                        {isSelected
                          ? <CheckSquare size={15} style={{ color: 'var(--accent)' }} />
                          : <Square size={15} />
                        }
                      </button>
                    </td>

                    {/* Student */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                          background: 'var(--accent-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '600', color: 'var(--accent)',
                        }}>
                          {((app.studentName as string) || 'S').charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                            {app.studentName as string || '—'}
                          </div>
                          <div className="text-caption">{app.studentEmail as string || ''}</div>
                        </div>
                      </div>
                    </td>

                    {/* Program */}
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {app.programName as string || '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <span className="text-caption">{date}</span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={s.cls}>{s.label}</span>
                    </td>

                    {/* Action */}
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setViewingApp(app)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-faint)', padding: '4px 6px', borderRadius: '5px',
                          display: 'flex', alignItems: 'center',
                          transition: 'background 0.1s, color 0.1s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--bg-card-hover)'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'none'
                          e.currentTarget.style.color = 'var(--text-faint)'
                        }}
                        aria-label="View application"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && (
          <div style={{
            padding: '12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <button onClick={() => loadApps(true)} className="btn-secondary" style={{ fontSize: '13px' }}>
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <ApplicationPanel app={viewingApp} onClose={() => setViewingApp(null)} />
    </div>
  )
}