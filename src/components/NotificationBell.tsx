'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth } from '@/lib/firebase/config'
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firebase/notifications'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<FirestoreRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsub = subscribeToNotifications(user.uid, (data) => {
          setNotifications(data)
          setUnreadCount(data.filter(n => !n.isRead).length)
        })
        return () => unsub()
      }
    })
    return () => unsubscribe()
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          position: 'relative',
          transition: 'all 0.15s',
        }}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--border-hover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--red)',
            border: '2px solid var(--bg-elevated)',
          }} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setIsOpen(false)} 
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 10px)',
                width: '360px',
                maxHeight: '480px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                zIndex: 50,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: 'var(--indigo)',
                      color: 'white',
                      padding: '2px 7px',
                      borderRadius: '100px',
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <button 
                  onClick={() => markAllNotificationsRead(auth.currentUser?.uid || '')}
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--indigo-light)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Mark all read
                </button>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => {
                    const iconBg = n.type === 'selected'
                      ? 'rgba(22,163,74,0.10)'
                      : n.type === 'rejected'
                      ? 'rgba(220,38,38,0.10)'
                      : 'rgba(99,102,241,0.10)'
                    const iconColor = n.type === 'selected'
                      ? 'var(--green)'
                      : n.type === 'rejected'
                      ? 'var(--red)'
                      : 'var(--indigo-light)'

                    return (
                      <button 
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          background: !n.isRead ? 'rgba(99,102,241,0.04)' : 'transparent',
                          border: 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = !n.isRead ? 'rgba(99,102,241,0.04)' : 'transparent' }}
                      >
                        <div style={{
                          width: '32px', height: '32px',
                          borderRadius: '50%',
                          background: iconBg,
                          color: iconColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {n.isRead ? <Check size={14} /> : <Bell size={14} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <p style={{
                              fontSize: '13px',
                              fontWeight: !n.isRead ? '600' : '400',
                              color: !n.isRead ? 'var(--text-primary)' : 'var(--text-secondary)',
                              margin: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {n.title}
                            </p>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {n.createdAt?.seconds ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000)) + ' ago' : ''}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {n.message}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--indigo)', flexShrink: 0, marginTop: '4px' }} />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
