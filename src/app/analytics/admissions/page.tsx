'use client'

import React from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { getProgramDistribution, getConversionFunnel } from '@/lib/analytics'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const FunnelChart = dynamic(() => import('recharts').then(m => m.FunnelChart), { ssr: false })
const Funnel = dynamic(() => import('recharts').then(m => m.Funnel), { ssr: false })
const LabelList = dynamic(() => import('recharts').then(m => m.LabelList), { ssr: false })

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>{title}</h3>
      </div>
      <div style={{ padding: '16px', height: '340px', width: '100%', minHeight: '340px', position: 'relative' }}>{children}</div>
    </div>
  )
}

export default function AdmissionsAnalytics() {
  const { apps, programs, loading, error, permissionDenied } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const isLight = resolvedTheme === 'light'
  const axisStroke = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
  const gridStroke = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
  const tipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--red)' }}><AlertCircle size={32} /><p style={{ fontSize: '14px' }}>Failed to load: {error}</p></div>

  const programData = getProgramDistribution(apps, programs)
  const funnelData = getConversionFunnel(apps)

  return (
    <div>
      {(permissionDenied || apps.length === 0) && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
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
          <h1 className="page-title">Admissions Analytics</h1>
          <p className="page-subtitle">Application funnels and program demand</p>
        </div>
        <button onClick={() => exportToCSV(programData, 'Admissions_By_Program')} className="btn-secondary" style={{ gap: '6px' }}>
          <Download size={13} /> Export
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Demand by Program">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
            <BarChart data={programData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal vertical={false} />
              <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={140} />
              <Tooltip cursor={{ fill: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} contentStyle={tipStyle} />
              <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversion Funnel">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
            <FunnelChart>
              <Tooltip contentStyle={tipStyle} />
              <Funnel dataKey="count" data={funnelData} isAnimationActive fill="var(--accent)">
                <LabelList position="right" fill="var(--text-secondary)" stroke="none" dataKey="stage" style={{ fontSize: '11px' }} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="count" style={{ fontSize: '11px', fontWeight: '600' }} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}