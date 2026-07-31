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
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div style={{ position: 'relative', width: '260px' }}>
        <Search
          size={13}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-faint)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search applications, students…"
          aria-label="Search"
          style={{
            width: '100%',
            padding: '6px 11px 6px 30px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
            fontFamily: 'inherit',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ThemeToggle />
        <NotificationBell />

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 4px' }} />

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              margin: 0,
              whiteSpace: 'nowrap',
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.1px',
            }}>
              {name}
            </p>
            <p style={{
              fontSize: '10px',
              color: 'var(--text-faint)',
              marginTop: '1px',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: '500',
            }}>
              University Admin
            </p>
          </div>
          {/* Avatar */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            color: 'white',
            flexShrink: 0,
          }}>
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}