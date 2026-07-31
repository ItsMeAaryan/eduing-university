'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import { subscribeToUniversity, updateUniversityProfile } from '@/lib/firebase/university'
import { sendPasswordResetEmail } from 'firebase/auth'
import { User, Bell, ShieldAlert, Key, Mail, ChevronRight, Palette, Sun, Moon, Monitor, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/Toast'
import { useTheme } from 'next-themes'
import type { AppTheme } from '@/context/ThemeContext'
import { THEMES } from '@/context/ThemeContext'

const THEME_ICONS: Record<AppTheme, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, iconColor, title, subtitle, children }: {
  icon: React.ElementType
  iconColor: string
  title: string
  subtitle: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${iconColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={iconColor} />
        </div>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>{title}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function ToggleRow({ label, description, isActive, onToggle }: {
  label: string; description: string; isActive: boolean; onToggle: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isActive}
        aria-label={label}
        style={{
          width: '40px', height: '22px', borderRadius: '999px', flexShrink: 0,
          background: isActive ? 'var(--accent)' : 'var(--border-hover)',
          border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
        }}
      >
        <motion.div
          animate={{ x: isActive ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
        />
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState({
    newApplicationAlerts: true,
    statusUpdateNotifications: true,
    deadlineReminders: true,
  })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        const unsubUni = subscribeToUniversity(user.uid, data => {
          if (data.settings) setSettings(data.settings as typeof settings)
          setLoading(false)
        })
        return () => unsubUni()
      }
    })
    return () => unsub()
  }, [])

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser!.email!)
      toast.success('Password reset email sent')
    } catch {
      toast.error('Failed to send reset email')
    }
  }

  const toggleSetting = async (key: keyof typeof settings) => {
    const prev = settings
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try {
      await updateUniversityProfile(auth.currentUser!.uid, { settings: next })
    } catch {
      setSettings(prev)
      toast.error('Failed to update setting')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ maxWidth: '640px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account, appearance, and notifications</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Appearance */}
        <Section icon={Palette} iconColor="var(--accent)" title="Appearance" subtitle="Choose how the portal looks">
          <div style={{ padding: '16px 20px' }}>
            <div className="text-eyebrow" style={{ marginBottom: '10px' }}>Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {THEMES.map(({ value, label, description }) => {
                const isActive = mounted && theme === value
                const Icon = THEME_ICONS[value]
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    style={{
                      position: 'relative',
                      padding: '14px',
                      borderRadius: '8px',
                      background: isActive ? 'var(--accent-bg)' : 'var(--bg)',
                      border: isActive ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    {isActive && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={10} color="white" />
                      </div>
                    )}
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: isActive ? 'var(--accent-bg)' : 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '10px' }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: isActive ? 'var(--accent)' : 'var(--text-primary)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section icon={User} iconColor="var(--accent)" title="Account" subtitle="Manage your login credentials">
          {/* Email */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <div className="text-eyebrow" style={{ marginBottom: '2px' }}>Email address</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{auth.currentUser?.email}</div>
              </div>
            </div>
            <span className="badge badge-success">Verified</span>
          </div>

          {/* Password */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Key size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <div className="text-eyebrow" style={{ marginBottom: '2px' }}>Password</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', letterSpacing: '2px' }}>••••••••</div>
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)', fontFamily: 'inherit', fontWeight: '500' }}
            >
              Change <ChevronRight size={13} />
            </button>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} iconColor="var(--gold)" title="Notifications" subtitle="Control how you receive alerts">
          <ToggleRow
            label="New application alerts"
            description="Get notified when a student applies to your programs"
            isActive={settings.newApplicationAlerts}
            onToggle={() => toggleSetting('newApplicationAlerts')}
          />
          <ToggleRow
            label="Status update confirmations"
            description="Confirmation when you update application statuses"
            isActive={settings.statusUpdateNotifications}
            onToggle={() => toggleSetting('statusUpdateNotifications')}
          />
          <div style={{ borderBottom: 'none' }}>
            <ToggleRow
              label="Deadline reminders"
              description="Alerts for upcoming program application deadlines"
              isActive={settings.deadlineReminders}
              onToggle={() => toggleSetting('deadlineReminders')}
            />
          </div>
        </Section>

        {/* Danger zone */}
        <div style={{
          background: 'rgba(220,38,38,0.04)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert size={15} style={{ color: 'var(--red)' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--red)', letterSpacing: '-0.2px' }}>Danger Zone</div>
              <div style={{ fontSize: '12px', color: 'rgba(220,38,38,0.55)' }}>Destructive account actions</div>
            </div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '3px' }}>Deactivate account</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: 1.5 }}>
                Hides your university from all students and pauses active applications. Contact support to reactivate.
              </div>
            </div>
            <button onClick={() => toast.info('Contact support to deactivate')} className="btn-danger" style={{ flexShrink: 0 }}>
              Deactivate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}