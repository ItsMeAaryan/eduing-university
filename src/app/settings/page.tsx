'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import { subscribeToUniversity, updateUniversityProfile } from '@/lib/firebase/university'
import { sendPasswordResetEmail } from 'firebase/auth'
import { 
  User, 
  Bell, 
  ShieldAlert, 
  Key, 
  Mail, 
  ChevronRight,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/Toast'
import { useTheme } from 'next-themes'
import type { AppTheme } from '@/context/ThemeContext'
import { THEMES } from '@/context/ThemeContext'

const THEME_ICONS: Record<AppTheme, React.ElementType> = {
  light:  Sun,
  dark:   Moon,
  system: Monitor,
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState({
    newApplicationAlerts: true,
    statusUpdateNotifications: true,
    deadlineReminders: true
  })

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true) 
  }, [])

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsub = subscribeToUniversity(user.uid, (data) => {
          if (data.settings) setSettings(data.settings as typeof settings)
          setLoading(false)
        })
        return () => unsub()
      }
    })
    return () => unsubscribeAuth()
  }, [])

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser!.email!)
      toast.success('Password reset email sent!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to send reset email')
    }
  }

  const toggleSetting = async (key: keyof typeof settings) => {
    const previous = settings
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    try {
      await updateUniversityProfile(auth.currentUser!.uid, { settings: updated })
    } catch (error) {
      console.error(error)
      setSettings(previous)
      toast.error('Failed to update settings')
    }
  }

  if (loading) return null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold sr-only" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      {/* ── Appearance Section ── */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--indigo-light)',
          }}>
            <Palette size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Appearance
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Choose how the portal looks for you
            </p>
          </div>
        </div>

        {/* Theme cards */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Theme
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {THEMES.map(({ value, label, description, emoji }) => {
              const isActive = mounted && theme === value
              const Icon = THEME_ICONS[value]
              return (
                <motion.button
                  key={value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(value)}
                  style={{
                    position: 'relative',
                    padding: '16px',
                    borderRadius: '12px',
                    background: isActive ? 'rgba(99,102,241,0.08)' : 'var(--bg)',
                    border: isActive
                      ? '1.5px solid rgba(99,102,241,0.4)'
                      : '1.5px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Checkmark */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--indigo)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={12} color="white" />
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? 'var(--indigo-light)' : 'var(--text-muted)',
                    marginBottom: '12px',
                    fontSize: '20px',
                  }}>
                    <Icon size={18} />
                  </div>

                  {/* Label */}
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isActive ? 'var(--indigo-light)' : 'var(--text-primary)',
                    margin: '0 0 4px',
                  }}>
                    {label}
                  </p>

                  {/* Description */}
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}>
                    {description}
                  </p>
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Account Section ── */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--indigo-light)',
          }}>
            <User size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Account Settings
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Manage your login credentials
            </p>
          </div>
        </div>
        
        <div style={{ borderTop: 'none' }}>
          {/* Email row */}
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(99,102,241,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <Mail size={18} />
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                  Email Address
                </p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>
                  {auth.currentUser?.email}
                </p>
              </div>
            </div>
            <span style={{
              fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#16A34A', background: 'rgba(22,163,74,0.10)', padding: '3px 8px', borderRadius: '6px',
            }}>
              Verified
            </span>
          </div>

          {/* Password row */}
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(99,102,241,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <Key size={18} />
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                  Password
                </p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>
                  ••••••••••••
                </p>
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              style={{
                fontSize: '13px', fontWeight: '700',
                color: 'var(--indigo-light)',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              Change <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Notifications Section ── */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(245,158,11,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gold)',
          }}>
            <Bell size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Notification Preferences
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Control how you receive alerts
            </p>
          </div>
        </div>
        
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ToggleItem 
            label="New Application Alerts" 
            description="Get notified when a student applies to your programs"
            isActive={settings.newApplicationAlerts}
            onToggle={() => toggleSetting('newApplicationAlerts')}
          />
          <ToggleItem 
            label="Status Update Notifications" 
            description="Confirmation when you update application statuses"
            isActive={settings.statusUpdateNotifications}
            onToggle={() => toggleSetting('statusUpdateNotifications')}
          />
          <ToggleItem 
            label="Deadline Reminders" 
            description="Alerts for upcoming program application deadlines"
            isActive={settings.deadlineReminders}
            onToggle={() => toggleSetting('deadlineReminders')}
          />
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section
        style={{
          background: 'rgba(220,38,38,0.04)',
          border: '1px solid rgba(220,38,38,0.20)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(220,38,38,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(220,38,38,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--red)',
          }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--red)', margin: 0 }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(220,38,38,0.60)', margin: '2px 0 0' }}>
              Destructive actions for your account
            </p>
          </div>
        </div>
        
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Deactivate University Account
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, maxWidth: '420px' }}>
              This will hide your university from all students and pause active applications.
              You will need to contact support to reactivate.
            </p>
          </div>
          <button 
            onClick={() => toast.info('Contact support to deactivate')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid var(--red)',
              color: 'var(--red)',
              background: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            Deactivate
          </button>
        </div>
      </section>
    </div>
  )
}

function ToggleItem({ label, description, isActive, onToggle }: {
  label: string
  description: string
  isActive: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 3px' }}>
          {label}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {description}
        </p>
      </div>
      <button 
        onClick={onToggle}
        role="switch"
        aria-checked={isActive}
        aria-label={label}
        style={{
          width: '48px', height: '26px', borderRadius: '100px',
          background: isActive ? 'var(--indigo)' : 'var(--border-hover)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <motion.div 
          animate={{ x: isActive ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute',
            top: '3px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}
        />
      </button>
    </div>
  )
}
