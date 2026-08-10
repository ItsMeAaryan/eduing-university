'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot, or, orderBy, limit } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import type { FirestoreRecord, AuditLog } from '@/lib/firebase/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Clock,
  CheckCircle,
  BookOpen,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Zap,
  Activity,
  FileText,
  UserCheck,
  ChevronRight,
  Megaphone,
  Calendar,
} from 'lucide-react'
import { subscribeToAuditLogs } from '@/lib/firebase/audit'
import { useAuth } from '@/context/AuthContext'
import { callGroqAI } from '@/lib/groq'

// ─── Animation helper ──────────────────────────────────────────────────────────
const fadeIn = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
})

// ─── University Profile Strength AI Component ─────────────────────────────
function UniversityProfileStrengthCard({ programsCount, uniData }: { programsCount: number; uniData: any }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<{ score: number; recommendations: { title: string; bonus: string; href: string }[] } | null>(null)
  
  // Calculate target score
  const targetScore = useMemo(() => {
    let s = 45
    if (uniData?.naacGrade) s += 15
    if (uniData?.gallery && uniData.gallery.length > 0) s += 15
    if (uniData?.email || uniData?.phone) s += 15
    if (programsCount > 0) s += 10
    return Math.min(100, s)
  }, [uniData, programsCount])

  // Animated score value (0 to targetScore in 1s on mount)
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1000
    const stepTime = 20
    const steps = duration / stepTime
    const increment = targetScore / steps

    const timer = setInterval(() => {
      start += increment
      if (start >= targetScore) {
        setAnimatedScore(targetScore)
        clearInterval(timer)
      } else {
        setAnimatedScore(Math.round(start))
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [targetScore])

  const defaultSuggestions = [
    { title: 'Add NAAC grade', bonus: '+10%', href: '/profile' },
    { title: 'Upload campus photos', bonus: '+5%', href: '/profile' },
    { title: 'Complete contact details', bonus: '+10%', href: '/profile' },
  ]

  const suggestions = analysis ? analysis.recommendations : defaultSuggestions

  const score = analysis?.score ?? animatedScore
  const circumference = 2 * Math.PI * 36
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <Panel index={0.5} style={{ marginBottom: '20px', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="#6366F1" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>University Profile Strength</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>AI-powered admissions appeal and completeness evaluation</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: '20px', alignItems: 'center' }}>
        {/* Circular Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="36" stroke="var(--bg-card-hover)" strokeWidth="7" fill="none" />
              <circle
                cx="45"
                cy="45"
                r="36"
                stroke="#6366F1"
                strokeWidth="7"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 45 45)"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <span style={{ position: 'absolute', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {score}%
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '6px' }}>Strength Score</span>
        </div>

        {/* Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {suggestions.map((rec, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1', flexShrink: 0 }} />
                <span>{rec.title}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1AAE39', background: 'rgba(26,174,57,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                  {rec.bonus}
                </span>
              </div>
              <Link
                href={rec.href}
                style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Action →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({
  children,
  style,
  index = 0,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  index?: number
}) {
  return (
    <motion.div
      {...fadeIn(index)}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

function PanelHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h2>
        {sub && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  sub?: string
  accent: string
  index: number
  badge?: React.ReactNode
  trend?: 'up' | 'down' | null
  trendLabel?: string
}

function StatCard({ label, value, icon: Icon, sub, accent, index, badge, trend, trendLabel }: StatCardProps) {
  return (
    <motion.div
      {...fadeIn(index)}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: 'var(--shadow-card)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
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
      {/* Subtle accent glow top-right */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `${accent}18`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {badge}
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: `${accent}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={14} color={accent} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: '30px',
          fontWeight: '800',
          color: 'var(--text-primary)',
          letterSpacing: '-1.5px',
          lineHeight: 1,
          marginBottom: '8px',
        }}
      >
        {value}
      </div>

      {/* Sub + trend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '11px',
              fontWeight: '600',
              color: trend === 'up' ? 'var(--green)' : 'var(--red)',
            }}
          >
            {trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trendLabel}
          </span>
        )}
        {sub && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
    </motion.div>
  )
}

// ─── Application Funnel ────────────────────────────────────────────────────────
function FunnelStep({
  label,
  count,
  pct,
  color,
  isFirst,
}: {
  label: string
  count: number
  pct: number
  color: string
  isFirst: boolean
}) {
  const barWidth = count === 0 ? 0 : isFirst ? 100 : Math.max(pct, 2)
  const displayLabel = count === 0 ? '0%' : isFirst ? '100%' : `${pct.toFixed(0)}%`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '110px', flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {count}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: '36px',
            borderRadius: '6px',
            background: `${color}20`,
            border: `1px solid ${color}35`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              width: `${barWidth}%`,
              background: `linear-gradient(90deg, ${color}60, ${color}90)`,
              borderRadius: '5px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '10px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: '700', color, zIndex: 1 }}>
              {displayLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Program Bar ───────────────────────────────────────────────────────────────
function ProgramBar({ name, count, max }: { name: string; count: number; max: number }) {
  const pct = max === 0 ? 0 : (count / max) * 100
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '70%',
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{count}</span>
      </div>
      <div
        style={{
          height: '6px',
          borderRadius: '999px',
          background: 'var(--bg-card-hover)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '100%',
            borderRadius: '999px',
            background: count === 0
              ? 'var(--text-faint)'
              : 'linear-gradient(90deg, var(--accent), #6366F1)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Activity icon map ─────────────────────────────────────────────────────────
function activityMeta(actionType: string): { icon: React.ElementType; color: string } {
  if (actionType.includes('application') || actionType.includes('submit'))
    return { icon: FileText, color: '#6366F1' }
  if (actionType.includes('status') || actionType.includes('update'))
    return { icon: Activity, color: '#D97706' }
  if (actionType.includes('student') || actionType.includes('register'))
    return { icon: UserCheck, color: '#1AAE39' }
  if (actionType.includes('program'))
    return { icon: BookOpen, color: '#0075DE' }
  return { icon: Zap, color: '#8C8C85' }
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Main dashboard ────────────────────────────────────────────────────────────
export default function UniversityDashboard() {
  const router = useRouter()
  const { user: authUser, userData } = useAuth()
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isUnmounted = false
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/auth/login'); return }

      let unsubApps: (() => void) | null = null
      let unsubProgs: (() => void) | null = null
      let unsubLogs: (() => void) | null = null

      try {
        // Applications
        const qApps = query(collection(db, 'applications'), where('universityId', '==', user.uid))
        unsubApps = onSnapshot(
          qApps, 
          (snap) => {
            if (!isUnmounted) {
              setApps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
              setLoading(false)
            }
          },
          (err: any) => {
            unsubApps = null
            if (err?.code === 'permission-denied') {
              console.warn('Insufficient permissions for dashboard apps query:', err.message)
            } else {
              console.error('Dashboard applications onSnapshot error:', err)
            }
            if (!isUnmounted) setLoading(false)
          }
        )
      } catch (e) {
        console.error('Failed to setup dashboard apps query:', e)
      }

      try {
        // Programs
        const qProgs = query(
          collection(db, 'programs'),
          or(where('universityId', '==', user.uid), where('uniId', '==', user.uid))
        )
        unsubProgs = onSnapshot(
          qProgs, 
          (snap) => {
            if (!isUnmounted) {
              setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            }
          },
          (err: any) => {
            unsubProgs = null
            if (err?.code === 'permission-denied') {
              console.warn('Insufficient permissions for dashboard programs query:', err.message)
            } else {
              console.error('Dashboard programs onSnapshot error:', err)
            }
          }
        )
      } catch (e) {
        console.error('Failed to setup dashboard programs query:', e)
      }

      // Audit logs (activity feed) — 10 items
      const uniId = userData?.role === 'uni_admin' ? user.uid : userData?.universityId
      if (uniId) {
        try {
          unsubLogs = subscribeToAuditLogs(uniId, 10, (data) => {
            if (!isUnmounted) setLogs(data)
          })
        } catch (e) {
          console.error('Failed to setup dashboard logs query:', e)
        }
      }

      return () => {
        isUnmounted = true
        if (unsubApps) {
          try { unsubApps() } catch (err) { console.warn('Safe unsub apps error:', err) }
          unsubApps = null
        }
        if (unsubProgs) {
          try { unsubProgs() } catch (err) { console.warn('Safe unsub progs error:', err) }
          unsubProgs = null
        }
        if (unsubLogs) {
          try { unsubLogs() } catch (err) { console.warn('Safe unsub logs error:', err) }
          unsubLogs = null
        }
      }
    })
    return unsub
  }, [router, userData])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total = apps.length
  const submitted = apps.filter(a => a.status === 'submitted').length
  const underReview = apps.filter(a => a.status === 'under_review').length
  const selected = apps.filter(a => a.status === 'selected').length
  const enrolled = apps.filter(a => a.status === 'enrolled').length

  // Funnel
  const funnelSteps = [
    { label: 'Applied', count: total, color: '#6366F1' },
    { label: 'Under Review', count: underReview + selected + enrolled, color: '#0075DE' },
    { label: 'Selected', count: selected + enrolled, color: '#1AAE39' },
    { label: 'Enrolled', count: enrolled, color: '#10B981' },
  ]

  // Programs with applicant counts
  const programStats = useMemo(() => {
    return programs.map(p => ({
      id: p.id,
      name: (p.name || p.programName || 'Unnamed Program') as string,
      count: apps.filter(a => a.programId === p.id || a.programName === p.name).length,
    })).sort((a, b) => b.count - a.count)
  }, [programs, apps])

  const maxProgramCount = Math.max(...programStats.map(p => p.count), 1)

  // Deadlines in next 7 days
  const [now] = useState(() => Date.now())
  const urgentDeadlines = useMemo(() => programs
    .filter(p => p.deadline)
    .map(p => {
      const d = new Date(p.deadline as string)
      const days = Math.ceil((d.getTime() - now) / 86400000)
      return { ...(p as Record<string, unknown>), id: p.id, days, date: d } as FirestoreRecord & { days: number; date: Date }
    })
    .filter(p => p.days >= 0 && p.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3),
    [programs, now]
  )

  // Programs with 0 applicants
  const zeroApplicantPrograms = programStats.filter(p => p.count === 0)

  // Month-over-month trend (apps this month vs last)
  const thisMonthCount = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
    return apps.filter(a => {
      const ts = (a.appliedAt as { seconds?: number } | undefined)?.seconds
      return ts && ts * 1000 >= start.getTime()
    }).length
  }, [apps])

  const lastMonthCount = useMemo(() => {
    const start = new Date(); start.setMonth(start.getMonth() - 1); start.setDate(1); start.setHours(0, 0, 0, 0)
    const end = new Date(); end.setDate(1); end.setHours(0, 0, 0, 0)
    return apps.filter(a => {
      const ts = (a.appliedAt as { seconds?: number } | undefined)?.seconds
      return ts && ts * 1000 >= start.getTime() && ts * 1000 < end.getTime()
    }).length
  }, [apps])

  const trend = thisMonthCount > lastMonthCount ? 'up' : thisMonthCount < lastMonthCount ? 'down' : null
  const trendDiff = Math.abs(thisMonthCount - lastMonthCount)

  const profileStrength = useMemo(() => {
    let s = 45
    const u = userData as any
    if (u?.naacGrade) s += 15
    if (u?.gallery && Array.isArray(u.gallery) && u.gallery.length > 0) s += 15
    if (u?.email || u?.phone) s += 15
    if (programs.length > 0) s += 10
    return Math.min(100, s)
  }, [userData, programs])

  return (
    <div>
      {/* ── Page header ── */}
      <motion.div {...fadeIn(0)} className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Admissions overview · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </motion.div>

      {/* ── Profile Strength AI Card ── */}
      <UniversityProfileStrengthCard programsCount={programs.length} uniData={userData} />

      {/* ══ ROW 1 — Stat cards ══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          index={1}
          label="Total Applications"
          value={total}
          icon={Users}
          accent="#6366F1"
          trend={trend}
          trendLabel={trend ? `${trendDiff} vs last month` : undefined}
          sub={!trend ? 'All time' : undefined}
        />

        <StatCard
          index={2}
          label="Pending Review"
          value={submitted}
          icon={Clock}
          accent="#D97706"
          sub="Awaiting first review"
          badge={
            submitted > 0 ? (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#DC2626',
                  boxShadow: '0 0 0 3px rgba(220,38,38,0.2)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            ) : null
          }
        />

        <StatCard
          index={3}
          label="Selected / Enrolled"
          value={
            <span>
              <span style={{ color: '#1AAE39' }}>{selected}</span>
              <span style={{ fontSize: '16px', fontWeight: '400', color: 'var(--text-muted)', letterSpacing: 0 }}> / </span>
              <span style={{ color: '#10B981' }}>{enrolled}</span>
            </span>
          }
          icon={CheckCircle}
          accent="#1AAE39"
          sub="Selected · Enrolled"
        />

        <StatCard
          index={4}
          label="Active Programs"
          value={programs.length}
          icon={BookOpen}
          accent="#0075DE"
          sub="Listed courses"
        />
      </div>

      {/* ══ Quick Actions ══ */}
      <motion.div {...fadeIn(4.5)} style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Link href="/programs" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(0,117,222,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0075DE', flexShrink: 0 }}>
                <BookOpen size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Add Program</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Create new course</div>
              </div>
            </div>
          </Link>

          <Link href="/staff" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
                <Users size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Invite Staff</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manage team members</div>
              </div>
            </div>
          </Link>

          <Link href="/applications" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(26,174,57,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1AAE39', flexShrink: 0 }}>
                <FileText size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>View Applications</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Review student leads</div>
              </div>
            </div>
          </Link>

          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(234,88,12,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C', flexShrink: 0 }}>
                <UserCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Edit Profile</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Update details & logos</div>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* ══ ROW 2 — Funnel + Action Required ══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Application Funnel */}
        <Panel index={5}>
          <PanelHeader title="Application Funnel" sub="Conversion through your admissions pipeline" />
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {funnelSteps.map((step, i) => (
              <div key={step.label}>
                <FunnelStep
                  label={step.label}
                  count={step.count}
                  pct={total === 0 ? 0 : (step.count / total) * 100}
                  color={step.color}
                  isFirst={i === 0}
                />
                {i < funnelSteps.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                    <div style={{ width: '110px', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
                      {step.count > 0 && funnelSteps[i + 1].count > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '600' }}>
                          ↓ {((funnelSteps[i + 1].count / step.count) * 100).toFixed(0)}% conversion
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {total === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No applications yet. Share your programs to attract students.
              </div>
            )}
          </div>
        </Panel>

        {/* Action Required */}
        <Panel index={6}>
          <PanelHeader
            title="Action Required"
            sub="Items needing your attention"
          />
          <div style={{ padding: '12px' }}>
            {programs.length === 0 || profileStrength < 50 || submitted > 0 || zeroApplicantPrograms.length > 0 || urgentDeadlines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* 0 programs condition */}
                {programs.length === 0 && (
                  <ActionItem
                    icon={BookOpen}
                    iconColor="#0075DE"
                    iconBg="rgba(0,117,222,0.10)"
                    title="Add your first program to start receiving applications"
                    cta="Add Program"
                    href="/programs"
                    urgent
                  />
                )}

                {/* Incomplete profile condition (<50%) */}
                {profileStrength < 50 && (
                  <ActionItem
                    icon={AlertCircle}
                    iconColor="#EA580C"
                    iconBg="rgba(234,88,12,0.10)"
                    title="Complete your profile to appear in student searches"
                    cta="Complete Profile"
                    href="/profile"
                    urgent
                  />
                )}

                {/* Unreviewed applications */}
                {submitted > 0 && (
                  <ActionItem
                    icon={AlertCircle}
                    iconColor="#DC2626"
                    iconBg="rgba(220,38,38,0.10)"
                    title={`${submitted} application${submitted !== 1 ? 's' : ''} not yet reviewed`}
                    cta="Review Now"
                    href="/applications"
                    urgent
                  />
                )}

                {/* Programs with 0 applicants */}
                {zeroApplicantPrograms.length > 0 && (
                  <ActionItem
                    icon={Megaphone}
                    iconColor="#D97706"
                    iconBg="rgba(217,119,6,0.10)"
                    title={`${zeroApplicantPrograms.length} program${zeroApplicantPrograms.length !== 1 ? 's' : ''} with 0 applicants`}
                    cta="Promote"
                    href="/programs"
                  />
                )}

                {/* Upcoming deadlines */}
                {urgentDeadlines.map(p => (
                  <ActionItem
                    key={p.id}
                    icon={Calendar}
                    iconColor="#6366F1"
                    iconBg="rgba(99,102,241,0.10)"
                    title={`"${String(p.name ?? '').slice(0, 28)}" deadline in ${p.days === 0 ? 'today' : `${p.days}d`}`}
                    cta="View"
                    href="/programs"
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(26,174,57,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  <CheckCircle size={20} color="#1AAE39" />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#1AAE39', margin: 0 }}>All caught up! ✓</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Nothing pending right now.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ══ ROW 3 — Program Performance + Activity Feed ══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        {/* Program Performance */}
        <Panel index={7}>
          <PanelHeader
            title="Program Performance"
            sub="Applicants per program"
            right={
              <Link
                href="/programs"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', color: 'var(--accent)', textDecoration: 'none',
                  fontWeight: '500', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Manage <ArrowRight size={12} />
              </Link>
            }
          />
          <div style={{ padding: '18px 20px' }}>
            {programStats.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No programs added yet.
              </div>
            ) : (
              programStats.slice(0, 8).map(p => (
                <ProgramBar key={p.id} name={p.name} count={p.count} max={maxProgramCount} />
              ))
            )}
          </div>
        </Panel>

        {/* Recent Activity Feed */}
        <Panel index={8}>
          <PanelHeader
            title="Recent Activity"
            sub="Latest events across your portal"
            right={
              <Link
                href="/audit"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', color: 'var(--accent)', textDecoration: 'none',
                  fontWeight: '500', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                View all <ArrowRight size={12} />
              </Link>
            }
          />
          <div style={{ padding: '8px 12px', overflowY: 'auto', maxHeight: '360px' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <Activity size={20} style={{ color: 'var(--text-faint)', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No activity recorded yet.</p>
              </div>
            ) : (
              logs.map((log, i) => {
                const { icon: Icon, color } = activityMeta(log.actionType)
                const entityRoute = log.entityType === 'application'
                  ? `/applications`
                  : log.entityType === 'program'
                    ? `/programs`
                    : log.entityType === 'student'
                      ? `/students`
                      : null

                const inner = (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '9px 8px',
                      borderRadius: '8px',
                      cursor: entityRoute ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => { if (entityRoute) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: `${color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      <Icon size={13} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{log.actorName}</strong>
                        {' '}{log.actionType.replace(/_/g, ' ')}{' '}
                        <span style={{ color: 'var(--text-muted)' }}>{log.entityType}</span>
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0', fontWeight: '500' }}>
                        {timeAgo(log.timestamp)}
                      </p>
                    </div>
                    {entityRoute && (
                      <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: '8px' }} />
                    )}
                  </motion.div>
                )

                return entityRoute ? (
                  <Link key={log.id} href={entityRoute} style={{ textDecoration: 'none', display: 'block' }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={log.id}>{inner}</div>
                )
              })
            )}
          </div>
        </Panel>
      </div>

      {/* Upcoming deadlines — only shown if data exists */}
      {urgentDeadlines.length > 0 && (
        <motion.div
          {...fadeIn(9)}
          style={{
            marginTop: '16px',
            background: 'var(--bg-elevated)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <PanelHeader
            title="Upcoming Deadlines"
            sub="Programs closing within 7 days"
            right={
              <Link
                href="/programs"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', color: 'var(--accent)', textDecoration: 'none',
                  fontWeight: '500', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                View Programs <ArrowRight size={12} />
              </Link>
            }
          />
          <div style={{ padding: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {urgentDeadlines.map(p => (
              <div
                key={p.id}
                style={{
                  flex: '1 1 200px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: p.days <= 2 ? 'rgba(220,38,38,0.06)' : 'rgba(217,119,6,0.06)',
                  border: `1px solid ${p.days <= 2 ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {String(p.name ?? '')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {p.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: p.days <= 2 ? 'var(--red)' : 'var(--gold)',
                      background: p.days <= 2 ? 'rgba(220,38,38,0.10)' : 'rgba(217,119,6,0.10)',
                      padding: '2px 7px',
                      borderRadius: '999px',
                    }}
                  >
                    {p.days === 0 ? 'Today' : `${p.days}d left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Action item component ──────────────────────────────────────────────────────
function ActionItem({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  cta,
  href,
  urgent,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  cta: string
  href: string
  urgent?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 10px',
        borderRadius: '8px',
        background: urgent ? 'rgba(220,38,38,0.04)' : 'transparent',
        border: urgent ? '1px solid rgba(220,38,38,0.12)' : '1px solid transparent',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '12.5px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </p>
      </div>
      <Link
        href={href}
        style={{
          fontSize: '11.5px',
          fontWeight: '700',
          color: iconColor,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          whiteSpace: 'nowrap',
          padding: '4px 8px',
          borderRadius: '6px',
          background: iconBg,
          transition: 'opacity 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {cta} <ChevronRight size={11} />
      </Link>
    </div>
  )
}