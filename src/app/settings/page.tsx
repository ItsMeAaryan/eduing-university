'use client'

import React, { useState, useEffect } from 'react'
import { auth, storage } from '@/lib/firebase/config'
import { getUniversity, updateUniversityProfile } from '@/lib/firebase/university'
import { sendPasswordResetEmail } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
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
  Check,
  Calendar,
  FileText,
  Upload,
  Sparkles,
  MessageSquare,
  Eye,
  Shield,
  Laptop,
  Smartphone,
  Download,
  Lock,
  Loader2,
  Camera,
  Layers,
  Globe
} from 'lucide-react'
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const ALL_DOCUMENTS = [
  '10th Marksheet',
  '12th Marksheet',
  'Aadhaar Card',
  'Passport Photo',
  'Graduation Marksheet',
  'Transfer Certificate (TC)',
  'Migration Certificate',
  'Category / Caste Certificate',
  'Entrance Exam Scorecard'
]

const COLOR_PRESETS = ['#0075DE', '#1AAE39', '#7C3AED', '#DB2777', '#EA580C', '#0284C7', '#4F46E5']

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, iconColor, title, subtitle, children }: {
  icon: React.ElementType
  iconColor: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${iconColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${iconColor}20` }}>
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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Full Settings State
  const [settings, setSettings] = useState({
    // Notifications
    newApplicationAlerts: true,
    statusUpdateNotifications: true,
    deadlineReminders: true,
    statusChangeAlerts: true,
    newStaffJoinedAlerts: true,

    // Admissions Settings
    academicYearStart: 'July',
    applicationStartDate: '2026-05-01',
    applicationEndDate: '2026-08-31',
    autoCloseDeadline: true,
    maxApplicationsPerStudent: 1,
    allowDocumentUploads: true,
    requiredDocuments: [
      '10th Marksheet',
      '12th Marksheet',
      'Aadhaar Card',
      'Passport Photo'
    ] as string[],

    // Portal Branding
    logoURL: '',
    portalAccentColor: '#0075DE',
    customStudentBanner: 'Admissions open for Academic Year 2026-27! Apply before August 31st.',

    // Communication Settings
    autoReplyEmailTemplate: 'Dear {student_name},\n\nThank you for submitting your application to {university_name}. Your application reference ID is {application_id}. We are currently reviewing your documents.\n\nBest regards,\nAdmissions Office',
    shortlistingEmailTemplate: 'Dear {student_name},\n\nCongratulations! You have been shortlisted for admission at {university_name}. Please log in to your portal to schedule your interview or verification round.\n\nBest regards,\nAdmissions Committee',
    rejectionEmailTemplate: 'Dear {student_name},\n\nThank you for your interest in {university_name}. We regret to inform you that we are unable to offer you admission for this academic session.\n\nBest regards,\nAdmissions Office',

    // Privacy & Visibility
    showInSearch: true,
    showPlacementStatsPublicly: true,
    showFeeStructurePublicly: true,

    // Security
    twoFactorAuth: false,
  })

  // Mock Active Sessions
  const [activeSessions, setActiveSessions] = useState([
    { id: 'sess-1', device: 'MacBook Pro 16"', browser: 'Chrome 122.0', ip: '103.24.12.89', lastActive: 'Active now', current: true },
    { id: 'sess-2', device: 'iPhone 15 Pro', browser: 'Safari 17.2', ip: '103.24.12.90', lastActive: '2 hours ago', current: false },
    { id: 'sess-3', device: 'Windows PC', browser: 'Firefox 123.0', ip: '49.207.54.12', lastActive: 'Yesterday', current: false },
  ])

  // Mock Login Log
  const [loginLogs] = useState([
    { id: 'log-1', timestamp: '2026-08-10 16:30:12', ip: '103.24.12.89', location: 'Bengaluru, IN', device: 'Chrome on macOS' },
    { id: 'log-2', timestamp: '2026-08-09 11:15:45', ip: '103.24.12.89', location: 'Bengaluru, IN', device: 'Safari on iOS' },
    { id: 'log-3', timestamp: '2026-08-08 09:42:10', ip: '49.207.54.12', location: 'New Delhi, IN', device: 'Firefox on Windows' },
    { id: 'log-4', timestamp: '2026-08-07 18:20:01', ip: '103.24.12.89', location: 'Bengaluru, IN', device: 'Chrome on macOS' },
    { id: 'log-5', timestamp: '2026-08-05 14:05:33', ip: '103.24.12.89', location: 'Bengaluru, IN', device: 'Chrome on macOS' },
  ])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const data = await getUniversity(user.uid)
        if (data) {
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }))
          }
          if (data.logoURL) {
            setSettings((prev) => ({ ...prev, logoURL: data.logoURL as string }))
          }
        }
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const persistSettingChange = async (updatedFields: Partial<typeof settings>) => {
    const prev = settings
    const next = { ...settings, ...updatedFields }
    setSettings(next)
    try {
      const uid = auth.currentUser?.uid
      if (uid) {
        await updateUniversityProfile(uid, { settings: next })
      }
    } catch {
      setSettings(prev)
      toast.error('Failed to update setting')
    }
  }

  const toggleSetting = (key: keyof typeof settings) => {
    const val = settings[key]
    if (typeof val === 'boolean') {
      persistSettingChange({ [key]: !val })
    }
  }

  const handlePasswordReset = async () => {
    try {
      if (auth.currentUser?.email) {
        await sendPasswordResetEmail(auth, auth.currentUser.email)
        toast.success('Password reset email sent successfully')
      }
    } catch {
      toast.error('Failed to send reset email')
    }
  }

  // Handle Document Checklist Toggle
  const toggleRequiredDocument = (docName: string) => {
    const current = settings.requiredDocuments || []
    const updated = current.includes(docName)
      ? current.filter((d) => d !== docName)
      : [...current, docName]
    
    persistSettingChange({ requiredDocuments: updated })
  }

  // Handle Logo Upload
  const handleLogoUpload = async (file: File) => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    setUploadingLogo(true)
    try {
      const storageRef = ref(storage, `universities/${uid}/logo/${Date.now()}_${file.name}`)
      const snapshot = await uploadBytes(storageRef, file)
      const url = await getDownloadURL(snapshot.ref)
      
      await updateUniversityProfile(uid, { logoURL: url, settings: { ...settings, logoURL: url } })
      setSettings((prev) => ({ ...prev, logoURL: url }))
      toast.success('Logo updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle Revoke Session
  const revokeSession = (sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
    toast.success('Session revoked successfully')
  }

  // Handle Data Export
  const exportPortalData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      universityUid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      settings,
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `university_portal_export_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success('University portal data exported')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage portal branding, admissions rules, communication templates, and security</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. Admissions Settings */}
        <Section icon={Calendar} iconColor="var(--accent)" title="Admissions Settings" subtitle="Configure application windows, deadlines, and requirements">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Academic Year Start Month</label>
              <select
                className="input-field"
                value={settings.academicYearStart}
                onChange={(e) => persistSettingChange({ academicYearStart: e.target.value })}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Max Applications / Student</label>
              <input
                type="number"
                min={1}
                max={10}
                className="input-field"
                value={settings.maxApplicationsPerStudent}
                onChange={(e) => persistSettingChange({ maxApplicationsPerStudent: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Application Window Start</label>
              <input
                type="date"
                className="input-field"
                value={settings.applicationStartDate}
                onChange={(e) => persistSettingChange({ applicationStartDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Application Window End</label>
              <input
                type="date"
                className="input-field"
                value={settings.applicationEndDate}
                onChange={(e) => persistSettingChange({ applicationEndDate: e.target.value })}
              />
            </div>
          </div>

          <ToggleRow
            label="Auto-close applications after deadline"
            description="Automatically lock new application submissions past the end date"
            isActive={settings.autoCloseDeadline}
            onToggle={() => toggleSetting('autoCloseDeadline')}
          />

          <ToggleRow
            label="Allow student document uploads"
            description="Permit students to attach digital marksheets and certificates during registration"
            isActive={settings.allowDocumentUploads}
            onToggle={() => toggleSetting('allowDocumentUploads')}
          />

          {/* Document Checklist */}
          <div style={{ padding: '16px 20px' }}>
            <div className="text-eyebrow" style={{ marginBottom: '10px' }}>Required Documents Checklist</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {ALL_DOCUMENTS.map((doc) => {
                const isChecked = (settings.requiredDocuments || []).includes(doc)
                return (
                  <button
                    type="button"
                    key={doc}
                    onClick={() => toggleRequiredDocument(doc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: isChecked ? 'var(--accent-bg)' : 'var(--bg)',
                      border: isChecked ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                      fontSize: '12px',
                      color: isChecked ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontWeight: isChecked ? '500' : '400'
                    }}
                  >
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      border: isChecked ? 'none' : '1px solid var(--border-hover)',
                      background: isChecked ? 'var(--accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      {isChecked && <Check size={10} />}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        {/* 2. Portal Branding Section */}
        <Section icon={Sparkles} iconColor="#7C3AED" title="Portal Branding" subtitle="Customize logo, colors, and student listing announcements">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              {settings.logoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoURL} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Sparkles size={24} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div className="text-eyebrow" style={{ marginBottom: '4px' }}>University Logo</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Shown on student portal and offer certificates</p>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} className="btn-secondary">
                <input
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
                {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                <span>{settings.logoURL ? 'Change Logo' : 'Upload Logo'}</span>
              </label>
            </div>
          </div>

          {/* Accent Color */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="text-eyebrow" style={{ marginBottom: '8px' }}>Portal Accent Color</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: settings.portalAccentColor, border: '1px solid var(--border-hover)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100px', fontSize: '12px', fontFamily: 'monospace' }}
                  value={settings.portalAccentColor}
                  onChange={(e) => persistSettingChange({ portalAccentColor: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => persistSettingChange({ portalAccentColor: color })}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: color,
                      border: settings.portalAccentColor === color ? '2px solid white' : 'none',
                      boxShadow: settings.portalAccentColor === color ? '0 0 0 2px var(--accent)' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Custom Student Banner Message */}
          <div style={{ padding: '16px 20px' }}>
            <label className="text-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Custom Student Announcement Banner</label>
            <textarea
              className="input-field"
              rows={2}
              style={{ resize: 'vertical', fontSize: '13px', lineHeight: 1.5 }}
              placeholder="e.g. Admissions open for AY 2026-27..."
              value={settings.customStudentBanner}
              onChange={(e) => persistSettingChange({ customStudentBanner: e.target.value })}
            />
          </div>
        </Section>

        {/* 3. Communication Settings Section */}
        <Section icon={MessageSquare} iconColor="#0284C7" title="Communication Settings" subtitle="Configure automated email templates sent to prospective students">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <label className="text-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>Auto-Reply Email Template (On Application Received)</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Available placeholders: {'{student_name}'}, {'{university_name}'}, {'{application_id}'}</p>
            <textarea
              className="input-field"
              rows={3}
              style={{ resize: 'vertical', fontSize: '12px', fontFamily: 'monospace' }}
              value={settings.autoReplyEmailTemplate}
              onChange={(e) => persistSettingChange({ autoReplyEmailTemplate: e.target.value })}
            />
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <label className="text-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>Shortlisting Email Template</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Sent when an officer updates application status to Shortlisted</p>
            <textarea
              className="input-field"
              rows={3}
              style={{ resize: 'vertical', fontSize: '12px', fontFamily: 'monospace' }}
              value={settings.shortlistingEmailTemplate}
              onChange={(e) => persistSettingChange({ shortlistingEmailTemplate: e.target.value })}
            />
          </div>

          <div style={{ padding: '16px 20px' }}>
            <label className="text-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>Rejection Email Template</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Sent when an application is rejected</p>
            <textarea
              className="input-field"
              rows={3}
              style={{ resize: 'vertical', fontSize: '12px', fontFamily: 'monospace' }}
              value={settings.rejectionEmailTemplate}
              onChange={(e) => persistSettingChange({ rejectionEmailTemplate: e.target.value })}
            />
          </div>
        </Section>

        {/* 4. Privacy & Visibility Section */}
        <Section icon={Eye} iconColor="#1AAE39" title="Privacy & Visibility" subtitle="Control public visibility of your institution and metrics">
          <ToggleRow
            label="Show university in student directory search"
            description="Allows students to discover your portal on the public Eduing marketplace"
            isActive={settings.showInSearch}
            onToggle={() => toggleSetting('showInSearch')}
          />
          <ToggleRow
            label="Show placement stats publicly"
            description="Display highest package and average LPA statistics on your public profile"
            isActive={settings.showPlacementStatsPublicly}
            onToggle={() => toggleSetting('showPlacementStatsPublicly')}
          />
          <div style={{ borderBottom: 'none' }}>
            <ToggleRow
              label="Show fee structure publicly"
              description="Make program tuition fees visible to non-logged in visitors"
              isActive={settings.showFeeStructurePublicly}
              onToggle={() => toggleSetting('showFeeStructurePublicly')}
            />
          </div>
        </Section>

        {/* 5. Security Section */}
        <Section icon={Shield} iconColor="#DC2626" title="Security & Authentication" subtitle="Manage two-factor auth, active login sessions, and audit logs">
          <ToggleRow
            label="Two-factor authentication (2FA)"
            description="Require an OTP code sent to your registered email when logging in"
            isActive={settings.twoFactorAuth}
            onToggle={() => toggleSetting('twoFactorAuth')}
          />

          {/* Active Sessions List */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="text-eyebrow" style={{ marginBottom: '10px' }}>Active Device Sessions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeSessions.map((sess) => (
                <div key={sess.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {sess.device.includes('iPhone') ? <Smartphone size={16} color="var(--text-muted)" /> : <Laptop size={16} color="var(--text-muted)" />}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sess.device}
                        {sess.current && <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>Current</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {sess.browser} • IP: {sess.ip} • {sess.lastActive}
                      </div>
                    </div>
                  </div>

                  {!sess.current && (
                    <button
                      onClick={() => revokeSession(sess.id)}
                      className="btn-secondary"
                      style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Login Activity Log */}
          <div style={{ padding: '16px 20px' }}>
            <div className="text-eyebrow" style={{ marginBottom: '10px' }}>Recent Login Activity (Last 5 Sessions)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 8px' }}>Timestamp</th>
                    <th style={{ padding: '6px 8px' }}>IP Address</th>
                    <th style={{ padding: '6px 8px' }}>Location</th>
                    <th style={{ padding: '6px 8px' }}>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px' }}>{log.timestamp}</td>
                      <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>{log.ip}</td>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{log.location}</td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{log.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* 6. Appearance (Theme) */}
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

        {/* 7. Account Credentials */}
        <Section icon={User} iconColor="var(--accent)" title="Account" subtitle="Manage your login credentials">
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

        {/* 8. Notifications */}
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
          <ToggleRow
            label="Deadline reminders"
            description="Alerts for upcoming program application deadlines"
            isActive={settings.deadlineReminders}
            onToggle={() => toggleSetting('deadlineReminders')}
          />
          <ToggleRow
            label="Application status change alerts"
            description="Receive immediate alerts when an officer changes student status"
            isActive={settings.statusChangeAlerts}
            onToggle={() => toggleSetting('statusChangeAlerts')}
          />
          <div style={{ borderBottom: 'none' }}>
            <ToggleRow
              label="New staff member joined alerts"
              description="Notification when new staff accounts are created or joined"
              isActive={settings.newStaffJoinedAlerts}
              onToggle={() => toggleSetting('newStaffJoinedAlerts')}
            />
          </div>
        </Section>

        {/* 9. Danger zone */}
        <div style={{
          background: 'rgba(220,38,38,0.04)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert size={15} style={{ color: 'var(--red)' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--red)', letterSpacing: '-0.2px' }}>Danger Zone</div>
              <div style={{ fontSize: '12px', color: 'rgba(220,38,38,0.55)' }}>Data exports and account actions</div>
            </div>
          </div>

          {/* Export All Data */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '3px' }}>Export all data</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: 1.5 }}>
                Download a complete JSON backup of your portal settings, branding, and rules.
              </div>
            </div>
            <button
              onClick={exportPortalData}
              className="btn-secondary"
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Export Data
            </button>
          </div>

          {/* Deactivate Account */}
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