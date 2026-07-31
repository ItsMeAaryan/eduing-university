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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />

      {/* Main — offset by sidebar width */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingLeft: '232px' }}>
        <Navbar />

        <main style={{ flex: 1, padding: '24px 28px 32px', overflowX: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}