'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { useRouter, usePathname } from 'next/navigation'
import type { Permission, StaffMember } from '@/lib/firebase/types'

export interface UserData {
  uid: string
  name: string
  email: string
  universityName?: string
  universityId?: string
  role: 'uni_admin' | 'uni_staff' | 'student' | 'admin'
  createdAt: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  staffData: StaffMember | null
  loading: boolean
  hasPermission: (perm: Permission) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  staffData: null,
  loading: true,
  hasPermission: () => false
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [staffData, setStaffData] = useState<StaffMember | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const hasPermission = (perm: Permission): boolean => {
    if (userData?.role === 'uni_admin') return true
    if (userData?.role === 'uni_staff' && staffData?.permissions) {
      return staffData.permissions.includes(perm)
    }
    return false
  }

  useEffect(() => {
    let isUnmounted = false
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (user) {
        let unsubscribeStaff: (() => void) | null = null
        let unsubscribeDoc: (() => void) | null = null

        const userDocRef = doc(db, 'users', user.uid)
        const fetchUserData = async () => {
          try {
            const docSnap = await getDoc(userDocRef)
            if (isUnmounted) return

            if (docSnap.exists()) {
              const data = docSnap.data() as UserData
              setUserData(data)
              
              // RBAC Check: Only allow uni_admin and uni_staff
              if (data.role !== 'uni_admin' && data.role !== 'uni_staff' && !pathname.startsWith('/auth')) {
                router.push('/auth/login')
                setLoading(false)
                return
              }

              // If staff, get their specific staff document
              if (data.role === 'uni_staff' && data.universityId) {
                const staffRef = doc(db, `universities/${data.universityId}/staff`, user.uid)
                try {
                  const staffSnap = await getDoc(staffRef)
                  if (isUnmounted) return

                  if (staffSnap.exists()) {
                    const sData = staffSnap.data() as StaffMember
                    if (sData.status === 'suspended') {
                      setStaffData(null)
                      if (!pathname.startsWith('/auth')) {
                        auth.signOut()
                        router.push('/auth/login?suspended=true')
                      }
                    } else {
                      setStaffData(sData)
                    }
                  } else {
                    setStaffData(null)
                  }
                } catch (err: any) {
                  if (err?.code === 'permission-denied') {
                    console.warn('Insufficient permissions for AuthContext staff doc:', err.message)
                  } else {
                    console.error('Error in AuthContext staff fetch:', err)
                  }
                  setStaffData(null)
                }
              } else {
                setStaffData(null)
              }
            } else {
              setUserData(null)
              setStaffData(null)
              if (!pathname.startsWith('/auth')) {
                router.push('/auth/login')
              }
            }
          } catch (err: any) {
            if (err?.code === 'permission-denied') {
              console.warn('Insufficient permissions for AuthContext user doc:', err.message)
            } else {
              console.error('Error in AuthContext user fetch:', err)
            }
          } finally {
            if (!isUnmounted) setLoading(false)
          }
        }

        fetchUserData()

        return () => {
          isUnmounted = true
        }
      } else {
        setUserData(null)
        setStaffData(null)
        setLoading(false)
        if (!pathname.startsWith('/auth')) {
          router.push('/auth/login')
        }
      }
    })

    return () => unsubscribe()
  }, [pathname, router])

  return (
    <AuthContext.Provider value={{ user, userData, staffData, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export const usePermissions = () => {
  const { hasPermission } = useContext(AuthContext)
  return { hasPermission }
}
