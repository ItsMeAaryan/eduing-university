'use client'

import React, { useState, useRef, useCallback } from 'react'
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
  ChevronUp,
  ChevronDown,
  Check,
  Shield,
  UserSquare,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const navGroups = [
  {
    label: 'Core',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: UserSquare, label: 'Students', href: '/students' },
      { icon: FileText, label: 'Applications', href: '/applications' },
    ],
  },
  {
    label: 'Management',
    items: [
      { icon: BookOpen, label: 'Programs', href: '/programs' },
      { icon: GraduationCap, label: 'Exams', href: '/exams' },
      { icon: Users, label: 'Seat Allocation', href: '/seats' },
      { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Settings, label: 'Settings', href: '/settings' },
      { icon: Shield, label: 'Audit Logs', href: '/audit', requiredPermission: 'view_audit_logs' as const },
    ],
  },
]

const THEME_OPTIONS = [
  { id: 'light' as const, icon: Sun, label: 'Light' },
  { id: 'dark' as const, icon: Moon, label: 'Dark' },
  { id: 'system' as const, icon: Monitor, label: 'System' },
]

// ─── Account Dropdown ─────────────────────────────────────────────────────────

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

  const navigate = (href: string) => { router.push(href); onClose() }

  const item: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '400',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    transition: 'background 0.1s ease, color 0.1s ease',
    fontFamily: 'inherit',
  }

  const hover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'var(--bg-card-hover)'
    e.currentTarget.style.color = 'var(--text-primary)'
  }
  const unhover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = 'var(--text-secondary)'
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={onClose} aria-hidden="true" />
      <motion.div
        role="menu"
        aria-label="Account menu"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '8px',
          right: '8px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          boxShadow: 'var(--shadow-dropdown)',
          zIndex: 99,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '6px', flexShrink: 0,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700', color: 'white',
          }}>
            {initial}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: '11px', color: isVerified ? 'var(--green)' : 'var(--gold)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isVerified ? 'var(--green)' : 'var(--gold)', display: 'inline-block', flexShrink: 0 }} />
              {isVerified ? 'Verified' : 'Pending verification'}
            </div>
          </div>
        </div>

        <div style={{ padding: '4px' }}>
          {/* Nav items */}
          {[
            { emoji: '🏢', label: 'University Profile', href: '/profile' },
            { emoji: '⚙️', label: 'Settings', href: '/settings' },
          ].map(({ emoji, label, href }) => (
            <button key={href} onClick={() => navigate(href)} style={item} onMouseEnter={hover} onMouseLeave={unhover}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Appearance submenu */}
          <button
            onClick={() => setAppearanceOpen(v => !v)}
            style={{ ...item, justifyContent: 'space-between' }}
            onMouseEnter={hover}
            onMouseLeave={unhover}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>🎨</span>
              <span>Appearance</span>
            </div>
            <ChevronDown
              size={12}
              style={{
                color: 'var(--text-muted)',
                transform: appearanceOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          <AnimatePresence>
            {appearanceOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingLeft: '12px', paddingBottom: '2px' }}>
                  {THEME_OPTIONS.map(({ id, icon: Icon, label }) => {
                    const isActive = theme === id
                    return (
                      <button
                        key={id}
                        onClick={() => { setTheme(id); onClose() }}
                        style={{
                          ...item,
                          justifyContent: 'space-between',
                          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: isActive ? '500' : '400',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={13} />
                          <span>{label}</span>
                        </div>
                        {isActive && <Check size={12} style={{ color: 'var(--accent)' }} />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          <button onClick={onClose} style={item} onMouseEnter={hover} onMouseLeave={unhover}>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>❓</span>
            <span>Help & Support</span>
          </button>
          <button onClick={onClose} style={item} onMouseEnter={hover} onMouseLeave={unhover}>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>📄</span>
            <span>Documentation</span>
          </button>

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          <button
            onClick={onLogout}
            style={{ ...item, color: 'var(--red)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={13} style={{ flexShrink: 0 }} />
            <span>Log out</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

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
        width: '232px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '16px 14px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Image
            src="/bandwlogo.PNG"
            alt="EDUING Logo"
            width={26}
            height={26}
            style={{
              width: '26px',
              height: '26px',
              objectFit: 'contain',
              filter: resolvedTheme === 'dark' ? 'invert(1)' : 'none',
              transition: 'filter 180ms ease',
              opacity: resolvedTheme === 'dark' ? 0.85 : 1,
            }}
          />
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: '-0.5px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '1px',
          }}>
            <span style={{ color: 'var(--text-primary)' }}>EDU</span>
            <span style={{ color: 'var(--accent)' }}>ING</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '500', marginLeft: '1px' }}>.in</span>
          </div>
        </Link>
        <div style={{
          marginTop: '6px',
          fontSize: '10px',
          fontWeight: '500',
          letterSpacing: '0.08em',
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          paddingLeft: '35px',
        }}>
          University Portal
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '6px 6px', overflowY: 'auto' }}>
        {navGroups.map((group) => {
          const visible = group.items.filter(item =>
            !item.requiredPermission || hasPermission(item.requiredPermission as Parameters<typeof hasPermission>[0])
          )
          if (visible.length === 0) return null

          return (
            <div key={group.label} style={{ marginBottom: '4px' }}>
              {/* Group label */}
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                padding: '8px 10px 4px',
              }}>
                {group.label}
              </div>

              {visible.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: 'none',
                      background: isActive ? 'var(--sidebar-active-bg)' : undefined,
                      border: isActive ? '1px solid var(--sidebar-active-border)' : '1px solid transparent',
                    }}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-100 mb-0.5 group',
                      isActive
                        ? 'text-[var(--sidebar-active-text)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                    )}
                  >
                    <item.icon
                      size={14}
                      strokeWidth={isActive ? 2 : 1.75}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isActive ? '500' : '400',
                      flex: 1,
                      letterSpacing: '-0.1px',
                    }}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Account */}
      <div
        ref={accountRef}
        style={{
          padding: '8px',
          borderTop: '1px solid var(--border)',
          position: 'relative',
          flexShrink: 0,
        }}
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

        <button
          onClick={() => setAccountOpen(v => !v)}
          aria-haspopup="true"
          aria-expanded={accountOpen}
          aria-label="Account menu"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: accountOpen ? 'var(--bg-card-hover)' : 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.1s ease, border-color 0.1s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            if (!accountOpen) e.currentTarget.style.background = 'var(--bg-card-hover)'
          }}
          onMouseLeave={e => {
            if (!accountOpen) e.currentTarget.style.background = 'transparent'
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '700', color: 'white',
          }}>
            {initial}
          </div>

          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.1px',
            }}>
              {name.length > 18 ? name.substring(0, 18) + '…' : name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
              Admin
            </div>
          </div>

          <ChevronUp
            size={12}
            style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              transform: accountOpen ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.15s',
            }}
          />
        </button>
      </div>
    </aside>
  )
}