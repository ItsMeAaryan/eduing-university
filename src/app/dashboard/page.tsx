'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot, or } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Clock,
  CheckCircle,
  BookOpen,
  ArrowRight,
  Calendar,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react'
import { updateApplicationStatus } from '@/lib/firebase/applications'
import { useToast } from '@/components/Toast'
import RecentActivityWidget from '@/components/RecentActivityWidget'

const fadeIn = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
})

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; badge: string }> = {
  submitted: { label: 'Submitted', badge: 'badge badge-info' },
  under_review: { label: 'In Review', badge: 'badge badge-warning' },
  selected: { label: 'Selected', badge: 'badge badge-success' },
  waitlisted: { label: 'Waitlisted', badge: 'badge badge-orange' },
  rejected: { label: 'Rejected', badge: 'badge badge-error' },
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  sub: string
  accent: string       // css var or hex
  index: number
}

function StatCard({ label, value, icon: Icon, sub, accent, index }: StatCardProps) {
  return (
    <motion.div
      {...fadeIn(index)}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '18px 20px',
        boxShadow: 'var(--shadow-card)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border-hover)'
        el.style.boxShadow = 'var(--shadow-hover)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border)'
        el.style.boxShadow = 'var(--shadow-card)'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span className="text-eyebrow">{label}</span>
        <div style={{
          width: '30px', height: '30px', borderRadius: '7px',
          background: `${accent}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color={accent} strokeWidth={2} />
        </div>
      </div>

      {/* Number — tight tracking like Notion display type */}
      <div style={{
        fontSize: '32px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        letterSpacing: '-1.5px',
        lineHeight: 1,
        marginBottom: '6px',
      }}>
        {value}
      </div>

      {/* Sub */}
      <div className="text-caption">{sub}</div>
    </motion.div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

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
        user.uid, appId, studentId, status,
        { uid: user.uid, name: user.displayName || user.email || 'Admin', role: 'admin' }
      )
      toast.success(`Status updated to ${status.replace('_', ' ')}`)
    } catch {
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
          const aS = (a.appliedAt as { seconds?: number } | undefined)?.seconds ?? 0
          const bS = (b.appliedAt as { seconds?: number } | undefined)?.seconds ?? 0
          return bS - aS
        })
        .slice(0, 6),
    [apps]
  )

  const [now] = useState(() => Date.now())

  const upcomingDeadlines = useMemo(() =>
    programs
      .filter(p => p.deadline)
      .map(p => {
        const d = new Date(p.deadline as string)
        const days = Math.ceil((d.getTime() - now) / 86400000)
        return { ...p, days, date: d }
      })
      .filter(p => p.days > 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 3),
    [programs, now]
  )

  const STATS: StatCardProps[] = [
    { label: 'Total Applications', value: total, icon: Users, sub: 'All time', accent: '#0075DE', index: 1 },
    { label: 'Under Review', value: underReview, icon: Clock, sub: 'Requires action', accent: '#D97706', index: 2 },
    { label: 'Selected', value: selected, icon: CheckCircle, sub: 'Awaiting enrollment', accent: '#1AAE39', index: 3 },
    { label: 'Active Programs', value: programs.length, icon: BookOpen, sub: 'Listed courses', accent: '#6366F1', index: 4 },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      {/* ── Page header ── */}
      <motion.div {...fadeIn(0)} className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Admissions overview for your institution</p>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Main content grid ── */}
      <div
        className="dashboard-main-grid"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 288px', gap: '16px' }}
      >
        {/* ── Recent Applications table ── */}
        <motion.div
          {...fadeIn(5)}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Table header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                Recent Applications
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Latest student activity
              </p>
            </div>
            <Link
              href="/applications"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={18} /></div>
              <p className="empty-state-title">No applications yet</p>
              <p className="empty-state-description">Applications will appear here once students apply to your programs.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '18px' }}>Student</th>
                  <th>Program</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => {
                  const s = STATUS[app.status as string] || STATUS.submitted
                  const date = app.appliedAt?.toDate ? app.appliedAt.toDate() : new Date()
                  return (
                    <tr key={app.id}>
                      {/* Student */}
                      <td style={{ paddingLeft: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                            background: 'var(--accent-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '600', color: 'var(--accent)',
                          }}>
                            {(app.studentName as string || 'S').charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {app.studentName as string || 'Student'}
                            </div>
                            <div className="text-caption">{app.studentEmail as string || ''}</div>
                          </div>
                        </div>
                      </td>

                      {/* Program */}
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {app.programName as string || '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td>
                        <span className="text-caption">
                          {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={s.badge}>{s.label}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        <ActionDropdown
                          app={app}
                          onUpdate={(status) => handleStatusUpdate(app.id, app.studentId as string, status)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Upcoming Deadlines */}
          <motion.div
            {...fadeIn(6)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <Calendar size={14} color="var(--text-muted)" />
              <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                Upcoming Deadlines
              </h2>
            </div>

            <div style={{ padding: '8px' }}>
              {upcomingDeadlines.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                  <Calendar size={20} style={{ color: 'var(--text-faint)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No upcoming deadlines</p>
                </div>
              ) : upcomingDeadlines.map((p) => {
                const urgent = p.days <= 7
                const soon = p.days <= 14
                const color = urgent ? 'var(--red)' : soon ? 'var(--gold)' : 'var(--accent)'
                const bgColor = urgent
                  ? 'rgba(220,38,38,0.06)'
                  : soon
                    ? 'rgba(217,119,6,0.06)'
                    : 'var(--accent-bg)'

                return (
                  <div key={p.id as string} style={{
                    padding: '12px',
                    borderRadius: '7px',
                    marginBottom: '4px',
                    background: bgColor,
                    border: `1px solid ${urgent ? 'rgba(220,38,38,0.15)' : soon ? 'rgba(217,119,6,0.15)' : 'var(--accent-border)'}`,
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.1px' }}>
                      {p.name as string}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {p.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color,
                        background: urgent ? 'rgba(220,38,38,0.10)' : soon ? 'rgba(217,119,6,0.10)' : 'var(--accent-bg)',
                        padding: '2px 7px',
                        borderRadius: '999px',
                      }}>
                        {p.days}d left
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div {...fadeIn(7)} style={{ flex: 1, minHeight: 0 }}>
            <RecentActivityWidget />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ─── Action Dropdown ───────────────────────────────────────────────────────────

function ActionDropdown({ app, onUpdate }: { app: FirestoreRecord; onUpdate: (s: string) => void }) {
  const [open, setOpen] = useState(false)

  const options = [
    { label: 'Mark as In Review', value: 'under_review' },
    { label: 'Select student', value: 'selected' },
    { label: 'Waitlist', value: 'waitlisted' },
    { label: 'Reject', value: 'rejected' },
  ]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const btnStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '6px 10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    borderRadius: '5px',
    transition: 'background 0.1s ease, color 0.1s ease',
    fontFamily: 'inherit',
    display: 'block',
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-faint)',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: '5px',
          transition: 'background 0.1s, color 0.1s',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg-card-hover)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.color = 'var(--text-faint)'
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                width: '172px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 20,
                overflow: 'hidden',
                padding: '4px',
              }}
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onUpdate(opt.value); setOpen(false) }}
                  style={btnStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-card-hover)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {opt.label}
                </button>
              ))}

              <div style={{ height: '1px', background: 'var(--border)', margin: '3px 0' }} />

              <Link
                href={`/applications?id=${app.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  color: 'var(--accent)',
                  fontSize: '12px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  transition: 'background 0.1s',
                  fontWeight: '500',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                View details <ChevronRight size={12} />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}