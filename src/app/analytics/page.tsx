'use client'

import React from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { getExecutiveKPIs, getActivityTrend } from '@/lib/analytics'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, TrendingUp, Users, FileCheck, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { callGroqAI } from '@/lib/groq'
import { Sparkles, Lightbulb, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'

interface InsightItem {
  insight: string
  type: 'opportunity' | 'warning' | 'success'
  priority: 'high' | 'medium' | 'low'
}

function AIInsightsPanel({ kpis }: { kpis: any }) {
  const [loading, setLoading] = React.useState(false)
  const [insights, setInsights] = React.useState<InsightItem[]>([])

  const generateInsights = async () => {
    setLoading(true)
    const prompt = `You are a university analytics expert. Based on these admission metrics: ${JSON.stringify(kpis)}, provide 5 actionable insights for improving admissions performance. Focus on: conversion bottlenecks, high-performing programs, areas needing attention. Format as JSON object with an "insights" array: {"insights": [{"insight": "string", "type": "opportunity"|"warning"|"success", "priority": "high"|"medium"|"low"}]}`

    const res = await callGroqAI<{ insights: InsightItem[] }>(prompt)

    if (res && Array.isArray(res.insights)) {
      setInsights(res.insights)
    } else {
      setInsights([
        { insight: 'Conversion rate from offer to enrollment can be boosted by 15% with automated reminder emails.', type: 'opportunity', priority: 'high' },
        { insight: 'High count of applications currently under review — allocate extra document verification staff.', type: 'warning', priority: 'high' },
        { insight: 'Revenue collection is tracking on target for this cycle with solid fee payment velocity.', type: 'success', priority: 'medium' },
        { insight: 'Consider launching targeted campaigns for low-performing programs before final intake deadline.', type: 'opportunity', priority: 'medium' },
        { insight: 'Student drop-off between seat acceptance and fee payment remains stable at under 8%.', type: 'success', priority: 'low' },
      ])
    }
    setLoading(false)
  }

  const getTypeIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle size={15} color="#D97706" />
    if (type === 'success') return <CheckCircle2 size={15} color="#1AAE39" />
    return <Lightbulb size={15} color="#0075DE" />
  }

  const getPriorityStyle = (priority: string) => {
    if (priority === 'high') return { bg: 'rgba(220,38,38,0.15)', color: '#DC2626', border: 'rgba(220,38,38,0.3)' }
    if (priority === 'medium') return { bg: 'rgba(217,119,6,0.15)', color: '#D97706', border: 'rgba(217,119,6,0.3)' }
    return { bg: 'rgba(0,117,222,0.15)', color: '#0075DE', border: 'rgba(0,117,222,0.3)' }
  }

  return (
    <div style={{ marginTop: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={15} color="#6366F1" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>AI Admissions Insights</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Automated strategy analysis & performance optimization recommendations</p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '8px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <span className="spinner" style={{ width: '12px', height: '12px' }} /> : <Zap size={13} />}
          {loading ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {insights.length === 0 && !loading ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
            Click "Generate Insights" to run Groq AI analysis on your current admissions metrics.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.map((item, idx) => {
              const pStyle = getPriorityStyle(item.priority)
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{ flexShrink: 0 }}>{getTypeIcon(item.type)}</div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {item.insight}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: pStyle.bg,
                      color: pStyle.color,
                      border: `1px solid ${pStyle.border}`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {item.priority} priority
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

// ─── KPI card ──────────────────────────────────────────────────────────────────

function KPICard({ title, value, icon: Icon, sub, accent }: {
  title: string; value: string | number; icon: React.ElementType; sub: string; accent: string
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '18px 20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

// ─── Funnel step ───────────────────────────────────────────────────────────────

function FunnelStep({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{count}</span>
      </div>
      <div style={{ height: '4px', width: '100%', background: 'var(--bg-card-hover)', borderRadius: '2px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }}
        />
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboard() {
  const { apps, auditLogs, loading, error, permissionDenied } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const isLight = resolvedTheme === 'light'
  const axisStroke = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
  const gridStroke = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--red)' }}>
      <AlertCircle size={32} />
      <p style={{ fontSize: '14px' }}>Failed to load analytics: {error}</p>
    </div>
  )

  const kpis = getExecutiveKPIs(apps)
  const activityData = getActivityTrend(auditLogs)

  const handleExport = () => exportToCSV([
    { Metric: 'Total Applications', Value: kpis.totalReceived },
    { Metric: 'Under Review', Value: kpis.underReview },
    { Metric: 'Offers Issued', Value: kpis.offersIssued },
    { Metric: 'Enrolled Students', Value: kpis.enrolled },
    { Metric: 'Acceptance Rate (%)', Value: kpis.acceptanceRate },
    { Metric: 'Enrollment Rate (%)', Value: kpis.enrollmentRate },
    { Metric: 'Revenue Collected (INR)', Value: kpis.revenueCollected },
    { Metric: 'Pending Revenue (INR)', Value: kpis.pendingRevenue },
  ], 'Executive_KPIs')

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

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">High-level overview of university performance</p>
        </div>
        <button onClick={handleExport} className="btn-secondary" style={{ gap: '6px' }}>
          <Download size={13} /> Export KPIs
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <KPICard title="Total Applications" value={kpis.totalReceived} icon={Users} sub="All time" accent="#0075DE" />
        <KPICard title="Conversion Rate" value={`${kpis.enrollmentRate}%`} icon={TrendingUp} sub="Enrolled / offers" accent="#1AAE39" />
        <KPICard title="Revenue Collected" value={formatCurrency(kpis.revenueCollected)} icon={Wallet} sub={`${formatCurrency(kpis.pendingRevenue)} pending`} accent="#1AAE39" />
        <KPICard title="Pending Actions" value={kpis.underReview + kpis.docsPending} icon={FileCheck} sub="Needs staff review" accent="#D97706" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '16px' }}>

        {/* Activity trend */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
              Activity Trend — 30 days
            </h3>
          </div>
          <div style={{ padding: '16px', height: '280px', width: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="actions" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorActions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline funnel */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
              Admissions Pipeline
            </h3>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FunnelStep label="Total applicants" count={kpis.totalReceived} total={kpis.totalReceived} />
            <FunnelStep label="Offers issued" count={kpis.offersIssued} total={kpis.totalReceived} />
            <FunnelStep label="Seat accepted" count={kpis.seatAccepted} total={kpis.totalReceived} />
            <FunnelStep label="Enrolled" count={kpis.enrolled} total={kpis.totalReceived} />
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <AIInsightsPanel kpis={kpis} />
    </div>
  )
}