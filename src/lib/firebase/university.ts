import { db } from './config'
import type { FirestoreRecord, FirestoreWriteData } from './types'
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'

import { getDoc } from 'firebase/firestore'

export const getUniversity = async (uid: string): Promise<FirestoreRecord | null> => {
  try {
    const snap = await getDoc(doc(db, 'universities', uid))
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() }
    }
    return null
  } catch (err) {
    console.error('Error in getUniversity:', err)
    return null
  }
}

export const updateUniversityProfile = async (uid: string, data: FirestoreWriteData) => {
  await updateDoc(doc(db, 'universities', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ── Platform-admin functions ──────────────────────────────────────────────────
// Callable only by users with role: 'eduing_admin' (enforced by Firestore rules)

export const subscribeToPendingUniversities = (
  callback: (universities: FirestoreRecord[]) => void,
  onError?: (err: Error) => void
) => {
  return onSnapshot(
    query(collection(db, 'universities'), where('approvalStatus', '==', 'pending')),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    },
    (err) => {
      console.error('Error in subscribeToPendingUniversities:', err)
      if (onError) onError(err)
    }
  )
}

export const subscribeToAllUniversities = (
  callback: (universities: FirestoreRecord[]) => void,
  onError?: (err: Error) => void
) => {
  return onSnapshot(
    collection(db, 'universities'),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    },
    (err) => {
      console.error('Error in subscribeToAllUniversities:', err)
      if (onError) onError(err)
    }
  )
}

export const approveUniversity = async (uid: string) => {
  // Update both collections — login page reads approvalStatus from users/{uid}
  const batch = writeBatch(db)
  batch.update(doc(db, 'universities', uid), {
    approvalStatus: 'approved',
    isVerified: true,
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid), {
    approvalStatus: 'approved',
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export const rejectUniversity = async (uid: string, reason: string) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'universities', uid), {
    approvalStatus: 'rejected',
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid), {
    approvalStatus: 'rejected',
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export const getAllUniversities = async (): Promise<FirestoreRecord[]> => {
  const snap = await getDocs(collection(db, 'universities'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
