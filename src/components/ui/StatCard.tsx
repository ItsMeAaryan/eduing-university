import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isUp: boolean
  }
  color: 'indigo' | 'gold' | 'emerald' | 'rose' | 'orange'
}

const valueColors = {
  indigo: 'text-[#818CF8]',
  gold: 'text-[#FCD34D]',
  emerald: 'text-[#4ADE80]',
  rose: 'text-[#FCA5A5]',
  orange: 'text-[#FB923C]',
}

const glowColors = {
  indigo: 'hover:shadow-[0_0_20px_rgba(79,70,229,0.15)]',
  gold: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  emerald: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
  rose: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  orange: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
}

const iconBg = {
  indigo: 'rgba(99,102,241,0.10)',
  gold: 'rgba(245,158,11,0.10)',
  emerald: 'rgba(16,185,129,0.10)',
  rose: 'rgba(239,68,68,0.10)',
  orange: 'rgba(249,115,22,0.10)',
}

export default function StatCard({ title, value, icon: Icon, description, trend, color }: StatCardProps) {
  return (
    <div className={cn(
      "glass-card p-6 relative group transition-all duration-300",
      glowColors[color]
    )}>
      <div
        className="absolute top-6 right-6 p-2 rounded-lg group-hover:scale-110 transition-transform"
        style={{ background: iconBg[color] }}
      >
        <Icon className={cn("w-4 h-4", valueColors[color])} />
      </div>

      <div className="mt-2">
        <span className={cn("text-4xl font-black tracking-tighter", valueColors[color])}>
          {value}
        </span>
        <h3 style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '8px' }}>{title}</h3>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded-full border",
            trend.isUp 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {trend.isUp ? '↑' : '↓'} {trend.value}%
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>vs last month</span>
        </div>
      )}
      
      {description && !trend && (
        <p style={{ marginTop: '16px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{description}</p>
      )}
    </div>
  )
}
