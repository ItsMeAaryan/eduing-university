'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { useRouter, usePathname } from 'next/navigation'

interface UserData {
  uid: string
  name: string
  email: string
  universityName: string
  role: 'uni_admin' | 'student' | 'admin'
  createdAt: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (user) {
        // Listen to user document in Firestore
        const userDocRef = doc(db, 'users', user.uid)
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData
            setUserData(data)
            
            // Check for uni_admin role
            if (data.role !== 'uni_admin' && !pathname.startsWith('/auth')) {
              router.push('/auth/login')
            }
          } else {
            setUserData(null)
            if (!pathname.startsWith('/auth')) {
              router.push('/auth/login')
            }
          }
          setLoading(false)
        })
        return () => unsubscribeDoc()
      } else {
        setUserData(null)
        setLoading(false)
        if (!pathname.startsWith('/auth')) {
          router.push('/auth/login')
        }
      }
    })

    return () => unsubscribe()
  }, [pathname, router])

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
