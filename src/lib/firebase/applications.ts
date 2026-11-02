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

const createdMs = (app: FirestoreRecord) => {
  const v = (app.createdAt ?? app.appliedAt) as { seconds?: number } | string | undefined
  if (v && typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000
  if (typeof v === 'string') return new Date(v).getTime() || 0
  return 0
}

/**
 * One page of this university's applications.
 * - No filter: ordered by newest first and paginated (uses the universityId+createdAt index).
 * - Status filter: equality-only query (needs no composite index) sorted here, returned in one page.
 *   Before, the status filter needed an extra index and failed with "Failed to load applications".
 * - Program and search filters are applied here, on the loaded applications.
 */
export const getApplicationsPage = async (
  universityId: string,
  pageSize: number = 20,
  lastDoc: DocumentSnapshot | null = null,
  filters?: { status?: string, searchTerm?: string, programId?: string, programName?: string }
) => {
  const statusFiltered = !!filters?.status && filters.status !== 'all'
  const constraints = statusFiltered
    ? [where('universityId', '==', universityId), where('status', '==', filters!.status)]
    : [where('universityId', '==', universityId), orderBy('createdAt', 'desc'), limit(pageSize), ...(lastDoc ? [startAfter(lastDoc)] : [])]

  const snapshot = await getDocs(query(collection(db, 'applications'), ...constraints))
  let apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord))
  if (statusFiltered) apps.sort((a, b) => createdMs(b) - createdMs(a))

  if (filters?.programId && filters.programId !== 'all') {
    const name = (filters.programName || '').toLowerCase()
    apps = apps.filter(app =>
      app.programId === filters.programId ||
      (!!name && String(app.programName || app.program || '').toLowerCase() === name))
  }

  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase()
    apps = apps.filter(app =>
      String(app.studentName || '').toLowerCase().includes(term) ||
      String(app.studentEmail || '').toLowerCase().includes(term) ||
      String(app.programName || app.program || '').toLowerCase().includes(term) ||
      String(app.id || '').toLowerCase().includes(term)
    )
  }

  return {
    apps,
    // a status-filtered result is complete, so there is nothing more to load
    lastDoc: statusFiltered ? null : (snapshot.docs[snapshot.docs.length - 1] || null),
    complete: statusFiltered,
    hasMore: !statusFiltered && snapshot.docs.length === pageSize,
  }
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
