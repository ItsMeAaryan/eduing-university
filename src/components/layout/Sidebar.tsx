'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  BarChart3, 
  GraduationCap, 
  Users, 
  Settings,
  LogOut,
  Sun,
  Moon,
  Laptop
} from 'lucide-react'
import { auth } from '@/lib/firebase/config'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/university/dashboard' },
  { icon: FileText, label: 'Applications', href: '/university/applications' },
  { icon: BookOpen, label: 'Programs', href: '/university/programs' },
  { icon: GraduationCap, label: 'Exams', href: '/university/exams' },
  { icon: Users, label: 'Seat Allocation', href: '/university/seat-allocation' },
  { icon: BarChart3, label: 'Analytics', href: '/university/analytics' },
  { icon: Settings, label: 'Settings', href: '/university/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="w-72 h-screen fixed left-0 top-0 bg-sidebar border-r border-[#242424] flex flex-col z-50 transition-colors duration-300">
      {/* Logo Section */}
      <div className="flex flex-col items-center py-10 border-b border-[#242424]/50">
        <Link href="/university/dashboard" className="group flex items-center gap-3">
          {/* Logo Image */}
          <Image
            src="/bandwlogo.PNG"
            alt="EDUING Logo"
            width={36}
            height={36}
            style={{ objectFit: 'contain', filter: 'invert(1)' }}
          />
          {/* Text */}
          <div className="text-3xl font-black tracking-tighter flex items-baseline">
            <span className="text-white">EDU</span>
            <span className="text-brand-indigo">ING</span>
            <span className="text-brand-indigo text-sm ml-0.5">.in</span>
          </div>
        </Link>
        <div className="mt-4 text-center">
          <h3 className="text-white font-bold text-sm tracking-wide">Stanford University</h3>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-indigo font-black mt-1">University Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 mt-8 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "text-brand-indigo" : "group-hover:scale-110")} />
              <span className="font-semibold text-sm">{item.label}</span>
              {isActive && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-brand-indigo shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 mt-auto border-t border-[#242424]">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-1 bg-black/40 rounded-full border border-[#242424] mb-4">
          {[
            { id: 'dark', icon: Moon },
            { id: 'light', icon: Sun },
            { id: 'system', icon: Laptop },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setTheme(mode.id)}
              className={cn(
                "p-2 rounded-full transition-all duration-300 flex-1 flex justify-center",
                theme === mode.id 
                  ? "bg-brand-indigo/25 border border-brand-indigo text-brand-indigo" 
                  : "text-white/30 hover:text-white"
              )}
            >
              <mode.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
