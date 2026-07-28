'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Clock, AlertCircle } from 'lucide-react'

export type LifecycleStage = 
  | 'submitted'
  | 'under_review' 
  | 'docs_verified' 
  | 'selected' 
  | 'seat_accepted' 
  | 'fee_paid' 
  | 'payment_verified'
  | 'enrolled'

const STAGES: { id: LifecycleStage, label: string }[] = [
  { id: 'submitted', label: 'Applicant' },
  { id: 'docs_verified', label: 'Docs Verified' },
  { id: 'selected', label: 'Selected' },
  { id: 'seat_accepted', label: 'Seat Accepted' },
  { id: 'payment_verified', label: 'Payment Verified' },
  { id: 'enrolled', label: 'Enrolled' }
]

export default function StudentLifecycle({ currentStatus }: { currentStatus: string }) {
  // Map internal statuses to pipeline stages
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return 0
      case 'selected':
        return 2
      case 'seat_accepted':
      case 'fee_paid':
        return 3
      case 'payment_verified':
        return 4
      case 'enrolled':
        return 5
      default:
        // Default to checking if docs verified or something else
        return 1
    }
  }

  const currentIndex = getStageIndex(currentStatus)

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute top-5 left-0 w-full h-1 bg-white/10 rounded-full z-0">
          <motion.div 
            className="h-full bg-brand-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {STAGES.map((stage, index) => {
          const isCompleted = index <= currentIndex
          const isCurrent = index === currentIndex
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-colors duration-500
                  ${isCompleted 
                    ? 'bg-brand-primary border-brand-primary text-white shadow-brand-primary/20' 
                    : 'bg-brand-surface border-white/20 text-text-muted'
                  }
                  ${isCurrent ? 'ring-4 ring-brand-primary/30' : ''}
                `}
              >
                {isCompleted ? <Check size={18} strokeWidth={3} /> : <Clock size={18} />}
              </motion.div>
              <div className="text-center w-24">
                <p className={`text-xs font-bold leading-tight ${isCompleted ? 'text-white' : 'text-text-muted'}`}>
                  {stage.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
