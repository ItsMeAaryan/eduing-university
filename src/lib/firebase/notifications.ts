import { db } from './config'
import type { FirestoreRecord } from './types'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  writeBatch,
  getDocs
} from 'firebase/firestore'

export const subscribeToNotifications = (
  userId: string, 
  callback: (notifications: FirestoreRecord[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId))
  return onSnapshot(
    q, 
    (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      // Sort by createdAt desc
      notifications.sort((a: FirestoreRecord, b: FirestoreRecord) => {
        const aSeconds = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
        const bSeconds = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
        return bSeconds - aSeconds
      })
      callback(notifications)
    },
    (err) => {
      console.error('Error in subscribeToNotifications:', err)
      if (onError) onError(err)
    }
  )
}

export const markNotificationRead = async (notificationId: string) => {
  const ref = doc(db, 'notifications', notificationId)
  await updateDoc(ref, { isRead: true })
}

export const markAllNotificationsRead = async (userId: string) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false))
  const snapshot = await getDocs(q)
  
  const batch = writeBatch(db)
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { isRead: true })
  })
  
  await batch.commit()
}
