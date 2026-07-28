'use client'

import React from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { getProgramDistribution, getConversionFunnel } from '@/lib/analytics'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const FunnelChart = dynamic(() => import('recharts').then(mod => mod.FunnelChart), { ssr: false })
const Funnel = dynamic(() => import('recharts').then(mod => mod.Funnel), { ssr: false })
const LabelList = dynamic(() => import('recharts').then(mod => mod.LabelList), { ssr: false })

export default function AdmissionsAnalytics() {
  const { apps, programs, loading, error } = useAnalytics()
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

  const programData = getProgramDistribution(apps, programs)
  const funnelData = getConversionFunnel(apps)

  const isLight = resolvedTheme === 'light'
  const axisStroke  = isLight ? 'rgba(0,0,0,0.30)'  : 'rgba(255,255,255,0.30)'
  const gridStroke  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'

  const handleExport = () => {
    exportToCSV(programData, 'Admissions_By_Program')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Admissions Analytics</h1>
          <p className="text-text-secondary text-sm">Deep dive into application funnels and program demand</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export Data
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Programs Chart */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Demand by Program</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={true} vertical={false} />
                <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={150} />
                <Tooltip 
                  cursor={{ fill: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Application Conversion Funnel</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Funnel
                  dataKey="count"
                  data={funnelData}
                  isAnimationActive
                  fill="#4F46E5"
                >
                  <LabelList position="right" fill="#fff" stroke="none" dataKey="stage" />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="count" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
