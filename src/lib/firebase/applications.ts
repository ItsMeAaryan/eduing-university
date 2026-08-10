import { db } from './config'
import type { FirestoreRecord } from './types'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  arrayUnion,
  runTransaction,
  getDocs,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  addDoc
} from 'firebase/firestore'
import { logToTransaction } from './audit'
import type { ActorContext } from './types'

export const subscribeToApplications = (
  universityId: string, 
  callback: (apps: FirestoreRecord[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(collection(db, 'applications'), where('universityId', '==', universityId))
  return onSnapshot(
    q, 
    (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      callback(apps)
    },
    (err) => {
      console.error('Error in subscribeToApplications:', err)
      if (onError) onError(err)
    }
  )
}

export const updateApplicationStatus = async (
  universityId: string,
  appId: string, 
  studentId: string, 
  status: string, 
  actor: ActorContext,
  note: string = 'Updated by university'
) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    const appDoc = await transaction.get(appRef)
    if (!appDoc.exists()) throw new Error('Application not found')
    if (appDoc.data().status === status) return // Idempotent
    
    transaction.update(appRef, {
      status,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({
        status,
        date: new Date().toISOString(),
        note
      })
    })

    // Add notification for student
    const notifRef = doc(collection(db, 'notifications'))
    transaction.set(notifRef, {
      userId: studentId,
      title: 'Application Update',
      message: `Your application status has been updated to ${status.replace('_', ' ')}.`,
      type: status,
      isRead: false,
      createdAt: serverTimestamp()
    })

    // Audit Log
    logToTransaction(transaction, universityId, actor, {
      actionType: 'application_status_changed',
      entityType: 'application',
      entityId: appId,
      newValue: { status, note }
    })
  })
}

export const getApplicationsPage = async (
  universityId: string, 
  pageSize: number = 20, 
  lastDoc: DocumentSnapshot | null = null,
  filters?: { status?: string, searchTerm?: string }
) => {
  let constraints: any[] = [
    where('universityId', '==', universityId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  ]
  
  if (filters?.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status))
  }
  
  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }
  
  const q = query(collection(db, 'applications'), ...constraints)
  const snapshot = await getDocs(q)
  
  let apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreRecord))
  
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase()
    apps = apps.filter(app => 
      (app.studentName && app.studentName.toLowerCase().includes(term)) ||
      (app.studentEmail && app.studentEmail.toLowerCase().includes(term)) ||
      (app.programName && app.programName.toLowerCase().includes(term)) ||
      (app.id && app.id.toLowerCase().includes(term))
    )
  }
  
  return { apps, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null }
}

export const updateApplicationTags = async (universityId: string, appId: string, tags: string[], actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const appRef = doc(db, 'applications', appId)
    transaction.update(appRef, { tags })
    
    logToTransaction(transaction, universityId, actor, {
      actionType: 'application_tags_updated',
      entityType: 'application',
      entityId: appId,
      newValue: { tags }
    })
  })
}

export interface InternalNote extends FirestoreRecord {
  text: string
  authorName: string
  authorUid: string
  authorRole: string
  createdAt: unknown
  priority: 'low' | 'normal' | 'high'
}

export const subscribeToInternalNotes = (
  appId: string, 
  callback: (notes: InternalNote[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(
    collection(db, `applications/${appId}/internal_notes`),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q, 
    (snapshot) => {
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalNote))
      callback(notes)
    },
    (err) => {
      console.error('Error in subscribeToInternalNotes:', err)
      if (onError) onError(err)
    }
  )
}

export const addInternalNote = async (
  universityId: string, 
  appId: string, 
  text: string, 
  priority: 'low' | 'normal' | 'high', 
  actor: ActorContext
) => {
  await runTransaction(db, async (transaction) => {
    const newNoteRef = doc(collection(db, `applications/${appId}/internal_notes`))
    transaction.set(newNoteRef, {
      text,
      authorName: actor.name,
      authorUid: actor.uid,
      authorRole: actor.role,
      priority,
      createdAt: serverTimestamp()
    })

    logToTransaction(transaction, universityId, actor, {
      actionType: 'internal_note_added',
      entityType: 'application',
      entityId: appId,
      newValue: { priority, author: actor.name }
    })
  })
}
