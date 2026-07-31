'use client'

import React from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { getStaffProductivity } from '@/lib/analytics'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, Activity, ShieldCheck } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '7px' }}>
        <Icon size={13} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>{title}</h3>
      </div>
      <div style={{ padding: '16px', height: '320px' }}>{children}</div>
    </div>
  )
}

export default function StaffAnalytics() {
  const { auditLogs, staff, loading, error } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const isLight = resolvedTheme === 'light'
  const axisStroke = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
  const gridStroke = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
  const tipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--red)' }}><AlertCircle size={32} /><p style={{ fontSize: '14px' }}>{error}</p></div>

  const staffData = getStaffProductivity(auditLogs, staff)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Productivity</h1>
          <p className="page-subtitle">Team activity and operational efficiency</p>
        </div>
        <button onClick={() => exportToCSV(staffData, 'Staff_Productivity')} className="btn-secondary" style={{ gap: '6px' }}>
          <Download size={13} /> Export
        </button>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <ChartCard title="Total Actions by Staff" icon={Activity}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffData.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal vertical={false} />
              <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={120} />
              <Tooltip cursor={{ fill: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} contentStyle={tipStyle} />
              <Bar dataKey="actions" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={20} name="Actions" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verifications & Reviews" icon={ShieldCheck}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffData.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal vertical={false} />
              <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={120} />
              <Tooltip cursor={{ fill: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} contentStyle={tipStyle} />
              <Bar dataKey="reviews" fill="#1AAE39" radius={[0, 4, 4, 0]} barSize={20} name="Reviews" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff member</th>
              <th>Role</th>
              <th style={{ textAlign: 'right' }}>Total actions</th>
              <th style={{ textAlign: 'right' }}>Verifications</th>
            </tr>
          </thead>
          <tbody>
            {staffData.map(member => (
              <tr key={member.name}>
                <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{member.name}</td>
                <td style={{ textTransform: 'capitalize' }}>{member.role.replace(/_/g, ' ')}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '13px' }}>{member.actions}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: 'var(--green)', fontWeight: '600' }}>{member.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}