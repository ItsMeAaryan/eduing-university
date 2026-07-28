'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, AlertTriangle, Clock, MessageSquare, History } from 'lucide-react'
import { useFocusTrap } from '@/lib/useFocusTrap'
import type { StudentDocument, DocumentStatus, VerificationHistory } from '@/lib/firebase/documents'
import { updateDocumentStatus } from '@/lib/firebase/documents'
import DocumentViewer from './DocumentViewer'
import { useToast } from '@/components/Toast'
import { auth } from '@/lib/firebase/config'

interface DocumentVerificationPanelProps {
  document: StudentDocument | null
  appId: string
  studentId: string
  universityId: string
  onClose: () => void
}

export default function DocumentVerificationPanel({ document, appId, studentId, universityId, onClose }: DocumentVerificationPanelProps) {
  const panelRef = useFocusTrap(!!document, onClose)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [reason, setReason] = useState('')
  const [comments, setComments] = useState('')
  const [actionPane, setActionPane] = useState<'verify' | 'history'>('verify')

  if (!document) return null

  const handleStatusUpdate = async (newStatus: DocumentStatus) => {
    if (loading) return
    if ((newStatus === 'rejected' || newStatus === 'requires_resubmission') && !reason.trim()) {
      toast.error('Please provide a reason for rejection or resubmission')
      return
    }

    setLoading(true)
    try {
      const user = auth.currentUser
      const actor = {
        uid: user?.uid || 'system',
        name: user?.displayName || user?.email || 'University Staff',
        role: 'admin'
      }

      await updateDocumentStatus({
        universityId,
        appId,
        documentId: document.id,
        studentId,
        documentName: document.name,
        oldStatus: document.status || 'pending',
        newStatus,
        actor,
        reason: reason.trim(),
        comments: comments.trim()
      })
      
      toast.success(`Document marked as ${newStatus.replace('_', ' ')}`)
      if (newStatus === 'verified') {
        setReason('')
        setComments('')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to update document status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4 lg:p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-7xl h-full max-h-[900px] bg-brand-surface border border-brand-border rounded-2xl flex flex-col lg:flex-row overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Document Verification"
        >
          {/* Left Side - Viewer (Takes up majority of space) */}
          <div className="flex-1 p-4 lg:p-6 lg:border-r border-brand-border bg-black/20 flex flex-col min-h-[400px]">
            <DocumentViewer url={document.url} name={document.name} />
          </div>

          {/* Right Side - Verification Controls */}
          <div className="w-full lg:w-[420px] shrink-0 bg-brand-surface flex flex-col h-full max-h-[50vh] lg:max-h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-brand-elevated">
              <div>
                <h2 className="text-lg font-extrabold text-white">Verification</h2>
                <p className="text-xs text-text-muted mt-1">{document.category}</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Status Banner */}
            <div className={`px-6 py-3 border-b border-brand-border flex items-center gap-3 ${
              document.status === 'verified' ? 'bg-brand-success/10' :
              document.status === 'rejected' ? 'bg-brand-error/10' :
              document.status === 'requires_resubmission' ? 'bg-brand-warning/10' :
              'bg-brand-primary/5'
            }`}>
              <StatusIcon status={document.status} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Current Status</p>
                <p className={`text-sm font-bold capitalize ${
                  document.status === 'verified' ? 'text-brand-success' :
                  document.status === 'rejected' ? 'text-brand-error' :
                  document.status === 'requires_resubmission' ? 'text-brand-warning' :
                  'text-brand-primary-text'
                }`}>
                  {document.status?.replace('_', ' ') || 'Pending'}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-border">
              <button 
                onClick={() => setActionPane('verify')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  actionPane === 'verify' ? 'border-brand-primary text-brand-primary-text' : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                Actions
              </button>
              <button 
                onClick={() => setActionPane('history')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-colors ${
                  actionPane === 'history' ? 'border-brand-primary text-brand-primary-text' : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <History size={14} /> History ({document.history?.length || 0})
              </button>
            </div>

            {/* Pane Content */}
            <div className="flex-1 overflow-y-auto">
              {actionPane === 'verify' ? (
                <div className="p-6 space-y-6">
                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="reason-input" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                        Reason / Public Note
                      </label>
                      <textarea 
                        id="reason-input"
                        className="input-dark w-full min-h-[80px] resize-none text-sm"
                        placeholder="Visible to the student (Required for rejection/resubmission)"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="comments-input" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                        Internal Comments
                      </label>
                      <textarea 
                        id="comments-input"
                        className="input-dark w-full min-h-[60px] resize-none text-sm"
                        placeholder="Private notes for university staff..."
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-2">
                    <button 
                      disabled={loading || document.status === 'verified'}
                      onClick={() => handleStatusUpdate('verified')}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-brand-success text-white hover:bg-brand-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={18} />
                      Verify Document
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        disabled={loading || document.status === 'requires_resubmission'}
                        onClick={() => handleStatusUpdate('requires_resubmission')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-brand-warning/10 text-brand-warning border border-brand-warning/20 hover:bg-brand-warning/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        <AlertTriangle size={16} />
                        Request Resubmission
                      </button>
                      <button 
                        disabled={loading || document.status === 'rejected'}
                        onClick={() => handleStatusUpdate('rejected')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        <XCircle size={16} />
                        Reject Document
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="relative pl-4 border-l-2 border-brand-border space-y-8">
                    {document.history && document.history.length > 0 ? (
                      document.history.slice().reverse().map((event: VerificationHistory, i: number) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-brand-surface ${
                            event.newStatus === 'verified' ? 'bg-brand-success' :
                            event.newStatus === 'rejected' ? 'bg-brand-error' :
                            event.newStatus === 'requires_resubmission' ? 'bg-brand-warning' :
                            'bg-brand-primary'
                          }`} />
                          
                          <p className="text-sm font-bold text-white capitalize mb-1">
                            Status changed to {event.newStatus.replace('_', ' ')}
                          </p>
                          <p className="text-[11px] text-text-muted mb-3 flex items-center gap-1.5">
                            <Clock size={12} /> {new Date(event.timestamp).toLocaleString()} • by {event.changedBy}
                          </p>
                          
                          {event.reason && (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-2">
                              <p className="text-[10px] font-bold uppercase text-text-muted mb-1 flex items-center gap-1">
                                <MessageSquare size={10} /> Public Note
                              </p>
                              <p className="text-sm text-text-secondary">{event.reason}</p>
                            </div>
                          )}
                          
                          {event.comments && (
                            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-3">
                              <p className="text-[10px] font-bold uppercase text-brand-primary-text mb-1 flex items-center gap-1">
                                <MessageSquare size={10} /> Internal Comment
                              </p>
                              <p className="text-sm text-text-secondary">{event.comments}</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-muted italic -ml-4">No verification history yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatusIcon({ status }: { status?: DocumentStatus }) {
  switch (status) {
    case 'verified': return <CheckCircle size={24} className="text-brand-success" />
    case 'rejected': return <XCircle size={24} className="text-brand-error" />
    case 'requires_resubmission': return <AlertTriangle size={24} className="text-brand-warning" />
    case 'under_review': return <Clock size={24} className="text-brand-primary-text" />
    default: return <Clock size={24} className="text-text-muted" />
  }
}
