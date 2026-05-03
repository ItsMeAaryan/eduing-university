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

export default function StatCard({ title, value, icon: Icon, description, trend, color }: StatCardProps) {
  return (
    <div className={cn(
      "glass-card p-6 relative group transition-all duration-300",
      glowColors[color]
    )}>
      <div className="absolute top-6 right-6 p-2 bg-white/5 rounded-lg border border-white/10 group-hover:scale-110 transition-transform">
        <Icon className="w-4 h-4 text-white/50" />
      </div>

      <div className="mt-2">
        <span className={cn("text-4xl font-black tracking-tighter", valueColors[color])}>
          {value}
        </span>
        <h3 className="text-white/50 font-bold text-xs uppercase tracking-widest mt-2">{title}</h3>
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
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-tighter">vs last month</span>
        </div>
      )}
      
      {description && !trend && (
        <p className="mt-4 text-[10px] text-white/20 font-bold uppercase tracking-tighter">{description}</p>
      )}
    </div>
  )
}
