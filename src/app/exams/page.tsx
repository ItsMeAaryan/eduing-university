'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { auth, db } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { subscribeToApplications } from '@/lib/firebase/applications'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Users, 
  Download, 
  Printer, 
  FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { useToast } from '@/components/Toast'
import Link from 'next/link'

export default function ExamManagementPage() {
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [apps, setApps] = useState<FirestoreRecord[]>([])
  const [schedules, setSchedules] = useState<FirestoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('schedule')

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubProgs = subscribeToPrograms(user.uid, (data) => {
          setPrograms(data.filter(p => p.hasEntranceExam))
        })
        const unsubApps = subscribeToApplications(user.uid, setApps)
        
        const q = query(collection(db, 'exam_schedules'), where('universityId', '==', user.uid))
        const unsubSchedules = onSnapshot(q, (snapshot) => {
          setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
          setLoading(false)
        })

        return () => {
          unsubProgs()
          unsubApps()
          unsubSchedules()
        }
      }
    })
    return () => unsubscribeAuth()
  }, [])

  if (loading) return null

  const tabs = [
    { id: 'schedule', label: 'Exam Schedule', icon: Calendar },
    { id: 'admit_cards', label: 'Admit Cards', icon: FileText },
    { id: 'results', label: 'Results', icon: CheckCircle },
    { id: 'rank_list', label: 'Rank List', icon: Users },
  ]

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-brand-primary text-white shadow-lg' 
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'schedule' && <ExamScheduleView programs={programs} schedules={schedules} apps={apps} />}
        {activeTab === 'admit_cards' && <AdmitCardsView programs={programs} schedules={schedules} apps={apps} />}
        {activeTab === 'results' && <ResultsView programs={programs} schedules={schedules} apps={apps} />}
        {activeTab === 'rank_list' && <RankListView programs={programs} schedules={schedules} apps={apps} />}
      </div>
    </div>
  )
}

