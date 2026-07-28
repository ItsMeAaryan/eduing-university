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
import { useTheme } from 'next-themes'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  
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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            width: '100%', maxWidth: '420px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{
            width: '64px', height: '64px',
            background: 'rgba(245,158,11,0.10)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'var(--gold)',
          }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Account Pending Approval
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 32px' }}>
            Your account is pending approval. Our team will review your application and contact you shortly.
          </p>
          <button 
            onClick={() => setPendingApproval(false)}
            style={{
              width: '100%', height: '48px',
              background: 'var(--indigo)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: 'var(--shadow-card)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <Image
                src="/bandwlogo.PNG"
                alt="EDUING Logo"
                width={40}
                height={40}
                style={{
                  objectFit: 'contain',
                  filter: resolvedTheme === 'dark' ? 'invert(1)' : 'none',
                  transition: 'filter 200ms ease',
                }}
              />
              <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.03em', display: 'flex', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-primary)' }}>EDU</span>
                <span style={{ color: 'var(--indigo-light)' }}>ING</span>
                <span style={{ color: 'var(--indigo-light)', fontSize: '16px' }}>.in</span>
              </div>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px' }}>
              University Portal
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              Sign in to manage your institution
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}
              >
                Email Address
              </label>
              <input 
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@university.eduing.in"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '10px',
                  color: 'var(--input-text)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--input-border-focus)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)' }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 14px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '10px',
                    color: 'var(--input-text)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--input-border-focus)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '48px', marginTop: '8px',
                background: 'var(--indigo)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>
          </form>

          {/* Demo autofill */}
          <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button 
              onClick={handleAutofill}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Zap size={13} style={{ color: 'var(--gold)' }} />
              Autofill Demo Credentials
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
