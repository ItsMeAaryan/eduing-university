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

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
      >
        <Bell size={20} className="text-text-secondary hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-error text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-brand-bg">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[480px] bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-brand-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                <button 
                  onClick={() => markAllNotificationsRead(auth.currentUser?.uid || '')}
                  className="text-[11px] text-brand-primary hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-muted text-sm">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/2 transition-colors flex gap-3 ${!n.isRead ? 'bg-brand-primary/5' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'selected' ? 'bg-brand-success/10 text-brand-success' :
                        n.type === 'rejected' ? 'bg-brand-error/10 text-brand-error' :
                        'bg-brand-primary/10 text-brand-primary'
                      }`}>
                        {n.isRead ? <Check size={14} /> : <Bell size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${!n.isRead ? 'text-white font-semibold' : 'text-text-secondary'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-text-muted shrink-0">
                            {n.createdAt?.seconds ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000)) + ' ago' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="w-1.5 h-1.5 bg-brand-primary rounded-full mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
