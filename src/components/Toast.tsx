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
    promise: (promise: Promise<any>, msgs: { loading: string; success: string; error: string }) => Promise<any>
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
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
    promise: async (promise: Promise<any>, msgs: { loading: string; success: string; error: string }) => {
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
      <div className="fixed top-4 right-4 z-100 flex flex-col gap-3 pointer-events-none">
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
  const colors = {
    success: 'border-brand-success text-brand-success',
    error: 'border-brand-error text-brand-error',
    info: 'border-brand-primary text-brand-primary',
    warning: 'border-brand-warning text-brand-warning'
  }

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`relative bg-brand-surface border ${colors[toast.type].split(' ')[0]} rounded-xl p-[14px_18px] min-w-[280px] max-w-[360px] overflow-hidden pointer-events-auto`}
    >
      <div className="flex items-center gap-3">
        <span className={`font-bold text-lg ${colors[toast.type].split(' ')[1]}`}>{icons[toast.type]}</span>
        <span className="text-text-primary text-sm font-medium">{toast.message}</span>
      </div>
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${colors[toast.type].split(' ')[0].replace('border-', 'bg-')}`}
      />
    </motion.div>
  )
}
