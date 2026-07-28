import React, { useState } from 'react'
import { Beaker, UploadCloud, Loader2, Check, X } from 'lucide-react'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { simulateAcceptSeat, simulateDeclineSeat, simulateUploadPaymentProof } from '@/lib/firebase/admissions'
import { useToast } from '@/components/Toast'

interface StudentEmulatorSectionProps {
  app: FirestoreRecord
}

export default function StudentEmulatorSection({ app }: StudentEmulatorSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // This should only be visible for certain statuses to simulate student action
  const isPendingAcceptance = app.status === 'offer_generated' || app.status === 'selected'
  const isPendingPayment = app.status === 'seat_accepted'

  if (!isPendingAcceptance && !isPendingPayment) return null

  const handleAccept = async () => {
    setLoading(true)
    try {
      await simulateAcceptSeat(app.id, app.studentId)
      toast.success('Simulated: Student accepted the seat')
    } catch (error: unknown) {
      toast.error('Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    try {
      await simulateDeclineSeat(app.id, app.studentId)
      toast.success('Simulated: Student declined the seat')
    } catch (error: unknown) {
      toast.error('Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPayment = async () => {
    setLoading(true)
    try {
      // Create a dummy text blob as "PDF" receipt
      const blob = new Blob(['Dummy Payment Receipt PDF Content'], { type: 'application/pdf' })
      const amount = 50000 // Dummy fee amount
      await simulateUploadPaymentProof(app.id, app.studentId, app.universityId, blob, 'receipt.pdf', amount)
      toast.success('Simulated: Student uploaded payment proof')
    } catch (error: unknown) {
      toast.error('Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 border-2 border-dashed border-brand-primary/30 rounded-xl p-4 bg-brand-primary/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-brand-primary/20 text-brand-primary-text text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
        <Beaker size={12} />
        Dev Simulator
      </div>
      
      <h5 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
        Student Portal Emulator
      </h5>
      <p className="text-xs text-text-secondary mb-4">
        Simulate actions that the student would take in their portal to test the admission workflow.
      </p>

      {isPendingAcceptance && (
        <div className="bg-black/20 p-4 rounded-lg">
          <p className="text-sm font-semibold text-white mb-3">Pending Action: Seat Acceptance</p>
          <div className="flex gap-3">
            <button 
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 py-2 rounded border border-brand-success text-brand-success hover:bg-brand-success/10 text-xs font-bold transition-colors flex justify-center items-center gap-1 disabled:opacity-50"
            >
              <Check size={14} /> Accept Seat
            </button>
            <button 
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 py-2 rounded border border-brand-error text-brand-error hover:bg-brand-error/10 text-xs font-bold transition-colors flex justify-center items-center gap-1 disabled:opacity-50"
            >
              <X size={14} /> Decline
            </button>
          </div>
        </div>
      )}

      {isPendingPayment && (
        <div className="bg-black/20 p-4 rounded-lg">
          <p className="text-sm font-semibold text-white mb-3">Pending Action: Fee Payment Upload</p>
          <button 
            onClick={handleUploadPayment}
            disabled={loading}
            className="w-full py-2.5 rounded bg-brand-primary text-white text-xs font-bold transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={16} />}
            Simulate Payment Upload (₹50,000)
          </button>
        </div>
      )}
    </div>
  )
}
