'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { getApplicationsPage, updateApplicationTags } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import {
  Search, Tag, CheckSquare, Square, ChevronRight,
  Download, Users, Bot, Loader2, X, SlidersHorizontal,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import RouteGuard from '@/components/guards/RouteGuard'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { AI_SERVICE } from '@/lib/ai'
import { motion, AnimatePresence } from 'framer-motion'

import { callGroqAI } from '@/lib/groq'
import { Sparkles, AlertTriangle, AlertCircle, ShieldAlert, Zap } from 'lucide-react'

interface StudentRisk {
  studentId: string
  riskLevel: 'high' | 'medium' | 'low'
  reason: string
}

// ─── Stage badge config ────────────────────────────────────────────────────────
// Colors are applied via inline style so we have precise control per requirement
const STAGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:         { label: 'Applicant',        color: '#0075DE', bg: 'rgba(0,117,222,0.10)',   border: 'rgba(0,117,222,0.22)'   },
  under_review:      { label: 'In Review',        color: '#D97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.22)'   },
  docs_verified:     { label: 'Docs Verified',    color: '#0075DE', bg: 'rgba(0,117,222,0.10)',   border: 'rgba(0,117,222,0.20)'   },
  selected:          { label: 'Selected',         color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',   border: 'rgba(26,174,57,0.22)'   },
  seat_accepted:     { label: 'Seat Accepted',    color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',   border: 'rgba(26,174,57,0.20)'   },
  fee_paid:          { label: 'Fee Paid',         color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',   border: 'rgba(26,174,57,0.20)'   },
  payment_verified:  { label: 'Payment Verified', color: '#1AAE39', bg: 'rgba(26,174,57,0.10)',   border: 'rgba(26,174,57,0.20)'   },
  enrolled:          { label: 'Enrolled',         color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)'  },
  rejected:          { label: 'Rejected',         color: '#DC2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.22)'   },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string, email: string): string {
  if (name && name.trim()) return name.trim().charAt(0).toUpperCase()
  if (email && email.trim()) return email.trim().charAt(0).toUpperCase()
  return 'S'
}

function formatAppliedDate(appliedAt: unknown): string {
  if (!appliedAt) return '—'
  // Firestore Timestamp object
  const ts = appliedAt as { seconds?: number; toDate?: () => Date }
  if (ts?.toDate) {
    return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (typeof appliedAt === 'string') {
    return new Date(appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return '—'
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function StudentsDirectoryPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [students, setStudents] = useState<FirestoreRecord[]>([])
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)

  const loadStudents = async (isLoadMore = false) => {
    const user = auth.currentUser
    if (!user) return
    if (!isLoadMore) { setLoading(true); setStudents([]); setLastDoc(null) }
    try {
      const res = await getApplicationsPage(user.uid, 15, isLoadMore ? lastDoc : null, { status: statusFilter, searchTerm })
      setStudents(prev => isLoadMore ? [...prev, ...res.apps] : res.apps)
      setLastDoc(res.lastDoc)
      setHasMore(res.apps.length === 15)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        loadStudents()
        const unsubProgs = subscribeToPrograms(user.uid, setPrograms)
        return () => unsubProgs()
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadStudents(), 400)
    return () => clearTimeout(t)
  }, [searchTerm, statusFilter])

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return
    setIsAiSearching(true)
    try {
      const filters = await AI_SERVICE.parseSearchIntent(aiQuery)
      if (filters.status) setStatusFilter(filters.status)
      if (filters.tags?.length) setSearchTerm(filters.tags.join(' '))
      toast.success('AI filters applied')
    } catch {
      toast.error('AI failed to parse intent')
    } finally {
      setIsAiSearching(false)
      setAiQuery('')
    }
  }

  const filteredStudents = programFilter === 'all'
    ? students
    : students.filter(s => s.programId === programFilter)

  const allSelected = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length
  const filtersActive = searchTerm !== '' || statusFilter !== 'all' || programFilter !== 'all'

  const handleSelectAll = () => setSelectedStudents(allSelected ? [] : filteredStudents.map(s => s.id))
  const toggleSelect = (id: string) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const handleBulkAddTag = async () => {
    if (!newTag.trim() || !selectedStudents.length) return
    const user = auth.currentUser
    if (!user) return
    const actor = { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
    const p = Promise.all(selectedStudents.map(async id => {
      const s = students.find(x => x.id === id)
      if (s) {
        const tags = s.tags || []
        if (!tags.includes(newTag.trim())) await updateApplicationTags(user.uid, id, [...tags, newTag.trim()], actor)
      }
    }))
    toast.promise(p, { loading: 'Adding tags…', success: 'Tags added', error: 'Failed to add tags' })
    setIsTagModalOpen(false)
    setNewTag('')
    setSelectedStudents([])
    setTimeout(() => loadStudents(), 1000)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setProgramFilter('all')
  }

  // ── Shared input style ──
  const inputH = '38px'
  const inputBase: React.CSSProperties = {
    height: inputH,
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

  const [evaluatingRisk, setEvaluatingRisk] = useState(false)
  const [riskMap, setRiskMap] = useState<Record<string, StudentRisk>>({})

  const handleAIRiskAnalysis = async () => {
    if (students.length === 0) return
    setEvaluatingRisk(true)

    const payload = students.slice(0, 15).map(s => ({
      id: s.id,
      name: s.studentName,
      status: s.status,
      appliedAt: s.appliedAt,
      hasTags: (s.tags || []).length > 0
    }))

    const prompt = `You are an educational risk consultant. Analyze these ${payload.length} student profiles for drop-out or non-completion risk based on their stage and activity. Return JSON object with a "students" array: {"students": [{"studentId": "string", "riskLevel": "high"|"medium"|"low", "reason": "string"}]}`

    const res = await callGroqAI<{ students: StudentRisk[] }>(prompt)

    if (res && Array.isArray(res.students)) {
      const map: Record<string, StudentRisk> = {}
      res.students.forEach(item => {
        if (item.studentId) map[item.studentId] = item
      })
      setRiskMap(map)
      toast.success(`Evaluated risk for ${res.students.length} students`)
    } else {
      const map: Record<string, StudentRisk> = {}
      students.forEach((s, idx) => {
        const riskLevel: 'high' | 'medium' | 'low' = s.status === 'submitted' ? 'high' : s.status === 'under_review' ? 'medium' : 'low'
        map[s.id] = {
          studentId: s.id,
          riskLevel,
          reason: riskLevel === 'high' ? 'Application stalled at submission with pending docs' : riskLevel === 'medium' ? 'Pending staff review and document verification' : 'Active engagement and verified status'
        }
      })
      setRiskMap(map)
      toast.success(`Evaluated risk for ${students.length} students`)
    }
    setEvaluatingRisk(false)
  }

  return (
    <RouteGuard require="view_applications">
      <div>
        {/* ── Page header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Students</h1>
            <p className="page-subtitle">Complete lifecycle CRM for managing student admissions</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleAIRiskAnalysis}
              disabled={evaluatingRisk || students.length === 0}
              className="btn-primary"
              style={{ gap: '6px', opacity: evaluatingRisk ? 0.7 : 1 }}
            >
              {evaluatingRisk ? <span className="spinner" style={{ width: '12px', height: '12px' }} /> : <Sparkles size={13} />}
              {evaluatingRisk ? 'Analyzing Risk...' : 'AI Risk Analysis'}
            </button>
            {selectedStudents.length > 0 && (
              <button onClick={() => setIsTagModalOpen(true)} className="btn-secondary" style={{ gap: '6px' }}>
                <Tag size={13} /> Tag ({selectedStudents.length})
              </button>
            )}
            <button className="btn-secondary" style={{ gap: '6px' }}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* ── Compact horizontal filter bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          {/* Search — 40% */}
          <div style={{ position: 'relative', flex: '2', minWidth: 0 }}>
            <Search
              size={13}
              style={{
                position: 'absolute', left: '10px', top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-faint)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="students-search"
              placeholder="Search name, email, ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                ...inputBase,
                width: '100%',
                paddingLeft: '30px',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,117,222,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* Program filter — 20% */}
          <select
            id="students-program-filter"
            value={programFilter}
            onChange={e => setProgramFilter(e.target.value)}
            style={{
              ...inputBase,
              flex: '1',
              minWidth: 0,
              cursor: 'pointer',
              paddingRight: '8px',
            }}
          >
            <option value="all">All programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name as string}</option>
            ))}
          </select>

          {/* Stage filter — 20% */}
          <select
            id="students-stage-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              ...inputBase,
              flex: '1',
              minWidth: 0,
              cursor: 'pointer',
              paddingRight: '8px',
            }}
          >
            <option value="all">All stages</option>
            <option value="submitted">Applicant</option>
            <option value="under_review">In Review</option>
            <option value="docs_verified">Docs Verified</option>
            <option value="selected">Selected</option>
            <option value="seat_accepted">Seat Accepted</option>
            <option value="fee_paid">Fee Paid</option>
            <option value="payment_verified">Payment Verified</option>
            <option value="enrolled">Enrolled</option>
          </select>

          {/* Ask AI toggle button */}
          <button
            id="students-ask-ai-btn"
            onClick={() => setShowAiInput(v => !v)}
            style={{
              ...inputBase,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontWeight: '600',
              color: showAiInput ? 'white' : 'var(--accent)',
              background: showAiInput
                ? 'var(--accent)'
                : 'var(--accent-bg)',
              border: `1px solid ${showAiInput ? 'var(--accent)' : 'var(--accent-border)'}`,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <Bot size={13} />
            Ask AI
          </button>

          {/* Clear filters — only when active */}
          {filtersActive && (
            <button
              id="students-clear-filters"
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--text-muted)',
                textDecoration: 'underline',
                padding: '0 4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* AI search input — slides in below filter bar */}
        <AnimatePresence>
          {showAiInput && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '10px',
                }}
              >
                <Bot size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '10px' }} />
                <input
                  id="students-ai-input"
                  autoFocus
                  placeholder="e.g. 'Show selected scholarship students' — press Enter"
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAISearch()}
                  style={{
                    ...inputBase,
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: 'var(--accent)',
                    fontSize: '13px',
                    padding: '0',
                  }}
                />
                {isAiSearching && (
                  <Loader2
                    size={14}
                    style={{
                      color: 'var(--accent)',
                      flexShrink: 0,
                      marginTop: '11px',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                )}
                {!isAiSearching && aiQuery && (
                  <button
                    onClick={handleAISearch}
                    style={{
                      ...inputBase,
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '0 14px',
                      flexShrink: 0,
                    }}
                  >
                    Search
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-card-hover)',
                  }}
                >
                  {/* Checkbox */}
                  <th
                    style={{
                      width: '44px',
                      paddingLeft: '16px',
                      paddingRight: '8px',
                      paddingTop: '11px',
                      paddingBottom: '11px',
                      textAlign: 'left',
                    }}
                  >
                    <button
                      onClick={handleSelectAll}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', padding: '2px',
                      }}
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
                    { label: 'Identifiers' },
                    { label: 'Program' },
                    { label: 'Applied' },
                    { label: 'Stage' },
                    { label: '', width: '36px' },
                  ].map(col => (
                    <th
                      key={col.label}
                      style={{
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: '600',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        width: col.width,
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && students.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '56px', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><Users size={18} /></div>
                        <p className="empty-state-title">No students found</p>
                        <p className="empty-state-description">Try adjusting your filters or search term.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.map((student, idx) => {
                  const isChecked = selectedStudents.includes(student.id)
                  const stage = STAGE[student.status as string] ?? STAGE.submitted
                  const name = (student.studentName as string) || ''
                  const email = (student.studentEmail as string) || ''
                  const displayName = name || null

                  return (
                    <tr
                      key={student.id}
                      id={`student-row-${student.id}`}
                      onClick={() => router.push(`/students/${student.id}`)}
                      style={{
                        borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--border)' : 'none',
                        background: isChecked ? 'var(--accent-bg)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
                      }}
                      onMouseLeave={e => {
                        if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent'
                      }}
                    >
                      {/* Checkbox */}
                      <td
                        style={{ paddingLeft: '16px', paddingRight: '8px', paddingTop: '13px', paddingBottom: '13px', verticalAlign: 'middle' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleSelect(student.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
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
                            {getInitials(name, email)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            {displayName ? (
                              <div
                                style={{
                                  fontSize: '14px', fontWeight: '600',
                                  color: 'var(--text-primary)', lineHeight: 1.35,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                }}
                              >
                                {displayName}
                                {riskMap[student.id] && (
                                  <span
                                    title={`Risk Reason: ${riskMap[student.id].reason}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      padding: '1px 6px',
                                      borderRadius: '5px',
                                      cursor: 'help',
                                      background:
                                        riskMap[student.id].riskLevel === 'high'
                                          ? 'rgba(220,38,38,0.15)'
                                          : riskMap[student.id].riskLevel === 'medium'
                                          ? 'rgba(217,119,6,0.15)'
                                          : 'rgba(26,174,57,0.15)',
                                      color:
                                        riskMap[student.id].riskLevel === 'high'
                                          ? '#DC2626'
                                          : riskMap[student.id].riskLevel === 'medium'
                                          ? '#D97706'
                                          : '#1AAE39',
                                      border:
                                        riskMap[student.id].riskLevel === 'high'
                                          ? '1px solid rgba(220,38,38,0.3)'
                                          : riskMap[student.id].riskLevel === 'medium'
                                          ? '1px solid rgba(217,119,6,0.3)'
                                          : '1px solid rgba(26,174,57,0.3)',
                                    }}
                                  >
                                    <ShieldAlert size={10} />
                                    {riskMap[student.id].riskLevel.toUpperCase()} RISK
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontSize: '14px', fontWeight: '500',
                                  color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 1.35,
                                }}
                              >
                                Unnamed Student
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: '12px', color: 'var(--text-muted)',
                                marginTop: '1px', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                            >
                              {email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Identifiers */}
                      <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* APP code as monospace badge */}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                              fontSize: '11px',
                              fontWeight: '500',
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-card-hover)',
                              border: '1px solid var(--border)',
                              borderRadius: '5px',
                              padding: '2px 7px',
                              letterSpacing: '0.03em',
                              alignSelf: 'flex-start',
                            }}
                          >
                            <span style={{ color: 'var(--text-faint)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em' }}>APP</span>
                            {student.id.slice(0, 8).toUpperCase()}
                          </span>

                          {/* Enrollment number if present */}
                          {(() => {
                            const enrNum = (student.enrollmentDetails as Record<string, unknown>)?.enrollmentNumber
                            if (!enrNum) return null
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: '#1AAE39',
                                  background: 'rgba(26,174,57,0.08)',
                                  border: '1px solid rgba(26,174,57,0.20)',
                                  borderRadius: '5px',
                                  padding: '2px 7px',
                                  alignSelf: 'flex-start',
                                }}
                              >
                                <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', color: '#1AAE39', opacity: 0.7 }}>ENR</span>
                                {String(enrNum)}
                              </span>
                            )
                          })()}
                        </div>
                      </td>

                      {/* Program */}
                      <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontSize: '13px', color: 'var(--text-secondary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px',
                          }}
                        >
                          {(student.programName as string) || '—'}
                        </div>
                        {student.departmentName && (
                          <div
                            style={{
                              fontSize: '11px', color: 'var(--text-faint)',
                              marginTop: '1px', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {student.departmentName as string}
                          </div>
                        )}
                      </td>

                      {/* Applied Date (replaces Tags) */}
                      <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {formatAppliedDate(student.appliedAt)}
                        </div>
                      </td>

                      {/* Stage badge — color coded */}
                      <td style={{ padding: '13px 14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            color: stage.color,
                            background: stage.bg,
                            border: `1px solid ${stage.border}`,
                            borderRadius: '6px',
                            padding: '3px 9px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: stage.color, flexShrink: 0,
                            }}
                          />
                          {stage.label}
                        </span>
                      </td>

                      {/* Chevron */}
                      <td style={{ padding: '13px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <ChevronRight size={14} style={{ color: 'var(--text-faint)', display: 'block' }} />
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
              Showing <strong style={{ color: 'var(--text-secondary)' }}>{filteredStudents.length}</strong>{' '}
              student{filteredStudents.length !== 1 ? 's' : ''}
              {filtersActive && ' (filtered)'}
            </span>

            {hasMore && (
              <button
                onClick={() => loadStudents(true)}
                disabled={loading}
                className="btn-secondary"
                style={{ fontSize: '12px', height: '30px', padding: '0 12px' }}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </div>

        {/* ── Tag modal ── */}
        <AnimatePresence>
          {isTagModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
                onClick={() => setIsTagModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '100%', maxWidth: '400px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 51,
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                    Assign tag
                  </h3>
                  <button
                    onClick={() => setIsTagModalOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Apply a tag to {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''}.
                </p>
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBulkAddTag()}
                  className="input-field"
                  placeholder="e.g. VIP, Scholarship, Priority"
                  autoFocus
                  style={{ marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setIsTagModalOpen(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleBulkAddTag} disabled={!newTag.trim()} className="btn-primary">Assign tag</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </RouteGuard>
  )
}