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
  ChevronRight 
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/Toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    newApplicationAlerts: true,
    statusUpdateNotifications: true,
    deadlineReminders: true
  })

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
      {/* Account Section */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-brand-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Account Settings</h3>
            <p className="text-xs text-text-muted">Manage your login credentials</p>
          </div>
        </div>
        
        <div className="divide-y divide-white/4">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/3 flex items-center justify-center text-text-muted">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</p>
                <p className="text-sm text-white font-medium">{auth.currentUser?.email}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase text-brand-success bg-brand-success/10 px-2 py-1 rounded">Verified</span>
          </div>

          <div className="p-6 flex items-center justify-between group hover:bg-white/1 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/3 flex items-center justify-center text-text-muted">
                <Key size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Password</p>
                <p className="text-sm text-white font-medium">••••••••••••</p>
              </div>
            </div>
            <button onClick={handlePasswordReset} className="text-sm text-brand-primary font-bold hover:underline flex items-center gap-1">
              Change <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-brand-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Notification Preferences</h3>
            <p className="text-xs text-text-muted">Control how you receive alerts</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
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

      {/* Danger Zone */}
      <section className="bg-brand-error/5 border border-brand-error/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-brand-error/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-error/10 text-brand-error flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-error">Danger Zone</h3>
            <p className="text-xs text-brand-error/60">Destructive actions for your account</p>
          </div>
        </div>
        
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Deactivate University Account</p>
            <p className="text-xs text-text-muted mt-1 max-w-md">
              This will hide your university from all students and pause active applications. 
              You will need to contact support to reactivate.
            </p>
          </div>
          <button 
            onClick={() => toast.info('Contact support to deactivate')}
            className="px-5 py-2.5 rounded-lg border border-brand-error text-brand-error text-xs font-bold hover:bg-brand-error/10 transition-colors"
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
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isActive ? 'bg-brand-primary' : 'bg-white/10'}`}
      >
        <motion.div 
          animate={{ x: isActive ? 26 : 4 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
        />
      </button>
    </div>
  )
}
