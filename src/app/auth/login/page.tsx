'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase/config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap, Loader2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    
    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      
      if (!userData || userData.role !== 'uni_admin') {
        await auth.signOut()
        toast.error('University accounts only')
        setLoading(false)
        return
      }
      
      if (userData.approvalStatus === 'pending') {
        setPendingApproval(true)
        setLoading(false)
        return
      }
      
      toast.success('Successfully logged in')
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Authentication failed')
      setLoading(false)
    }
  }

  const handleAutofill = () => {
    setEmail('admin@dsu.eduing.in')
    setPassword('demo123')
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-brand-warning/10 text-brand-warning rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 size={32} className="animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Account Pending Approval</h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Your account is pending approval. Our team will review your application and contact you shortly.
          </p>
          <button 
            onClick={() => setPendingApproval(false)}
            className="w-full h-12 bg-white text-brand-bg rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3">
              <Image
                src="/bandwlogo.PNG"
                alt="EDUING Logo"
                width={40}
                height={40}
                style={{ objectFit: 'contain', filter: 'invert(1)' }}
              />
              <div className="text-3xl font-bold tracking-tight">
                <span className="text-white">EDU</span>
                <span className="text-brand-primary">ING</span>
                <span className="text-brand-primary">.in</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-white mt-6">University Portal</h1>
            <p className="text-text-secondary text-sm mt-2">Sign in to manage your institution</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@university.eduing.in"
                className="input-dark"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">Password</label>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark pr-12"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-white text-brand-bg rounded-lg font-bold flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 mt-8"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-brand-border text-center">
            <button 
              onClick={handleAutofill}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
            >
              <Zap size={12} className="text-brand-gold" />
              <span>⚡ Autofill Demo</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
