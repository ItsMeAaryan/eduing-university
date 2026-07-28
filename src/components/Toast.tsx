'use client'

import React, { createContext, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
    warning: (msg: string) => void
    promise: <T>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }) => Promise<T>
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 11)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error:   (msg: string) => addToast(msg, 'error'),
    info:    (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
    promise: async <T,>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }): Promise<T> => {
      addToast(msgs.loading, 'info')
      try {
        const result = await promise
        addToast(msgs.success, 'success')
        return result
      } catch (err) {
        addToast(msgs.error, 'error')
        throw err
      }
    }
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <ToastItemComponent key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItemComponent({ toast }: { toast: ToastItem }) {
  const borderColor: Record<ToastType, string> = {
    success: 'var(--green)',
    error:   'var(--red)',
    info:    'var(--indigo-light)',
    warning: 'var(--gold)',
  }

  const textColor: Record<ToastType, string> = {
    success: 'var(--green)',
    error:   'var(--red)',
    info:    'var(--indigo-light)',
    warning: 'var(--gold)',
  }

  const icons: Record<ToastType, string> = {
    success: '✓',
    error:   '✗',
    info:    'ℹ',
    warning: '⚠',
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      style={{
        position: 'relative',
        background: 'var(--bg-elevated)',
        border: `1px solid ${borderColor[toast.type]}`,
        borderRadius: '12px',
        padding: '14px 18px',
        minWidth: '280px',
        maxWidth: '360px',
        overflow: 'hidden',
        pointerEvents: 'auto',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: '700', fontSize: '16px', color: textColor[toast.type] }}>
          {icons[toast.type]}
        </span>
        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
          {toast.message}
        </span>
      </div>
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: borderColor[toast.type],
          borderRadius: '0 0 0 12px',
        }}
      />
    </motion.div>
  )
}
