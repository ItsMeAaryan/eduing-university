import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAWF57TakNaSkGXCRpw_Ig5NSxAVSozCvg",
  authDomain: "eduing-platform.firebaseapp.com",
  projectId: "eduing-platform",
  storageBucket: "eduing-platform.firebasestorage.app",
  messagingSenderId: "475439810258",
  appId: "1:475439810258:web:c6c06c8508f98b9a2c4f0b"
}


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
