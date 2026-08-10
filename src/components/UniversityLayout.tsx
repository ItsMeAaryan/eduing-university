'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Calendar,
  Armchair,
  TrendingUp,
  UserCircle,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronUp,
  ChevronDown,
  Check,
  Users,
  UserSquare
} from 'lucide-react'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { useTheme } from 'next-themes'
import ThemeToggle from '@/components/ThemeToggle'
import NotificationBell from '@/components/NotificationBell'
import AICopilot from '@/components/AICopilot'
import { useAuth } from '@/context/AuthContext'
import { Permission } from '@/lib/firebase/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_EXPANDED_WIDTH = 256
const SIDEBAR_COLLAPSED_WIDTH = 64
const STORAGE_KEY = 'uni-sidebar-collapsed'

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  requiredPermission?: Permission
}

const NAV: NavItem[] = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',          requiredPermission: 'view_dashboard' },
  { href: '/students',     icon: UserSquare,      label: 'Students',            requiredPermission: 'view_applications' },
  { href: '/applications', icon: ClipboardList,   label: 'Applications',        requiredPermission: 'view_applications' },
  { href: '/programs',     icon: GraduationCap,   label: 'Programs',            requiredPermission: 'manage_programs' },
  { href: '/exams',        icon: Calendar,        label: 'Exam Management',     requiredPermission: 'generate_admit_cards' },
  { href: '/seats',        icon: Armchair,        label: 'Seat Allocation',     requiredPermission: 'generate_offers' },
  { href: '/analytics',    icon: TrendingUp,      label: 'Analytics',           requiredPermission: 'view_reports' },
  { href: '/staff',        icon: Users,           label: 'Staff Management',    requiredPermission: 'manage_staff' },
  { href: '/profile',      icon: UserCircle,      label: 'University Profile',  requiredPermission: 'edit_university' },
  { href: '/settings',     icon: Settings,        label: 'Settings' },
]

const THEME_OPTIONS = [
  { id: 'light' as const,  icon: Sun,     label: 'Light'  },
  { id: 'dark' as const,   icon: Moon,    label: 'Dark'   },
  { id: 'system' as const, icon: Monitor, label: 'System' },
]

// ─── Account Dropdown ────────────────────────────────────────────────────────
interface AccountMenuProps {
  uniData: FirestoreRecord | null
  name: string
  initial: string
  onClose: () => void
  onLogout: () => void
}

