'use client'

import React, { useMemo } from 'react'
import { useAnalytics } from '@/context/AnalyticsContext'
import { exportToCSV } from '@/utils/export'
import { Download, AlertCircle, Users, MapPin, Tag } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6']

export default function StudentAnalytics() {
  const { apps, loading, error } = useAnalytics()
  const { resolvedTheme } = useTheme()

  const studentData = useMemo(() => {
    const geoCounts: Record<string, number> = {}
    const tagCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}

    apps.forEach(app => {
      // Geography
      const state = app.studentProfile?.state || app.city || 'Unknown'
      geoCounts[state] = (geoCounts[state] || 0) + 1

      // Tags
      if (app.tags && Array.isArray(app.tags)) {
        app.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }

      // Status
      const status = app.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const geoChart = Object.keys(geoCounts)
      .map(name => ({ name, value: geoCounts[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const tagChart = Object.keys(tagCounts)
      .map(name => ({ name, value: tagCounts[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const statusChart = Object.keys(statusCounts)
      .map(name => ({ name: name.replace('_', ' ').toUpperCase(), value: statusCounts[name] }))
      .sort((a, b) => b.value - a.value)

    return { geoChart, tagChart, statusChart }
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

  const handleExport = () => {
    exportToCSV(studentData.geoChart, 'Student_Demographics')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Student Analytics</h1>
          <p className="text-text-secondary text-sm">Demographics, lifecycle distribution, and tag tracking</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export Demographics
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Geography Chart */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-brand-primary" /> Geographic Distribution
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentData.geoChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Users size={18} className="text-purple-500" /> Lifecycle Status Distribution
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={studentData.statusChart}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {studentData.statusChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tag Distribution */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Tag size={18} className="text-pink-500" /> Top CRM Tags Assigned
          </h3>
          <div className="h-80 w-full">
            {studentData.tagChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentData.tagChart} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={true} vertical={false} />
                  <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted italic">
                No tags have been assigned to students yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
