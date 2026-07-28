'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, TrendingUp, Users, DollarSign, Activity } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnalyticsProvider } from '@/context/AnalyticsContext'
import RouteGuard from '@/components/guards/RouteGuard'

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/analytics', label: 'Executive', icon: LayoutDashboard },
    { href: '/analytics/admissions', label: 'Admissions', icon: TrendingUp },
    { href: '/analytics/financial', label: 'Financial', icon: DollarSign },
    { href: '/analytics/students', label: 'Students', icon: Users },
    { href: '/analytics/staff', label: 'Staff', icon: Activity }
  ]

  return (
    <RouteGuard require="view_reports">
      <AnalyticsProvider>
        <div className="flex h-screen bg-brand-background overflow-hidden relative">
          
          {/* Sub-Navigation Sidebar */}
          <div className="w-64 bg-brand-surface border-r border-brand-border flex flex-col shrink-0 py-6">
            <div className="px-6 mb-8">
              <h1 className="text-xl font-bold text-white mb-2">Business Intelligence</h1>
              <p className="text-xs text-text-muted">Enterprise reports & analytics</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
              {tabs.map(tab => {
                const isActive = pathname === tab.href
                return (
                  <Link 
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                      isActive ? 'text-white bg-white/5' : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={18} className={isActive ? 'text-brand-primary' : 'text-text-muted'} />
                    {tab.label}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-primary rounded-r-full"
                      />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

        </div>
      </AnalyticsProvider>
    </RouteGuard>
  )
}
