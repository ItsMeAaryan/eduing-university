'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot, or } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Clock, CheckCircle, BookOpen, ArrowUpRight, Calendar, MoreHorizontal } from 'lucide-react'
import { updateApplicationStatus } from '@/lib/firebase/applications'
import { useToast } from '@/components/Toast'
import RecentActivityWidget from '@/components/RecentActivityWidget'

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
})

export default function UniversityDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/auth/login'); return }
      
      const q = query(collection(db, 'applications'), where('universityId', '==', user.uid))
      const unsubApps = onSnapshot(q, (snap) => {
        setApps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })

      const pq = query(
        collection(db, 'programs'), 
        or(
          where('universityId', '==', user.uid),
          where('uniId', '==', user.uid)
        )
      )
      const unsubProgs = onSnapshot(pq, (snap) => {
        setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      })

      return () => { unsubApps(); unsubProgs() }
    })
    return unsub
  }, [router])

  const handleStatusUpdate = async (appId: string, studentId: string, status: string) => {
    try {
      const user = auth.currentUser
      if (!user) return
      await updateApplicationStatus(
        user.uid,
        appId, 
        studentId, 
        status,
        { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
      )
      toast.success(`Application updated to ${status.replace('_', ' ')}`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to update status')
    }
  }

  const total = apps.length
  const underReview = apps.filter(a => a.status === 'under_review').length
  const selected = apps.filter(a => a.status === 'selected').length
  const recent = useMemo(
    () =>
      [...apps]
        .sort((a, b) => {
          const aSeconds = (a.appliedAt as { seconds?: number } | undefined)?.seconds ?? 0
          const bSeconds = (b.appliedAt as { seconds?: number } | undefined)?.seconds ?? 0
          return bSeconds - aSeconds
        })
        .slice(0, 5),
    [apps]
  )

  // Date.now() must not be called directly during render (React's purity
  // rule) — capture it once via lazy useState initializer instead, since
  // that runs only on mount, not on every re-render.
  const [now] = useState(() => Date.now())

  const deadlines = useMemo(() => {
    return programs
      .filter(p => p.deadline)
      .map((p): FirestoreRecord & { days: number; date: Date } => {
        const d = new Date(p.deadline as string)
        const days = Math.ceil((d.getTime() - now) / 86400000)
        return { ...p, days, date: d }
      })
      .filter(p => p.days > -30) // Show recently closed too, but filter in UI
      .sort((a, b) => a.days - b.days)
  }, [programs, now])

  const upcomingDeadlines = deadlines.filter(p => p.days > 0).slice(0, 3)

  const STATS = [
    { label: 'Total Applications', value: total, icon: Users, color: '#5B5FEF', bg: 'rgba(91,95,239,0.1)', sub: 'All time' },
    { label: 'Under Review', value: underReview, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', sub: 'Requires action' },
    { label: 'Selected', value: selected, icon: CheckCircle, color: '#10B981', bg: 'rgba(16,185,129,0.1)', sub: 'Awaiting enrollment' },
    { label: 'Programs Listed', value: programs.length, icon: BookOpen, color: '#818CF8', bg: 'rgba(129,140,248,0.1)', sub: 'Active courses' },
  ]

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    submitted: { bg: 'rgba(91,95,239,0.15)', color: '#818CF8', label: 'Submitted' },
    under_review: { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', label: 'Under Review' },
    selected: { bg: 'rgba(16,185,129,0.15)', color: '#34D399', label: 'Selected' },
    waitlisted: { bg: 'rgba(249,115,22,0.15)', color: '#FB923C', label: 'Waitlisted' },
    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5', label: 'Rejected' },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid rgba(91,95,239,0.2)', borderTop: '2px solid #5B5FEF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your admissions activity</p>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {STATS.map((s, i) => (
          <motion.div key={s.label} {...fadeUp(i + 1)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '22px',
              boxShadow: 'var(--shadow-card)', cursor: 'default',
              transition: 'all 0.2s ease',
            }}
            whileHover={{ borderColor: 'var(--border-hover)', y: -2 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</div>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={17} color={s.color} strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontSize: '38px', fontWeight: '800', color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main grid — responsive: stacks on smaller screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '20px' }}
        className="dashboard-main-grid"
      >
        {/* Recent Applications */}
        <motion.div {...fadeUp(5)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Recent Applications</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Latest activity from students</p>
            </div>
            <Link href="/applications" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--indigo-light)', textDecoration: 'none', fontWeight: '500' }}>
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ margin: '0 auto 12px' }}>
                <Users size={22} />
              </div>
              <p className="empty-state-title">No applications yet</p>
              <p className="empty-state-description" style={{ margin: '8px auto 0' }}>Applications will appear here once students apply to your programs.</p>
            </div>
          ) : (
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '0', padding: '8px 24px', borderBottom: '1px solid var(--border)' }}>
                {['STUDENT', 'PROGRAM', 'APPLIED', 'STATUS', ''].map(h => (
                  <div key={h} style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {recent.map((app, i) => {
                const s = STATUS_STYLES[app.status] || STATUS_STYLES.submitted
                const date = app.appliedAt?.toDate ? app.appliedAt.toDate() : new Date()
                return (
                  <motion.div key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '0', padding: '14px 24px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                        {(app.studentName || 'S').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{app.studentName || 'Student'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.studentEmail || ''}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingRight: '12px' }}>{app.programName || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div>
                      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '100px', background: s.bg, color: s.color, fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em' }}>{s.label}</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <ActionDropdown 
                        app={app} 
                        onUpdate={(status) => handleStatusUpdate(app.id, app.studentId, status)} 
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Right Column: Deadlines & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Upcoming Deadlines */}
        <motion.div {...fadeUp(6)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={16} color="var(--indigo-light)" />
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Upcoming Deadlines</h2>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Calendar size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>No upcoming deadlines</p>
            </div>
          ) : upcomingDeadlines.map((p, i) => (
            <motion.div key={p.id} {...fadeUp(i)}
              style={{
                padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '10px',
                background: p.days <= 7 ? 'rgba(239,68,68,0.06)' : p.days <= 14 ? 'rgba(245,158,11,0.06)' : 'rgba(91,95,239,0.06)',
                border: `1px solid ${p.days <= 7 ? 'rgba(239,68,68,0.2)' : p.days <= 14 ? 'rgba(245,158,11,0.2)' : 'rgba(91,95,239,0.15)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: p.days <= 7 ? '#EF4444' : p.days <= 14 ? '#F59E0B' : '#818CF8',
                  background: p.days <= 7 ? 'rgba(239,68,68,0.15)' : p.days <= 14 ? 'rgba(245,158,11,0.15)' : 'rgba(91,95,239,0.15)',
                  padding: '2px 8px', borderRadius: '100px',
                }}>
                  {p.days} {p.days === 1 ? 'day' : 'days'} left
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Deadline: {p.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Recent Activity */}
        <div style={{ height: '400px' }}>
          <RecentActivityWidget />
        </div>
        </div>
      </div>
    </div>
  )
}

function ActionDropdown({ app, onUpdate }: { app: FirestoreRecord, onUpdate: (status: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  const options = [
    { label: 'Set Under Review', value: 'under_review' },
    { label: 'Select Student', value: 'selected' },
    { label: 'Waitlist', value: 'waitlisted' },
    { label: 'Reject', value: 'rejected' },
  ]

  // Keyboard users need an equivalent to "click outside to close" —
  // Escape is the standard convention for dismissing an open menu.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={18} />
      </button>

      <AnimatePresence>

        {isOpen && (
          <>
            {/* Decorative click-outside dismiss layer — not focusable content.
                Escape (handled above) is the keyboard equivalent for closing this menu. */}
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 10 }} 
              onClick={() => setIsOpen(false)} 
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                width: '180px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 20,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '4px' }}>
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onUpdate(opt.value)
                      setIsOpen(false)
                    }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px',
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: '12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {opt.label}
                  </button>
                ))}
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <Link 
                  href={`/applications?id=${app.id}`}
                  style={{
                    display: 'block', padding: '8px 12px', color: 'var(--indigo-light)',
                    fontSize: '12px', textDecoration: 'none', borderRadius: 'var(--radius-sm)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  View Full Details
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
