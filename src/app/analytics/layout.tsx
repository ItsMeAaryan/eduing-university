'use client'

import React from 'react'
import { LayoutDashboard, TrendingUp, Users, DollarSign, Activity } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnalyticsProvider } from '@/context/AnalyticsContext'
import RouteGuard from '@/components/guards/RouteGuard'

const tabs = [
  { href: '/analytics', label: 'Executive', icon: LayoutDashboard },
  { href: '/analytics/admissions', label: 'Admissions', icon: TrendingUp },
  { href: '/analytics/financial', label: 'Financial', icon: DollarSign },
  { href: '/analytics/students', label: 'Students', icon: Users },
  { href: '/analytics/staff', label: 'Staff', icon: Activity },
]

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <RouteGuard require="view_reports">
      <AnalyticsProvider>
        {/* Sub-nav — horizontal tab strip, not a second sidebar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '24px',
        }}>
          {tabs.map(tab => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: '-1px',
                  textDecoration: 'none',
                  transition: 'color 0.1s, border-color 0.1s',
                  whiteSpace: 'nowrap',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </Link>
            )
          })}
        </div>

        {children}
      </AnalyticsProvider>
    </RouteGuard>
  )
}