'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Mail, Phone, FileText, AlertCircle } from 'lucide-react'
import { updateApplicationStatus } from '@/lib/firebase/applications'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { useToast } from '@/components/Toast'

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
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [internalNote, setInternalNote] = useState(app?.notes || '')

  const handleStatusUpdate = async (status: string) => {
    if (!app || loading) return
    setLoading(true)
    try {
      await updateApplicationStatus(app.id, app.studentId, status)
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
          className="w-full max-w-lg bg-brand-surface border-l border-brand-border h-full flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
            <h2 className="text-xl font-bold text-white">Application Detail</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Student Profile */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-brand-primary to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                  {app.studentName?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{app.studentName}</h3>
                  <p className="text-brand-primary font-medium">{app.programName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Mail size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Email</span>
                  </div>
                  <p className="text-sm text-white truncate">{app.studentEmail}</p>
                </div>
                <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-text-muted mb-1">
                    <Phone size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Phone</span>
                  </div>
                  <p className="text-sm text-white">{app.studentPhone || 'Not provided'}</p>
                </div>
              </div>
            </section>

            {/* Academic Details */}
            <section className="space-y-4">
              <h4 className="section-label">Academic Profile</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                  <p className="text-[10px] text-text-muted uppercase font-bold mb-1">10th Marks</p>
                  <p className="text-lg font-bold text-white">{app.academicData?.tenthPercentage || 'N/A'}%</p>
                </div>
                <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                  <p className="text-[10px] text-text-muted uppercase font-bold mb-1">12th Marks</p>
                  <p className="text-lg font-bold text-white">{app.academicData?.twelfthPercentage || 'N/A'}%</p>
                </div>
              </div>
              {app.entranceScore && (
                <div className="p-4 bg-brand-gold/10 rounded-xl border border-brand-gold/20 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-brand-gold uppercase font-bold mb-1">Entrance Score</p>
                    <p className="text-xl font-bold text-brand-gold">{app.entranceScore}</p>
                  </div>
                  <AlertCircle className="text-brand-gold" size={24} />
                </div>
              )}
            </section>

            {/* Documents */}
            <section className="space-y-4">
              <h4 className="section-label">Documents</h4>
              <div className="space-y-2">
                {app.documents?.map((doc: DocumentEntry, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5 hover:border-brand-primary/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-text-muted group-hover:text-brand-primary transition-colors" />
                      <span className="text-sm text-white">{doc.name}</span>
                    </div>
                    <button 
                      onClick={() => window.open(doc.url, '_blank')}
                      className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink size={12} />
                    </button>
                  </div>
                ))}
                {(!app.documents || app.documents.length === 0) && (
                  <p className="text-sm text-text-muted italic">No documents uploaded</p>
                )}
              </div>
            </section>

            {/* Timeline */}
            <section className="space-y-4">
              <h4 className="section-label">Application Timeline</h4>
              <div className="space-y-6 pl-4 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-brand-border">
                {app.statusHistory?.map((event: StatusHistoryEntry, i: number) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                    <p className="text-sm font-semibold text-white capitalize">{event.status.replace('_', ' ')}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {event.date ? new Date(event.date).toLocaleString() : '—'}
                    </p>
                    {event.note && (
                      <p className="text-xs text-text-secondary mt-1 bg-white/5 p-2 rounded-lg">
                        {event.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Internal Notes */}
            <section className="space-y-4">
              <h4 className="section-label">Internal University Notes</h4>
              <textarea 
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add private notes about this student..."
                className="input-dark min-h-[100px] text-sm resize-none"
              />
              <p className="text-[10px] text-text-muted italic">
                These notes are only visible to university staff.
              </p>
            </section>
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-brand-border bg-brand-bg/50">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleStatusUpdate('under_review')}
                className="px-4 py-2.5 rounded-lg border border-brand-warning text-brand-warning text-xs font-bold hover:bg-brand-warning/5 transition-colors"
              >
                Set Under Review
              </button>
              <button 
                onClick={() => handleStatusUpdate('selected')}
                className="px-4 py-2.5 rounded-lg bg-brand-success text-brand-bg text-xs font-bold hover:bg-brand-success/90 transition-colors"
              >
                Select Student
              </button>
              <button 
                onClick={() => handleStatusUpdate('waitlisted')}
                className="px-4 py-2.5 rounded-lg border border-orange-500 text-orange-500 text-xs font-bold hover:bg-orange-500/5 transition-colors"
              >
                Waitlist
              </button>
              <button 
                onClick={() => handleStatusUpdate('rejected')}
                className="px-4 py-2.5 rounded-lg border border-brand-error text-brand-error text-xs font-bold hover:bg-brand-error/5 transition-colors"
              >
                Reject Student
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
