'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms, updateProgram, deleteProgram } from '@/lib/firebase/programs'
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  IndianRupee, 
  AlertCircle, 
  BookOpen, 
  X, 
  Search, 
  Filter, 
  Users, 
  FileText,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import ProgramPanel from '@/components/ProgramPanel'

const DEGREE_LEVELS = ['All', 'UG', 'PG', 'PhD', 'Diploma', 'Certificate']
const MODES = ['All', 'Full-time', 'Part-time', 'Online']
const STATUSES = ['All', 'Active', 'Draft', 'Closed']

export default function ProgramsPage() {
  const router = useRouter()
  const { user, userData } = useAuth()
  const { toast } = useToast()

  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [editingProgram, setEditingProgram] = useState<FirestoreRecord | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter Bar state
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const universityId = userData?.universityId || user?.uid || auth.currentUser?.uid

  useEffect(() => {
    if (!universityId) {
      setLoading(false)
      return
    }

    const unsubProgs = subscribeToPrograms(universityId, (data) => {
      setPrograms(data)
      setLoading(false)
    })

    return () => unsubProgs()
  }, [universityId])

  // Filtered Programs list
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        (p.name as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.eligibility as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description as string)?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchLevel = levelFilter === 'All' || p.level === levelFilter
      const matchMode = modeFilter === 'All' || p.mode === modeFilter
      const matchStatus = statusFilter === 'All' || p.status === statusFilter

      return matchSearch && matchLevel && matchMode && matchStatus
    })
  }, [programs, searchTerm, levelFilter, modeFilter, statusFilter])

  // Direct status toggle on card
  const handleToggleStatus = async (programId: string, currentStatus: string) => {
    const statusCycle: Record<string, string> = {
      Active: 'Draft',
      Draft: 'Closed',
      Closed: 'Active',
    }
    const nextStatus = statusCycle[currentStatus] || 'Active'

    try {
      await updateProgram(programId, {
        status: nextStatus,
        isActive: nextStatus === 'Active',
      })
      toast.success(`Program status updated to ${nextStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProgram(id)
      toast.success('Program deleted successfully')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete program')
    }
  }

  // Get color styles for degree levels
  const getLevelBadgeStyle = (level?: string) => {
    switch (level) {
      case 'UG':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'PG':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      case 'PhD':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'Diploma':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'Certificate':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  // Get status badge styles
  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      case 'Draft':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      case 'Closed':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center flex-col gap-3 text-text-muted">
        <Loader2 size={32} className="animate-spin text-brand-accent" />
        <p className="text-sm font-medium">Loading programs...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface/60 border border-brand-border p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <BookOpen size={22} className="text-brand-accent" />
            Programs
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Manage your course offerings and intake capacity</p>
        </div>

        <button
          onClick={() => {
            setEditingProgram(null)
            setIsPanelOpen(true)
          }}
          className="bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-brand-accent/90 transition-all shrink-0"
        >
          <Plus size={16} /> Add Program
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-dark pl-9 py-2 text-xs rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
            />
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="input-dark py-2 text-xs rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
            >
              <option value="All">All Degree Levels</option>
              {DEGREE_LEVELS.filter((l) => l !== 'All').map((l) => (
                <option key={l} value={l}>
                  {l} Level
                </option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="input-dark py-2 text-xs rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
            >
              <option value="All">All Modes</option>
              {MODES.filter((m) => m !== 'All').map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-dark py-2 text-xs rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
            >
              <option value="All">All Statuses</option>
              {STATUSES.filter((s) => s !== 'All').map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Program Grid (3 Columns) */}
      {filteredPrograms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-brand-border rounded-2xl bg-brand-surface/30 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
            <BookOpen size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">No programs found</h3>
            <p className="text-xs text-text-muted max-w-sm mt-1">
              {programs.length === 0
                ? 'Start building your academic offerings by creating your first program.'
                : 'No programs matched your current filter criteria.'}
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm('')
              setLevelFilter('All')
              setModeFilter('All')
              setStatusFilter('All')
              setEditingProgram(null)
              setIsPanelOpen(true)
            }}
            className="bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:bg-brand-accent/90 transition-all"
          >
            <Plus size={15} /> Add your first program
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((p) => {
            const totalSeats = (p.totalSeats as number) || 1
            const filledSeats = (p.filledSeats as number) || 0
            const availableSeats = Math.max(0, totalSeats - filledSeats)
            const utilizationPct = Math.min(100, Math.round((filledSeats / totalSeats) * 100))
            const status = (p.status as string) || 'Active'

            return (
              <div
                key={p.id}
                className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-brand-accent/50 transition-all shadow-xs group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${getLevelBadgeStyle(p.level as string)}`}>
                      {p.level as string}
                    </span>

                    {/* Clickable Status Badge */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p.id, status)}
                      title="Click to toggle status"
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-transform hover:scale-105 ${getStatusBadgeStyle(status)}`}
                    >
                      {status}
                    </button>
                  </div>

                  {/* Title & Mode */}
                  <div>
                    <h3 className="text-base font-bold text-text-primary group-hover:text-brand-accent transition-colors line-clamp-1">
                      {p.name as string}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                      <span>{p.duration as string}</span>
                      <span>•</span>
                      <span>{(p.mode as string) || 'Full-time'}</span>
                      {p.annualFeeLpa ? (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹{p.annualFeeLpa} LPA
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Seat Utilization Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">Seats</span>
                      <span className="text-text-secondary font-bold">
                        {availableSeats} available / {totalSeats} total
                      </span>
                    </div>

                    <div className="w-full bg-white/10 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-accent rounded-full transition-all duration-300"
                        style={{ width: `${utilizationPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Applications count & exams */}
                  <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-brand-border/60">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-brand-accent" />
                      <span>{filledSeats} Applications</span>
                    </div>

                    {p.entranceExam && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {p.entranceExam as string}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProgram(p)
                      setIsPanelOpen(true)
                    }}
                    className="flex-1 btn-secondary text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 border border-brand-border hover:border-brand-accent hover:text-brand-accent transition-all"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/applications?program=${p.id}`)}
                    className="flex-1 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-brand-accent/20"
                  >
                    <span>Applications</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(p.id)}
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Delete program"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-In Modal */}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl z-50 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-text-primary">Delete Program?</h3>
                <button type="button" onClick={() => setDeleteConfirm(null)} className="text-text-muted hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                This will permanently delete the program. Active student applications associated with this program will remain intact.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 btn-secondary text-xs font-semibold py-2 rounded-xl border border-brand-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-xl shadow-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}