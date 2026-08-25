'use client'

/**
 * AdminGuard — Layout-level protection for all /admin/* routes.
 *
 * Runs on the client as soon as the layout mounts. Any user whose
 * Firestore role is NOT 'eduing_admin' is silently redirected to
 * /dashboard with no error UI shown. This covers:
 *   - uni_admin / uni_staff who navigate directly to /admin
 *   - Unauthenticated users (redirected to /dashboard; the university
 *     login flow handles unauthenticated users before they reach any
 *     protected page)
 *
 * The check deliberately uses a one-time getDoc rather than the
 * AuthContext hook so it works even when this layout is rendered
 * outside the university AuthProvider tree.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter()
  // 'checking' while we verify role, 'allowed' only for eduing_admin
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not authenticated at all — bounce silently to /dashboard
        // (university login guard will handle the rest)
        router.replace('/dashboard')
        setStatus('denied')
        return
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const role = userDoc.exists() ? userDoc.data().role : null

        if (role !== 'eduing_admin') {
          // University admin, staff, student, or any unknown role — redirect silently
          router.replace('/dashboard')
          setStatus('denied')
        } else {
          setStatus('allowed')
        }
      } catch {
        // On any Firestore error, fail closed — bounce to /dashboard
        router.replace('/dashboard')
        setStatus('denied')
      }
    })

    return () => unsub()
  }, [router])

  // While checking: render nothing (no flash of admin content)
  if (status !== 'allowed') return null

  return <>{children}</>
}
