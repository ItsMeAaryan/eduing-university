'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { getApplicationsPage, updateApplicationTags } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { Search, Filter, MoreVertical, Tag, CheckSquare, Square, ChevronRight, Download, Users, Bot, Loader2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import RouteGuard from '@/components/guards/RouteGuard'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { AI_SERVICE } from '@/lib/ai'

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
    
    if (!isLoadMore) {
      setLoading(true)
      setStudents([])
      setLastDoc(null)
    }

    try {
      const currentLastDoc = isLoadMore ? lastDoc : null
      const res = await getApplicationsPage(user.uid, 15, currentLastDoc, {
        status: statusFilter,
        searchTerm: searchTerm
      })
      
      if (isLoadMore) {
        setStudents(prev => [...prev, ...res.apps])
      } else {
        setStudents(res.apps)
      }
      setLastDoc(res.lastDoc)
      setHasMore(res.apps.length === 15)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        loadStudents()
        const unsubProgs = subscribeToPrograms(user.uid, setPrograms)
        return () => unsubProgs()
      }
    })
    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter])

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return
    setIsAiSearching(true)
    try {
      const filters = await AI_SERVICE.parseSearchIntent(aiQuery)
      if (filters.status) {
        setStatusFilter(filters.status)
      }
      if (filters.tags && filters.tags.length > 0) {
        // Ideally we'd have a tag filter, but we can put it in searchTerm for now
        setSearchTerm(filters.tags.join(' '))
      }
      toast.success('Applied AI filters')
    } catch (err) {
      toast.error('AI failed to parse intent')
    } finally {
      setIsAiSearching(false)
      setAiQuery('')
    }
  }

  const filteredStudents = programFilter === 'all' 
    ? students 
    : students.filter(s => s.programId === programFilter)

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleBulkAddTag = async () => {
    if (!newTag.trim() || selectedStudents.length === 0) return
    
    const user = auth.currentUser
    if (!user) return

    const actor = { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
    
    const promise = Promise.all(
      selectedStudents.map(async (id) => {
        const student = students.find(s => s.id === id)
        if (student) {
          const currentTags = student.tags || []
          if (!currentTags.includes(newTag.trim())) {
            await updateApplicationTags(user.uid, id, [...currentTags, newTag.trim()], actor)
          }
        }
      })
    )

    toast.promise(promise, {
      loading: 'Adding tags...',
      success: 'Tags added successfully',
      error: 'Failed to add tags'
    })

    setIsTagModalOpen(false)
    setNewTag('')
    setSelectedStudents([])
    setTimeout(() => loadStudents(), 1000)
  }

  return (
    <RouteGuard require="view_applications">
      <div className="flex flex-col" style={{ minHeight: '60vh' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Student Directory</h1>
            <p className="page-subtitle">Enterprise CRM for managing the complete student lifecycle</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedStudents.length > 0 && (
              <button 
                onClick={() => setIsTagModalOpen(true)}
                className="btn-secondary"
              >
                <Tag size={14} /> Assign Tag ({selectedStudents.length})
              </button>
            )}
            <button className="btn-secondary">
              <Download size={14} /> Export CRM Data
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, email, application ID, or tags..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-dark w-full pl-10"
            />
          </div>
          
          <div className="flex-1 relative flex">
            <Bot className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
            <input 
              type="text" 
              placeholder="Ask AI (e.g. 'Show enrolled scholarship students')" 
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAISearch()}
              className="input-dark w-full pl-10 pr-12 border-brand-primary/30 focus:border-brand-primary"
            />
            {isAiSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary animate-spin" size={16} />}
          </div>
          <select 
            value={programFilter} 
            onChange={e => setProgramFilter(e.target.value)}
            className="input-dark w-48 truncate"
          >
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="input-dark w-48 capitalize"
          >
            <option value="all">Lifecycle Stage</option>
            <option value="submitted">Applicant</option>
            <option value="under_review">Under Review</option>
            <option value="docs_verified">Docs Verified</option>
            <option value="selected">Selected</option>
            <option value="seat_accepted">Seat Accepted</option>
            <option value="fee_paid">Fee Paid</option>
            <option value="payment_verified">Payment Verified</option>
            <option value="enrolled">Enrolled Student</option>
          </select>
        </div>

        <div className="flex-1 bg-brand-surface border border-brand-border rounded-xl flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 relative min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-brand-surface z-10 shadow-sm">
                <tr className="border-b border-brand-border bg-black/40">
                  <th className="p-4 w-12">
                    <button onClick={handleSelectAll} className="text-text-muted hover:text-white transition-colors">
                      {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 
                        ? <CheckSquare size={18} className="text-brand-primary" /> 
                        : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Student Profile</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Identifiers</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Program Details</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Tags</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Lifecycle Status</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && students.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                )}
                
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/students/${student.id}`)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleSelect(student.id)}
                        className="text-text-muted hover:text-white transition-colors mt-1"
                      >
                        {selectedStudents.includes(student.id) 
                          ? <CheckSquare size={18} className="text-brand-primary" /> 
                          : <Square size={18} />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary-text flex items-center justify-center font-bold text-sm shrink-0">
                          {student.studentName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">{student.studentName}</p>
                          <p className="text-xs text-text-muted">{student.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-text-muted space-y-1 font-mono">
                        <p>APP: <span className="text-white">{student.id.slice(0, 8)}</span></p>
                        {student.enrollmentDetails?.enrollmentNumber && (
                          <p>ENR: <span className="text-brand-success">{student.enrollmentDetails.enrollmentNumber}</span></p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-text-secondary line-clamp-1">{student.programName}</p>
                      <p className="text-xs text-text-muted mt-1">{student.departmentName}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {student.tags?.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-text-secondary border border-white/5 uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                        {student.tags?.length > 2 && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-text-muted border border-white/5">
                            +{student.tags.length - 2}
                          </span>
                        )}
                        {!student.tags?.length && (
                          <span className="text-xs text-text-muted italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight size={18} className="text-text-muted group-hover:text-brand-primary transition-colors" />
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <Users size={22} />
                        </div>
                        <p className="empty-state-title">No students found</p>
                        <p className="empty-state-description">Try adjusting your filters or search term.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="p-4 border-t border-brand-border flex justify-center bg-black/20">
              <button
                onClick={() => loadStudents(true)}
                disabled={loading}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Students'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Assign CRM Tag</h3>
            <p className="text-text-muted text-sm mb-6">Apply a custom tag to {selectedStudents.length} selected student(s).</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">Tag Name (e.g., VIP, Priority, Scholarship)</label>
              <input 
                type="text" 
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                className="input-dark w-full"
                placeholder="Enter tag..."
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsTagModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAddTag}
                disabled={!newTag.trim()}
                className="btn-primary"
              >
                Assign Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </RouteGuard>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-brand-primary/10 text-brand-primary-text border border-brand-primary/20',
    under_review: 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20',
    docs_verified: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    selected: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    seat_accepted: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
    fee_paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    payment_verified: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    enrolled: 'bg-brand-success/10 text-brand-success border border-brand-success/20',
    rejected: 'bg-brand-error/10 text-brand-error border border-brand-error/20'
  }
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.submitted}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
