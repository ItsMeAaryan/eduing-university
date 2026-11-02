'use client'

// Offer Planner — predicts which applicants will accept an offer and how many
// offers to send so each program fills without overshooting.
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { Loader2, Target, TrendingUp, TrendingDown, Info, ArrowRight, BookOpen } from 'lucide-react'
import { auth, db } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import type { FirestoreRecord } from '@/lib/firebase/types'
import { subscribeToPrograms } from '@/lib/firebase/programs'
import { subscribeToApplications } from '@/lib/firebase/applications'
import {
  ACCEPTED, OFFERED, DECLINED, CANDIDATE, FEATURES, PRIOR,
  features, fit, crossValidate, score, reasons, planOffers, type Example, type Weights,
} from '@/lib/yieldModel'

const PANEL = 'rounded-2xl border border-brand-border bg-brand-surface'
const pct = (p: number) => `${Math.round(p * 100)}%`
const marksOf = (a: FirestoreRecord) => {
  const v = parseFloat(String(a.studentProfile?.twelfthScore ?? a.studentProfile?.percentage ?? a.percentage ?? '').replace(/[^0-9.]/g, ''))
  return isFinite(v) ? v : null
}
const programOf = (a: FirestoreRecord, programs: FirestoreRecord[]) =>
  programs.find(p => p.id === a.programId || p.id === a.allottedProgramId) ?? programs.find(p => p.name && (p.name === a.programName || p.name === a.program))
const status = (a: FirestoreRecord) => String(a.status || 'submitted').toLowerCase()

