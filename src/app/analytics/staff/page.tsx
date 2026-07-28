'use client'

import React from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { getStaffProductivity } from '@/lib/analytics'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, Activity, ShieldCheck } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

export default function StaffAnalytics() {
  const { auditLogs, staff, loading, error } = useAnalytics()
  const { resolvedTheme } = useTheme()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-brand-error flex-col gap-4">
        <AlertCircle size={48} />
        <p>Failed to load analytics: {error}</p>
      </div>
    )
  }

  const staffData = getStaffProductivity(auditLogs, staff)

  const isLight = resolvedTheme === 'light'
  const axisStroke  = isLight ? 'rgba(0,0,0,0.30)'  : 'rgba(255,255,255,0.30)'
  const gridStroke  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'

  const handleExport = () => {
    exportToCSV(staffData, 'Staff_Productivity')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Staff Productivity</h1>
          <p className="text-text-secondary text-sm">Measure team activity and operational efficiency</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export Data
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Total Actions Chart */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity size={18} className="text-brand-primary" /> Total Actions by Staff
          </h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={true} vertical={false} />
                <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="actions" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Total Actions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Reviews Chart */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-success" /> Verification & Status Updates
          </h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={true} vertical={false} />
                <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="reviews" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} name="Review Actions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Raw Data Table */}
      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-black/20">
              <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Staff Member</th>
              <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
              <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total Actions</th>
              <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Verifications/Reviews</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {staffData.map(member => (
              <tr key={member.name} className="hover:bg-white/5 transition-colors">
                <td className="p-4 text-sm font-bold text-white">{member.name}</td>
                <td className="p-4 text-sm text-text-secondary uppercase">{member.role.replace('_', ' ')}</td>
                <td className="p-4 text-sm text-white text-right font-mono">{member.actions}</td>
                <td className="p-4 text-sm text-brand-success text-right font-mono font-bold">{member.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
