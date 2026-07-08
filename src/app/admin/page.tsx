'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, Clock, Building2,
  LogOut, Mail, Phone, Globe, Users, RefreshCw
} from 'lucide-react'
import { auth, db } from '@/lib/firebase/config'
import {
  subscribeToAllUniversities,
  approveUniversity,
  rejectUniversity,
} from '@/lib/firebase/university'
import { useToast } from '@/components/Toast'
import type { FirestoreRecord } from '@/lib/firebase/types'

type Tab = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminPage() {
  const [universities, setUniversities] = useState<FirestoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/admin/login'); return }

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists() || userDoc.data().role !== 'eduing_admin') {
        await auth.signOut()
        router.push('/admin/login')
        return
      }

      const unsubData = subscribeToAllUniversities((data) => {
        setUniversities(data)
        setLoading(false)
      })
      return unsubData
    })
    return () => unsub()
  }, [router])

  const handleApprove = async (uid: string, name: string) => {
    setProcessingId(uid)
    try {
      await approveUniversity(uid)
      toast.success(`${name} approved and verified`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to approve university')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setProcessingId(rejectingId)
    try {
      const uni = universities.find(u => u.id === rejectingId)
      await rejectUniversity(rejectingId, rejectReason.trim())
      toast.success(`${uni?.universityName || 'University'} rejected`)
      setRejectingId(null)
      setRejectReason('')
    } catch (error) {
      console.error(error)
      toast.error('Failed to reject university')
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = universities.filter(u => {
    if (activeTab === 'all') return true
    return u.approvalStatus === activeTab
  })

  const counts = {
    pending: universities.filter(u => u.approvalStatus === 'pending').length,
    approved: universities.filter(u => u.approvalStatus === 'approved').length,
    rejected: universities.filter(u => u.approvalStatus === 'rejected').length,
    all: universities.length,
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'pending', label: 'Pending', icon: <Clock size={14} /> },
    { key: 'approved', label: 'Approved', icon: <CheckCircle size={14} /> },
    { key: 'rejected', label: 'Rejected', icon: <XCircle size={14} /> },
    { key: 'all', label: 'All', icon: <Building2 size={14} /> },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <RefreshCw className="animate-spin text-brand-primary-text" size={24} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="border-b border-brand-border bg-brand-surface px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">EDUING Admin</h1>
          <p className="text-xs text-text-muted mt-0.5">University Registration Review</p>
        </div>
        <button
          onClick={async () => { await auth.signOut(); router.push('/admin/login') }}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending review', value: counts.pending, color: 'text-brand-warning' },
            { label: 'Approved', value: counts.approved, color: 'text-brand-success' },
            { label: 'Rejected', value: counts.rejected, color: 'text-brand-error' },
          ].map(stat => (
            <div key={stat.label} className="bg-brand-surface border border-brand-border rounded-2xl p-5">
              <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-bold">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-primary text-white'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* University list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No universities in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(uni => (
                <motion.div
                  key={uni.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-brand-surface border border-brand-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-base font-bold text-white truncate">
                          {uni.universityName as string || 'Unnamed University'}
                        </h2>
                        <StatusBadge status={uni.approvalStatus as string} />
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-text-muted">
                        {uni.adminName && (
                          <span className="flex items-center gap-1.5">
                            <Users size={12} /> {uni.adminName as string}
                          </span>
                        )}
                        {uni.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail size={12} /> {uni.email as string}
                          </span>
                        )}
                        {uni.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} /> {uni.phone as string}
                          </span>
                        )}
                        {uni.website && (
                          <span className="flex items-center gap-1.5">
                            <Globe size={12} /> {uni.website as string}
                          </span>
                        )}
                        {uni.city && uni.state && (
                          <span className="flex items-center gap-1.5">
                            <Building2 size={12} /> {uni.city as string}, {uni.state as string}
                          </span>
                        )}
                        {uni.type && (
                          <span className="capitalize">{uni.type as string}</span>
                        )}
                      </div>

                      {uni.about && (
                        <p className="text-xs text-text-muted mt-3 line-clamp-2">
                          {uni.about as string}
                        </p>
                      )}

                      {uni.rejectionReason && (
                        <p className="text-xs text-brand-error mt-2">
                          Rejection reason: {uni.rejectionReason as string}
                        </p>
                      )}

                      <p className="text-xs text-text-muted/60 mt-3">
                        Registered {uni.createdAt
                          ? new Date((uni.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Unknown date'
                        }
                      </p>
                    </div>

                    {/* Actions — only shown for pending */}
                    {uni.approvalStatus === 'pending' && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(uni.id, uni.universityName as string)}
                          disabled={processingId === uni.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-success/10 text-brand-success text-xs font-bold hover:bg-brand-success/20 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(uni.id)}
                          disabled={processingId === uni.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-error/10 text-brand-error text-xs font-bold hover:bg-brand-error/20 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Re-review button for already-processed */}
                    {uni.approvalStatus !== 'pending' && (
                      <button
                        onClick={() => handleApprove(uni.id, uni.universityName as string)}
                        disabled={processingId === uni.id}
                        className="shrink-0 px-3 py-1.5 rounded-lg border border-brand-border text-text-muted text-xs font-bold hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Rejection modal */}
      <AnimatePresence>
        {rejectingId && (
          <>
            {/* backdrop */}
            <div
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setRejectingId(null)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-dialog-title"
            >
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 id="reject-dialog-title" className="text-base font-bold text-white mb-1">
                  Reject Registration
                </h2>
                <p className="text-xs text-text-muted mb-4">
                  Provide a reason — this will be stored on the record and can help the university reapply with corrections.
                </p>
                <label htmlFor="reject-reason" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  Reason
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="input-dark min-h-[100px] resize-none w-full mb-4"
                  placeholder="e.g. Incomplete documentation, invalid accreditation number…"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason('') }}
                    className="flex-1 py-2 rounded-lg border border-brand-border text-text-muted text-sm font-bold hover:text-white hover:border-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || processingId !== null}
                    className="flex-1 py-2 rounded-lg bg-brand-error text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-brand-warning/10 text-brand-warning',
    approved: 'bg-brand-success/10 text-brand-success',
    rejected: 'bg-brand-error/10 text-brand-error',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status] || 'bg-white/10 text-text-muted'}`}>
      {status}
    </span>
  )
}
