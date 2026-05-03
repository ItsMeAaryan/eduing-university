'use client'

import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { Search, Bell, User } from 'lucide-react'

export default function Navbar() {
  const { userData } = useAuth()


  return (
    <header className="h-20 bg-card backdrop-blur-[20px] border-b border-brand-indigo/15 sticky top-0 z-40 px-8 flex items-center justify-between transition-colors duration-300">
      <div className="relative w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search for applications, students..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-12 pr-4 focus:ring-1 focus:ring-brand-indigo/50 transition-all outline-none text-white text-sm placeholder:text-white/20"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-gold rounded-full border-2 border-brand-bg" />
        </button>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-none">{userData?.name || 'Admin User'}</p>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider font-bold">Main Campus</p>
          </div>
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
            <div className="w-full h-full bg-brand-gold/20 flex items-center justify-center">
               <User className="w-5 h-5 text-brand-gold" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
