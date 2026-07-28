'use client'

import React, { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase/config'
import { motion, AnimatePresence } from 'framer-motion'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { AI_SERVICE, type EligibilityResult, type FraudAlert } from '@/lib/ai'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import RouteGuard from '@/components/guards/RouteGuard'
import { User, Mail, Phone, MapPin, Briefcase, Calendar, ChevronLeft, Flag, FileText, Activity, Clock, Bot, AlertTriangle, Loader2, RefreshCw, Shield, CheckCircle, XCircle } from 'lucide-react'
import StudentLifecycle from '@/components/StudentLifecycle'
import AdmissionProgressSection from '@/components/AdmissionProgressSection'
import GeneratedDocumentsSection from '@/components/GeneratedDocumentsSection'
import DocumentVerificationPanel from '@/components/DocumentVerificationPanel'
import { subscribeToApplicationDocuments } from '@/lib/firebase/documents'
import type { StudentDocument } from '@/lib/firebase/documents'
import { subscribeToInternalNotes, addInternalNote, updateApplicationTags } from '@/lib/firebase/applications'
import type { InternalNote } from '@/lib/firebase/applications'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/context/AuthContext'
import { subscribeToEntityAuditLogs } from '@/lib/firebase/audit'
import type { AuditLog } from '@/lib/firebase/types'

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { userData, user } = useAuth()
  
  const [student, setStudent] = useState<FirestoreRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Data States
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null)
  
  // Note Form
  
  // AI States
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [fraudAlert, setFraudAlert] = useState<FraudAlert | null>(null)
  const [isCheckingFraud, setIsCheckingFraud] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [notePriority, setNotePriority] = useState<'low'|'normal'|'high'>('normal')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const appRef = doc(db, 'applications', params.id)
        const appSnap = await getDoc(appRef)
        if (appSnap.exists()) {
          const studentData = { id: appSnap.id, ...appSnap.data() } as FirestoreRecord
          setStudent(studentData)
          
          // Auto-trigger AI checks if not already done
          runAIChecks(studentData)
        } else {
          toast.error('Student profile not found')
          router.push('/students')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [params.id, router, toast])

  useEffect(() => {
    if (!student) return
    
    const unsubDocs = subscribeToApplicationDocuments(student.id, setDocuments)
    const unsubNotes = subscribeToInternalNotes(student.id, setInternalNotes)
    
    let unsubAudit: (() => void) | undefined
    if (student.universityId) {
      unsubAudit = subscribeToEntityAuditLogs(student.universityId, student.id, setAuditLogs)
    }

    return () => {
      unsubDocs()
      unsubNotes()
      if (unsubAudit) unsubAudit()
    }
  }, [student?.id, student?.universityId])

  const handleAddNote = async () => {
    if (!newNote.trim() || !student || !user) return
    setIsSubmittingNote(true)
    try {
      const actor = { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
      await addInternalNote(student.universityId, student.id, newNote.trim(), notePriority, actor)
      setNewNote('')
      setNotePriority('normal')
      toast.success('Internal note added')
    } catch (err) {
      console.error(err)
      toast.error('Failed to add note')
    } finally {
      setIsSubmittingNote(false)
    }
  }

  // AI Integration Methods
  const runAIChecks = async (studentData: any) => {
    // 1. Generate Summary
    if (!aiSummary) {
      setIsSummarizing(true)
      try {
        const summary = await AI_SERVICE.generateApplicantSummary(studentData)
        setAiSummary(summary)
      } finally {
        setIsSummarizing(false)
      }
    }

    // 2. Eligibility
    if (!eligibility) {
      setIsCheckingEligibility(true)
      try {
        const result = await AI_SERVICE.analyzeEligibility(studentData, {})
        setEligibility(result)
      } finally {
        setIsCheckingEligibility(false)
      }
    }

    // 3. Fraud
    if (!fraudAlert) {
      setIsCheckingFraud(true)
      try {
        // We simulate passing all students by just passing an empty array or a mock for now
        // In a real app we'd fetch other apps, but we can just use the mock engine which doesn't strictly need it to return a basic response.
        const alert = await AI_SERVICE.detectFraud(studentData, [])
        setFraudAlert(alert)
      } finally {
        setIsCheckingFraud(false)
      }
    }
  }

  const handleRegenerateSummary = async () => {
    if (!student) return
    setIsSummarizing(true)
    try {
      const summary = await AI_SERVICE.generateApplicantSummary(student)
      setAiSummary(summary)
    } finally {
      setIsSummarizing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!student) return null

  return (
    <RouteGuard require="view_applications">
      <div className="flex h-screen bg-brand-background overflow-hidden relative">
        
        {/* Left Sidebar - Profile Summary */}
        <div className="w-80 bg-brand-surface border-r border-brand-border flex flex-col shrink-0">
          <div className="p-6 border-b border-brand-border">
            <button 
              onClick={() => router.push('/students')}
              className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6 text-sm font-medium"
            >
              <ChevronLeft size={16} /> Back to Directory
            </button>

            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-brand-primary/10 text-brand-primary-text flex items-center justify-center font-bold text-3xl mb-4 shadow-lg shadow-brand-primary/5">
                {student.studentName?.charAt(0) || 'S'}
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{student.studentName}</h2>
              <p className="text-sm text-text-muted">{student.studentEmail}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-muted">
                  <Phone size={14} />
                </div>
                <span className="text-text-secondary">{student.studentPhone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-muted">
                  <MapPin size={14} />
                </div>
                <span className="text-text-secondary">{student.city || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-brand-border">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Identifiers</h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">APP ID</span>
                <span className="text-white">{student.id}</span>
              </div>
              {student.enrollmentDetails?.enrollmentNumber && (
                <div className="flex justify-between">
                  <span className="text-text-muted">ENR NO</span>
                  <span className="text-brand-success font-bold">{student.enrollmentDetails.enrollmentNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center justify-between">
              CRM Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {student.tags?.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] text-text-secondary border border-white/10 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
              {!student.tags?.length && <p className="text-xs text-text-muted italic">No tags assigned</p>}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-brand-background overflow-hidden relative">
          
          <header className="px-8 py-6 border-b border-brand-border bg-brand-surface/50 shrink-0">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{student.programName}</h1>
                <p className="text-text-secondary">{student.departmentName}</p>
              </div>
              <StatusBadge status={student.status} />
            </div>

            <nav className="flex gap-6">
              {['overview', 'academic', 'financial', 'documents', 'notes', 'audit'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
                    activeTab === tab ? 'text-brand-primary' : 'text-text-muted hover:text-white'
                  }`}
                >
                  {tab.replace('_', ' ')}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"
                    />
                  )}
                </button>
              ))}
            </nav>
          </header>

          <main className="flex-1 overflow-y-auto p-8 relative">
            
            {activeTab === 'overview' && (
              <div className="space-y-8 max-w-4xl">
                
                {/* AI Fraud Alert */}
                <AnimatePresence>
                  {fraudAlert && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-brand-error/10 border border-brand-error text-brand-error rounded-xl p-6"
                    >
                      <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} /> Security & Fraud Alert ({fraudAlert.level})
                      </h3>
                      <p className="text-sm mb-4">{fraudAlert.explanation}</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm font-medium">
                        {fraudAlert.flags.map((flag, i) => <li key={i}>{flag}</li>)}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Summary */}
                <section className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Bot size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
                        <Bot size={16} /> AI Applicant Summary
                      </h3>
                      <button 
                        onClick={handleRegenerateSummary}
                        disabled={isSummarizing}
                        className="text-xs text-brand-primary hover:text-white transition-colors flex items-center gap-1"
                      >
                        {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Regenerate
                      </button>
                    </div>
                    {isSummarizing ? (
                      <div className="flex gap-2 items-center text-text-muted text-sm">
                        <Loader2 size={16} className="animate-spin text-brand-primary" /> Analyzing applicant profile...
                      </div>
                    ) : (
                      <p className="text-white text-sm leading-relaxed">{aiSummary}</p>
                    )}
                  </div>
                </section>

                <section className="bg-brand-surface border border-brand-border rounded-xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Lifecycle Status</h3>
                  <StudentLifecycle currentStatus={student.status} />
                </section>

                <div className="grid grid-cols-2 gap-6">
                  <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-brand-primary" /> Application Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-text-muted mb-1">Applied Date</p>
                        <p className="text-sm text-white">
                          {student.appliedAt?.seconds ? new Date(student.appliedAt.seconds * 1000).toLocaleString() : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted mb-1">Last Updated</p>
                        <p className="text-sm text-white">
                          {student.updatedAt?.seconds ? new Date(student.updatedAt.seconds * 1000).toLocaleString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity size={16} className="text-brand-success" /> Enrollment Status
                    </h3>
                    {student.status === 'enrolled' ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-text-muted mb-1">Enrolled Date</p>
                          <p className="text-sm text-white">
                            {student.enrollmentDetails?.enrolledAt ? new Date(student.enrollmentDetails.enrolledAt).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-1">Enrolled By</p>
                          <p className="text-sm text-white">
                            {student.enrollmentDetails?.enrolledBy || 'System'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted italic text-sm">
                        Student is not enrolled yet.
                      </div>
                    )}
                  </section>
                </div>

                {/* AI Eligibility Assistant */}
                <section className="bg-brand-surface border border-brand-border rounded-xl p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Shield size={16} className={eligibility?.isEligible ? 'text-brand-success' : 'text-brand-warning'} /> 
                    AI Eligibility Assistant
                  </h3>
                  
                  {isCheckingEligibility ? (
                    <div className="flex gap-2 items-center text-text-muted text-sm h-32 justify-center">
                      <Loader2 size={16} className="animate-spin text-brand-primary" /> Verifying constraints...
                    </div>
                  ) : eligibility ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl font-bold ${eligibility.isEligible ? 'text-brand-success' : 'text-brand-warning'}`}>
                          {eligibility.confidence}%
                        </div>
                        <div className="text-sm text-text-secondary">
                          Confidence this applicant meets the base requirements for {student.programName}.
                        </div>
                      </div>

                      {eligibility.reasonsMet.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider mb-2">Requirements Met</h4>
                          <ul className="space-y-2 text-sm text-text-secondary">
                            {eligibility.reasonsMet.map((reason, i) => (
                              <li key={i} className="flex gap-2"><CheckCircle size={16} className="text-brand-success shrink-0" /> {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {eligibility.reasonsMissing.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-brand-error uppercase tracking-wider mb-2">Requirements Missing</h4>
                          <ul className="space-y-2 text-sm text-text-secondary">
                            {eligibility.reasonsMissing.map((reason, i) => (
                              <li key={i} className="flex gap-2"><XCircle size={16} className="text-brand-error shrink-0" /> {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {eligibility.concerns.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-brand-warning uppercase tracking-wider mb-2">Potential Concerns</h4>
                          <ul className="space-y-2 text-sm text-text-secondary">
                            {eligibility.concerns.map((reason, i) => (
                              <li key={i} className="flex gap-2"><AlertTriangle size={16} className="text-brand-warning shrink-0" /> {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-[10px] text-text-muted italic border-t border-white/5 pt-4 mt-2">
                        AI recommendations are for guidance only. Do not automate rejections based on this panel.
                      </p>
                    </div>
                  ) : null}
                </section>
              </div>
            )}

            {activeTab === 'academic' && (
              <div className="max-w-4xl">
                <AdmissionProgressSection app={student} />
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="max-w-4xl space-y-6">
                <AdmissionProgressSection app={student} />
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="max-w-5xl space-y-8">
                <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Generated Documents</h3>
                  <GeneratedDocumentsSection app={student} universityName={userData?.universityName || 'University'} />
                </div>
                
                <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Uploaded Documents</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        onClick={() => setSelectedDocument(doc)}
                        className="bg-black/20 border border-white/5 rounded-xl p-4 cursor-pointer hover:border-brand-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 bg-white/5 rounded-lg text-brand-primary">
                            <FileText size={20} />
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === 'verified' ? 'bg-brand-success/10 text-brand-success' :
                            doc.status === 'rejected' ? 'bg-brand-error/10 text-brand-error' :
                            doc.status === 'requires_resubmission' ? 'bg-brand-warning/10 text-brand-warning' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{doc.name}</h4>
                        <p className="text-xs text-text-muted">{doc.category}</p>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="col-span-full py-8 text-center text-text-muted italic border-2 border-dashed border-white/10 rounded-xl">
                        No documents uploaded by student yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="max-w-4xl flex gap-8">
                <div className="flex-1 space-y-6">
                  <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Internal Notes (CRM)</h3>
                    <p className="text-sm text-text-muted mb-6">These notes are strictly internal and visible only to authorized staff members.</p>
                    
                    <div className="space-y-4 mb-8">
                      <textarea 
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Add a counseling note, priority flag, or internal follow-up..."
                        className="input-dark w-full h-32 resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <select 
                          value={notePriority}
                          onChange={(e: any) => setNotePriority(e.target.value)}
                          className="input-dark w-48"
                        >
                          <option value="low">Low Priority</option>
                          <option value="normal">Normal Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                        <button 
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || isSubmittingNote}
                          className="btn-primary"
                        >
                          {isSubmittingNote ? 'Saving...' : 'Add Note'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {internalNotes.map(note => (
                        <div key={note.id} className="bg-black/20 border border-white/5 rounded-xl p-5 relative overflow-hidden">
                          {note.priority === 'high' && <div className="absolute top-0 left-0 w-1 h-full bg-brand-error" />}
                          {note.priority === 'low' && <div className="absolute top-0 left-0 w-1 h-full bg-text-muted" />}
                          
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">
                                {note.authorName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{note.authorName}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">{note.authorRole.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock size={12} /> {(note.createdAt as any)?.seconds ? new Date((note.createdAt as any).seconds * 1000).toLocaleString() : 'Just now'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-text-secondary whitespace-pre-wrap pl-11">{note.text}</p>
                        </div>
                      ))}
                      {internalNotes.length === 0 && (
                        <p className="text-center text-text-muted italic py-8 border-2 border-dashed border-white/5 rounded-xl">
                          No internal notes found for this student.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="max-w-4xl space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="bg-brand-surface border border-brand-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <Activity size={16} className="text-brand-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium capitalize">{log.actionType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-text-muted mt-1">By {log.actorName} ({log.actorRole.replace('_', ' ')})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">{new Date(log.timestamp).toLocaleString()}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'success' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-error/10 text-brand-error'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center text-text-muted italic py-12 border-2 border-dashed border-white/5 rounded-xl">
                    No audit logs available for this student.
                  </p>
                )}
              </div>
            )}

          </main>
        </div>
        
        {/* Document Viewer Modal Overlay */}
        {selectedDocument && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDocument(null)} />
            <div className="relative z-10 w-full h-full p-4 flex justify-end">
              <div className="w-full max-w-xl h-full shadow-2xl rounded-2xl overflow-hidden bg-brand-surface border-l border-brand-border">
                <DocumentVerificationPanel
                  appId={student.id}
                  studentId={student.studentId}
                  universityId={student.universityId}
                  document={selectedDocument}
                  onClose={() => setSelectedDocument(null)}
                />
              </div>
            </div>
          </div>
        )}

      </div>
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
    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status] || styles.submitted}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
