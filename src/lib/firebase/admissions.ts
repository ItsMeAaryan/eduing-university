import { db } from './config'
import {
  doc,
  collection,
  serverTimestamp,
  arrayUnion,
  runTransaction
} from 'firebase/firestore'
import { logToTransaction } from './audit'
import type { ActorContext } from './types'

export interface EnrollmentDetails {
  enrollmentNumber: string
  enrollmentDate: string
  academicSession: string
  department: string
  batch: string
  semester: string
}

export const verifyPayment = async (universityId: string, appId: string, studentId: string, verificationNotes: string, actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    if (appDoc.data().status === 'payment_verified') return // Idempotent

    transaction.update(appRef, {
      status: 'payment_verified',
      updatedAt: serverTimestamp(),
      'paymentDetails.status': 'verified',
      'paymentDetails.verifiedAt': new Date().toISOString(),
      'paymentDetails.verifiedBy': actor.name,
      'paymentDetails.notes': verificationNotes,
      statusHistory: arrayUnion({
        status: 'payment_verified',
        date: new Date().toISOString(),
        note: `Payment verified by ${actor.name}. Notes: ${verificationNotes}`
      })
    })

    const notifRef = doc(collection(db, 'notifications'))
    transaction.set(notifRef, {
      userId: studentId,
      title: 'Payment Verified',
      message: 'Your fee payment has been successfully verified. You are now eligible for enrollment.',
      type: 'payment_verified',
      isRead: false,
      createdAt: serverTimestamp()
    })

    logToTransaction(transaction, universityId, actor, {
      actionType: 'payment_verified',
      entityType: 'application',
      entityId: appId,
      newValue: { status: 'payment_verified', notes: verificationNotes }
    })
  })
}

export const rejectPayment = async (universityId: string, appId: string, studentId: string, reason: string, actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    if (appDoc.data().paymentDetails?.status === 'rejected') return // Idempotent

    transaction.update(appRef, {
      status: 'seat_accepted', // Revert to seat_accepted so they can re-upload
      updatedAt: serverTimestamp(),
      'paymentDetails.status': 'rejected',
      'paymentDetails.rejectedAt': new Date().toISOString(),
      'paymentDetails.rejectedBy': actor.name,
      'paymentDetails.rejectionReason': reason,
      statusHistory: arrayUnion({
        status: 'payment_rejected',
        date: new Date().toISOString(),
        note: `Payment rejected by ${actor.name}. Reason: ${reason}`
      })
    })

    const notifRef = doc(collection(db, 'notifications'))
    transaction.set(notifRef, {
      userId: studentId,
      title: 'Payment Rejected',
      message: `Your fee payment proof was rejected. Reason: ${reason}. Please re-upload.`,
      type: 'payment_rejected',
      isRead: false,
      createdAt: serverTimestamp()
    })

    logToTransaction(transaction, universityId, actor, {
      actionType: 'payment_rejected',
      entityType: 'application',
      entityId: appId,
      newValue: { status: 'seat_accepted', reason }
    })
  })
}

export const completeEnrollment = async (universityId: string, appId: string, studentId: string, details: EnrollmentDetails, actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    
    const appData = appDoc.data()
    if (appData.status === 'enrolled') return // Idempotent

    // Check Seat Availability
    if (appData.programId) {
      const programRef = doc(db, `universities/${universityId}/programs`, appData.programId)
      const progDoc = await transaction.get(programRef)
      if (progDoc.exists()) {
        const pData = progDoc.data()
        if (typeof pData.availableSeats === 'number') {
          if (pData.availableSeats <= 0) {
            throw new Error(`Cannot enroll: No seats available in program ${pData.name}`)
          }
          transaction.update(programRef, {
            availableSeats: pData.availableSeats - 1,
            enrolledCount: (pData.enrolledCount || 0) + 1
          })
        }
      }
    }

    transaction.update(appRef, {
      status: 'enrolled',
      updatedAt: serverTimestamp(),
      enrollmentDetails: {
        ...details,
        enrolledAt: new Date().toISOString(),
        enrolledBy: actor.name
      },
      statusHistory: arrayUnion({
        status: 'enrolled',
        date: new Date().toISOString(),
        note: `Student enrolled by ${actor.name}. Enrollment No: ${details.enrollmentNumber}`
      })
    })

    const notifRef = doc(collection(db, 'notifications'))
    transaction.set(notifRef, {
      userId: studentId,
      title: 'Enrollment Completed',
      message: `Congratulations! You are officially enrolled. Your Enrollment Number is ${details.enrollmentNumber}.`,
      type: 'enrolled',
      isRead: false,
      createdAt: serverTimestamp()
    })

    logToTransaction(transaction, universityId, actor, {
      actionType: 'enrollment_completed',
      entityType: 'application',
      entityId: appId,
      newValue: { status: 'enrolled', ...details }
    })
  })
}
