import { db } from './config'
import type { FirestoreRecord } from './types'
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  addDoc,
  runTransaction
} from 'firebase/firestore'
import { logToTransaction } from './audit'
import type { ActorContext } from './types'

export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'requires_resubmission' | 'under_review'

export interface VerificationHistory {
  oldStatus: DocumentStatus | 'none'
  newStatus: DocumentStatus
  changedBy: string
  timestamp: string
  reason: string
  comments: string
}

export interface StudentDocument extends FirestoreRecord {
  name: string
  url: string
  category: string
  status: DocumentStatus
  verifiedBy?: string
  verificationDate?: unknown // Timestamp
  history?: VerificationHistory[]
  uploadDate?: unknown // Timestamp
}

/**
 * Subscribes to the documents subcollection for a given application.
 */
export const subscribeToApplicationDocuments = (appId: string, callback: (docs: StudentDocument[]) => void) => {
  const q = query(collection(db, `applications/${appId}/documents`))
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentDocument))
    callback(docs)
  })
}

/**
 * Updates the verification status of a document, appends to its history, and notifies the student.
 */
export const updateDocumentStatus = async ({
  universityId,
  appId,
  documentId,
  studentId,
  documentName,
  oldStatus,
  newStatus,
  actor,
  reason,
  comments,
}: {
  universityId: string
  appId: string
  documentId: string
  studentId: string
  documentName: string
  oldStatus: DocumentStatus | 'none'
  newStatus: DocumentStatus
  actor: ActorContext
  reason: string
  comments: string
}) => {
  await runTransaction(db, async (transaction) => {
    const docRef = doc(db, `applications/${appId}/documents`, documentId)
    const docSnap = await transaction.get(docRef)
    if (!docSnap.exists()) throw new Error('Document not found')
    if (docSnap.data().status === newStatus) return // Idempotent
    
    const historyEntry: VerificationHistory = {
      oldStatus,
      newStatus,
      changedBy: actor.name,
      timestamp: new Date().toISOString(),
      reason,
      comments
    }

    transaction.update(docRef, {
      status: newStatus,
      verifiedBy: actor.name,
      verificationDate: serverTimestamp(),
      history: arrayUnion(historyEntry),
      updatedAt: serverTimestamp()
    })

    // 2. Add a notification for the student
    const notifRef = doc(collection(db, 'notifications'))
    let title = 'Document Update'
    let message = `The status of your document "${documentName}" has been updated to ${newStatus.replace('_', ' ')}.`
    
    if (newStatus === 'verified') {
      title = 'Document Verified'
      message = `Your document "${documentName}" has been verified.`
    } else if (newStatus === 'rejected') {
      title = 'Document Rejected'
      message = `Your document "${documentName}" was rejected. Reason: ${reason}`
    } else if (newStatus === 'requires_resubmission') {
      title = 'Document Needs Resubmission'
      message = `Please resubmit your document "${documentName}". Reason: ${reason}`
    }

    transaction.set(notifRef, {
      userId: studentId,
      title,
      message,
      type: 'document_update',
      isRead: false,
      createdAt: serverTimestamp()
    })

    logToTransaction(transaction, universityId, actor, {
      actionType: `document_${newStatus}`,
      entityType: 'document',
      entityId: documentId,
      newValue: { status: newStatus, reason, comments }
    })
  })
}

/**
 * Utility to migrate a legacy document from the application's array into the subcollection.
 * Used by the UI when encountering an unmigrated document.
 */
export const migrateLegacyDocument = async (appId: string, docData: { name: string, url: string, category?: string }) => {
  await addDoc(collection(db, `applications/${appId}/documents`), {
    name: docData.name,
    url: docData.url,
    category: docData.category || 'Other',
    status: 'pending',
    uploadDate: serverTimestamp(),
    history: []
  })
}
