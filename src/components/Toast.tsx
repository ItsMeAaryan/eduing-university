'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading'

export interface ToastItem {
  id: string
  message: string
  description?: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  toast: {
    success: (msg: string, description?: string) => void
    error:   (msg: string, description?: string) => void
    info:    (msg: string, description?: string) => void
    warning: (msg: string, description?: string) => void
    loading: (msg: string, description?: string) => void
    promise: <T>(
      promise: Promise<T>,
      msgs: { loading: string; success: string; error: string }
    ) => Promise<T>
    dismiss: (id: string) => void
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const ACCENT: Record<ToastType, string> = {
  success: 'var(--green)',
  error:   'var(--red)',
  info:    'var(--indigo-light)',
  warning: 'var(--gold)',
  loading: 'var(--indigo-light)',
}

const ACCENT_OPACITY: Record<ToastType, string> = {
  success: 'rgba(16, 185, 129, 0.15)',
  error:   'rgba(239, 68, 68, 0.15)',
  info:    'rgba(99, 102, 241, 0.15)',
  warning: 'rgba(245, 158, 11, 0.15)',
  loading: 'rgba(99, 102, 241, 0.15)',
}

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 4000

// ─── Spring animation variants ────────────────────────────────────────────────

const toastVariants = {
  initial: {
    opacity: 0,
    y: -16,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.96,
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <motion.circle
        cx="10" cy="10" r="9"
        stroke="var(--green)"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.path
        d="M6.5 10.25L8.75 12.5L13.5 7.75"
        stroke="var(--green)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <motion.circle
        cx="10" cy="10" r="9"
        stroke="var(--red)"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.path
        d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5"
        stroke="var(--red)"
        strokeWidth="1.75"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <motion.circle
        cx="10" cy="10" r="9"
        stroke="var(--indigo-light)"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <line x1="10" y1="9" x2="10" y2="13.5" stroke="var(--indigo-light)" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="6.75" r="0.9" fill="var(--indigo-light)" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <motion.path
        d="M10 3L18.5 17H1.5L10 3Z"
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <line x1="10" y1="9" x2="10" y2="13" stroke="var(--gold)" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="15.25" r="0.85" fill="var(--gold)" />
    </svg>
  )
}

function LoadingIcon() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '2px solid rgba(99,102,241,0.25)',
        borderTopColor: 'var(--indigo-light)',
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  )
}

