'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { X, ExternalLink, Mail, Phone, FileText, AlertCircle, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { updateApplicationStatus } from '@/lib/firebase/applications'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { useToast } from '@/components/Toast'
import { useEffect } from 'react'
import { subscribeToApplicationDocuments, migrateLegacyDocument } from '@/lib/firebase/documents'
import type { StudentDocument, DocumentStatus } from '@/lib/firebase/documents'
import DocumentVerificationPanel from './DocumentVerificationPanel'
import GeneratedDocumentsSection from './GeneratedDocumentsSection'
import AdmissionProgressSection from './AdmissionProgressSection'
import StudentEmulatorSection from './StudentEmulatorSection'
import PermissionGuard from './guards/PermissionGuard'
import { subscribeToEntityAuditLogs } from '@/lib/firebase/audit'
import type { AuditLog } from '@/lib/firebase/types'
import { useAuth } from '@/context/AuthContext'

interface DocumentEntry {
  name: string
  url: string
}

interface StatusHistoryEntry {
  status: string
  date?: string
  note?: string
}

interface ApplicationPanelProps {
  app: (FirestoreRecord & { documents?: DocumentEntry[]; statusHistory?: StatusHistoryEntry[] }) | null
  onClose: () => void
}

export default function ApplicationPanel({ app, onClose }: ApplicationPanelProps) {
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null)
  const panelRef = useFocusTrap(!!app && !selectedDocument, onClose)
  const { toast } = useToast()
  const { userData, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [internalNote, setInternalNote] = useState(app?.notes || '')
  
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [generating, setGenerating] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    if (!app) return
    const unsubDocs = subscribeToApplicationDocuments(app.id, (docs) => {
      setDocuments(docs)
      
      // Handle legacy migration
      if (app.documents && app.documents.length > 0 && docs.length === 0) {
        app.documents.forEach(legacyDoc => {
          migrateLegacyDocument(app.id, legacyDoc).catch(console.error)
        })
      }
    })

    let unsubAudit: (() => void) | undefined
    if (app.universityId) {
      unsubAudit = subscribeToEntityAuditLogs(app.universityId, app.id, (logs) => {
        setAuditLogs(logs)
      })
    }
    
    return () => {
      unsubDocs()
      if (unsubAudit) unsubAudit()
    }
  }, [app?.id, app?.universityId])

  const handleStatusUpdate = async (status: string) => {
    if (!app || loading) return
    setLoading(true)
    try {
      await updateApplicationStatus(
        app.universityId,
        app.id, 
        app.studentId, 
        status,
        { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      )
      toast.success(`Status updated to ${status}`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  if (!app) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
          onClick={(e) => e.stopPropagation()}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Application Detail"
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Application Detail</h2>
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="Close application detail">
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Student Profile */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--indigo), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '24px', flexShrink: 0 }}>
                  {app.studentName?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>{app.studentName}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--indigo-light)', fontWeight: '600', margin: 0 }}>{app.programName}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Mail size={13} />
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.1em' }}>Email</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.studentEmail}</p>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Phone size={13} />
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.1em' }}>Phone</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>{app.studentPhone || 'Not provided'}</p>
                </div>
              </div>
            </section>

            {/* Academic Details */}
            <section>
              <h4 className="section-label" style={{ marginBottom: '12px' }}>Academic Profile</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 6px' }}>10th Marks</p>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{app.academicData?.tenthPercentage || 'N/A'}%</p>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 6px' }}>12th Marks</p>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{app.academicData?.twelfthPercentage || 'N/A'}%</p>
                </div>
              </div>
              {app.entranceScore && (
                <div style={{ padding: '16px', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 4px' }}>Entrance Score</p>
                    <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gold)', margin: 0 }}>{app.entranceScore}</p>
                  </div>
                  <AlertCircle size={24} style={{ color: 'var(--gold)' }} />
                </div>
              )}
            </section>

            {/* Documents */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 className="section-label" style={{ margin: 0 }}>Student Documents</h4>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{documents.length} Files</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>{doc.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.category}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>•</span>
                          <DocumentStatusChip status={doc.status} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <PermissionGuard require="verify_documents">
                        <button 
                          onClick={() => setSelectedDocument(doc)}
                          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Verify
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No documents found</p>
                  </div>
                )}
              </div>
            </section>

            {/* Generated Documents (Offer Letters / Admit Cards) */}
            <GeneratedDocumentsSection app={app} universityName={userData?.universityName || 'University'} />

            {/* Phase 3: Admission Progress (Payments, Enrollment) */}
            <AdmissionProgressSection app={app} />
            <StudentEmulatorSection app={app} />

            {/* Timeline */}
            <section>
              <h4 className="section-label" style={{ marginBottom: '12px' }}>Application Audit Trail</h4>
              <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No audit logs found.</p>
                ) : auditLogs.map((log) => (
                  <div key={log.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--indigo)', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 3px' }}>
                      {log.actorName} <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>performed</span> <span className="capitalize">{log.actionType.replace(/_/g, ' ')}</span>
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.newValue && Object.keys(log.newValue).length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(log.newValue, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Internal Notes */}
            <section>
              <h4 className="section-label" style={{ marginBottom: '12px' }}>Internal University Notes</h4>
              <textarea 
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add private notes about this student..."
                className="input-dark"
                style={{ minHeight: '100px', fontSize: '13px', resize: 'none' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '8px 0 0' }}>
                These notes are only visible to university staff.
              </p>
            </section>
          </div>

          {/* Action Footer */}
          <PermissionGuard require="edit_applications">
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  onClick={() => handleStatusUpdate('under_review')}
                style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--gold)', color: 'var(--gold)', background: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                Set Under Review
              </button>
              <button 
                onClick={() => handleStatusUpdate('selected')}
                style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--green)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s' }}
              >
                Select Student
              </button>
              <button 
                onClick={() => handleStatusUpdate('waitlisted')}
                style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--orange)', color: 'var(--orange)', background: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,88,12,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                Waitlist
              </button>
              <button 
                onClick={() => handleStatusUpdate('rejected')}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--gold)', color: 'var(--gold)', background: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  Set Under Review
                </button>
                <button 
                  onClick={() => handleStatusUpdate('selected')}
                  style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--green)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s' }}
                >
                  Select Student
                </button>
                <button 
                  onClick={() => handleStatusUpdate('waitlisted')}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--orange)', color: 'var(--orange)', background: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,88,12,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  Waitlist
                </button>
                <button 
                  onClick={() => handleStatusUpdate('rejected')}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--red)', color: 'var(--red)', background: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  Reject Student
                </button>
              </div>
            </div>
          </PermissionGuard>
        </motion.div>
      </motion.div>

      {selectedDocument && app && (
        <DocumentVerificationPanel
          document={selectedDocument}
          appId={app.id}
          studentId={app.studentId}
          universityId={app.universityId}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </AnimatePresence>
  )
}

function DocumentStatusChip({ status }: { status: DocumentStatus }) {
  let color = 'text-text-muted bg-white/5'
  let Icon = Clock
  
  switch (status) {
    case 'verified': 
      color = 'text-brand-success bg-brand-success/10'
      Icon = CheckCircle
      break
    case 'rejected': 
      color = 'text-brand-error bg-brand-error/10'
      Icon = XCircle
      break
    case 'requires_resubmission': 
      color = 'text-brand-warning bg-brand-warning/10'
      Icon = AlertTriangle
      break
    case 'under_review': 
      color = 'text-brand-primary-text bg-brand-primary/10'
      Icon = Clock
      break
  }

  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color}`}>
      <Icon size={10} />
      {status.replace('_', ' ')}
    </span>
  )
}
