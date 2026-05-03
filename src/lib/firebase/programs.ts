import { db } from './config'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore'

export const subscribeToPrograms = (universityId: string, callback: (programs: any[]) => void) => {
  const q = query(collection(db, 'programs'), where('universityId', '==', universityId))
  return onSnapshot(q, (snapshot) => {
    const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(programs)
  })
}

export const addProgram = async (universityId: string, programData: any) => {
  await addDoc(collection(db, 'programs'), {
    ...programData,
    universityId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

export const updateProgram = async (programId: string, programData: any) => {
  const programRef = doc(db, 'programs', programId)
  await updateDoc(programRef, {
    ...programData,
    updatedAt: serverTimestamp()
  })
}

export const deleteProgram = async (programId: string) => {
  await deleteDoc(doc(db, 'programs', programId))
}
