'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms, deleteProgram } from '@/lib/firebase/programs'
import { Plus, Edit2, Trash2, Calendar, IndianRupee, AlertCircle, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import ProgramPanel from '@/components/ProgramPanel'

export default function ProgramsPage() {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [editingProgram, setEditingProgram] = useState<FirestoreRecord | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsub = subscribeToPrograms(user.uid, (data) => {
          setPrograms(data)
          setLoading(false)
        })
        return () => unsub()
      }
    })
    return () => unsubscribeAuth()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteProgram(id)
      toast.success('Program deleted successfully')
      setDeleteConfirm(null)
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete program')
    }
  }

  if (loading) return null

  return (
    <div className="space-y-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Academic Programs</h1>
          <p className="text-text-secondary text-sm mt-1">Manage and configure your course offerings</p>
        </div>
        <button 
          onClick={() => {
            setEditingProgram(null)
            setIsPanelOpen(true)
          }}
          className="bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
        >
          <Plus size={18} />
          <span>New Program</span>
        </button>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {programs.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {programs.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col group hover:border-brand-primary/40 hover:shadow-2xl hover:shadow-brand-primary/5 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider">
                        {p.level}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors truncate">
                      {p.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => {
                        setEditingProgram(p)
                        setIsPanelOpen(true)
                      }}
                      className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-colors"
                      title="Edit Program"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(p.id)}
                      className="p-2 rounded-xl hover:bg-brand-error/10 text-text-muted hover:text-brand-error transition-colors"
                      title="Delete Program"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold mb-1 tracking-tight">Duration</p>
                    <p className="text-sm font-semibold text-white">{p.duration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold mb-1 tracking-tight">Total Seats</p>
                    <p className="text-sm font-semibold text-white">{p.totalSeats || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold mb-1 tracking-tight">Available</p>
                    <p className="text-sm font-semibold text-brand-success">{(p.totalSeats || 0) - (p.filledSeats || 0)}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest mb-1.5">
                      <span className="text-text-muted">Seats Utilization</span>
                      <span className="text-brand-primary">{p.filledSeats || 0} / {p.totalSeats || 0}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((p.filledSeats || 0) / (p.totalSeats || 1)) * 100)}%` }}
                        className="h-full bg-linear-to-r from-brand-primary to-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-brand-gold font-bold">
                      <IndianRupee size={14} />
                      <span>{(p.annualFee || 0).toLocaleString()}/yr</span>
                    </div>
                    {p.deadline && <DeadlineBadge date={p.deadline} />}
                  </div>
                </div>

                {p.hasEntranceExam && (
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                    <AlertCircle size={14} className="text-brand-gold" />
                    <span className="text-[10px] font-bold uppercase text-brand-gold truncate opacity-80">
                      {p.entranceExam || 'Entrance Required'}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 px-6 bg-brand-surface/30 border border-dashed border-brand-border rounded-3xl text-center"
          >
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="text-brand-primary" size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No programs created yet</h3>
            <p className="text-text-secondary text-sm max-w-sm mb-8">
              Start building your academic portfolio by adding your first program or course offering.
            </p>
            <button 
              onClick={() => setIsPanelOpen(true)}
              className="bg-white text-brand-bg px-8 py-3 rounded-xl font-bold hover:bg-white/90 transition-all active:scale-95 shadow-xl"
            >
              Create your first program
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPanelOpen && (
          <ProgramPanel 
            program={editingProgram}
            onClose={() => {
              setIsPanelOpen(false)
              setEditingProgram(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-200 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-brand-border rounded-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-brand-error/10 text-brand-error rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Program?</h3>
              <p className="text-text-secondary text-sm mb-8 leading-relaxed">
                This will also affect active applications. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 h-12 rounded-lg border border-brand-border text-white font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 h-12 rounded-lg bg-brand-error text-white font-semibold hover:bg-brand-error/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeadlineBadge({ date }: { date: string }) {
  const d = new Date(date)
  const daysLeft = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  let colorClass = 'text-text-muted'
  if (daysLeft < 30) colorClass = 'text-brand-error'
  else if (daysLeft < 60) colorClass = 'text-brand-warning'

  return (
    <div className={`flex items-center gap-1.5 ${colorClass}`}>
      <Calendar size={14} />
      <span className="text-xs font-medium">{d.toLocaleDateString()}</span>
    </div>
  )
}
