import { db } from './config'
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  WriteBatch,
  Transaction,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore'
import type { ActorContext, AuditLog } from './types'

export interface LogPayload {
  actionType: string
  entityType: string
  entityId: string
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
  status?: 'success' | 'failed' | 'warning'
  metadata?: Record<string, any>
}

export const logAuditAction = async (
  universityId: string, 
  actor: ActorContext, 
  payload: LogPayload
) => {
  const auditCollection = collection(db, `universities/${universityId}/audit_logs`)
  
  await addDoc(auditCollection, {
    timestamp: new Date().toISOString(),
    createdAt: serverTimestamp(),
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    universityId,
    ...payload,
    status: payload.status || 'success'
  })
}

export const logToBatch = (
  batch: WriteBatch,
  universityId: string,
  actor: ActorContext,
  payload: LogPayload
) => {
  const auditRef = doc(collection(db, `universities/${universityId}/audit_logs`))
  batch.set(auditRef, {
    timestamp: new Date().toISOString(),
    createdAt: serverTimestamp(),
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    universityId,
    ...payload,
    status: payload.status || 'success'
  })
}

export const logToTransaction = (
  transaction: Transaction,
  universityId: string,
  actor: ActorContext,
  payload: LogPayload
) => {
  const auditRef = doc(collection(db, `universities/${universityId}/audit_logs`))
  transaction.set(auditRef, {
    timestamp: new Date().toISOString(),
    createdAt: serverTimestamp(),
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    universityId,
    ...payload,
    status: payload.status || 'success'
  })
}

export const subscribeToAuditLogs = (universityId: string, limitCount: number = 100, callback: (logs: AuditLog[]) => void) => {
  const q = query(
    collection(db, `universities/${universityId}/audit_logs`),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  )
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog))
    callback(logs)
  })
}

export const subscribeToEntityAuditLogs = (universityId: string, entityId: string, callback: (logs: AuditLog[]) => void) => {
  const q = query(
    collection(db, `universities/${universityId}/audit_logs`),
    where('entityId', '==', entityId),
    orderBy('timestamp', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog))
    callback(logs)
  })
}

export const getAuditLogsPage = async (
  universityId: string, 
  pageSize: number = 20, 
  lastDoc: DocumentSnapshot | null = null,
  filters?: { actionType?: string }
) => {
  let constraints: any[] = [
    orderBy('timestamp', 'desc'),
    limit(pageSize)
  ]
  
  if (filters?.actionType && filters.actionType !== 'all') {
    constraints.unshift(where('actionType', '==', filters.actionType))
  }
  
  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }
  
  const q = query(collection(db, `universities/${universityId}/audit_logs`), ...constraints)
  const snapshot = await getDocs(q)
  
  const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog))
  return { logs, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null }
}
