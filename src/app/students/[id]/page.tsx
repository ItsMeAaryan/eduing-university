'use client'

import React, { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase/config'
import { motion, AnimatePresence } from 'framer-motion'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { AI_SERVICE, type EligibilityResult, type FraudAlert } from '@/lib/ai'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import RouteGuard from '@/components/guards/RouteGuard'
import {
  ChevronLeft, FileText, Activity, Clock, Bot,
  AlertTriangle, Loader2, RefreshCw, Shield,
  CheckCircle, XCircle, Phone, MapPin, X,
} from 'lucide-react'
import StudentLifecycle from '@/components/StudentLifecycle'
import AdmissionProgressSection from '@/components/AdmissionProgressSection'
import GeneratedDocumentsSection from '@/components/GeneratedDocumentsSection'
import DocumentVerificationPanel from '@/components/DocumentVerificationPanel'
import { subscribeToApplicationDocuments } from '@/lib/firebase/documents'
import type { StudentDocument } from '@/lib/firebase/documents'
import { subscribeToInternalNotes, addInternalNote } from '@/lib/firebase/applications'
import type { InternalNote } from '@/lib/firebase/applications'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/context/AuthContext'
import { subscribeToEntityAuditLogs } from '@/lib/firebase/audit'
import type { AuditLog } from '@/lib/firebase/types'

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

const TABS = ['overview', 'academic', 'financial', 'documents', 'notes', 'audit'] as const
type Tab = typeof TABS[number]

// ─── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, value }: { icon: React.ElementType; value?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: value ? 'var(--text-secondary)' : 'var(--text-faint)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || 'Not provided'}
      </span>
    </div>
  )
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
      }}>
        {Icon && <Icon size={14} style={{ color: 'var(--text-muted)' }} />}
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.1px' }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: '16px 18px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { userData, user } = useAuth()

  const [student, setStudent] = useState<FirestoreRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null)

  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [fraudAlert, setFraudAlert] = useState<FraudAlert | null>(null)
  const [isCheckingFraud, setIsCheckingFraud] = useState(false)

  const [newNote, setNewNote] = useState('')
  const [notePriority, setNotePriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const snap = await getDoc(doc(db, 'applications', params.id))
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as FirestoreRecord
          setStudent(data)
          runAIChecks(data)
        } else {
          toast.error('Student not found')
          router.push('/students')
        }
      } catch {
        toast.error('Failed to load student')
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [params.id])

  useEffect(() => {
    if (!student) return
    const unsubDocs = subscribeToApplicationDocuments(student.id, setDocuments)
    const unsubNotes = subscribeToInternalNotes(student.id, setInternalNotes)
    let unsubAudit: (() => void) | undefined
    if (student.universityId) {
      unsubAudit = subscribeToEntityAuditLogs(student.universityId as string, student.id, setAuditLogs)
    }
    return () => { unsubDocs(); unsubNotes(); unsubAudit?.() }
  }, [student?.id, student?.universityId])

  const runAIChecks = async (s: FirestoreRecord) => {
    if (!aiSummary) {
      setIsSummarizing(true)
      try { setAiSummary(await AI_SERVICE.generateApplicantSummary(s)) }
      finally { setIsSummarizing(false) }
    }
    if (!eligibility) {
      setIsCheckingEligibility(true)
      try { setEligibility(await AI_SERVICE.analyzeEligibility(s, {})) }
      finally { setIsCheckingEligibility(false) }
    }
    if (!fraudAlert) {
      setIsCheckingFraud(true)
      try { setFraudAlert(await AI_SERVICE.detectFraud(s, [])) }
      finally { setIsCheckingFraud(false) }
    }
  }

  const handleRegenerateSummary = async () => {
    if (!student) return
    setIsSummarizing(true)
    try { setAiSummary(await AI_SERVICE.generateApplicantSummary(student)) }
    finally { setIsSummarizing(false) }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !student || !user) return
    setIsSubmittingNote(true)
    try {
      await addInternalNote(
        student.universityId as string, student.id, newNote.trim(), notePriority,
        { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
      )
      setNewNote('')
      setNotePriority('normal')
      toast.success('Note added')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setIsSubmittingNote(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!student) return null

  const statusInfo = STATUS[student.status as string] || STATUS.submitted

  return (
    <RouteGuard require="view_applications">
      {/* Back link */}
      <button
        onClick={() => router.push('/students')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px',
          padding: '4px 0', fontFamily: 'inherit',
          transition: 'color 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ChevronLeft size={14} /> Back to Students
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '256px minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>

        {/* ── Left sidebar — profile card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Identity */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '12px',
              background: 'var(--accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: '700', color: 'var(--accent)',
              margin: '0 auto 12px',
            }}>
              {((student.studentName as string) || 'S').charAt(0)}
            </div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 3px', letterSpacing: '-0.2px' }}>
              {student.studentName as string}
            </h2>
            <p className="text-caption" style={{ marginBottom: '12px' }}>{student.studentEmail as string}</p>
            <span className={statusInfo.cls}>{statusInfo.label}</span>
          </div>

          {/* Contact */}
          <SectionCard title="Contact">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <InfoRow icon={Phone} value={student.studentPhone as string | undefined} />
              <InfoRow icon={MapPin} value={student.city as string | undefined} />
            </div>
          </SectionCard>

          {/* Identifiers */}
          <SectionCard title="Identifiers">
            <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-faint)' }}>APP</span>
                <span style={{ color: 'var(--text-secondary)' }}>{student.id.slice(0, 10)}</span>
              </div>
              {(student.enrollmentDetails as any)?.enrollmentNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-faint)' }}>ENR</span>
                  <span style={{ color: 'var(--green)', fontWeight: '600' }}>
                    {(student.enrollmentDetails as any).enrollmentNumber}
                  </span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Tags */}
          <SectionCard title="CRM Tags">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {(student.tags as string[] | undefined)?.map((tag: string) => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '4px',
                  background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
                  fontSize: '10px', fontWeight: '500', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {tag}
                </span>
              ))}
              {!(student.tags as string[] | undefined)?.length && (
                <span style={{ fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic' }}>No tags assigned</span>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Main content ── */}
        <div>
          {/* Page header */}
          <div style={{ marginBottom: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px', letterSpacing: '-0.5px' }}>
              {student.programName as string}
            </h1>
            {student.departmentName && (
              <p className="text-caption">{student.departmentName as string}</p>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '2px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px',
          }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? '600' : '400',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'color 0.1s, border-color 0.1s',
                  marginBottom: '-1px',
                  textTransform: 'capitalize',
                  fontFamily: 'inherit',
                  letterSpacing: '-0.1px',
                }}
                onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Fraud alert */}
              <AnimatePresence>
                {fraudAlert && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.2)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Fraud Alert — {fraudAlert.level}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{fraudAlert.explanation}</p>
                    <ul style={{ paddingLeft: '16px', margin: 0 }}>
                      {fraudAlert.flags.map((flag, i) => (
                        <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{flag}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI summary */}
              <div style={{
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                borderRadius: '10px',
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={13} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      AI Summary
                    </span>
                  </div>
                  <button
                    onClick={handleRegenerateSummary}
                    disabled={isSummarizing}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', color: 'var(--accent)', fontFamily: 'inherit',
                    }}
                  >
                    {isSummarizing ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <RefreshCw size={12} />}
                    Regenerate
                  </button>
                </div>
                {isSummarizing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <Loader2 size={14} style={{ color: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
                    Analyzing profile…
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{aiSummary}</p>
                )}
              </div>

              {/* Lifecycle */}
              <SectionCard title="Lifecycle Status" icon={Activity}>
                <StudentLifecycle currentStatus={student.status as string} />
              </SectionCard>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SectionCard title="Application Details" icon={FileText}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div className="text-eyebrow" style={{ marginBottom: '3px' }}>Applied</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {(student.appliedAt as any)?.seconds
                          ? new Date((student.appliedAt as any).seconds * 1000).toLocaleString()
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-eyebrow" style={{ marginBottom: '3px' }}>Last updated</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {(student.updatedAt as any)?.seconds
                          ? new Date((student.updatedAt as any).seconds * 1000).toLocaleString()
                          : '—'}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Enrollment" icon={Activity}>
                  {student.status === 'enrolled' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div className="text-eyebrow" style={{ marginBottom: '3px' }}>Enrolled</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {(student.enrollmentDetails as any)?.enrolledAt
                            ? new Date((student.enrollmentDetails as any).enrolledAt).toLocaleString()
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-eyebrow" style={{ marginBottom: '3px' }}>By</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {(student.enrollmentDetails as any)?.enrolledBy || 'System'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>Not yet enrolled</p>
                  )}
                </SectionCard>
              </div>

              {/* Eligibility */}
              <SectionCard title="AI Eligibility" icon={Shield}>
                {isCheckingEligibility ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px 0', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <Loader2 size={14} style={{ color: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
                    Checking eligibility…
                  </div>
                ) : eligibility ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-1px', color: eligibility.isEligible ? 'var(--green)' : 'var(--gold)' }}>
                        {eligibility.confidence}%
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        confidence for {student.programName as string}
                      </span>
                    </div>

                    {eligibility.reasonsMet.length > 0 && (
                      <div>
                        <div className="text-eyebrow" style={{ marginBottom: '6px', color: 'var(--green)' }}>Met</div>
                        {eligibility.reasonsMet.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '5px' }}>
                            <CheckCircle size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '1px' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {eligibility.reasonsMissing.length > 0 && (
                      <div>
                        <div className="text-eyebrow" style={{ marginBottom: '6px', color: 'var(--red)' }}>Missing</div>
                        {eligibility.reasonsMissing.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '5px' }}>
                            <XCircle size={13} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {eligibility.concerns.length > 0 && (
                      <div>
                        <div className="text-eyebrow" style={{ marginBottom: '6px', color: 'var(--gold)' }}>Concerns</div>
                        {eligibility.concerns.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '5px' }}>
                            <AlertTriangle size={13} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '1px' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', borderTop: '1px solid var(--border)', paddingTop: '10px', margin: 0, fontStyle: 'italic' }}>
                      AI guidance only. Do not automate rejections based on this output.
                    </p>
                  </div>
                ) : null}
              </SectionCard>
            </div>
          )}

          {/* ── Academic / Financial ── */}
          {(activeTab === 'academic' || activeTab === 'financial') && (
            <AdmissionProgressSection app={student} />
          )}

          {/* ── Documents ── */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionCard title="Generated Documents" icon={FileText}>
                <GeneratedDocumentsSection app={student} universityName={userData?.universityName as string || 'University'} />
              </SectionCard>

              <SectionCard title="Uploaded Documents" icon={FileText}>
                {documents.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic' }}>No documents uploaded yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                    {documents.map(d => {
                      const docStatus: Record<string, string> = {
                        verified: 'badge badge-success',
                        rejected: 'badge badge-error',
                        requires_resubmission: 'badge badge-warning',
                      }
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDocument(d)}
                          style={{
                            padding: '14px',
                            background: 'var(--bg-card-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'border-color 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
                        >
                          <FileText size={16} style={{ color: 'var(--accent)', marginBottom: '8px' }} />
                          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>{d.name}</div>
                          <span className={docStatus[d.status] || 'badge badge-neutral'}>{d.status.replace('_', ' ')}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* ── Notes ── */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionCard title="Add Internal Note">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a counseling note, priority flag, or follow-up…"
                  className="input-field"
                  style={{ height: '100px', resize: 'vertical', marginBottom: '10px', display: 'block' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <select
                    value={notePriority}
                    onChange={e => setNotePriority(e.target.value as 'low' | 'normal' | 'high')}
                    className="input-field"
                    style={{ width: 'auto', minWidth: '140px' }}
                  >
                    <option value="low">Low priority</option>
                    <option value="normal">Normal priority</option>
                    <option value="high">High priority</option>
                  </select>
                  <button onClick={handleAddNote} disabled={!newNote.trim() || isSubmittingNote} className="btn-primary">
                    {isSubmittingNote ? 'Saving…' : 'Add note'}
                  </button>
                </div>
              </SectionCard>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {internalNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-faint)', fontSize: '13px', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                    No internal notes yet.
                  </div>
                ) : internalNotes.map(note => (
                  <div key={note.id} style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${note.priority === 'high' ? 'var(--red)' : note.priority === 'low' ? 'var(--border)' : 'var(--accent)'}`,
                    borderRadius: '8px',
                    padding: '14px 16px',
                    boxShadow: 'var(--shadow-card)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '6px',
                          background: 'var(--accent-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '700', color: 'var(--accent)',
                        }}>
                          {note.authorName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{note.authorName}</div>
                          <div className="text-eyebrow">{note.authorRole.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-faint)', fontSize: '11px' }}>
                        <Clock size={11} />
                        {(note.createdAt as any)?.seconds
                          ? new Date((note.createdAt as any).seconds * 1000).toLocaleString()
                          : 'Just now'}
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Audit ── */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontSize: '13px', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                  No audit logs for this student.
                </div>
              ) : auditLogs.map(log => (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '7px', flexShrink: 0,
                    background: 'var(--bg-card-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Activity size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {log.actionType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-caption">By {log.actorName} · {log.actorRole.replace('_', ' ')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-caption">{new Date(log.timestamp).toLocaleString()}</div>
                    <span className={log.status === 'success' ? 'badge badge-success' : 'badge badge-error'} style={{ marginTop: '3px', display: 'inline-flex' }}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document viewer */}
      <AnimatePresence>
        {selectedDocument && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50 }}
              onClick={() => setSelectedDocument(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '480px', zIndex: 51,
                background: 'var(--bg-elevated)',
                borderLeft: '1px solid var(--border)',
                boxShadow: 'var(--shadow-dropdown)',
                overflow: 'hidden',
              }}
            >
              <DocumentVerificationPanel
                appId={student.id}
                studentId={student.studentId as string}
                universityId={student.universityId as string}
                document={selectedDocument}
                onClose={() => setSelectedDocument(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </RouteGuard>
  )
}