'use client'

import React from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

interface UniversityLayoutProps {
  children: React.ReactNode
}

export default function UniversityLayout({ children }: UniversityLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark flex">
      {/* Sidebar - Fixed width */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen pl-72">
        <Navbar />
        
        {/* Main Content with 24px top padding as requested */}
        <main className="flex-1 px-8 pt-6 pb-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
