'use client'

import React, { useMemo } from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, Wallet, IndianRupee, Landmark } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })

const PIE_COLORS = ['#1AAE39', '#D97706']

function StatCard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{title}</span>
        <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  )
}

export default function FinancialAnalytics() {
  const { apps, loading, error, permissionDenied } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const isLight = resolvedTheme === 'light'
  const axisStroke = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
  const gridStroke = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
  const tipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const financialData = useMemo(() => {
    let collected = 0, pending = 0
    const months: Record<string, number> = {}
    apps.forEach(app => {
      if (app.paymentDetails) {
        const amount = Number(app.paymentDetails.amount) || 0
        if (app.paymentDetails.status === 'verified') {
          collected += amount
          if (app.paymentDetails.date) {
            const m = new Date(app.paymentDetails.date).toLocaleString('default', { month: 'short', year: '2-digit' })
            months[m] = (months[m] || 0) + amount
          }
        } else {
          pending += amount
        }
      }
    })
    return {
      collected, pending,
      pieData: [{ name: 'Collected', value: collected }, { name: 'Pending', value: pending }],
      trendData: Object.entries(months).map(([month, revenue]) => ({ month, revenue })).sort((a, b) => a.month.localeCompare(b.month)),
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
          <h1 className="page-title">Financial Analytics</h1>
          <p className="page-subtitle">Revenue monitoring and fee collection trends</p>
        </div>
        <button onClick={() => exportToCSV(financialData.trendData, 'Financial_Monthly_Trends')} className="btn-secondary" style={{ gap: '6px' }}>
          <Download size={13} /> Export
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatCard title="Revenue Collected" value={formatCurrency(financialData.collected)} icon={Landmark} accent="#1AAE39" />
        <StatCard title="Pending Fees" value={formatCurrency(financialData.pending)} icon={Wallet} accent="#D97706" />
        <StatCard title="Total Expected" value={formatCurrency(financialData.collected + financialData.pending)} icon={IndianRupee} accent="#0075DE" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '16px' }}>
        {/* Trend */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Monthly Revenue Trend</h3>
          </div>
          <div style={{ padding: '16px', height: '280px', width: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <AreaChart data={financialData.trendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1AAE39" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1AAE39" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v) || 0), 'Revenue']} contentStyle={tipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="#1AAE39" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Collection ratio */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Collection Status</h3>
          </div>
          <div style={{ padding: '16px', height: '280px', width: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <PieChart>
                <Pie data={financialData.pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {financialData.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v) || 0), 'Amount']} contentStyle={tipStyle} />
                <Legend verticalAlign="bottom" height={32} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}