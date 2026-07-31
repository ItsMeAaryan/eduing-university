'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { getApplicationsPage, updateApplicationTags } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { Search, Tag, CheckSquare, Square, ChevronRight, Download, Users, Bot, Loader2, X } from 'lucide-react'
import { useToast } from '@/components/Toast'
import RouteGuard from '@/components/guards/RouteGuard'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { AI_SERVICE } from '@/lib/ai'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Applicant', cls: 'badge badge-info' },
  under_review: { label: 'In Review', cls: 'badge badge-warning' },
  docs_verified: { label: 'Docs Verified', cls: 'badge badge-info' },
  selected: { label: 'Selected', cls: 'badge badge-success' },
  seat_accepted: { label: 'Seat Accepted', cls: 'badge badge-success' },
  fee_paid: { label: 'Fee Paid', cls: 'badge badge-success' },
  payment_verified: { label: 'Payment Verified', cls: 'badge badge-success' },
  enrolled: { label: 'Enrolled', cls: 'badge badge-success' },
  rejected: { label: 'Rejected', cls: 'badge badge-error' },
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

  return (
    <RouteGuard require="view_applications">
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Students</h1>
            <p className="page-subtitle">Complete lifecycle CRM for managing student admissions</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {/* Regular search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input
              placeholder="Search name, email, ID, tags…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '30px' }}
            />
          </div>

          {/* AI search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Bot size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', pointerEvents: 'none' }} />
            <input
              placeholder="Ask AI: 'Show scholarship students'…"
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAISearch()}
              className="input-field"
              style={{ paddingLeft: '30px', paddingRight: '32px', borderColor: aiQuery ? 'var(--accent-border)' : undefined }}
            />
            {isAiSearching && (
              <Loader2 size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
            )}
          </div>

          <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className="input-field" style={{ minWidth: '130px', cursor: 'pointer' }}>
            <option value="all">All programs</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name as string}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ minWidth: '130px', cursor: 'pointer' }}>
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
        </div>

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
                  <th>Identifiers</th>
                  <th>Program</th>
                  <th>Tags</th>
                  <th>Stage</th>
                  <th style={{ width: '44px' }} />
                </tr>
              </thead>
              <tbody>
                {loading && students.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center' }}>
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
                ) : filteredStudents.map(student => {
                  const isSelected = selectedStudents.includes(student.id)
                  const s = STATUS[student.status as string] || STATUS.submitted

                  return (
                    <tr
                      key={student.id}
                      onClick={() => router.push(`/students/${student.id}`)}
                      style={{ background: isSelected ? 'var(--accent-bg)' : undefined }}
                    >
                      {/* Checkbox */}
                      <td style={{ paddingLeft: '16px', paddingRight: '8px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(student.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
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
                            width: '30px', height: '30px', borderRadius: '7px', flexShrink: 0,
                            background: 'var(--accent-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '600', color: 'var(--accent)',
                          }}>
                            {((student.studentName as string) || 'S').charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {student.studentName as string || '—'}
                            </div>
                            <div className="text-caption">{student.studentEmail as string || ''}</div>
                          </div>
                        </div>
                      </td>

                      {/* Identifiers */}
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6 }}>
                          <span style={{ color: 'var(--text-muted)' }}>APP </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{student.id.slice(0, 8)}</span>
                          {(student.enrollmentDetails as any)?.enrollmentNumber && (
                            <>
                              <br />
                              <span style={{ color: 'var(--text-muted)' }}>ENR </span>
                              <span style={{ color: 'var(--green)', fontWeight: '600' }}>
                                {(student.enrollmentDetails as any).enrollmentNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Program */}
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{student.programName as string || '—'}</div>
                        {student.departmentName && (
                          <div className="text-caption">{student.departmentName as string}</div>
                        )}
                      </td>

                      {/* Tags */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(student.tags as string[] | undefined)?.slice(0, 2).map((tag: string) => (
                            <span key={tag} style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'var(--bg-card-hover)',
                              border: '1px solid var(--border)',
                              fontSize: '10px',
                              fontWeight: '500',
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              {tag}
                            </span>
                          ))}
                          {((student.tags as string[] | undefined)?.length ?? 0) > 2 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                              +{(student.tags as string[]).length - 2}
                            </span>
                          )}
                          {!((student.tags as string[] | undefined)?.length) && (
                            <span style={{ fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Stage */}
                      <td>
                        <span className={s.cls}>{s.label}</span>
                      </td>

                      {/* Arrow */}
                      <td>
                        <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => loadStudents(true)} disabled={loading} className="btn-secondary" style={{ fontSize: '13px' }}>
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>

        {/* Tag modal */}
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
                  <button onClick={() => setIsTagModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
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