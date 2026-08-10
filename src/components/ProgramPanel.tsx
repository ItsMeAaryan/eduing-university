'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { X, Save, BookOpen, Clock, Layers, DollarSign, Users, Calendar, Check, Percent, ShieldCheck } from 'lucide-react'
import { addProgram, updateProgram } from '@/lib/firebase/programs'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'

interface ProgramPanelProps {
  program: FirestoreRecord | null
  onClose: () => void
}

const DEGREE_LEVELS = ['UG', 'PG', 'PhD', 'Diploma', 'Certificate']
const MODES = ['Full-time', 'Part-time', 'Online']
const ENTRANCE_EXAMS_LIST = ['JEE', 'NEET', 'CAT', 'GATE', 'CLAT', 'State CET', 'University Exam', 'None']
const STATUS_OPTIONS = ['Active', 'Draft', 'Closed']

export default function ProgramPanel({ program, onClose }: ProgramPanelProps) {
  const panelRef = useFocusTrap(true, onClose)
  const { toast } = useToast()
  const { user, userData } = useAuth()
  const [loading, setLoading] = useState(false)

  const universityId = userData?.universityId || user?.uid || auth.currentUser?.uid

  const [formData, setFormData] = useState({
    name: '',
    level: 'UG',
    duration: '4 Years',
    mode: 'Full-time',
    totalSeats: 60,
    filledSeats: 0,
    annualFeeLpa: 1.5,
    eligibility: '',
    minPercentage: 60,
    entranceExams: ['JEE'],
    openDate: '2026-05-01',
    closeDate: '2026-08-31',
    status: 'Active',
    description: '',
  })

  const [prevProgram, setPrevProgram] = useState(program)
  if (program !== prevProgram) {
    setPrevProgram(program)
    if (program) {
      setFormData({
        name: (program.name as string) || '',
        level: (program.level as string) || 'UG',
        duration: (program.duration as string) || '4 Years',
        mode: (program.mode as string) || 'Full-time',
        totalSeats: (program.totalSeats as number) || 60,
        filledSeats: (program.filledSeats as number) || 0,
        annualFeeLpa: (program.annualFeeLpa as number) || (program.annualFee ? Number((program.annualFee / 100000).toFixed(2)) : 1.5),
        eligibility: (program.eligibility as string) || '',
        minPercentage: (program.minPercentage as number) || 60,
        entranceExams: (program.entranceExams as string[]) || (program.entranceExam ? [program.entranceExam as string] : ['None']),
        openDate: (program.openDate as string) || '2026-05-01',
        closeDate: (program.closeDate as string) || (program.deadline as string) || '2026-08-31',
        status: (program.status as string) || 'Active',
        description: (program.description as string) || '',
      })
    }
  }

  const toggleEntranceExam = (exam: string) => {
    let current = [...formData.entranceExams]
    if (exam === 'None') {
      current = ['None']
    } else {
      current = current.filter((e) => e !== 'None')
      if (current.includes(exam)) {
        current = current.filter((e) => e !== exam)
      } else {
        current.push(exam)
      }
      if (current.length === 0) current = ['None']
    }
    setFormData({ ...formData, entranceExams: current })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!universityId) {
      toast.error('University authentication error')
      return
    }

    setLoading(true)

    try {
      const programData = {
        universityId,
        name: formData.name,
        level: formData.level,
        duration: formData.duration,
        mode: formData.mode,
        totalSeats: Number(formData.totalSeats) || 0,
        availableSeats: Math.max(0, (Number(formData.totalSeats) || 0) - (Number(formData.filledSeats) || 0)),
        filledSeats: Number(formData.filledSeats) || 0,
        annualFeeLpa: Number(formData.annualFeeLpa) || 0,
        annualFee: Math.round((Number(formData.annualFeeLpa) || 0) * 100000),
        eligibility: formData.eligibility,
        minPercentage: Number(formData.minPercentage) || 0,
        entranceExams: formData.entranceExams,
        hasEntranceExam: !formData.entranceExams.includes('None'),
        entranceExam: formData.entranceExams.filter((e) => e !== 'None').join(', '),
        openDate: formData.openDate,
        closeDate: formData.closeDate,
        deadline: formData.closeDate,
        status: formData.status,
        isActive: formData.status === 'Active',
        description: formData.description,
      }

      if (program?.id) {
        await updateProgram(program.id, programData)
        toast.success('Program updated successfully')
      } else {
        await addProgram(universityId, programData)
        toast.success('Program created successfully')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save program')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-xl bg-brand-surface border-l border-brand-border h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={program ? `Edit ${program.name as string}` : 'Add Program'}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-brand-surface/90 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <BookOpen size={20} className="text-brand-accent" />
              {program ? 'Edit Academic Program' : 'Add New Academic Program'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Configure course details, intake capacity, and eligibility requirements
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-all"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Program Name */}
          <div>
            <label htmlFor="prog-name" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Program Name *
            </label>
            <input
              id="prog-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. B.Tech Computer Science & Engineering"
              className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
            />
          </div>

          {/* Level & Mode Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prog-level" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Degree Level *
              </label>
              <select
                id="prog-level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              >
                {DEGREE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prog-mode" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Learning Mode *
              </label>
              <select
                id="prog-mode"
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration & Fee Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prog-duration" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Duration *
              </label>
              <input
                id="prog-duration"
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 4 Years"
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              />
            </div>

            <div>
              <label htmlFor="prog-fee" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Fee per Year (LPA) *
              </label>
              <input
                id="prog-fee"
                type="number"
                step="0.01"
                required
                value={formData.annualFeeLpa}
                onChange={(e) => setFormData({ ...formData, annualFeeLpa: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 1.5"
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              />
            </div>
          </div>

          {/* Seats & Min Percentage Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prog-seats" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Total Intake Seats *
              </label>
              <input
                id="prog-seats"
                type="number"
                required
                min={1}
                value={formData.totalSeats}
                onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) || 0 })}
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              />
            </div>

            <div>
              <label htmlFor="prog-minPct" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Min. Percentage Required (%)
              </label>
              <input
                id="prog-minPct"
                type="number"
                min={0}
                max={100}
                value={formData.minPercentage}
                onChange={(e) => setFormData({ ...formData, minPercentage: parseInt(e.target.value) || 0 })}
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              />
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div>
            <label htmlFor="prog-eligibility" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Eligibility Criteria
            </label>
            <textarea
              id="prog-eligibility"
              rows={3}
              value={formData.eligibility}
              onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
              placeholder="e.g. Pass in 10+2 with minimum 60% aggregate in Physics, Chemistry & Mathematics..."
              className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full resize-none"
            />
          </div>

          {/* Entrance Exams Accepted */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Entrance Exams Accepted
            </label>
            <div className="flex flex-wrap gap-2">
              {ENTRANCE_EXAMS_LIST.map((exam) => {
                const isSelected = formData.entranceExams.includes(exam)
                return (
                  <button
                    type="button"
                    key={exam}
                    onClick={() => toggleEntranceExam(exam)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                        : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {exam}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Application Open & Close Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prog-openDate" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Application Open Date
              </label>
              <input
                id="prog-openDate"
                type="date"
                value={formData.openDate}
                onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              />
            </div>

            <div>
              <label htmlFor="prog-closeDate" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Application Close Date
              </label>
              <input
                id="prog-closeDate"
                type="date"
                value={formData.closeDate}
                onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
              />
            </div>
          </div>

          {/* Program Status */}
          <div>
            <label htmlFor="prog-status" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Program Status
            </label>
            <select
              id="prog-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input-dark text-sm p-3 rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Action Button */}
          <div className="pt-4 sticky bottom-0 bg-brand-surface pb-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-accent text-white rounded-xl font-bold hover:bg-brand-accent/90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <Clock className="animate-spin" size={18} />
              ) : (
                <>
                  <Save size={18} />
                  <span>{program ? 'Save Program Changes' : 'Create Program'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
