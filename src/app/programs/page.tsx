'use client'

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms, deleteProgram } from '@/lib/firebase/programs'
import { Plus, Edit2, Trash2, Calendar, IndianRupee, AlertCircle, BookOpen, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/Toast'
import ProgramPanel from '@/components/ProgramPanel'

// ─── Deadline badge ────────────────────────────────────────────────────────────

function DeadlineBadge({ date }: { date: string }) {
  const d = new Date(date)
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000)
  const color = daysLeft < 30 ? 'var(--red)' : daysLeft < 60 ? 'var(--gold)' : 'var(--text-muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color }}>
      <Calendar size={12} />
      <span style={{ fontSize: '12px', fontWeight: '500' }}>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      {daysLeft > 0 && daysLeft < 60 && (
        <span style={{ fontSize: '11px', color }}>{daysLeft}d left</span>
      )}
    </div>
  )
}

// ─── Program card ─────────────────────────────────────────────────────────────

function ProgramCard({ p, onEdit, onDelete }: { p: FirestoreRecord; onEdit: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const filled = (p.filledSeats as number) || 0
  const total = (p.totalSeats as number) || 1
  const pct = Math.min(100, (filled / total) * 100)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: '10px',
        padding: '18px 20px',
        boxShadow: hovered ? 'var(--shadow-hover)' : 'var(--shadow-card)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {p.level && (
            <span className="badge badge-info" style={{ marginBottom: '6px', display: 'inline-flex' }}>
              {p.level as string}
            </span>
          )}
          <h3 style={{
            fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)',
            margin: 0, letterSpacing: '-0.2px', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {p.name as string}
          </h3>
        </div>

        {/* Actions — always visible, not hidden on hover (better UX) */}
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button
            onClick={onEdit}
            title="Edit"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', padding: '5px', borderRadius: '5px',
              display: 'flex', transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', padding: '5px', borderRadius: '5px',
              display: 'flex', transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Duration', value: p.duration as string || '—' },
          { label: 'Total', value: String(p.totalSeats || 0) },
          { label: 'Available', value: String(total - filled), green: true },
        ].map(stat => (
          <div key={stat.label}>
            <div className="text-eyebrow" style={{ marginBottom: '2px' }}>{stat.label}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: stat.green ? 'var(--green)' : 'var(--text-primary)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Seat utilization */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span className="text-eyebrow">Utilization</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{filled} / {total}</span>
        </div>
        <div style={{ height: '3px', background: 'var(--bg-card-hover)', borderRadius: '2px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }}
          />
        </div>
      </div>

      {/* Fee + deadline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gold)', fontSize: '13px', fontWeight: '600' }}>
          <IndianRupee size={13} />
          {((p.annualFee as number) || 0).toLocaleString('en-IN')}/yr
        </div>
        {p.deadline && <DeadlineBadge date={p.deadline as string} />}
      </div>

      {/* Entrance exam notice */}
      {p.hasEntranceExam && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
          <AlertCircle size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '500' }}>
            {(p.entranceExam as string) || 'Entrance exam required'}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<FirestoreRecord[]>([])
  const [editingProgram, setEditingProgram] = useState<FirestoreRecord | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        const unsubProgs = subscribeToPrograms(user.uid, data => {
          setPrograms(data)
          setLoading(false)
        })
        return () => unsubProgs()
      }
    })
    return () => unsub()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteProgram(id)
      toast.success('Program deleted')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete program')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Programs</h1>
          <p className="page-subtitle">Manage your academic course offerings</p>
        </div>
        <button
          onClick={() => { setEditingProgram(null); setIsPanelOpen(true) }}
          className="btn-primary"
          style={{ gap: '6px' }}
        >
          <Plus size={13} /> New Program
        </button>
      </div>

      {/* Grid */}
      {programs.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px', textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: '10px',
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>No programs yet</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', marginBottom: '20px' }}>
            Start building your academic portfolio by adding your first program.
          </p>
          <button onClick={() => setIsPanelOpen(true)} className="btn-primary" style={{ gap: '6px' }}>
            <Plus size={13} /> Create first program
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {programs.map(p => (
            <ProgramCard
              key={p.id}
              p={p}
              onEdit={() => { setEditingProgram(p); setIsPanelOpen(true) }}
              onDelete={() => setDeleteConfirm(p.id)}
            />
          ))}
        </div>
      )}

      {/* Program panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <ProgramPanel
            program={editingProgram}
            onClose={() => { setIsPanelOpen(false); setEditingProgram(null) }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50 }}
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '360px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: '12px', boxShadow: 'var(--shadow-dropdown)',
                zIndex: 51, padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Delete program?</h3>
                <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}>
                  <X size={16} />
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
                This will also affect active applications. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm!)} className="btn-danger" style={{ flex: 1 }}>Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}