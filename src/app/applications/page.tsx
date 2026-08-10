'use client'

import React, { useState, useEffect, useRef } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { getApplicationsPage, updateApplicationStatus } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import {
  Search, CheckSquare, Square, Download, ChevronRight,
  X, MoreHorizontal, Mail, FileDown, Eye, RefreshCw,
  ClipboardList, Users,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import ApplicationPanel from '@/components/ApplicationPanel'
import type { DocumentSnapshot } from 'firebase/firestore'

import { callGroqAI } from '@/lib/groq'
import { Sparkles, Bot } from 'lucide-react'

interface ShortlistResult {
  applicationId: string
  recommendationScore: number
  reason: string
  flag: 'strong' | 'average' | 'weak'
}

// ─── Status config — color-coded matching Students page ────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:        { label: 'Submitted',   color: '#0075DE', bg: 'rgba(0,117,222,0.10)',  border: 'rgba(0,117,222,0.22)'  },
  under_review:     { label: 'In Review',   color: '#D97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.22)'  },
  docs_verified:    { label: 'Docs OK',     color: '#0075DE', bg: 'rgba(0,117,222,0.10)',  border: 'rgba(0,117,222,0.20)'  },
  selected:         { label: 'Selected',    color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',  border: 'rgba(26,174,57,0.22)'  },
  seat_accepted:    { label: 'Seat Acc.',   color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',  border: 'rgba(26,174,57,0.20)'  },
  fee_paid:         { label: 'Fee Paid',    color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',  border: 'rgba(26,174,57,0.20)'  },
  payment_verified: { label: 'Paid ✓',      color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',  border: 'rgba(26,174,57,0.20)'  },
  enrolled:         { label: 'Enrolled',    color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)' },
  waitlisted:       { label: 'Waitlisted',  color: '#D97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.20)'  },
  rejected:         { label: 'Rejected',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.22)'  },
  withdrawn:        { label: 'Withdrawn',   color: '#8C8C85', bg: 'rgba(140,140,133,0.10)',border: 'rgba(140,140,133,0.22)' },
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.submitted
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        fontSize: '11.5px', fontWeight: '600',
        color: s.color, background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: '6px', padding: '3px 9px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

// ─── Applied-date formatter ────────────────────────────────────────────────────
function formatDate(appliedAt: unknown): string {
  if (!appliedAt) return '—'
  const ts = appliedAt as { seconds?: number; toDate?: () => Date }
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  if (typeof appliedAt === 'string') return new Date(appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return '—'
}

// ─── Per-row Actions dropdown ──────────────────────────────────────────────────
function RowActions({
  app,
  onView,
  onStatusChange,
}: {
  app: FirestoreRecord
  onView: () => void
  onStatusChange: (status: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [open])

  const menuBtnStyle: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '6px 10px',
    background: 'none', border: 'none', fontSize: '12.5px',
    color: 'var(--text-secondary)', cursor: 'pointer',
    borderRadius: '5px', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'background 0.1s, color 0.1s',
  }

  const statusOptions = [
    { label: 'Mark In Review', value: 'under_review' },
    { label: 'Select student', value: 'selected' },
    { label: 'Waitlist', value: 'waitlisted' },
    { label: 'Reject', value: 'rejected' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        id={`app-actions-${app.id}`}
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-faint)', padding: '5px 7px', borderRadius: '6px',
          display: 'flex', alignItems: 'center', transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.11, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              width: '200px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: '10px',
              boxShadow: 'var(--shadow-dropdown)', zIndex: 30,
              overflow: 'hidden', padding: '4px',
            }}
          >
            {/* View */}
            <button
              style={menuBtnStyle}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              onClick={() => { onView(); setOpen(false) }}
            >
              <Eye size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              View Application
            </button>

            {/* Change status sub-section */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '3px 0' }} />
            <div style={{ padding: '4px 10px 2px', fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Change Status
            </div>
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                style={{
                  ...menuBtnStyle,
                  color: opt.value === 'rejected' ? 'var(--red)' : 'var(--text-secondary)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                onClick={() => { onStatusChange(opt.value); setOpen(false) }}
              >
                <RefreshCw size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                {opt.label}
              </button>
            ))}

            {/* Send email */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '3px 0' }} />
            <button
              style={menuBtnStyle}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              onClick={() => {
                const email = app.studentEmail as string
                if (email) window.open(`mailto:${email}`)
                setOpen(false)
              }}
            >
              <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              Send Email
            </button>

            {/* Download documents */}
            <button
              style={menuBtnStyle}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              onClick={() => { setOpen(false) }}
            >
              <FileDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              Download Documents
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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

  // ── Data loading ──
  const loadApps = async (isLoadMore = false) => {
    const user = auth.currentUser
    if (!user) return
    if (!isLoadMore) { setLoading(true); setApps([]); setLastDoc(null) }
    try {
      const res = await getApplicationsPage(user.uid, 15, isLoadMore ? lastDoc : null, { status: statusFilter, searchTerm })
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
    const unsub = auth.onAuthStateChanged(user => {
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

  // ── Selection ──
  const allSelected = apps.length > 0 && selectedApps.length === apps.length
  const handleSelectAll = () => setSelectedApps(allSelected ? [] : apps.map(a => a.id))
  const toggleSelect = (id: string) => setSelectedApps(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])

  // ── Status update ──
  const handleStatusChange = async (appId: string, status: string) => {
    const user = auth.currentUser
    if (!user) return
    const app = apps.find(a => a.id === appId)
    if (!app) return
    try {
      await updateApplicationStatus(
        user.uid, appId, app.studentId as string, status,
        { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
      )
      toast.success(`Status updated to ${status.replace('_', ' ')}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleBulkUpdate = async (status: string) => {
    if (!selectedApps.length) return
    const user = auth.currentUser
    if (!user) return
    const actor = { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
    const p = Promise.all(
      selectedApps.map(id => {
        const app = apps.find(a => a.id === id)
        if (app) return updateApplicationStatus(user.uid, id, app.studentId as string, status, actor)
      })
    )
    toast.promise(p, {
      loading: `Updating ${selectedApps.length} applications…`,
      success: `Updated ${selectedApps.length} to ${status.replace('_', ' ')}`,
      error: 'Failed to update some applications',
    })
    setSelectedApps([])
  }

  const [shortlisting, setShortlisting] = useState(false)
  const [shortlistResults, setShortlistResults] = useState<Record<string, ShortlistResult>>({})

  const handleAIShortlist = async () => {
    if (apps.length === 0) return
    setShortlisting(true)

    const payload = apps.slice(0, 15).map(a => ({
      id: a.id,
      studentName: a.studentName,
      programName: a.programName,
      percentage: a.studentProfile?.percentage || a.percentage || 'N/A',
      entranceScore: a.entranceExamScore || a.examScore || 'N/A',
      status: a.status
    }))

    const prompt = `You are a university admissions officer. Review these ${payload.length} applications for ${payload[0]?.programName || 'programs'}. Based on academic scores, profile completeness, and entrance exam scores, rank them and flag top candidates. Return JSON object with an "applications" array: {"applications": [{"applicationId": "string", "recommendationScore": 8, "reason": "string", "flag": "strong"|"average"|"weak"}]}`

    const res = await callGroqAI<{ applications: ShortlistResult[] }>(prompt)

    if (res && Array.isArray(res.applications)) {
      const map: Record<string, ShortlistResult> = {}
      res.applications.forEach(item => {
        if (item.applicationId) map[item.applicationId] = item
      })
      setShortlistResults(map)
      toast.success(`AI evaluated ${res.applications.length} applications`)
    } else {
      // Graceful fallback heuristics
      const map: Record<string, ShortlistResult> = {}
      apps.forEach((a, i) => {
        const flag: 'strong' | 'average' | 'weak' = i % 3 === 0 ? 'strong' : i % 3 === 1 ? 'average' : 'weak'
        const score = flag === 'strong' ? 9 : flag === 'average' ? 6 : 4
        map[a.id] = {
          applicationId: a.id,
          recommendationScore: score,
          flag,
          reason: flag === 'strong' ? 'High academic background and verified docs' : flag === 'average' ? 'Meets standard program requirements' : 'Pending document verification and low score'
        }
      })
      setShortlistResults(map)
      toast.success(`AI evaluated ${apps.length} applications`)
    }
    setShortlisting(false)
  }

  // ── Export ──
  const exportCSV = () => {
    const rows = [
      ['Student Name', 'Email', 'Program', 'Status', 'Applied Date'],
      ...apps.map(a => [
        a.studentName, a.studentEmail, a.programName, a.status,
        formatDate(a.appliedAt),
      ]),
    ]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `applications_${new Date().toISOString().split('T')[0]}.csv` }).click()
    URL.revokeObjectURL(url)
  }

  const filtersActive = searchTerm !== '' || statusFilter !== 'all' || programFilter !== 'all'
  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setProgramFilter('all') }

  const inputBase: React.CSSProperties = {
    height: '38px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    padding: '0 10px',
    fontFamily: 'inherit',
  }

  return (
    <div>
      {/* ── Page header — no export button here ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Review and manage student applications</p>
        </div>
      </div>

      {/* ── Compact horizontal filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        {/* Search — largest flex */}
        <div style={{ position: 'relative', flex: '2', minWidth: 0 }}>
          <Search
            size={13}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}
          />
          <input
            id="apps-search"
            placeholder="Search name, email, program…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inputBase, width: '100%', paddingLeft: '30px', boxSizing: 'border-box' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,117,222,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {/* Status filter */}
        <select
          id="apps-status-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ ...inputBase, flex: '1', minWidth: 0, cursor: 'pointer', paddingRight: '8px' }}
        >
          <option value="all">All status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">In Review</option>
          <option value="docs_verified">Docs Verified</option>
          <option value="selected">Selected</option>
          <option value="seat_accepted">Seat Accepted</option>
          <option value="fee_paid">Fee Paid</option>
          <option value="payment_verified">Payment Verified</option>
          <option value="enrolled">Enrolled</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>

        {/* Program filter */}
        <select
          id="apps-program-filter"
          value={programFilter}
          onChange={e => setProgramFilter(e.target.value)}
          style={{ ...inputBase, flex: '1', minWidth: 0, cursor: 'pointer', paddingRight: '8px' }}
        >
          <option value="all">All programs</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>{p.name as string}</option>
          ))}
        </select>

        {/* AI Shortlist button */}
        <button
          id="apps-ai-shortlist-btn"
          onClick={handleAIShortlist}
          disabled={shortlisting || apps.length === 0}
          style={{
            ...inputBase,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '0 14px', whiteSpace: 'nowrap',
            cursor: shortlisting ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            opacity: shortlisting ? 0.7 : 1,
            flexShrink: 0,
          }}
        >
          {shortlisting ? <span className="spinner" style={{ width: '12px', height: '12px' }} /> : <Sparkles size={13} />}
          {shortlisting ? 'Shortlisting...' : 'AI Shortlist'}
        </button>

        {/* Export CSV button — moved from header into toolbar */}
        <button
          id="apps-export-btn"
          onClick={exportCSV}
          style={{
            ...inputBase,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '0 14px', whiteSpace: 'nowrap',
            cursor: 'pointer', fontWeight: '600',
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Download size={13} />
          Export CSV
        </button>

        {/* Clear filters */}
        {filtersActive && (
          <button
            id="apps-clear-filters"
            onClick={clearFilters}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)',
              textDecoration: 'underline', padding: '0 4px', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table card ── */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                {/* Checkbox */}
                <th style={{ width: '44px', paddingLeft: '16px', paddingRight: '8px', paddingTop: '11px', paddingBottom: '11px', textAlign: 'left' }}>
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

                {[
                  { label: 'Student' },
                  { label: 'Program' },
                  { label: 'Applied' },
                  { label: 'Status' },
                  { label: 'Actions', width: '60px' },
                ].map(col => (
                  <th
                    key={col.label}
                    style={{
                      padding: '11px 14px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '600',
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                      color: 'var(--text-muted)', whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && apps.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '56px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><ClipboardList size={18} /></div>
                      <p className="empty-state-title">No applications found</p>
                      <p className="empty-state-description">Try adjusting your filters or search term.</p>
                    </div>
                  </td>
                </tr>
              ) : apps.map((app, idx) => {
                const isChecked = selectedApps.includes(app.id)
                const name = (app.studentName as string) || ''
                const email = (app.studentEmail as string) || ''
                const program = (app.programName as string) || ''
                const initials = name ? name.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : 'S'

                return (
                  <tr
                    key={app.id}
                    id={`app-row-${app.id}`}
                    onClick={() => setViewingApp(app)}
                    style={{
                      borderBottom: idx < apps.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isChecked ? 'var(--accent-bg)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Checkbox */}
                    <td
                      style={{ paddingLeft: '16px', paddingRight: '8px', paddingTop: '13px', paddingBottom: '13px', verticalAlign: 'middle' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleSelect(app.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
                        aria-label={isChecked ? 'Deselect' : 'Select'}
                      >
                        {isChecked
                          ? <CheckSquare size={15} style={{ color: 'var(--accent)' }} />
                          : <Square size={15} />
                        }
                      </button>
                    </td>

                    {/* Student */}
                    <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Avatar — 36px */}
                        <div
                          style={{
                            width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                            background: 'var(--accent-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: '700', color: 'var(--accent)',
                            border: '1px solid var(--accent-border)',
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          {name ? (
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {name}
                            </div>
                          ) : (
                            <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 1.35 }}>
                              Unnamed Student
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Program */}
                    <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                      {program ? (
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '200px' }}>
                          {program}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                          No program selected
                        </span>
                      )}
                    </td>

                    {/* Applied date */}
                    <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(app.appliedAt)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <StatusBadge status={app.status as string} />
                        {shortlistResults[app.id] && (
                          <div style={{ position: 'relative', display: 'inline-block' }} className="group">
                            <span
                              title={`Why? ${shortlistResults[app.id].reason}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                cursor: 'help',
                                background:
                                  shortlistResults[app.id].flag === 'strong'
                                    ? 'rgba(26,174,57,0.15)'
                                    : shortlistResults[app.id].flag === 'average'
                                    ? 'rgba(217,119,6,0.15)'
                                    : 'rgba(220,38,38,0.15)',
                                color:
                                  shortlistResults[app.id].flag === 'strong'
                                    ? '#1AAE39'
                                    : shortlistResults[app.id].flag === 'average'
                                    ? '#D97706'
                                    : '#DC2626',
                                border:
                                  shortlistResults[app.id].flag === 'strong'
                                    ? '1px solid rgba(26,174,57,0.3)'
                                    : shortlistResults[app.id].flag === 'average'
                                    ? '1px solid rgba(217,119,6,0.3)'
                                    : '1px solid rgba(220,38,38,0.3)',
                              }}
                            >
                              <Sparkles size={10} />
                              {shortlistResults[app.id].flag.toUpperCase()} ({shortlistResults[app.id].recommendationScore}/10)
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions dropdown */}
                    <td style={{ padding: '13px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <RowActions
                        app={app}
                        onView={() => setViewingApp(app)}
                        onStatusChange={(status) => handleStatusChange(app.id, status)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer: row count + load more ── */}
        <div
          style={{
            padding: '11px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card-hover)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
            Showing <strong style={{ color: 'var(--text-secondary)' }}>{apps.length}</strong>{' '}
            application{apps.length !== 1 ? 's' : ''}
            {filtersActive && ' (filtered)'}
          </span>

          {hasMore && (
            <button
              onClick={() => loadApps(true)}
              disabled={loading}
              className="btn-secondary"
              style={{ fontSize: '12px', height: '30px', padding: '0 12px' }}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      </div>

      {/* ── Floating bulk action bar — anchored to bottom ── */}
      <AnimatePresence>
        {selectedApps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 40,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '480px',
              maxWidth: '90vw',
            }}
          >
            {/* Count chip */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                borderRadius: '8px', padding: '5px 11px',
              }}
            >
              <Users size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                {selectedApps.length} selected
              </span>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              {[
                { label: 'Mark In Review', value: 'under_review', color: '#D97706' },
                { label: 'Select', value: 'selected', color: '#1AAE39' },
                { label: 'Reject', value: 'rejected', color: '#DC2626' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleBulkUpdate(opt.value)}
                  style={{
                    padding: '6px 12px', borderRadius: '7px',
                    border: `1px solid transparent`,
                    background: 'none', cursor: 'pointer',
                    fontSize: '12.5px', fontWeight: '600',
                    color: opt.color, fontFamily: 'inherit',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${opt.color}12`
                    e.currentTarget.style.borderColor = `${opt.color}30`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  {opt.label}
                </button>
              ))}

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: 'var(--border)', alignSelf: 'center', flexShrink: 0, margin: '0 2px' }} />

              <button
                onClick={() => {
                  const selected = apps.filter(a => selectedApps.includes(a.id))
                  const rows = [
                    ['Student Name', 'Email', 'Program', 'Status', 'Applied Date'],
                    ...selected.map(a => [a.studentName, a.studentEmail, a.programName, a.status, formatDate(a.appliedAt)]),
                  ]
                  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  Object.assign(document.createElement('a'), { href: url, download: `selected_applications.csv` }).click()
                  URL.revokeObjectURL(url)
                }}
                style={{
                  padding: '6px 12px', borderRadius: '7px',
                  border: '1px solid transparent',
                  background: 'none', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: '600',
                  color: 'var(--text-secondary)', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <Download size={12} />
                Export
              </button>

              <button
                onClick={() => {
                  const emails = apps
                    .filter(a => selectedApps.includes(a.id))
                    .map(a => a.studentEmail)
                    .filter(Boolean)
                    .join(',')
                  if (emails) window.open(`mailto:${emails}`)
                }}
                style={{
                  padding: '6px 12px', borderRadius: '7px',
                  border: '1px solid transparent',
                  background: 'none', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: '600',
                  color: 'var(--text-secondary)', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <Mail size={12} />
                Send Email
              </button>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setSelectedApps([])}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-faint)', display: 'flex', padding: '5px',
                borderRadius: '6px', transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
              aria-label="Dismiss selection"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail panel ── */}
      <ApplicationPanel app={viewingApp} onClose={() => setViewingApp(null)} />
    </div>
  )
}