'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import type { AppTheme } from '@/context/ThemeContext'

const OPTIONS: { value: AppTheme; label: string; icon: React.ElementType }[] = [
  { value: 'light',  label: 'Light',  icon: Sun     },
  { value: 'dark',   label: 'Dark',   icon: Moon    },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Avoid hydration mismatch — render nothing until client-side
  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true) 
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!mounted) return null

  // Icon to show in the trigger button = current resolved theme
  const TriggerIcon = resolvedTheme === 'light' ? Sun : Moon

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        id="theme-toggle-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle theme"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--border-hover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        <TriggerIcon size={16} />
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="listbox"
              aria-label="Select theme"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 10px)',
                width: '180px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(99,102,241,0.06)',
                zIndex: 50,
                padding: '6px',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                padding: '4px 10px 8px',
              }}>
                Appearance
              </div>

              {OPTIONS.map(({ value, label, icon: Icon }) => {
                const isActive = theme === value
                return (
                  <button
                    key={value}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { setTheme(value); setOpen(false) }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'rgba(99,102,241,0.10)' : 'transparent',
                      border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                      color: isActive ? 'var(--indigo-light)' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: isActive ? '600' : '400',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {isActive && <Check size={13} style={{ flexShrink: 0 }} />}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
