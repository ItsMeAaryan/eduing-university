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
  addDoc
} from 'firebase/firestore'

export const subscribeToApplications = (universityId: string, callback: (apps: FirestoreRecord[]) => void) => {
  const q = query(collection(db, 'applications'), where('universityId', '==', universityId))
  return onSnapshot(q, (snapshot) => {
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(apps)
  })
}

export const updateApplicationStatus = async (appId: string, studentId: string, status: string, note: string = 'Updated by university') => {
  const appRef = doc(db, 'applications', appId)
  
  await updateDoc(appRef, {
    status,
    updatedAt: serverTimestamp(),
    statusHistory: arrayUnion({
      status,
      date: new Date().toISOString(),
      note
    })
  })

  // Add notification for student
  await addDoc(collection(db, 'notifications'), {
    userId: studentId,
    title: 'Application Update',
    message: `Your application status has been updated to ${status.replace('_', ' ')}.`,
    type: status,
    isRead: false,
    createdAt: serverTimestamp()
  })
}
