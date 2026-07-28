'use client'

import React from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { getExecutiveKPIs, getActivityTrend } from '@/lib/analytics'
import { exportToCSV } from '@/utils/export'
import { FileText, Download, TrendingUp, Users, FileCheck, CheckCircle, Wallet, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

// Lazy load Recharts for performance optimization
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })

export default function ExecutiveDashboard() {
  const { apps, auditLogs, loading, error } = useAnalytics()
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

  const kpis = getExecutiveKPIs(apps)
  const activityData = getActivityTrend(auditLogs)
  const isLight = resolvedTheme === 'light'
  const axisStroke  = isLight ? 'rgba(0,0,0,0.30)'  : 'rgba(255,255,255,0.30)'
  const gridStroke  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
  }

  const handleExport = () => {
    const data = [
      { Metric: 'Total Applications', Value: kpis.totalReceived },
      { Metric: 'Under Review', Value: kpis.underReview },
      { Metric: 'Docs Pending Approval', Value: kpis.docsPending },
      { Metric: 'Offers Issued', Value: kpis.offersIssued },
      { Metric: 'Enrolled Students', Value: kpis.enrolled },
      { Metric: 'Acceptance Rate (%)', Value: kpis.acceptanceRate },
      { Metric: 'Enrollment Rate (%)', Value: kpis.enrollmentRate },
      { Metric: 'Revenue Collected (INR)', Value: kpis.revenueCollected },
      { Metric: 'Pending Revenue (INR)', Value: kpis.pendingRevenue }
    ]
    exportToCSV(data, 'Executive_KPIs')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Executive Dashboard</h1>
          <p className="text-text-secondary text-sm">High-level overview of university performance</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export KPIs
        </button>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Applications" 
          value={kpis.totalReceived} 
          icon={<Users className="text-blue-500" />} 
          trend="+12%" 
          trendUp={true} 
        />
        <KPICard 
          title="Conversion Rate" 
          value={`${kpis.enrollmentRate}%`} 
          icon={<TrendingUp className="text-brand-success" />} 
          trend="Enrolled / Offers" 
          trendUp={true} 
        />
        <KPICard 
          title="Revenue Collected" 
          value={formatCurrency(kpis.revenueCollected)} 
          icon={<Wallet className="text-emerald-500" />} 
          trend={`${formatCurrency(kpis.pendingRevenue)} pending`} 
          trendUp={true} 
        />
        <KPICard 
          title="Pending Actions" 
          value={kpis.underReview + kpis.docsPending} 
          icon={<FileCheck className="text-brand-warning" />} 
          trend="Needs staff review" 
          trendUp={false} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">University Activity Trend (30 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: '#4F46E5', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="actions" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorActions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Summary */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Admissions Pipeline</h3>
          <div className="space-y-4">
            <FunnelStep label="Total Applicants" count={kpis.totalReceived} total={kpis.totalReceived} color="bg-blue-500" />
            <FunnelStep label="Offers Issued" count={kpis.offersIssued} total={kpis.totalReceived} color="bg-purple-500" />
            <FunnelStep label="Seat Accepted" count={kpis.seatAccepted} total={kpis.totalReceived} color="bg-pink-500" />
            <FunnelStep label="Enrolled Students" count={kpis.enrolled} total={kpis.totalReceived} color="bg-emerald-500" />
          </div>
        </div>

      </div>
    </div>
  )
}

function KPICard({ title, value, icon, trend, trendUp }: any) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-lg">
          {icon}
        </div>
      </div>
      <div>
        <h4 className="text-sm text-text-muted font-medium mb-1">{title}</h4>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className={`text-xs mt-2 ${trendUp ? 'text-brand-success' : 'text-text-muted'}`}>{trend}</p>
      </div>
    </div>
  )
}

function FunnelStep({ label, count, total, color }: any) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="text-sm font-bold text-white">{count}</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  )
}
