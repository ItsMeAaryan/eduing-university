'use client'

import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { Search } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'

export default function Navbar() {
  const { userData } = useAuth()

  const name = userData?.name || 'Admin User'
  const initial = name.charAt(0).toUpperCase()

  return (
    <header
      style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Search bar */}
      <div style={{ position: 'relative', width: '280px' }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '11px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search applications, students…"
          aria-label="Search"
          style={{
            width: '100%',
            padding: '7px 12px 7px 32px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '9px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Theme quick toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

        {/* User identity — initials avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: 1,
              margin: 0,
              whiteSpace: 'nowrap',
              maxWidth: '160px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {name}
            </p>
            <p style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              marginTop: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: '600',
            }}>
              University Admin
            </p>
          </div>
          {/* Initials avatar — matches sidebar */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, var(--indigo), #7C3AED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '800',
            color: 'white',
            flexShrink: 0,
            border: '1.5px solid rgba(99,102,241,0.3)',
          }}>
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}
