'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { auth, db } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { subscribeToApplications } from '@/lib/firebase/applications'
import { 
  Search, 
  Send, 
  Play, 
  CheckCircle2, 
  BarChart3
} from 'lucide-react'
import { motion } from 'framer-motion'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { useToast } from '@/components/Toast'

export default function SeatAllocationPage() {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubProgs = subscribeToPrograms(user.uid, setPrograms)
        const unsubApps = subscribeToApplications(user.uid, (data) => {
          setApps(data)
          setLoading(false)
        })
        return () => {
          unsubProgs()
          unsubApps()
        }
      }
    })
    return () => unsubscribeAuth()
  }, [])

  const handleAllotSeat = async (app: FirestoreRecord, programId: string) => {
    try {
      const universityId = auth.currentUser?.uid
      const program = programs.find(p => p.id === programId)
      
      if (!program) {
        toast.error('Program not found')
        return
      }

      if (Number(program.filledSeats ?? 0) >= Number(program.totalSeats ?? 0)) {
        toast.error('No seats available in this program')
        return
      }

      // 1. Create allotment record
      await addDoc(collection(db, 'seat_allotments'), {
        universityId,
        programId,
        studentId: app.studentId,
        studentName: app.studentName,
        programName: program.name,
        allottedAt: serverTimestamp(),
        status: 'allotted'
      })

      // 2. Update application status
      await updateDoc(doc(db, 'applications', app.id), {
        status: 'selected',
        allottedProgramId: programId,
        updatedAt: serverTimestamp()
      })

      // 3. Increment filled seats in program
      await updateDoc(doc(db, 'programs', programId), {
        filledSeats: increment(1)
      })

      // 4. Notify student
      await addDoc(collection(db, 'notifications'), {
        userId: app.studentId,
        title: 'Seat Allotted!',
        message: `Congratulations! You have been allotted a seat in ${program.name}.`,
        type: 'selected',
        isRead: false,
        createdAt: serverTimestamp()
      })

      toast.success('Seat allotted successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to allot seat')
    }
  }

  const filteredApps = useMemo(() => {
    if (!searchTerm) return []
    return apps.filter(a => 
      a.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [apps, searchTerm])

  if (loading) return null

  return (
    <div className="space-y-8">
      {/* Seat Matrix */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="text-brand-primary" size={20} />
          Seat Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((p) => {
            const totalSeats = Number(p.totalSeats) || 0
            const filledSeats = Number(p.filledSeats) || 0
            const available = totalSeats - filledSeats
            const fillPct = totalSeats > 0 ? Math.round((filledSeats / totalSeats) * 100) : 0
            
            return (
              <div key={p.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '20px',
                boxShadow: 'var(--shadow-card)'
              }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>{p.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fill Status</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{filledSeats} / {totalSeats}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: available > 0 ? 'var(--indigo-light)' : 'var(--red)' }}>
                      {available > 0 ? `${available} available` : 'Full'}
                    </div>
                  </div>
                </div>
                <div style={{
                  height: '6px', borderRadius: '100px',
                  background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: '8px',
                }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(fillPct, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                      height: '100%', borderRadius: '100px',
                      background: fillPct > 85 ? 'var(--red)' : fillPct > 60 ? 'var(--gold)' : 'var(--indigo)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Counselling Rounds */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Counselling Rounds</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((round) => (
              <div key={round} className="p-5 rounded-2xl border border-white/5 bg-white/1 flex items-center justify-between group">
                <div>
                  <h4 className="font-bold text-white">Round {round}</h4>
                  <p className="text-xs text-text-muted mt-1">
                    {round === 1 ? 'Rank 1-500' : round === 2 ? 'Rank 501-1500' : 'Open Round'}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    round === 1 ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-primary/10 text-brand-primary'
                  }`}>
                    {round === 1 ? 'Active' : 'Upcoming'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="px-4 py-1.5 rounded-lg bg-white/5 border border-brand-border text-white text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-colors">
                    <Send size={12} /> Notify
                  </button>
                  <button className="px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
                    <Play size={12} /> Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Allotment */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Seat Allotment</h3>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text"
              placeholder="Search by student name, roll number, or rank..."
              className="input-dark pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredApps.map((app) => (
              <motion.div 
                key={app.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl border border-white/5 bg-white/2"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">{app.studentName}</h4>
                    <p className="text-[10px] text-brand-primary font-bold uppercase mt-0.5">
                      Applied for: {app.programName}
                    </p>
                  </div>
                  {app.status === 'selected' ? (
                    <CheckCircle2 size={20} className="text-brand-success" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <select 
                        className="h-8 bg-brand-bg border border-white/10 rounded-lg text-[10px] font-bold text-white px-2"
                        onChange={(e) => handleAllotSeat(app, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Allot Seat</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 bg-black/20 rounded-lg">
                    <p className="text-[8px] uppercase text-text-muted font-bold">12th Marks</p>
                    <p className="text-xs font-bold text-white">{app.academicData?.twelfthPercentage || 'N/A'}%</p>
                  </div>
                  <div className="p-2 bg-black/20 rounded-lg">
                    <p className="text-[8px] uppercase text-text-muted font-bold">Entrance Score</p>
                    <p className="text-xs font-bold text-brand-gold">{app.entranceScore || 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {searchTerm && filteredApps.length === 0 && (
              <p className="text-center py-8 text-text-muted text-sm italic">No students found</p>
            )}
            {!searchTerm && (
              <div className="text-center py-12 border border-dashed border-brand-border rounded-2xl text-text-muted">
                <Search className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-xs font-medium">Search for a student to begin allotment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
