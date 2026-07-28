import { db, storage } from './config'
import {
  doc,
  collection,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  runTransaction
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
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

export const simulateAcceptSeat = async (appId: string, studentId: string) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    if (appDoc.data().status === 'seat_accepted') return // Idempotent

    transaction.update(appRef, {
      status: 'seat_accepted',
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({
        status: 'seat_accepted',
        date: new Date().toISOString(),
        note: 'Student accepted the seat offer'
      })
    })

    const notifRef = doc(collection(db, 'notifications'))
    transaction.set(notifRef, {
      userId: studentId,
      title: 'Seat Accepted',
      message: 'You have successfully accepted the seat offer. Please proceed to fee payment.',
      type: 'seat_accepted',
      isRead: false,
      createdAt: serverTimestamp()
    })
  })
}

export const simulateDeclineSeat = async (appId: string, studentId: string) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    if (appDoc.data().status === 'seat_declined') return // Idempotent
    
    transaction.update(appRef, {
      status: 'seat_declined',
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({
        status: 'seat_declined',
        date: new Date().toISOString(),
        note: 'Student declined the seat offer'
      })
    })
  })
}

export const simulateUploadPaymentProof = async (
  appId: string, 
  studentId: string, 
  universityId: string, 
  fileBlob: Blob, 
  fileName: string,
  totalAmount: number
) => {
  // 1. Upload to Storage
  const timestamp = Date.now()
  const storagePath = `universities/${universityId}/applications/${appId}/payments/${timestamp}_${fileName}`
  const storageRef = ref(storage, storagePath)
  
  await uploadBytes(storageRef, fileBlob)
  const url = await getDownloadURL(storageRef)

  // 2. Update Firestore
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    
    transaction.update(appRef, {
      status: 'fee_paid',
      updatedAt: serverTimestamp(),
      'paymentDetails.receiptUrl': url,
      'paymentDetails.amountPaid': totalAmount,
      'paymentDetails.submittedAt': new Date().toISOString(),
      'paymentDetails.status': 'pending_verification',
      statusHistory: arrayUnion({
        status: 'fee_paid',
        date: new Date().toISOString(),
        note: 'Student uploaded fee payment proof'
      })
    })

    const notifRef = doc(collection(db, 'notifications'))
    transaction.set(notifRef, {
      userId: studentId,
      title: 'Payment Proof Submitted',
      message: 'Your fee payment proof has been submitted and is pending verification by the university.',
      type: 'fee_paid',
      isRead: false,
      createdAt: serverTimestamp()
    })
  })
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