const ICON: Record<ToastType, React.ReactNode> = {
  success: <SuccessIcon />,
  error:   <ErrorIcon />,
  info:    <InfoIcon />,
  warning: <WarningIcon />,
  loading: <LoadingIcon />,
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  duration,
  paused,
  accent,
}: {
  duration: number
  paused: boolean
  accent: string
}) {
  const width = useMotionValue(100)

  useEffect(() => {
    if (paused) return

    const startTime = performance.now()
    const startWidth = width.get()
    let frame: number

    const tick = (now: number) => {
      const elapsed = now - startTime
      const next = Math.max(0, startWidth - (elapsed / duration) * startWidth)
      width.set(next)
      if (next > 0) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  const widthPct = useTransform(width, (v) => `${v}%`)

  return (
    <motion.div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '2px',
        width: widthPct,
        background: accent,
        borderRadius: '0 0 0 16px',
        opacity: 0.7,
      }}
    />
  )
}

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItemComponent({
  toast,
  onDismiss,
  index,
  total,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
  index: number
  total: number
}) {
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remainingRef = useRef(toast.duration)
  const startTimeRef = useRef<number | null>(null)

  const accent = ACCENT[toast.type]
  const accentBg = ACCENT_OPACITY[toast.type]

  const startTimer = useCallback(() => {
    if (toast.type === 'loading') return
    startTimeRef.current = Date.now()
    timerRef.current = setTimeout(() => onDismiss(toast.id), remainingRef.current)
  }, [toast.id, toast.type, onDismiss])

  const pauseTimer = useCallback(() => {
    if (!timerRef.current || startTimeRef.current == null) return
    clearTimeout(timerRef.current)
    remainingRef.current -= Date.now() - startTimeRef.current
    startTimeRef.current = null
  }, [])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMouseEnter = () => {
    setPaused(true)
    pauseTimer()
  }

  const handleMouseLeave = () => {
    setPaused(false)
    startTimer()
  }

  // Stack visual offset: items behind the front get slightly smaller
  const isFront = index === total - 1
  const stackScale = isFront ? 1 : 1 - (total - 1 - index) * 0.03
  const stackY = isFront ? 0 : -(total - 1 - index) * 6

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      style={{
        transform: `scale(${stackScale}) translateY(${stackY}px)`,
        transformOrigin: 'top center',
        position: 'relative',
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${accent}28`,
        borderRadius: '16px',
        padding: '14px 16px',
        minWidth: '300px',
        maxWidth: '400px',
        overflow: 'hidden',
        pointerEvents: 'auto',
        cursor: 'default',
        boxShadow: `
          0 4px 6px -1px rgba(0,0,0,0.1),
          0 10px 40px -4px rgba(0,0,0,0.2),
          0 0 0 1px rgba(99,102,241,0.06),
          inset 0 1px 0 rgba(255,255,255,0.04)
        `,
        outline: 'none',
      }}
    >
      {/* Accent glow line at top */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${accent}50, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Content row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon pill */}
        <div style={{
          flexShrink: 0,
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '1px',
        }}>
          {ICON[toast.type]}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            lineHeight: '1.4',
            letterSpacing: '-0.01em',
          }}>
            {toast.message}
          </div>
          {toast.description && (
            <div style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              marginTop: '3px',
              lineHeight: '1.5',
            }}>
              {toast.description}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {toast.type !== 'loading' && (
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            style={{
              flexShrink: 0,
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'background 0.12s, color 0.12s',
              marginTop: '2px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-card-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {toast.type !== 'loading' && (
        <ProgressBar duration={toast.duration} paused={paused} accent={accent} />
      )}
    </motion.div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((
    message: string,
    type: ToastType,
    description?: string,
    duration = DEFAULT_DURATION
  ) => {
    const id = Math.random().toString(36).substring(2, 11)
    setToasts(prev => {
      const next = [...prev, { id, message, description, type, duration }]
      return next.slice(-MAX_VISIBLE)
    })
    if (type !== 'loading') {
      setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  const toast = {
    success: (msg: string, desc?: string) => addToast(msg, 'success', desc),
    error:   (msg: string, desc?: string) => addToast(msg, 'error', desc),
    info:    (msg: string, desc?: string) => addToast(msg, 'info', desc),
    warning: (msg: string, desc?: string) => addToast(msg, 'warning', desc),
    loading: (msg: string, desc?: string) => addToast(msg, 'loading', desc),
    dismiss,
    promise: async <T,>(
      promise: Promise<T>,
      msgs: { loading: string; success: string; error: string }
    ): Promise<T> => {
      addToast(msgs.loading, 'loading')
      try {
        const result = await promise
        addToast(msgs.success, 'success')
        return result
      } catch (err) {
        addToast(msgs.error, 'error')
        throw err
      }
    },
  }

  // ESC dismisses the latest toast
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToasts(prev => {
          if (prev.length === 0) return prev
          return prev.slice(0, -1)
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const visible = toasts.slice(-MAX_VISIBLE)

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ARIA live region for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {toasts.map(t => `${t.type}: ${t.message}`).join('. ')}
      </div>

      {/* Toast container */}
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          left: 'auto',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="sync">
          {visible.map((t, i) => (
            <ToastItemComponent
              key={t.id}
              toast={t}
              onDismiss={dismiss}
              index={i}
              total={visible.length}
            />
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .toast-container {
            top: 72px !important;
            right: 16px !important;
          }
        }
        @media (max-width: 640px) {
          .toast-container {
            top: 72px !important;
            right: 16px !important;
            left: 16px !important;
            align-items: stretch !important;
          }
          .toast-container > * {
            min-width: unset !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
