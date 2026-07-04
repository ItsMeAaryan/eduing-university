import { db } from './config'
import type { FirestoreRecord, FirestoreWriteData } from './types'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'

export const subscribeToUniversity = (uid: string, callback: (data: FirestoreRecord) => void) => {
  return onSnapshot(doc(db, 'universities', uid), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    }
  })
}

export const updateUniversityProfile = async (uid: string, data: FirestoreWriteData) => {
  const uniRef = doc(db, 'universities', uid)
  await updateDoc(uniRef, {
    ...data,
    updatedAt: serverTimestamp()
  })
}
