'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { X, Save, BookOpen, Clock, Layers, DollarSign, Users, Briefcase } from 'lucide-react'
import { addProgram, updateProgram } from '@/lib/firebase/programs'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { auth } from '@/lib/firebase/config'
import { useToast } from '@/components/Toast'

interface ProgramPanelProps {
  program: FirestoreRecord | null
  onClose: () => void
}

export default function ProgramPanel({ program, onClose }: ProgramPanelProps) {
  const panelRef = useFocusTrap(true, onClose)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    level: 'UG',
    duration: '4 Years',
    totalSeats: 60,
    filledSeats: 0,
    annualFee: 0,
    deadline: '',
    eligibility: '',
    description: '',
    hasEntranceExam: false,
    entranceExam: '',
    careerProspects: ''
  })

  // "Adjust state when a prop changes" pattern (React docs), computed
  // during render rather than via a useEffect+setState round-trip — this
  // avoids the extra render pass and the cascading-render lint warning
  // that calling setState synchronously inside an effect body produces.
  const [prevProgram, setPrevProgram] = useState(program)
  if (program !== prevProgram) {
    setPrevProgram(program)
    if (program) {
      setFormData({
        name: (program.name as string) || '',
        level: (program.level as string) || 'UG',
        duration: (program.duration as string) || '4 Years',
        totalSeats: (program.totalSeats as number) || 60,
        filledSeats: (program.filledSeats as number) || 0,
        annualFee: (program.annualFee as number) || 0,
        deadline: (program.deadline as string) || '',
        eligibility: (program.eligibility as string) || '',
        description: (program.description as string) || '',
        hasEntranceExam: (program.hasEntranceExam as boolean) || false,
        entranceExam: (program.entranceExam as string) || '',
        careerProspects: (program.careerProspects as string) || ''
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      
      const { getDoc, doc: firestoreDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase/config')
      
      const uniDoc = await getDoc(firestoreDoc(db, 'universities', user.uid))
      const uniData = uniDoc.data()
      
      const programData = {
        // University identifiers
        universityId: user.uid,
        universityName: uniData?.name || '',
        
        // Program details from form
        name: formData.name || '',
        level: formData.level || 'UG',
        duration: formData.duration || '',
        totalSeats: Number(formData.totalSeats) || 0,
        availableSeats: Number(formData.totalSeats) || 0,
        annualFee: Number(formData.annualFee) || 0,
        eligibility: formData.eligibility || '',
        description: formData.description || '',
        hasEntranceExam: formData.hasEntranceExam || false,
        entranceExam: formData.entranceExam || '',
        applicationDeadline: formData.deadline ? new Date(formData.deadline) : null,
        
        // Status must be active so students see it
        status: 'active',
        isActive: true,
      }
      
      if (program) {
        await updateProgram(program.id, programData)
        toast.success('Program updated successfully')
      } else {
        await addProgram(user.uid, programData)
        toast.success('Program added successfully')
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
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-100 flex justify-end"
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
        <div className="px-8 py-6 border-b border-brand-border flex items-center justify-between bg-brand-surface/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {program ? 'Edit Program' : 'New Program'}
            </h2>
            <p className="text-xs text-text-secondary mt-1">Configure your course details and intake capacity</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-text-muted hover:text-white transition-all active:scale-90"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {/* Section: Basic Info */}
          <div className="space-y-6">
            <div>
              <label htmlFor="program-name" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Program Identity</label>
              <div className="relative group">
                <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary-text transition-colors" />
                <input 
                  id="program-name"
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="program-level" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Level</label>
                <select 
                  id="program-level"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="UG">Undergraduate (UG)</option>
                  <option value="PG">Postgraduate (PG)</option>
                  <option value="MBA">MBA</option>
                  <option value="MTech">M.Tech</option>
                  <option value="MBBS">MBBS</option>
                  <option value="LLB">LLB</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
              <div>
                <label htmlFor="program-duration" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Duration</label>
                <input 
                  id="program-duration"
                  type="text" required value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g. 4 Years"
                  className="w-full px-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="program-annualFee" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Annual Fee (₹)</label>
                <div className="relative group">
                  <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary-text transition-colors" />
                  <input 
                    id="program-annualFee"
                    type="number" required value={formData.annualFee}
                    onChange={(e) => setFormData({ ...formData, annualFee: parseInt(e.target.value) || 0 })}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="program-totalSeats" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Intake Capacity</label>
                <div className="relative group">
                  <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary-text transition-colors" />
                  <input 
                    id="program-totalSeats"
                    type="number" required value={formData.totalSeats}
                    onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) || 0 })}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="program-deadline" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Admission Deadline</label>
              <div className="relative group">
                <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary-text transition-colors" />
                <input 
                  id="program-deadline"
                  type="date" required value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all color-scheme-dark"
                />
              </div>
            </div>

            <div>
              <label htmlFor="program-eligibility" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Eligibility Criteria</label>
              <textarea 
                id="program-eligibility"
                value={formData.eligibility}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                placeholder="e.g. 60% in 12th with Physics, Chemistry, and Mathematics"
                className="w-full px-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all min-h-[100px] resize-none placeholder:text-text-muted/50"
              />
            </div>

            {/* Entrance Exam Toggle */}
            <div className="p-5 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary-text">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Entrance Examination</div>
                    <div className="text-[10px] text-text-secondary mt-0.5">Toggle if this program requires a qualifying test</div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, hasEntranceExam: !formData.hasEntranceExam })}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.hasEntranceExam ? 'bg-brand-primary' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${formData.hasEntranceExam ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              {formData.hasEntranceExam && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-brand-primary/10">
                  <input 
                    type="text" placeholder="Specify Exam Name (e.g. JEE Main, NEET)"
                    value={formData.entranceExam}
                    onChange={(e) => setFormData({ ...formData, entranceExam: e.target.value })}
                    required={formData.hasEntranceExam}
                    className="w-full px-4 py-3.5 bg-brand-primary/10 border border-brand-primary/30 rounded-xl text-white text-sm outline-none focus:border-brand-primary transition-all"
                  />
                </motion.div>
              )}
            </div>

            <div>
              <label htmlFor="program-careerProspects" className="block text-[10px] font-bold uppercase tracking-widest text-brand-primary-text mb-2.5">Career Prospects</label>
              <div className="relative group">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary-text transition-colors" />
                <input 
                  id="program-careerProspects"
                  type="text" value={formData.careerProspects}
                  onChange={(e) => setFormData({ ...formData, careerProspects: e.target.value })}
                  placeholder="e.g. Software Engineer, Systems Architect"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/3 border border-brand-border rounded-xl text-white text-sm focus:border-brand-primary focus:bg-white/5 outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 sticky bottom-0 bg-brand-surface pb-8">
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? <Clock className="animate-spin" size={20} /> : (
                <>
                  <Save size={20} />
                  <span>{program ? 'Update Program Details' : 'Create Academic Program'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
