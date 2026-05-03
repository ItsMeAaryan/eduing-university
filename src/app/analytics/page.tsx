'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { auth } from '@/lib/firebase/config'
import { subscribeToApplications } from '@/lib/firebase/applications'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'
import { FileText, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/Toast'

const COLORS = ['#4F46E5', '#F59E0B', '#22C55E', '#EA580C', '#EF4444', '#7C3AED']

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [apps, setApps] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubApps = subscribeToApplications(user.uid, setApps)
        const unsubProgs = subscribeToPrograms(user.uid, (data) => {
          setPrograms(data)
          setLoading(false)
        })
        return () => {
          unsubApps()
          unsubProgs()
        }
      }
    })
    return () => unsubscribeAuth()
  }, [])

  // 1. Applications over time
  const timelineData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const counts: any = {}
    last30Days.forEach(date => counts[date] = 0)

    apps.forEach(app => {
      if (app.appliedAt?.seconds) {
        const date = new Date(app.appliedAt.seconds * 1000).toISOString().split('T')[0]
        if (counts[date] !== undefined) counts[date]++
      }
    })

    return last30Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: counts[date]
    }))
  }, [apps])

  // 2. Applications by Program
  const programData = useMemo(() => {
    const counts: any = {}
    programs.forEach(p => counts[p.name] = 0)
    apps.forEach(app => {
      if (counts[app.programName] !== undefined) counts[app.programName]++
    })
    return programs.map(p => ({
      name: p.name,
      value: counts[p.name]
    })).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [apps, programs])

  // 3. Status Distribution
  const statusData = useMemo(() => {
    const counts: any = {
      submitted: 0,
      under_review: 0,
      selected: 0,
      waitlisted: 0,
      rejected: 0
    }
    apps.forEach(app => {
      if (counts[app.status] !== undefined) counts[app.status]++
    })
    return Object.keys(counts).map(status => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: counts[status]
    }))
  }, [apps])

  // 4. Geographic Distribution (States)
  const geographicData = useMemo(() => {
    const counts: any = {}
    apps.forEach(app => {
      const state = app.studentProfile?.state || 'Unknown'
      counts[state] = (counts[state] || 0) + 1
    })
    return Object.keys(counts).map(state => ({
      name: state,
      count: counts[state]
    })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [apps])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1C1C1E] border border-white/10 p-3 rounded-lg shadow-2xl">
          <p className="text-xs font-bold text-white mb-1">{label || payload[0].name}</p>
          <p className="text-sm font-bold text-brand-primary">{payload[0].value} {payload[0].value === 1 ? 'Application' : 'Applications'}</p>
        </div>
      )
    }
    return null
  }

  const showToastFeature = () => {
    toast.info('Feature coming in full version')
  }

  if (loading) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Enrollment Analytics</h2>
        <div className="flex items-center gap-3">
          <button onClick={showToastFeature} className="h-10 px-4 rounded-lg bg-white/5 border border-brand-border text-white text-sm font-semibold flex items-center gap-2 hover:bg-white/10">
            <FileText size={16} /> Report PDF
          </button>
          <button onClick={showToastFeature} className="h-10 px-4 rounded-lg bg-brand-primary text-white text-sm font-bold flex items-center gap-2 hover:bg-brand-primary/90">
            <Share2 size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Line Chart: Applications Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-surface border border-brand-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-8">Applications Trend (Last 30 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData.map(d => ({ ...d, count: Math.min(d.count, 50) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#5B5FEF" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#5B5FEF', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#5B5FEF', stroke: 'white', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Programs by Demand */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-surface border border-brand-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-8">Top Programs by Demand</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {programs.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', fontSize: '14px' }}>
                No program data available
              </div>
            ) : [...programData].sort((a, b) => b.value - a.value).slice(0, 5).map((p: any, i: number) => (
              <div key={p.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{p.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.value || 0} apps</span>
                </div>
                <div style={{ height: '8px', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((p.value / (programData[0]?.value || 1)) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    style={{
                      height: '100%', borderRadius: '100px',
                      background: ['#5B5FEF','#F59E0B','#10B981','#F97316','#818CF8'][i % 5],
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pie Chart: Status Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-brand-surface border border-brand-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-8">Application Status Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bar Chart: Geographic Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-brand-surface border border-brand-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-8">Geographic Origin (Top States)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geographicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="#4F46E5" 
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
