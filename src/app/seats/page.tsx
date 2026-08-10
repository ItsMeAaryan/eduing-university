'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { auth, db } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms, updateProgram } from '@/lib/firebase/programs'
import { subscribeToApplications } from '@/lib/firebase/applications'
import { 
  BarChart3, 
  PieChart, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Save, 
  ArrowRight, 
  BookOpen, 
  Users, 
  Award,
  Loader2,
  Info,
  Check,
  Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { useToast } from '@/components/Toast'

// Indian Reservation Categories
const DEFAULT_CATEGORIES = [
  { id: 'general', name: 'General (Open)', defaultPct: 40, color: '#0075DE' },
  { id: 'obc', name: 'OBC (Other Backward Classes)', defaultPct: 27, color: '#7C3AED' },
  { id: 'sc', name: 'SC (Scheduled Caste)', defaultPct: 15, color: '#DB2777' },
  { id: 'st', name: 'ST (Scheduled Tribe)', defaultPct: 7.5, color: '#EA580C' },
  { id: 'ews', name: 'EWS (Economically Weaker Section)', defaultPct: 10.5, color: '#1AAE39' },
  { id: 'nri', name: 'NRI / Management Quota', defaultPct: 0, color: '#0284C7' },
]

export default function SeatAllocationPage() {
  const { user, userData } = useAuth()
  const { toast } = useToast()

  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // State for total intake & category reservation percentages
  const [totalSeats, setTotalSeats] = useState<number>(60)
  const [categoryPcts, setCategoryPcts] = useState<Record<string, number>>({
    general: 40,
    obc: 27,
    sc: 15,
    st: 7.5,
    ews: 10.5,
    nri: 0,
  })
  const [pwdQuotaPct, setPwdQuotaPct] = useState<number>(5)

  const universityId = userData?.universityId || user?.uid || auth.currentUser?.uid

  useEffect(() => {
    if (!universityId) {
      setLoading(false)
      return
    }

    const unsubProgs = subscribeToPrograms(universityId, (progData) => {
      setPrograms(progData)
      if (progData.length > 0 && !selectedProgramId) {
        setSelectedProgramId(progData[0].id)
      }
    })

    const unsubApps = subscribeToApplications(universityId, (appData) => {
      setApps(appData)
      setLoading(false)
    })

    return () => {
      unsubProgs()
      unsubApps()
    }
  }, [universityId, selectedProgramId])

  // Sync selected program data into form
  const selectedProgram = useMemo(() => {
    return programs.find((p) => p.id === selectedProgramId) || null
  }, [programs, selectedProgramId])

  useEffect(() => {
    if (selectedProgram) {
      setTotalSeats(Number(selectedProgram.totalSeats) || 60)
      if (selectedProgram.seatMatrix) {
        setCategoryPcts(selectedProgram.seatMatrix as Record<string, number>)
      }
      if (selectedProgram.pwdQuotaPct !== undefined) {
        setPwdQuotaPct(Number(selectedProgram.pwdQuotaPct))
      }
    }
  }, [selectedProgram])

  // Compute total percentage sum
  const totalPctSum = useMemo(() => {
    const sum = Object.values(categoryPcts).reduce((acc, val) => acc + (Number(val) || 0), 0)
    return Number(sum.toFixed(2))
  }, [categoryPcts])

  const isValid100Pct = Math.abs(totalPctSum - 100) < 0.01

  // Compute category statistics for table
  const categoryRows = useMemo(() => {
    const progApps = apps.filter((a) => a.programId === selectedProgramId)
    const totalCap = Number(totalSeats) || 0

    return DEFAULT_CATEGORIES.map((cat) => {
      const pct = categoryPcts[cat.id] ?? cat.defaultPct
      const reservedSeats = Math.round((pct / 100) * totalCap)

      // Count applications matching category
      const catApplied = progApps.filter((a) => {
        const candidateCat = (a.category as string || a.reservationCategory as string || 'general').toLowerCase()
        return candidateCat.includes(cat.id) || (cat.id === 'general' && candidateCat === 'open')
      }).length

      // Count selected applications
      const catSelected = progApps.filter((a) => {
        const isSelected = a.status === 'selected' || a.status === 'allotted'
        const candidateCat = (a.category as string || a.reservationCategory as string || 'general').toLowerCase()
        return isSelected && (candidateCat.includes(cat.id) || (cat.id === 'general' && candidateCat === 'open'))
      }).length

      const availableSeats = Math.max(0, reservedSeats - catSelected)

      return {
        ...cat,
        pct,
        reservedSeats,
        applied: catApplied,
        selected: catSelected,
        available: availableSeats,
      }
    })
  }, [selectedProgramId, apps, totalSeats, categoryPcts])

  // Donut Chart SVG Path Calculator
  const donutSlices = useMemo(() => {
    const totalCap = Number(totalSeats) || 1
    let cumulativeAngle = 0

    return categoryRows.map((row) => {
      const pct = row.pct
      const angle = (pct / 100) * 360
      const startAngle = cumulativeAngle
      const endAngle = cumulativeAngle + angle
      cumulativeAngle = endAngle

      const startRad = (startAngle - 90) * (Math.PI / 180)
      const endRad = (endAngle - 90) * (Math.PI / 180)

      const radius = 80
      const innerRadius = 52

      const x1 = 100 + radius * Math.cos(startRad)
      const y1 = 100 + radius * Math.sin(startRad)
      const x2 = 100 + radius * Math.cos(endRad)
      const y2 = 100 + radius * Math.sin(endRad)

      const x3 = 100 + innerRadius * Math.cos(endRad)
      const y3 = 100 + innerRadius * Math.sin(endRad)
      const x4 = 100 + innerRadius * Math.cos(startRad)
      const y4 = 100 + innerRadius * Math.sin(startRad)

      const largeArcFlag = angle > 180 ? 1 : 0

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ')

      return {
        ...row,
        pathData,
        angle,
      }
    })
  }, [categoryRows, totalSeats])

  // Save Allocation Matrix to Firestore
  const handleUpdateAllocation = async () => {
    if (!selectedProgramId) return
    if (!isValid100Pct) {
      toast.error(`Category percentages must sum to 100%. Current sum: ${totalPctSum}%`)
      return
    }

    setSaving(true)
    try {
      await updateProgram(selectedProgramId, {
        totalSeats: Number(totalSeats),
        seatMatrix: categoryPcts,
        pwdQuotaPct: Number(pwdQuotaPct),
        updatedAt: serverTimestamp(),
      })

      // Also update local state
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === selectedProgramId
            ? { ...p, totalSeats: Number(totalSeats), seatMatrix: categoryPcts, pwdQuotaPct: Number(pwdQuotaPct) }
            : p
        )
      )

      toast.success('Seat allocation updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update seat allocation')
    } finally {
      setSaving(false)
    }
  }

  // Allot seat to student
  const handleAllotSeat = async (app: FirestoreRecord, programIdToAllot?: string) => {
    const targetProgId = programIdToAllot || selectedProgramId || app.programId
    const prog = programs.find((p) => p.id === targetProgId)

    if (!prog) {
      toast.error('Program not found')
      return
    }

    const filled = Number(prog.filledSeats ?? 0)
    const capacity = Number(prog.totalSeats ?? 0)

    if (filled >= capacity) {
      toast.error('No available seats remaining in this program')
      return
    }

    try {
      const uid = universityId || auth.currentUser?.uid

      // Create allotment record
      await addDoc(collection(db, 'seat_allotments'), {
        universityId: uid,
        programId: targetProgId,
        studentId: app.studentId,
        studentName: app.studentName,
        programName: prog.name,
        allottedAt: serverTimestamp(),
        status: 'allotted',
      })

      // Update application status
      await updateDoc(doc(db, 'applications', app.id), {
        status: 'selected',
        allottedProgramId: targetProgId,
        updatedAt: serverTimestamp(),
      })

      // Increment filled seats in program
      await updateDoc(doc(db, 'programs', targetProgId), {
        filledSeats: increment(1),
      })

      toast.success(`Seat allotted to ${app.studentName}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to allot seat')
    }
  }

  const filteredApps = useMemo(() => {
    if (!searchTerm) return []
    return apps.filter(
      (a) =>
        a.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [apps, searchTerm])

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center flex-col gap-3 text-text-muted">
        <Loader2 size={32} className="animate-spin text-brand-accent" />
        <p className="text-sm font-medium">Loading seat allocations...</p>
      </div>
    )
  }

  // EMPTY STATE: No programs exist
  if (programs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-10 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent mx-auto">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Add programs first to configure seat allocation</h2>
            <p className="text-xs text-text-muted max-w-md mx-auto mt-1">
              You must create at least one academic program before configuring intake capacity and reservation matrices.
            </p>
          </div>
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-brand-accent/90 transition-all"
          >
            <Plus size={16} /> Go to Programs Page <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-2 sm:px-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface/60 border border-brand-border p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 size={22} className="text-brand-accent" />
            Seat Allocation
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Manage intake capacity and category reservation matrices</p>
        </div>

        {/* Program Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="select-program" className="text-xs font-bold uppercase tracking-wider text-text-muted shrink-0">
            Select Program:
          </label>
          <select
            id="select-program"
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="input-dark text-xs p-2.5 rounded-xl border border-brand-border bg-brand-surface text-text-primary min-w-[220px]"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.totalSeats || 0} seats)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 100% Validation Alert Banner */}
      {!isValid100Pct && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <div className="text-xs">
              <strong className="font-bold block">Invalid Seat Allocation Percentages</strong>
              Total reservation percentages must add up to exactly 100%. Current total: <span className="font-extrabold">{totalPctSum}%</span>.
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-red-500/20 px-3 py-1 rounded-lg">
            {totalPctSum > 100 ? `+${(totalPctSum - 100).toFixed(1)}%` : `${(totalPctSum - 100).toFixed(1)}%`}
          </span>
        </div>
      )}

      {/* Capacity & Matrix Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Seat Matrix Table & Total Seats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
            {/* Top row: Capacity & Save */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-brand-border pb-4">
              <div className="flex items-center gap-3">
                <div>
                  <label htmlFor="total-capacity" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    Total Intake Capacity
                  </label>
                  <input
                    id="total-capacity"
                    type="number"
                    min={1}
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(parseInt(e.target.value) || 1)}
                    className="input-dark text-sm font-bold p-2 w-28 rounded-xl border border-brand-border bg-brand-bg text-text-primary"
                  />
                </div>

                <div>
                  <label htmlFor="pwd-quota" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                    <Info size={11} /> PwD Horizontal Quota (%)
                  </label>
                  <input
                    id="pwd-quota"
                    type="number"
                    min={0}
                    max={20}
                    value={pwdQuotaPct}
                    onChange={(e) => setPwdQuotaPct(parseFloat(e.target.value) || 0)}
                    className="input-dark text-sm font-bold p-2 w-28 rounded-xl border border-brand-border bg-brand-bg text-text-primary"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleUpdateAllocation}
                disabled={!isValid100Pct || saving}
                className="bg-brand-accent text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:bg-brand-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Update Allocation</span>
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border text-text-muted uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Reservation Category</th>
                    <th className="py-3 px-3 w-28">Reserved %</th>
                    <th className="py-3 px-3">Reserved Seats</th>
                    <th className="py-3 px-3">Applied</th>
                    <th className="py-3 px-3">Selected</th>
                    <th className="py-3 px-3">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {categoryRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-text-primary flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />
                        {row.name}
                      </td>
                      <td className="py-3.5 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={100}
                          value={row.pct}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setCategoryPcts({ ...categoryPcts, [row.id]: val })
                          }}
                          className="input-dark text-xs p-1.5 w-20 rounded-lg border border-brand-border bg-brand-bg text-text-primary font-semibold"
                        />
                      </td>
                      <td className="py-3.5 px-3 font-bold text-text-primary">{row.reservedSeats}</td>
                      <td className="py-3.5 px-3 text-text-secondary">{row.applied}</td>
                      <td className="py-3.5 px-3 text-emerald-500 font-bold">{row.selected}</td>
                      <td className="py-3.5 px-3 font-bold text-brand-accent">{row.available}</td>
                    </tr>
                  ))}

                  {/* PwD Horizontal Quota Row */}
                  <tr className="bg-brand-accent/5 font-semibold text-text-secondary">
                    <td className="py-3.5 px-3 flex items-center gap-2">
                      <Info size={14} className="text-brand-accent shrink-0" />
                      <span>PwD (Persons with Disability)</span>
                    </td>
                    <td className="py-3.5 px-3 font-bold">{pwdQuotaPct}%</td>
                    <td className="py-3.5 px-3 font-bold">{Math.round(((pwdQuotaPct || 0) / 100) * totalSeats)}</td>
                    <td className="py-3.5 px-3" colSpan={3}>
                      <span className="text-[11px] text-text-muted italic">Horizontal reservation applied across all categories</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Visual Donut Chart */}
        <div className="space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
            <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
              <PieChart size={16} className="text-brand-accent" />
              Category Breakdown (Donut Chart)
            </h3>

            {/* Donut Chart SVG */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {donutSlices.map((slice) => (
                    <path
                      key={slice.id}
                      d={slice.pathData}
                      fill={slice.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <title>{`${slice.name}: ${slice.pct}% (${slice.reservedSeats} seats)`}</title>
                    </path>
                  ))}
                </svg>
                {/* Center Circle Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-extrabold text-text-primary">{totalSeats}</span>
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Total Seats</span>
                </div>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 pt-2 border-t border-brand-border">
              {categoryRows.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="text-text-secondary truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-text-muted">{cat.pct}%</span>
                    <span className="font-bold text-text-primary">{cat.reservedSeats}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Seat Allotment Section */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
        <h3 className="section-label font-bold text-text-primary flex items-center gap-2">
          <Users size={16} className="text-brand-accent" />
          Manual Applicant Allotment
        </h3>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search student name or email to allot seat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-dark pl-9 py-2 text-xs rounded-xl border border-brand-border bg-brand-bg text-text-primary w-full"
          />
        </div>

        <div className="space-y-3">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-xl border border-brand-border bg-brand-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-text-primary">{app.studentName}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-brand-border text-[10px] text-text-muted uppercase">
                    {(app.category as string) || 'General'}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Applied for: <strong className="text-text-secondary">{app.programName || 'Program'}</strong>
                </p>
              </div>

              {app.status === 'selected' || app.status === 'allotted' ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                  <CheckCircle2 size={14} /> Seat Allotted
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAllotSeat(app)}
                  className="bg-brand-accent text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-brand-accent/90 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Award size={14} /> Allot Seat
                </button>
              )}
            </div>
          ))}

          {searchTerm && filteredApps.length === 0 && (
            <p className="text-xs text-text-muted italic py-4 text-center">No student applications found matching search.</p>
          )}

          {!searchTerm && (
            <div className="py-6 text-center text-text-muted text-xs border border-dashed border-brand-border rounded-xl">
              Type applicant name in search bar above to manually allot seats.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