function ExamScheduleView({ programs, schedules, apps }: { programs: FirestoreRecord[], schedules: FirestoreRecord[], apps: FirestoreRecord[] }) {
  const { toast } = useToast()
  const [isFormOpen, setIsFormOpen] = useState<string | null>(null)

  const handlePublish = async (programId: string, formData: Record<string, unknown>) => {
    try {
      const uid = auth.currentUser?.uid
      await addDoc(collection(db, 'exam_schedules'), {
        ...formData,
        programId,
        universityId: uid,
        isPublished: true,
        createdAt: serverTimestamp()
      })
      
      // Notify applicants
      const programApps = apps.filter((a: FirestoreRecord) => a.programId === programId)
      const program = programs.find((p: FirestoreRecord) => p.id === programId)
      if (!program) {
        toast.error('Program not found')
        return
      }
      
      for (const app of programApps) {
        await addDoc(collection(db, 'notifications'), {
          userId: app.studentId,
          title: 'Exam Scheduled',
          message: `Your entrance exam for ${program.name} is scheduled for ${formData.date}.`,
          type: 'exam',
          isRead: false,
          createdAt: serverTimestamp()
        })
      }
      
      toast.success('Exam schedule published!')
      setIsFormOpen(null)
    } catch (error) {
      console.error(error)
      toast.error('Failed to publish schedule')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {programs.map((p: FirestoreRecord) => {
        const schedule = schedules.find((s: FirestoreRecord) => s.programId === p.id)
        return (
          <div key={p.id} className="bg-brand-surface border border-brand-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              {schedule ? (
                <span className="text-[10px] font-bold uppercase text-brand-success bg-brand-success/10 px-2 py-1 rounded">Scheduled</span>
              ) : (
                <span className="text-[10px] font-bold uppercase text-text-muted bg-white/5 px-2 py-1 rounded">Not Scheduled</span>
              )}
            </div>

            {schedule ? (
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <Calendar size={16} className="text-brand-primary" />
                  <span>{schedule.date}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <Clock size={16} className="text-brand-primary" />
                  <span>{schedule.time}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <MapPin size={16} className="text-brand-primary" />
                  <span>{schedule.centers?.length || 0} Exam Centers</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted mb-6">Configure the exam schedule for this program to notify applicants.</p>
            )}

            <button 
              onClick={() => setIsFormOpen(p.id)}
              className={`w-full h-10 rounded-lg text-sm font-bold transition-all ${
                schedule ? 'border border-brand-border text-white hover:bg-white/5' : 'bg-brand-primary text-white hover:bg-brand-primary/90'
              }`}
            >
              {schedule ? 'Edit Schedule' : 'Configure Exam'}
            </button>

            {isFormOpen === p.id && (
              <ExamScheduleForm 
                program={p} 
                onClose={() => setIsFormOpen(null)} 
                onSave={(data: Record<string, unknown>) => handlePublish(p.id, data)}
                initialData={schedule}
              />
            )}
          </div>
        )
      })}
      
      {programs.length === 0 && (
        <div style={{
          gridColumn: '1 / -1',
          textAlign: 'center', padding: '64px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', marginTop: '20px',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📅</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No Exam Schedules Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
            Create entrance exam schedules for your programs. Students will receive admit cards automatically.
          </p>
          <Link href="/programs">
            <button style={{
              padding: '10px 24px', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
              border: 'none', borderRadius: 'var(--radius-md)', color: 'white',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}>
              + Go to Programs
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}

function ExamScheduleForm({ program, onClose, onSave, initialData }: {
  program: FirestoreRecord
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  initialData?: FirestoreRecord
}) {
  const [formData, setFormData] = useState({
    date: initialData?.date || '',
    time: initialData?.time || '',
    centers: initialData?.centers?.join(', ') || '',
    instructions: initialData?.instructions || ''
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-200 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-brand-surface border border-brand-border rounded-2xl p-8 max-w-lg w-full"
      >
        <h3 className="text-xl font-bold text-white mb-6">Configure Exam: {program.name}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="exam-date" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Exam Date</label>
              <input 
                id="exam-date"
                type="date"
                className="input-dark scheme-dark"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="exam-time" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Exam Time</label>
              <input 
                id="exam-time"
                type="time"
                className="input-dark scheme-dark"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label htmlFor="exam-centers" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Exam Centers (Comma separated)</label>
            <input 
              id="exam-centers"
              type="text"
              className="input-dark"
              placeholder="e.g. Bangalore Campus, Mumbai Center"
              value={formData.centers}
              onChange={(e) => setFormData({ ...formData, centers: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="exam-instructions" className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Instructions</label>
            <textarea 
              id="exam-instructions"
              className="input-dark min-h-[100px] resize-none"
              placeholder="Bring your ID card, No electronic devices..."
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-8">
          <button onClick={onClose} className="flex-1 h-11 rounded-lg border border-brand-border text-white font-semibold">Cancel</button>
          <button 
            onClick={() => onSave({ ...formData, centers: formData.centers.split(',').map((c: string) => c.trim()) })}
            className="flex-1 h-11 rounded-lg bg-brand-primary text-white font-semibold"
          >
            Publish Schedule
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function AdmitCardsView({ programs, schedules, apps }: { programs: FirestoreRecord[], schedules: FirestoreRecord[], apps: FirestoreRecord[] }) {
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id || '')
  
  const programApps = apps.filter((a: FirestoreRecord) => a.programId === selectedProgram)
  const schedule = schedules.find((s: FirestoreRecord) => s.programId === selectedProgram)

  if (!selectedProgram) return <div className="text-center py-20 text-text-muted italic">No exam programs found</div>

  return (
    <div className="space-y-6">
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-white">Registered Students</h3>
          <div className="flex items-center gap-4">
            <select 
              className="input-dark w-64"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              {programs.map((p: FirestoreRecord) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button className="h-10 px-4 rounded-lg bg-white/5 border border-brand-border text-white text-sm font-semibold flex items-center gap-2">
              <Printer size={16} />
              Generate All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Roll No</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Student Name</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Center</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {programApps.map((app: FirestoreRecord, i: number) => (
                <tr key={app.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-brand-primary">
                    EXAM2026{String(i + 1).padStart(3, '0')}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{app.studentName}</p>
                    <p className="text-xs text-text-muted">{app.studentEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {schedule?.centers?.[i % schedule.centers.length] || 'TBD'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* TODO: no admit-card generation/download handler exists yet — this button is currently non-functional. Left as-is per audit guardrails (not inventing business logic without a spec); flagging for implementation. */}
                    <button className="p-2 rounded-lg hover:bg-white/5 text-brand-primary" aria-label="Download admit card" disabled>
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {programApps.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-text-muted">No applicants for this program</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ResultsView({ programs, apps }: { programs: FirestoreRecord[], apps: FirestoreRecord[], schedules?: FirestoreRecord[] }) {
  const { toast } = useToast()
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id || '')
  const [scores, setScores] = useState<Record<string, string>>({})

  const programApps = apps.filter((a: FirestoreRecord) => a.programId === selectedProgram)

  const handlePublishResults = async () => {
    try {
      const promise = Promise.all(
        programApps.map(async (app: FirestoreRecord) => {
          const score = scores[app.id]
          if (score === undefined) return
          
          await updateDoc(doc(db, 'applications', app.id), {
            entranceScore: parseFloat(score),
            examStatus: 'results_published',
            updatedAt: serverTimestamp()
          })
          
          await addDoc(collection(db, 'notifications'), {
            userId: app.studentId,
            title: 'Results Published',
            message: `Results for your entrance exam have been published. Check your dashboard.`,
            type: 'results',
            isRead: false,
            createdAt: serverTimestamp()
          })
        })
      )
      
      toast.promise(promise, {
        loading: 'Publishing results...',
        success: 'Results published successfully!',
        error: 'Failed to publish results'
      })
    } catch (error) {
      console.error(error)
      toast.error('Failed to publish results')
    }
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-white">Upload Exam Scores</h3>
        <div className="flex items-center gap-4">
          <select 
            className="input-dark w-64"
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
          >
            {programs.map((p: FirestoreRecord) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={handlePublishResults}
            className="h-10 px-6 rounded-lg bg-brand-primary text-white text-sm font-bold flex items-center gap-2"
          >
            <CheckCircle size={16} />
            Publish Results
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/2">
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Student Name</th>
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Roll No</th>
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold w-40">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {programApps.map((app: FirestoreRecord, i: number) => (
              <tr key={app.id} className="hover:bg-white/2 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">{app.studentName}</td>
                <td className="px-6 py-4 text-sm font-mono text-text-muted">EXAM2026{String(i+1).padStart(3, '0')}</td>
                <td className="px-6 py-4">
                  <input 
                    type="number"
                    className="input-dark h-9 text-center"
                    placeholder="0-100"
                    value={scores[app.id] || app.entranceScore || ''}
                    onChange={(e) => setScores({ ...scores, [app.id]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RankListView({ programs, apps }: { programs: FirestoreRecord[], apps: FirestoreRecord[], schedules?: FirestoreRecord[] }) {
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id || '')
  
  const rankList = useMemo(() => {
    return apps
      .filter((a: FirestoreRecord) => a.programId === selectedProgram && a.entranceScore !== undefined)
      .sort((a: FirestoreRecord, b: FirestoreRecord) => Number(b.entranceScore) - Number(a.entranceScore))
  }, [apps, selectedProgram])

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-white">Merit Rank List</h3>
        <select 
          className="input-dark w-64"
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
        >
          {programs.map((p: FirestoreRecord) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/2">
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Rank</th>
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Student Name</th>
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Score</th>
              <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-text-muted font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {rankList.map((app: FirestoreRecord, i: number) => (
              <tr key={app.id} className="hover:bg-white/2 transition-colors">
                <td className="px-6 py-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    i === 0 ? 'bg-brand-gold text-brand-bg' : 
                    i === 1 ? 'bg-gray-300 text-brand-bg' : 
                    i === 2 ? 'bg-amber-600 text-brand-bg' : 'bg-white/10 text-text-secondary'
                  }`}>
                    #{i + 1}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-white">{app.studentName}</td>
                <td className="px-6 py-4 text-sm font-bold text-brand-primary">{app.entranceScore}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    app.status === 'selected' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-primary/10 text-brand-primary'
                  }`}>
                    {app.status}
                  </span>
                </td>
              </tr>
            ))}
            {rankList.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-text-muted">No scores published yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
