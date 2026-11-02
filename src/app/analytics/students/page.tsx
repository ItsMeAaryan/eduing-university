// ─── analytics/students/page.tsx ──────────────────────────────────────────────
// Copy this file to src/app/analytics/students/page.tsx

'use client'

import React, { useMemo } from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, Users, MapPin } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })

// One colour per stage, so the same status always looks the same
const STATUS_COLORS: Record<string, string> = {
  submitted: '#745CF5', under_review: '#D97706', docs_verified: '#4B2FC9', waitlisted: '#EA580C',
  selected: '#16A373', allotted: '#16A373', seat_accepted: '#14B8A6', fee_paid: '#0EA5E9',
  payment_verified: '#0284C7', enrolled: '#047857', rejected: '#DC2626', offer_declined: '#8C8C85', withdrawn: '#A8A29E',
}

function ChartCard({ title, icon: Icon, children, span2 }: { title: string; icon?: React.ElementType; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '14px',
      overflow: 'hidden', boxShadow: 'var(--shadow-card)',
      gridColumn: span2 ? 'span 2' : undefined,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '7px' }}>
        {Icon && <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>{title}</h3>
      </div>
      <div style={{ padding: '16px', height: '300px', width: '100%', minHeight: '300px', position: 'relative' }}>{children}</div>
    </div>
  )
}

export default function StudentAnalytics() {
  const { apps, loading, error, permissionDenied } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const isLight = resolvedTheme === 'light'
  const axisStroke = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
  const gridStroke = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
  const tipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }

  const data = useMemo(() => {
    const geo: Record<string, number> = {}
    const status: Record<string, number> = {}
    apps.forEach(app => {
      const p = (app.studentProfile ?? {}) as Record<string, string>
      const state = p.state || p.domicileState || p.city || 'Not shared yet'
      geo[state as string] = (geo[state as string] || 0) + 1
      const s = (app.status as string) || 'unknown'
      status[s] = (status[s] || 0) + 1
    })
    return {
      geoChart: Object.entries(geo).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      // colours live on the data: <Cell> loaded through next/dynamic is ignored by recharts (slices came out grey)
      statusChart: Object.entries(status)
        .map(([key, value]) => ({ name: key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), value, fill: STATUS_COLORS[key] ?? '#8C8C85' }))
        .sort((a, b) => b.value - a.value),
    }
  }, [apps])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--red)' }}><AlertCircle size={32} /><p style={{ fontSize: '14px' }}>{error}</p></div>

  return (
    <div>
      {(permissionDenied || apps.length === 0) && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={15} style={{ color: 'var(--text-muted)' }} />
          <span>Live data unavailable — showing empty state.</span>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Analytics</h1>
          <p className="page-subtitle">Demographics and lifecycle distribution</p>
        </div>
        <button onClick={() => exportToCSV(data.geoChart, 'Student_Demographics')} className="btn-secondary" style={{ gap: '6px' }}>
          <Download size={13} /> Export
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Geographic Distribution" icon={MapPin}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
            <BarChart data={data.geoChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lifecycle Status" icon={Users}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
            <PieChart>
              <Pie data={data.statusChart} cx="50%" cy="44%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none" />
              <Tooltip contentStyle={tipStyle} />
              <Legend verticalAlign="bottom" height={32} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>


      </div>
    </div>
  )
}