// ── sample data (for demos; never written anywhere) ───────────────────────
const SAMPLE_STATES = ['Karnataka', 'Karnataka', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Maharashtra', 'Bihar', 'Delhi']
function makeSample(uniState: string): { programs: FirestoreRecord[]; apps: FirestoreRecord[] } {
  let seed = 7
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const deadline = new Date(Date.now() + 30 * 86400000)
  const program: FirestoreRecord = { id: 'sample-program', name: 'B.Tech Computer Science (sample)', totalSeats: 60, annualFee: 250000, applicationDeadline: deadline.toISOString() }
  const truth = { bias: 0.4, merit: -0.8, home: 0.9, afford: 0.5, early: 0.3, engaged: 0.4, scholarship: 0.9 } as Weights
  const person = (i: number, status: string): FirestoreRecord => {
    const marks = Math.round(Math.min(99, Math.max(55, 78 + (r() - 0.5) * 34)) * 10) / 10
    const st = r() < 0.5 ? (uniState || 'Karnataka') : SAMPLE_STATES[Math.floor(r() * SAMPLE_STATES.length)]
    const income = [3, 4.5, 6, 8, 12, 18, 25][Math.floor(r() * 7)]
    const shared = r() < 0.7
    const studentProfile: Record<string, string> = shared
      ? { fullName: `Applicant ${String(i).padStart(3, '0')}`, twelfthScore: String(marks), state: st, annualIncome: `${income} lakh`, phone: '9', dob: '2007', gender: '-', category: '-', city: '-' }
      : { twelfthScore: String(marks), state: st }
    const applied = new Date(deadline.getTime() - r() * 75 * 86400000)
    return { id: `sample-${i}`, studentName: `Applicant ${String(i).padStart(3, '0')}`, programId: program.id, status, studentProfile, appliedAt: applied.toISOString(), scholarshipAwarded: r() < 0.15 }
  }
  const apps: FirestoreRecord[] = []
  let i = 1
  for (let k = 0; k < 140; k++) {          // last cycle: decided offers the model learns from
    const a = person(i++, 'selected')
    const y = r() < score(truth, features(a, program, uniState))
    apps.push({ ...a, status: y ? 'enrolled' : 'offer_declined', statusHistory: [{ status: 'selected' }], programId: 'sample-past' })
  }
  for (let k = 0; k < 18; k++) apps.push(person(i++, 'seat_accepted'))
  for (let k = 0; k < 15; k++) apps.push(person(i++, 'selected'))
  for (let k = 0; k < 90; k++) apps.push(person(i++, 'under_review'))
  return { programs: [program, { id: 'sample-past', name: 'Last cycle (sample)', totalSeats: 0, annualFee: 250000, applicationDeadline: deadline.toISOString() }], apps }
}

export default function OfferPlannerPage() {
  const { user, userData } = useAuth()
  const universityId = userData?.universityId || user?.uid || auth.currentUser?.uid
  const [livePrograms, setPrograms] = useState<FirestoreRecord[]>([])
  const [liveApps, setApps] = useState<FirestoreRecord[]>([])
  const [uniState, setUniState] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickedId, setProgramId] = useState('')
  const [risk, setRisk] = useState(0.1)
  const [sample, setSample] = useState(false)

  useEffect(() => {
    if (!universityId) return
    getDoc(doc(db, 'universities', universityId)).then(s => setUniState(String(s.data()?.state || ''))).catch(() => {})
    const u1 = subscribeToPrograms(universityId, p => { setPrograms(p); setProgramId(id => id || p[0]?.id || '') })
    const u2 = subscribeToApplications(universityId, a => { setApps(a); setLoading(false) }, e => { setError(e.message); setLoading(false) })
    return () => { u1(); u2() }
  }, [universityId])

  const live = { programs: livePrograms, apps: liveApps }
  const sampleData = useMemo(() => (sample ? makeSample(uniState) : null), [sample, uniState])
  const { programs, apps } = sampleData ?? live
  const programId = sample ? (programs.some(p => p.id === pickedId) ? pickedId : 'sample-program') : pickedId

  // Train on every decided offer this university has (all programs)
  const { weights, examples, evaluation } = useMemo(() => {
    const ex: Example[] = []
    for (const a of apps) {
      const s = status(a)
      const wasOffered = (Array.isArray(a.statusHistory) && (a.statusHistory as { status?: string }[]).some(h => OFFERED.includes(String(h?.status)))) || ACCEPTED.includes(s) || DECLINED.includes(s)
      if (!wasOffered) continue
      const y = ACCEPTED.includes(s) ? 1 : DECLINED.includes(s) || s === 'withdrawn' ? 0 : null
      if (y === null) continue
      ex.push({ x: features(a, programOf(a, programs), uniState), y: y as 0 | 1 })
    }
    return { examples: ex, weights: fit(ex) as Weights, evaluation: crossValidate(ex) }
  }, [apps, programs, uniState])

  const program = programs.find(p => p.id === programId)
  const view = useMemo(() => {
    if (!program) return null
    const mine = apps.filter(a => programOf(a, programs)?.id === program.id)
    const capacity = Number(program.totalSeats ?? program.seats ?? program.intake ?? 0)
    const accepted = mine.filter(a => ACCEPTED.includes(status(a)))
    const pending = mine.filter(a => OFFERED.includes(status(a))).map(a => ({ a, p: score(weights, features(a, program, uniState)) }))
    const candidates = mine.filter(a => CANDIDATE.includes(status(a)))
      .map(a => { const x = features(a, program, uniState); return { a, p: score(weights, x), why: reasons(weights, x), marks: marksOf(a) } })
      .sort((x, y) => (y.marks ?? -1) - (x.marks ?? -1))
    const seatsLeft = Math.max(0, capacity - accepted.length)
    const plan = planOffers(pending.map(x => x.p), candidates.map(c => c.p), seatsLeft, risk)
    return { mine, capacity, accepted, pending, candidates, seatsLeft, plan }
  }, [program, apps, programs, weights, uniState, risk])

  if (loading && universityId) {
    return <div className="flex min-h-[400px] items-center justify-center text-text-muted"><Loader2 size={28} className="animate-spin text-brand-accent" /></div>
  }
  if (programs.length === 0 && !sample) {
    return (
      <div className="mx-auto max-w-3xl py-16 px-4">
        <div className={`${PANEL} space-y-4 p-10 text-center`}>
          <BookOpen size={30} className="mx-auto text-brand-accent" />
          <h1 className="text-xl font-bold text-text-primary">Add a program to plan offers</h1>
          <Link href="/programs" className="inline-flex items-center gap-2 rounded-2xl bg-brand-accent px-5 py-3 text-xs font-bold text-white">Go to Programs <ArrowRight size={14} /></Link>
        </div>
      </div>
    )
  }

  const learning = examples.length
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 pb-20 sm:px-4">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text-primary"><Target size={22} className="text-brand-accent" /> Offer Planner</h1>
        <p className="max-w-3xl text-sm text-text-muted">Predicts which applicants will take your offer, and how many offers to send so each program fills without going over. It learns from every offer your students accept or decline.</p>
        <label className="mt-2 inline-flex w-fit items-center gap-2 text-xs font-semibold text-text-secondary">
          <input type="checkbox" checked={sample} onChange={e => setSample(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand-accent)]" />
          Show with sample applicants (for demos — nothing is saved)
        </label>
      </header>
      {sample && <p className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 text-xs font-semibold text-brand-gold">Sample data: 140 past offers and 123 made-up applicants. Switch it off to see your real applications.</p>}
      {error && <p role="alert" className="rounded-xl border border-brand-error/30 bg-brand-error/10 px-4 py-3 text-sm text-brand-error">Could not load applications: {error}</p>}

      <div className={`${PANEL} flex flex-wrap items-end gap-4 p-4`}>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-text-secondary">
          Program
          <select value={programId} onChange={e => setProgramId(e.target.value)} className="h-10 rounded-xl border border-brand-border bg-brand-bg px-3 text-sm text-text-primary">
            {programs.map(p => <option key={p.id} value={p.id}>{p.name || 'Untitled program'}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
          Highest risk of more acceptances than seats you accept
          <div className="flex gap-1">
            {[0.05, 0.1, 0.25].map(c => (
              <button key={c} onClick={() => setRisk(c)} aria-pressed={risk === c}
                className={`h-10 rounded-xl border px-4 text-sm font-semibold ${risk === c ? 'border-brand-accent bg-brand-accent text-white' : 'border-brand-border text-text-secondary hover:text-text-primary'}`}>{pct(c)}</button>
            ))}
          </div>
        </div>
      </div>

      {view && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Seats" value={view.capacity ? String(view.capacity) : '—'} sub={view.capacity ? `${view.accepted.length} accepted · ${view.seatsLeft} open` : 'Set total seats on the program'} />
            <Stat label="Offers out, waiting for reply" value={String(view.pending.length)} sub={view.pending.length ? `about ${view.pending.reduce((s, x) => s + x.p, 0).toFixed(1)} expected to accept` : 'none'} />
            <Stat label="Send this round" value={view.capacity ? String(view.plan.newOffers) : '—'} sub={!view.capacity ? '' : view.seatsLeft === 0 ? 'Program is full' : view.plan.newOffers ? `next ${view.plan.newOffers} on the merit list · ${pct(view.plan.overfillChance)} overbooking risk` : view.candidates.length ? 'wait for replies before sending more' : 'no applicants left in review'} accent />
            <Stat label="Seats filled after this round" value={view.capacity ? `≈ ${Math.min(view.capacity, Math.round(view.accepted.length + view.plan.expectedAccepted))}` : '—'} sub={view.capacity ? `${pct(view.plan.fillChance)} chance every seat fills now${view.plan.reachable ? '' : ' — you need more applicants'}` : ''} />
          </div>

          {view.capacity > 0 && view.plan.dist.length > 1 && (
            <div className={`${PANEL} p-5`}>
              <h2 className="text-sm font-bold text-text-primary">Likely acceptances after this round ({view.pending.length + view.plan.newOffers} offers out)</h2>
              <p className="mb-4 text-xs text-text-muted">How many students accept, and how likely each count is. {view.seatsLeft} seat{view.seatsLeft === 1 ? ' is' : 's are'} open.</p>
              {(() => {
                const d = view.plan.dist
                let lo = d.findIndex(q => q > 0.002); let hi = d.length - 1
                while (hi > 0 && d[hi] <= 0.002) hi--
                lo = Math.max(0, Math.min(lo, view.seatsLeft - 2)); hi = Math.max(hi, view.seatsLeft + 1)
                const max = Math.max(...d)
                return (
                  <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={d.slice(lo, hi + 1).map((q, j) => `${lo + j} accept: ${pct(q)}`).join(', ')}>
                    {d.slice(lo, hi + 1).map((q, j) => {
                      const k = lo + j
                      return (
                        <div key={k} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                          <div className={`w-full rounded-t ${k === view.seatsLeft ? 'bg-text-primary' : k > view.seatsLeft ? 'bg-brand-error/60' : 'bg-brand-accent/35'}`} style={{ height: `${Math.max(2, (q / max) * 110)}px` }} title={`${k} accept: ${pct(q)}`} />
                          <span className={`text-[10px] ${k === view.seatsLeft ? 'font-bold text-text-primary' : 'text-text-muted'}`}>{k}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <p className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand-accent/35" /> seats left empty</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-text-primary" /> exactly full</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand-error/60" /> more acceptances than seats</span>
              </p>
            </div>
          )}

          <div className={`${PANEL} overflow-hidden`}>
            <div className="border-b border-brand-border px-5 py-3">
              <h2 className="text-sm font-bold text-text-primary">Applicants still in review, by marks</h2>
              <p className="text-xs text-text-muted">Highlighted rows are this round&apos;s offers. Send the next round once these students reply — the planner updates as they do. Chances come from the model; the reasons show what moved them.</p>
            </div>
            {view.candidates.length === 0 && view.pending.length === 0 ? (
              <p className="p-5 text-sm text-text-muted">No applicants waiting for a decision in this program.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs text-text-muted">
                    <tr><th className="px-5 py-2 font-semibold">Applicant</th><th className="px-3 py-2 font-semibold">12th %</th><th className="px-3 py-2 font-semibold">Will accept</th><th className="px-3 py-2 font-semibold">Why</th><th className="px-5 py-2" /></tr>
                  </thead>
                  <tbody>
                    {view.pending.map(({ a, p }) => (
                      <tr key={a.id} className="border-t border-brand-border">
                        <td className="px-5 py-3 font-semibold text-text-primary">{a.studentName || a.studentProfile?.fullName || a.studentEmail || 'Applicant'} <span className="ml-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-bold text-brand-gold">Offer sent</span></td>
                        <td className="px-3 py-3 text-text-secondary">{marksOf(a) ?? '—'}</td>
                        <td className="px-3 py-3 font-bold text-text-primary">{pct(p)}</td>
                        <td className="px-3 py-3 text-xs text-text-muted">Waiting for the student</td>
                        <td className="px-5 py-3 text-right"><Link href={`/students/${a.id}`} className="text-xs font-semibold text-brand-accent">Open</Link></td>
                      </tr>
                    ))}
                    {view.candidates.map((c, i) => (
                      <tr key={c.a.id} className={`border-t border-brand-border ${i < view.plan.newOffers ? 'bg-brand-accent/5' : ''}`}>
                        <td className="px-5 py-3 font-semibold text-text-primary">{c.a.studentName || c.a.studentProfile?.fullName || c.a.studentEmail || 'Applicant'}{i < view.plan.newOffers && <span className="ml-2 rounded-full bg-brand-accent/15 px-2 py-0.5 text-[10px] font-bold text-brand-accent">Offer now</span>}</td>
                        <td className="px-3 py-3 text-text-secondary">{c.marks ?? '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-10 font-bold text-text-primary">{pct(c.p)}</span>
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-brand-border"><span className="block h-full rounded-full bg-brand-accent" style={{ width: pct(c.p) }} /></span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-text-secondary">
                          {c.why.length ? c.why.map((r, k) => (
                            <span key={k} className="mr-3 inline-flex items-center gap-1">{r.up ? <TrendingUp size={12} className="text-brand-success" /> : <TrendingDown size={12} className="text-brand-error" />}{r.text}</span>
                          )) : <span className="text-text-muted">Typical applicant</span>}
                        </td>
                        <td className="px-5 py-3 text-right"><Link href={`/students/${c.a.id}`} className="text-xs font-semibold text-brand-accent">Open</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className={`${PANEL} space-y-4 p-5`}>
        <div>
          <h2 className="text-sm font-bold text-text-primary">How the prediction works</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-secondary">
            A logistic-regression model scores each applicant from marks, home state, fee against family income, how early they applied, whether they shared their details and any scholarship you offered. It starts from general assumptions and is re-fitted on your own decided offers every time this page opens, so it adapts to your university. Category, religion and gender are never used. The number of offers comes from the exact probability distribution of acceptances.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-xl border border-brand-border px-3 py-2 text-text-secondary">Learned from <strong className="text-text-primary">{learning}</strong> decided offer{learning === 1 ? '' : 's'}</span>
          {evaluation ? (
            <>
              <span className="rounded-xl border border-brand-border px-3 py-2 text-text-secondary">Cross-validated: <strong className="text-text-primary">{pct(evaluation.accuracy)}</strong> of accept/decline calls right</span>
              <span className="rounded-xl border border-brand-border px-3 py-2 text-text-secondary">Error (Brier) <strong className="text-text-primary">{evaluation.brier.toFixed(3)}</strong> vs {evaluation.brierBaseRate.toFixed(3)} guessing your average rate</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-text-muted"><Info size={12} /> Accuracy is shown once 20 offers have been accepted or declined; until then it leans on the starting assumptions.</span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => {
            const w = weights[f.key], w0 = PRIOR[f.key]
            return (
              <div key={f.key} className="flex items-center justify-between rounded-xl border border-brand-border px-3 py-2 text-xs">
                <span className="text-text-secondary">{f.label}</span>
                <span className={`font-bold ${w >= 0 ? 'text-brand-success' : 'text-brand-error'}`}>{w >= 0 ? 'raises' : 'lowers'} chance{Math.abs(w - w0) > 0.05 ? ' · learned' : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-brand-accent/40 bg-brand-accent/10' : 'border-brand-border bg-brand-surface'}`}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-brand-accent' : 'text-text-primary'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  )
}
