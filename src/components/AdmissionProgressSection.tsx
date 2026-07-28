import React, { useState } from 'react'
import { CheckCircle, AlertCircle, FileText, Download, Loader2, IndianRupee } from 'lucide-react'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { verifyPayment, rejectPayment, completeEnrollment } from '@/lib/firebase/admissions'
import { generatePdfFromElement } from './pdf/PdfGenerator'
import { saveGeneratedDocument, subscribeToGeneratedDocuments } from '@/lib/firebase/generated_documents'
import { useToast } from '@/components/Toast'
import { auth } from '@/lib/firebase/config'

interface AdmissionProgressSectionProps {
  app: FirestoreRecord
}

export default function AdmissionProgressSection({ app }: AdmissionProgressSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  
  const statusOrder = ['selected', 'seat_accepted', 'fee_paid', 'payment_verified', 'enrolled']
  const currentIndex = statusOrder.indexOf(app.status) >= 0 ? statusOrder.indexOf(app.status) : -1

  const handleVerify = async () => {
    setLoading(true)
    try {
      const user = auth.currentUser
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      await verifyPayment(app.universityId, app.id, app.studentId, notes, actor)
      toast.success('Payment verified successfully')
      setNotes('')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Verification failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!notes) {
      toast.error('Please provide a reason for rejection in the notes field')
      return
    }
    setLoading(true)
    try {
      const user = auth.currentUser
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      await rejectPayment(app.universityId, app.id, app.studentId, notes, actor)
      toast.success('Payment rejected')
      setNotes('')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Rejection failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const user = auth.currentUser
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      const enrollmentNumber = `ENR${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`
      
      const details = {
        enrollmentNumber,
        enrollmentDate: new Date().toISOString(),
        academicSession: new Date().getFullYear().toString(),
        department: 'General Admissions',
        batch: 'Fall ' + new Date().getFullYear(),
        semester: '1'
      }

      await completeEnrollment(app.universityId, app.id, app.studentId, details, actor)
      
      // Also generate the enrollment certificate automatically
      const pdfBlob = await generatePdfFromElement('enrollment-certificate-template')
      await saveGeneratedDocument({
        appId: app.id,
        studentId: app.studentId,
        universityId: app.universityId,
        type: 'enrollment_certificate',
        pdfBlob,
        actor,
        version: 1
      })

      toast.success('Student enrolled and certificate generated successfully')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Enrollment failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // Only show this section if they've at least been selected
  if (currentIndex < 0) return null

  return (
    <div className="space-y-6 bg-brand-surface border border-brand-border rounded-xl p-4">
      <h4 className="section-label m-0">Admission Progress</h4>
      
      {/* Visual Timeline */}
      <div className="flex justify-between items-center relative py-4">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-white/10 -z-10 -translate-y-1/2 rounded-full"></div>
        <div 
          className="absolute left-0 top-1/2 h-1 bg-brand-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
          style={{ width: `${(Math.max(0, currentIndex) / (statusOrder.length - 1)) * 100}%` }}
        ></div>

        {statusOrder.map((step, idx) => {
          const isCompleted = currentIndex >= idx
          const isCurrent = currentIndex === idx
          return (
            <div key={step} className="flex flex-col items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                isCompleted ? 'bg-brand-primary text-white' : 'bg-white/10 text-white/40'
              } ${isCurrent ? 'ring-2 ring-brand-primary/50 ring-offset-2 ring-offset-brand-bg' : ''}`}>
                {isCompleted ? <CheckCircle size={14} /> : (idx + 1)}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isCompleted ? 'text-white' : 'text-white/40'}`}>
                {step.replace('_', ' ')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Payment Verification Card */}
      {app.status === 'fee_paid' && app.paymentDetails && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-brand-warning">
            <AlertCircle size={18} />
            <h5 className="font-bold text-sm">Action Required: Payment Verification</h5>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted text-[11px] uppercase font-bold mb-1">Amount Paid</p>
              <div className="flex items-center gap-1 font-mono text-brand-success">
                <IndianRupee size={14} />
                <span>{app.paymentDetails.amountPaid?.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <p className="text-text-muted text-[11px] uppercase font-bold mb-1">Submitted At</p>
              <p className="text-white">{new Date(app.paymentDetails.submittedAt).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-text-muted text-[11px] uppercase font-bold mb-2">Payment Proof</p>
            <a 
              href={app.paymentDetails.receiptUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 p-3 bg-black/20 rounded-lg hover:bg-black/40 transition-colors border border-white/5 w-fit"
            >
              <FileText size={16} className="text-brand-primary-text" />
              <span className="text-sm text-white font-medium">View Receipt / Transaction</span>
              <Download size={14} className="text-text-muted ml-2" />
            </a>
          </div>

          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add verification notes or rejection reason..."
            className="input-dark w-full text-sm"
            rows={2}
          />

          <div className="flex gap-2 pt-2">
            <button 
              onClick={handleReject}
              disabled={loading || !notes}
              className="px-4 py-2 rounded-lg bg-brand-error/10 text-brand-error text-sm font-bold hover:bg-brand-error/20 disabled:opacity-50"
            >
              Reject
            </button>
            <button 
              onClick={handleVerify}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-brand-success text-white text-sm font-bold hover:bg-brand-success/90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Enrollment Card */}
      {app.status === 'payment_verified' && (
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4 space-y-3">
          <h5 className="font-bold text-sm text-brand-primary-text">Ready for Enrollment</h5>
          <p className="text-sm text-text-secondary">Fee payment has been verified. You can now officially enroll this student and generate their Enrollment Certificate.</p>
          <button 
            onClick={handleEnroll}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Complete Enrollment & Generate Certificate'}
          </button>
        </div>
      )}

      {/* Complete State */}
      {app.status === 'enrolled' && app.enrollmentDetails && (
        <div className="bg-brand-success/10 border border-brand-success/20 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="text-brand-success" size={24} />
            <div>
              <h5 className="font-bold text-sm text-white">Admission Completed</h5>
              <p className="text-xs text-brand-success">Student successfully enrolled on {new Date(app.enrollmentDetails.enrolledAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-black/20 rounded">
            <div>
              <p className="text-[10px] uppercase text-text-muted font-bold">Enrollment No.</p>
              <p className="text-sm text-white font-mono">{app.enrollmentDetails.enrollmentNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-text-muted font-bold">Batch</p>
              <p className="text-sm text-white">{app.enrollmentDetails.batch}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
