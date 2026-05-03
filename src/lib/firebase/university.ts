import { db } from './config'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'

export const subscribeToUniversity = (uid: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, 'universities', uid), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    }
  })
}

export const updateUniversityProfile = async (uid: string, data: any) => {
  const uniRef = doc(db, 'universities', uid)
  await updateDoc(uniRef, {
    ...data,
    updatedAt: serverTimestamp()
  })
}
