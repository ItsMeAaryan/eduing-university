'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (!userDoc.exists() || userDoc.data().role !== 'eduing_admin') {
        await auth.signOut()
        toast.error('Access denied — EDUING admin accounts only')
        setLoading(false)
        return
      }

      router.push('/admin')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">EDUING Admin</h1>
          <p className="text-text-muted text-sm mt-2">Platform staff access only</p>
        </div>

        <form onSubmit={handleLogin} className="bg-brand-surface border border-brand-border rounded-2xl p-8 space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-dark"
              placeholder="admin@eduing.in"
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-dark"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