function AccountDropdown({ uniData, name, initial, onClose, onLogout }: AccountMenuProps) {
  const { theme, setTheme } = useTheme()
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const menuItemStyle: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 14px', background: 'transparent', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
    color: 'var(--text-secondary)', textAlign: 'left', transition: 'all 0.12s',
  }

  const navigate = (href: string) => { router.push(href); onClose() }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={menuRef}
        role="menu"
        aria-label="Account menu"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '10px', right: '10px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '14px',
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.20), 0 0 0 1px rgba(99,102,241,0.06)',
          zIndex: 99, overflow: 'hidden', backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, var(--indigo), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white', overflow: 'hidden' }}>
            {uniData?.logoURL
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={uniData.logoURL as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: '11px', color: uniData?.isVerified ? 'var(--green)' : 'var(--gold)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: uniData?.isVerified ? 'var(--green)' : 'var(--gold)', display: 'inline-block' }} />
              {uniData?.isVerified ? 'Verified University' : 'Pending Verification'}
            </div>
          </div>
        </div>
        <div style={{ padding: '6px' }}>
          <MenuItem icon="🏢" label="University Profile" sub="View and edit profile" onClick={() => navigate('/profile')} />
          <MenuItem icon="⚙️" label="Account Settings" sub="Manage account" onClick={() => navigate('/settings')} />
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <div>
            <button role="menuitem" aria-haspopup="true" aria-expanded={appearanceOpen}
              onClick={() => setAppearanceOpen(v => !v)}
              style={{ ...menuItemStyle, justifyContent: 'space-between' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', lineHeight: 1 }}>🎨</span>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Appearance</div>
              </div>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: appearanceOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            <AnimatePresence>
              {appearanceOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                  <div style={{ paddingLeft: '14px', paddingBottom: '4px' }}>
                    {THEME_OPTIONS.map(({ id, icon: Icon, label }) => {
                      const isActive = theme === id
                      return (
                        <button key={id} role="menuitemradio" aria-checked={isActive}
                          onClick={() => { setTheme(id); onClose() }}
                          style={{ ...menuItemStyle, color: isActive ? 'var(--indigo-light)' : 'var(--text-muted)', fontWeight: isActive ? '600' : '400', justifyContent: 'space-between' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Icon size={14} /><span>{label}</span></div>
                          {isActive && <Check size={13} style={{ color: 'var(--indigo-light)' }} />}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <MenuItem icon="🔔" label="Notification Settings" onClick={() => navigate('/settings')} />
          <MenuItem icon="🔐" label="Security" sub="Password · Sessions" onClick={() => navigate('/settings')} />
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <MenuItem icon="❓" label="Help & Support" onClick={() => { onClose() }} />
          <MenuItem icon="📄" label="Documentation" onClick={() => { onClose() }} />
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <button role="menuitem" onClick={onLogout}
            style={{ ...menuItemStyle, color: 'var(--red)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            <span>Logout</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── MenuItem helper ──────────────────────────────────────────────────────────
function MenuItem({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', lineHeight: 1.2 }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </button>
  )
}

// ─── Nav tooltip (shown in collapsed mode) ────────────────────────────────────
function NavTooltip({ label, sidebarWidth, children }: { label: string; sidebarWidth: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.13 }}
            style={{
              position: 'fixed',
              left: `${sidebarWidth + 10}px`,
              pointerEvents: 'none',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 200,
              transform: 'translateY(-50%)',
              marginTop: '0px',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, userData, hasPermission } = useAuth()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [uniData, setUniData] = useState<FirestoreRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  // ── Sidebar collapse — read initial value from localStorage ──────────────
  const [collapsed, setCollapsed] = useState(false)

  // Sync from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  const [uniError, setUniError] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  // ── Firestore fetch ────────────────────────────────────────────────
  useEffect(() => {
    let isUnmounted = false
    let retryTimer: NodeJS.Timeout | null = null

    if (!user || (userData?.role !== 'uni_admin' && userData?.role !== 'uni_staff')) {
      if (user === null) return
    }
    const uniId = userData?.role === 'uni_admin' ? user?.uid : userData?.universityId
    if (!uniId) return

    const fetchUni = async (retryCount = 0) => {
      try {
        const snap = await getDoc(doc(db, 'universities', uniId))
        if (!isUnmounted) {
          if (snap.exists()) {
            setUniData({ id: snap.id, ...snap.data() })
            setUniError(null)
            setShowWarning(false)
          } else if (retryCount < 2) {
            // Retry after 1 second if not found on first attempt
            retryTimer = setTimeout(() => fetchUni(retryCount + 1), 1000)
            return
          } else {
            setUniData(null)
          }
        }
      } catch (error: any) {
        if (!isUnmounted) {
          if (retryCount < 2) {
            retryTimer = setTimeout(() => fetchUni(retryCount + 1), 1000)
            return
          }
          if (error?.code === 'permission-denied') {
            console.warn('Insufficient permissions for university document:', error.message)
            setUniError('Unable to load university data — check your permissions')
          } else {
            console.error('Firestore university fetch error:', error.message)
            setUniError('Unable to load university data')
          }
          setUniData(null)
        }
      } finally {
        if (!isUnmounted) setLoading(false)
      }
    }

    fetchUni()

    // 3-second delay before displaying any warning
    const warningTimer = setTimeout(() => {
      if (!isUnmounted && uniError && !uniData) {
        setShowWarning(true)
      }
    }, 3000)

    return () => {
      isUnmounted = true
      if (retryTimer) clearTimeout(retryTimer)
      clearTimeout(warningTimer)
    }
  }, [user, userData, uniError, uniData])

  const handleLogout = useCallback(async () => {
    await signOut(auth)
    window.location.href = 'https://www.eduing.in'
  }, [])

  const name = uniData?.name || uniData?.shortName || 'University'
  const initial = name.charAt(0).toUpperCase()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      {showWarning && uniError && (
        <div style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 9999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          boxShadow: 'var(--shadow-card)',
        }}>
          ⚠️ {uniError}
        </div>
      )}

      {/* ════════════════════ SIDEBAR ════════════════════ */}
      <aside
        style={{
          width: `${sidebarWidth}px`,
          flexShrink: 0,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
          transition: 'width 300ms ease',
        }}
      >

        {/* ── Logo area ── */}
        <div
          style={{
            padding: collapsed ? '20px 0 16px' : '20px 20px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: collapsed ? 'center' : 'flex-start',
            transition: 'padding 300ms ease',
          }}
        >
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Logo mark — always visible */}
            <Image
              src="/bandwlogo.PNG"
              alt="EDUING Logo"
              width={30}
              height={30}
              style={{
                width: '30px',
                height: '30px',
                objectFit: 'contain',
                flexShrink: 0,
                filter: resolvedTheme === 'dark' ? 'invert(1)' : 'none',
                transition: 'filter 200ms ease',
              }}
            />
            {/* Wordmark — fades out when collapsed */}
            <span
              style={{
                fontSize: '18px',
                fontWeight: '900',
                letterSpacing: '-0.03em',
                display: 'flex',
                alignItems: 'baseline',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? '0px' : '200px',
                transition: 'opacity 200ms ease, max-width 300ms ease',
              }}
            >
              <span style={{ color: 'var(--text-primary)' }}>EDU</span>
              <span style={{ color: 'var(--indigo-light)' }}>ING</span>
              <span style={{ color: 'var(--indigo-light)', fontSize: '12px', fontWeight: '700', marginLeft: '1px' }}>.in</span>
            </span>
          </Link>

          {/* "UNIVERSITY PORTAL" subtitle — hidden when collapsed */}
          <div
            style={{
              marginTop: '4px',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity: collapsed ? 0 : 1,
              maxHeight: collapsed ? '0px' : '20px',
              transition: 'opacity 200ms ease, max-height 300ms ease',
            }}
          >
            University Portal
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '10px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.filter(item => !item.requiredPermission || hasPermission(item.requiredPermission)).map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

            const navLink = (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '9px 0' : '9px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '2px',
                    cursor: 'pointer',
                    background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                    border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                    color: active ? 'var(--indigo-light)' : 'var(--text-secondary)',
                    fontSize: '13.5px',
                    fontWeight: active ? '600' : '400',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-card-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  <item.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  {/* Label — animates out when collapsed */}
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      opacity: collapsed ? 0 : 1,
                      maxWidth: collapsed ? '0px' : '200px',
                      transition: 'opacity 180ms ease, max-width 300ms ease',
                    }}
                  >
                    {item.label}
                  </span>
                  {active && !collapsed && (
                    <ChevronRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                  )}
                </motion.div>
              </Link>
            )

            return collapsed
              ? <NavTooltip key={item.href} label={item.label} sidebarWidth={sidebarWidth}>{navLink}</NavTooltip>
              : <span key={item.href}>{navLink}</span>
          })}
        </nav>

        {/* ── Bottom account card ── */}
        <div
          ref={accountRef}
          style={{
            padding: collapsed ? '10px 4px' : '10px',
            borderTop: '1px solid var(--border)',
            position: 'relative',
            flexShrink: 0,
            transition: 'padding 300ms ease',
          }}
        >
          <AnimatePresence>
            {accountOpen && (
              <AccountDropdown
                uniData={uniData}
                name={name}
                initial={initial}
                onClose={() => setAccountOpen(false)}
                onLogout={handleLogout}
              />
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAccountOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={accountOpen}
            aria-label="Account menu"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? '0' : '10px',
              padding: collapsed ? '10px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '12px',
              background: accountOpen ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)',
              border: accountOpen ? '1px solid rgba(99,102,241,0.30)' : '1px solid rgba(99,102,241,0.12)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {/* Avatar */}
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, var(--indigo), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white', overflow: 'hidden' }}>
              {uniData?.logoURL
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={uniData.logoURL as string} alt="University logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial}
            </div>
            {/* Name + status — hidden when collapsed */}
            <div style={{ flex: 1, overflow: 'hidden', opacity: collapsed ? 0 : 1, maxWidth: collapsed ? '0px' : '200px', transition: 'opacity 180ms ease, max-width 300ms ease' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name.length > 16 ? name.substring(0, 16) + '…' : name}
              </div>
              <div style={{ fontSize: '11px', color: uniData?.isVerified ? 'var(--green)' : 'var(--gold)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: uniData?.isVerified ? 'var(--green)' : 'var(--gold)', display: 'inline-block', flexShrink: 0 }} />
                {uniData?.isVerified ? 'Verified' : 'Pending'}
              </div>
            </div>
            {/* Chevron — hidden when collapsed */}
            <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: accountOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', opacity: collapsed ? 0 : 1, maxWidth: collapsed ? '0px' : '20px' }} />
          </motion.button>
        </div>

        {/* ── Toggle button — chevron pinned to right edge at vertical center ── */}
        <button
          id="sidebar-toggle-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 60,
            color: 'var(--text-muted)',
            transition: 'background 0.15s, box-shadow 0.15s, color 0.15s',
            padding: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--indigo)'
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-elevated)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      {/* ════════════════════ MAIN CONTENT ════════════════════ */}
      <div
        style={{
          flex: 1,
          marginLeft: `${sidebarWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 300ms ease',
        }}
      >
        {/* Topbar */}
        <header style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>

            {/* Topbar University Name / Shimmer / Warning Pill */}
            {uniData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', background: 'var(--bg-card-hover)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '14px' }}>🏢</span>
                <span>{name}</span>
              </div>
            ) : showWarning && uniError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--red)', background: 'rgba(220,38,38,0.08)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(220,38,38,0.2)' }}>
                <span>⚠️</span>
                <span>{uniError}</span>
              </div>
            ) : (
              <div style={{ width: '120px', height: '22px', borderRadius: '12px', background: 'var(--bg-card-hover)', opacity: 0.6, animation: 'pulse 1.5s infinite ease-in-out' }} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeToggle />
            <NotificationBell />
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white', overflow: 'hidden', border: '2px solid var(--border)' }}>
              {uniData?.logoURL
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={uniData.logoURL as string} alt="University logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global AI Copilot */}
      <AICopilot />
    </div>
  )
}
