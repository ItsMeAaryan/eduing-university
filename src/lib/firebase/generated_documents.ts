import { db, storage } from './config'
import type { FirestoreRecord } from './types'
import {
  collection,
  query,
  onSnapshot,
  doc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { logToTransaction } from './audit'
import type { ActorContext } from './types'

export type GeneratedDocumentType = 'offer_letter' | 'admit_card' | 'enrollment_certificate'

export interface GeneratedDocument extends FirestoreRecord {
  type: GeneratedDocumentType
  url: string
  generatedAt: unknown // Timestamp
  generatedBy: string
  version: number
}

/**
 * Subscribes to the generated_documents subcollection for a given application.
 */
export const subscribeToGeneratedDocuments = (appId: string, callback: (docs: GeneratedDocument[]) => void) => {
  const q = query(collection(db, `applications/${appId}/generated_documents`))
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GeneratedDocument))
    // Sort descending by generation time (client side sorting for simplicity)
    docs.sort((a, b) => {
      const timeA = (a.generatedAt as any)?.seconds || 0
      const timeB = (b.generatedAt as any)?.seconds || 0
      return timeB - timeA
    })
    callback(docs)
  })
}

/**
 * Uploads a PDF Blob to Firebase Storage, saves the record in Firestore, and notifies the student.
 */
export const saveGeneratedDocument = async ({
  appId,
  studentId,
  universityId,
  type,
  pdfBlob,
  actor,
  version = 1
}: {
  appId: string
  studentId: string
  universityId: string
  type: GeneratedDocumentType
  pdfBlob: Blob
  actor: ActorContext
  version?: number
}) => {
  // 1. Upload to Storage
  const timestamp = Date.now()
  const storagePath = `universities/${universityId}/applications/${appId}/${type}_v${version}_${timestamp}.pdf`
  const storageRef = ref(storage, storagePath)
  
  await uploadBytes(storageRef, pdfBlob)
  const url = await getDownloadURL(storageRef)

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
      url,
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
      message = 'Congratulations! Your offer letter has been generated and is now available in your document vault.'
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
  
  return url
}
