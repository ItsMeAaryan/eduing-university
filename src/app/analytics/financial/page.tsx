'use client'

import React, { useMemo } from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, Wallet, IndianRupee, Landmark } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })

const COLORS = ['#10B981', '#F59E0B'] // Emerald for Collected, Amber for Pending

export default function FinancialAnalytics() {
  const { apps, loading, error } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const financialData = useMemo(() => {
    let revenueCollected = 0
    let pendingRevenue = 0
    let totalDiscount = 0

    // Monthly trends
    const months: Record<string, number> = {}

    apps.forEach(app => {
      if (app.paymentDetails) {
        const amount = Number(app.paymentDetails.amount) || 0
        if (app.paymentDetails.status === 'verified') {
          revenueCollected += amount
          
          if (app.paymentDetails.date) {
            const date = new Date(app.paymentDetails.date)
            const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' })
            months[monthStr] = (months[monthStr] || 0) + amount
          }
        } else {
          pendingRevenue += amount
        }
      }
    })

    const collectionData = [
      { name: 'Collected', value: revenueCollected },
      { name: 'Pending', value: pendingRevenue }
    ]

    const trendData = Object.keys(months).map(m => ({
      month: m,
      revenue: months[m]
    })).sort((a, b) => {
      // Basic string sort is fine for MVP
      return a.month.localeCompare(b.month)
    })

    return { revenueCollected, pendingRevenue, totalDiscount, collectionData, trendData }
  }, [apps])

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

  const isLight = resolvedTheme === 'light'
  const axisStroke  = isLight ? 'rgba(0,0,0,0.30)'  : 'rgba(255,255,255,0.30)'
  const gridStroke  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
  }

  const handleExport = () => {
    exportToCSV(financialData.trendData, 'Financial_Monthly_Trends')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Financial Analytics</h1>
          <p className="text-text-secondary text-sm">Revenue monitoring and fee collection trends</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export Data
        </button>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Landmark size={24} />
            </div>
          </div>
          <div>
            <h4 className="text-sm text-text-muted font-medium mb-1">Revenue Collected</h4>
            <p className="text-3xl font-bold text-white">{formatCurrency(financialData.revenueCollected)}</p>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <Wallet size={24} />
            </div>
          </div>
          <div>
            <h4 className="text-sm text-text-muted font-medium mb-1">Pending Fees</h4>
            <p className="text-3xl font-bold text-white">{formatCurrency(financialData.pendingRevenue)}</p>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <IndianRupee size={24} />
            </div>
          </div>
          <div>
            <h4 className="text-sm text-text-muted font-medium mb-1">Total Expected Revenue</h4>
            <p className="text-3xl font-bold text-white">{formatCurrency(financialData.revenueCollected + financialData.pendingRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Monthly Revenue Trend</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData.trendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis 
                  stroke={axisStroke} 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Collection Ratio */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6">Fee Collection Status</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialData.collectionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {financialData.collectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Amount']}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
