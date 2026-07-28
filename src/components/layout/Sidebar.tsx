'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  BarChart3, 
  GraduationCap, 
  Users, 
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',      href: '/dashboard' },
  { icon: FileText,        label: 'Applications',   href: '/applications' },
  { icon: BookOpen,        label: 'Programs',        href: '/programs' },
  { icon: GraduationCap,  label: 'Exams',           href: '/exams' },
  { icon: Users,           label: 'Seat Allocation', href: '/seats' },
  { icon: BarChart3,       label: 'Analytics',       href: '/analytics' },
  { icon: Settings,        label: 'Settings',        href: '/settings' },
  { icon: Shield,          label: 'Audit Logs',      href: '/audit', requiredPermission: 'view_audit_logs' },
]

const THEME_OPTIONS = [
  { id: 'light' as const,  icon: Sun,     label: 'Light'  },
  { id: 'dark' as const,   icon: Moon,    label: 'Dark'   },
  { id: 'system' as const, icon: Monitor, label: 'System' },
]

// ─── Account Dropdown ────────────────────────────────────────────────────────
interface AccountDropdownProps {
  name: string
  initial: string
  isVerified?: boolean
  onClose: () => void
  onLogout: () => void
}

function AccountDropdown({ name, initial, isVerified, onClose, onLogout }: AccountDropdownProps) {
  const { theme, setTheme } = useTheme()
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const itemStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    transition: 'all 0.12s',
  }

  const navigate = (href: string) => { router.push(href); onClose() }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={onClose} aria-hidden="true" />
      <motion.div
        role="menu"
        aria-label="Account menu"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '10px',
          right: '10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.20), 0 0 0 1px rgba(99,102,241,0.06)',
          zIndex: 99,
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Mini header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--indigo), #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: '800', color: 'white',
          }}>
            {initial}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: '11px', color: isVerified ? 'var(--green)' : 'var(--gold)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isVerified ? 'var(--green)' : 'var(--gold)', display: 'inline-block' }} />
              {isVerified ? 'Verified University' : 'Pending Verification'}
            </div>
          </div>
        </div>

        <div style={{ padding: '6px' }}>
          {/* Profile */}
          <DropdownItem icon="🏢" label="University Profile" sub="View and edit profile" onClick={() => navigate('/profile')} style={itemStyle} />
          {/* Settings */}
          <DropdownItem icon="⚙️" label="Account Settings" sub="Manage account" onClick={() => navigate('/settings')} style={itemStyle} />

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Appearance */}
          <div>
            <button
              onClick={() => setAppearanceOpen(v => !v)}
              style={{ ...itemStyle, justifyContent: 'space-between' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px' }}>🎨</span>
                <span>Appearance</span>
              </div>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: appearanceOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            <AnimatePresence>
              {appearanceOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingLeft: '14px', paddingBottom: '4px' }}>
                    {THEME_OPTIONS.map(({ id, icon: Icon, label }) => {
                      const isActive = theme === id
                      return (
                        <button
                          key={id}
                          onClick={() => { setTheme(id); onClose() }}
                          style={{ ...itemStyle, color: isActive ? 'var(--indigo-light)' : 'var(--text-muted)', fontWeight: isActive ? '600' : '400', justifyContent: 'space-between' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon size={14} />
                            <span>{label}</span>
                          </div>
                          {isActive && <Check size={13} style={{ color: 'var(--indigo-light)' }} />}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification */}
          <DropdownItem icon="🔔" label="Notification Settings" onClick={() => navigate('/settings')} style={itemStyle} />
          {/* Security */}
          <DropdownItem icon="🔐" label="Security" sub="Password · Sessions" onClick={() => navigate('/settings')} style={itemStyle} />

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          <DropdownItem icon="❓" label="Help & Support" onClick={onClose} style={itemStyle} />
          <DropdownItem icon="📄" label="Documentation" onClick={onClose} style={itemStyle} />

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{ ...itemStyle, color: 'var(--red)' }}
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

function DropdownItem({ icon, label, sub, onClick, style }: {
  icon: string; label: string; sub?: string; onClick: () => void; style: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'inherit', lineHeight: 1.2 }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </button>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const { userData, hasPermission } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const name = (userData?.name as string | undefined) || 'University'
  const initial = name.charAt(0).toUpperCase()

  const handleLogout = useCallback(async () => {
    await auth.signOut()
    window.location.href = 'https://www.eduing.in'
  }, [])

  return (
    <aside
      style={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        left: 0, top: 0,
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image
            src="/bandwlogo.PNG"
            alt="EDUING Logo"
            width={30}
            height={30}
            style={{
              objectFit: 'contain',
              filter: resolvedTheme === 'dark' ? 'invert(1)' : 'none',
              transition: 'filter 200ms ease',
            }}
          />
          <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.03em', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--text-primary)' }}>EDU</span>
            <span style={{ color: 'var(--indigo-light)' }}>ING</span>
            <span style={{ color: 'var(--indigo-light)', fontSize: '12px', fontWeight: '700', marginLeft: '1px' }}>.in</span>
          </div>
        </Link>
        <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          University Portal
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
        {navItems.filter(item => !item.requiredPermission || hasPermission(item.requiredPermission as any)).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative mb-0.5',
                isActive
                  ? 'bg-[rgba(99,102,241,0.12)] text-[var(--indigo-light)] border border-[rgba(99,102,241,0.25)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-transparent'
              )}
              style={{ textDecoration: 'none' }}
            >
              <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13.5px', fontWeight: isActive ? '600' : '400' }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{
                  position: 'absolute', right: '10px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--indigo-light)',
                  boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom Account Card ── */}
      <div
        ref={accountRef}
        style={{ padding: '10px', borderTop: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}
      >
        <AnimatePresence>
          {accountOpen && (
            <AccountDropdown
              name={name}
              initial={initial}
              isVerified={!!(userData as unknown as Record<string, unknown>)?.isVerified}
              onClose={() => setAccountOpen(false)}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>

        {/* Account trigger */}
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
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: accountOpen ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)',
            border: accountOpen ? '1px solid rgba(99,102,241,0.30)' : '1px solid rgba(99,102,241,0.12)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--indigo), #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: '800', color: 'white',
          }}>
            {initial}
          </div>

          {/* Info */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name.length > 16 ? name.substring(0, 16) + '…' : name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
              Admin
            </div>
          </div>

          {/* Arrow */}
          <ChevronUp
            size={14}
            style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              transform: accountOpen ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s',
            }}
          />
        </motion.button>
      </div>
    </aside>
  )
}
