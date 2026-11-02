import { db } from './config'
import type { FirestoreRecord } from './types'
import {
  collection,
  query,
  onSnapshot,
  doc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { logToTransaction } from './audit'
import type { ActorContext } from './types'

export type GeneratedDocumentType = 'offer_letter' | 'admit_card' | 'enrollment_certificate'

// Documents are no longer stored as files. Issuing saves the letter's data;
// the student website, the app and this portal render the PDF on demand.
export interface GeneratedDocument extends FirestoreRecord {
  type: GeneratedDocumentType
  data?: Record<string, string>
  url?: string // documents issued before this change
  generatedAt: unknown // Timestamp
  generatedBy: string
  version: number
}

/**
 * Subscribes to the generated_documents subcollection for a given application.
 */
export const subscribeToGeneratedDocuments = (
  appId: string, 
  callback: (docs: GeneratedDocument[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(collection(db, `applications/${appId}/generated_documents`))
  return onSnapshot(
    q, 
    (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GeneratedDocument))
      // Sort descending by generation time (client side sorting for simplicity)
      docs.sort((a, b) => {
        const timeA = (a.generatedAt as any)?.seconds || 0
        const timeB = (b.generatedAt as any)?.seconds || 0
        return timeB - timeA
      })
      callback(docs)
    },
    (err) => {
      console.error('Error in subscribeToGeneratedDocuments:', err)
      if (onError) onError(err)
    }
  )
}

/**
 * Issues a document: saves its contents in Firestore (no file upload) and notifies the student.
 */
export const saveGeneratedDocument = async ({
  appId,
  studentId,
  universityId,
  type,
  data,
  actor,
  version = 1
}: {
  appId: string
  studentId: string
  universityId: string
  type: GeneratedDocumentType
  data: Record<string, string>
  actor: ActorContext
  version?: number
}) => {
  // 2. Save to Firestore
  await runTransaction(db, async (transaction) => {
    // Predictable document ID to prevent duplicates (Idempotency)
    const newDocId = `${type}_v${version}`
    const newDocRef = doc(db, `applications/${appId}/generated_documents`, newDocId)
    
    const snap = await transaction.get(newDocRef)
    if (snap.exists()) {
      return // Already generated this version, idempotent return
    }
    
    transaction.set(newDocRef, {
      type,
      data,
      generatedAt: serverTimestamp(),
      generatedBy: actor.name,
      version
    })

    // 3. Add a notification for the student
    const notifRef = doc(collection(db, 'notifications'))
    let title = 'Document Generated'
    let message = 'A new document has been generated for your application.'
    
    if (type === 'offer_letter') {
      title = 'Offer Letter Available'
      message = 'Congratulations! Your offer letter has been generated and is ready. Open your application to accept the seat.'
    } else if (type === 'admit_card') {
      title = 'Admit Card Available'
      message = 'Your admit card for the upcoming entrance exam has been generated.'
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
      actionType: `document_generated`,
      entityType: 'application',
      entityId: appId,
      newValue: { documentType: type, version }
    })
  })
  
}
