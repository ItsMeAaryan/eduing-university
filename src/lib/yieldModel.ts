// src/lib/yieldModel.ts
// Offer-acceptance ("yield") model for the Offer Planner.
//
// A logistic regression that starts from sensible assumptions (the prior) and
// learns from this university's own decided offers — every accepted or
// declined offer pulls the weights towards what really happens here
// (maximum-a-posteriori fit with a Gaussian prior centred on the starting
// weights). Caste, religion and gender are deliberately NOT used.
//
// From the per-student chances it works out how many offers to send so a
// program fills with the confidence the admissions team asks for
// (exact Poisson-binomial distribution of acceptances).

import type { FirestoreRecord } from '@/lib/firebase/types'

export const ACCEPTED = ['seat_accepted', 'fee_paid', 'payment_verified', 'enrolled']
export const OFFERED = ['selected', 'allotted']
export const DECLINED = ['offer_declined']
export const CANDIDATE = ['submitted', 'under_review', 'docs_verified', 'waitlisted', 'pending', 'review', 'in_review']

export const FEATURES = [
  { key: 'merit', label: 'Marks (12th %)', up: 'Moderate marks — fewer competing offers likely', down: 'Top marks — likely holding other offers' },
  { key: 'home', label: 'Home state', up: 'Lives in your state', down: 'Would have to move from another state' },
  { key: 'afford', label: 'Fee vs family income', up: 'Fee is comfortable for the family income', down: 'Fee is high for the declared family income' },
  { key: 'early', label: 'Applied early', up: 'Applied well before the deadline', down: 'Applied at the last minute' },
  { key: 'engaged', label: 'Shared full details', up: 'Shared full profile details', down: 'Has not shared profile details' },
  { key: 'scholarship', label: 'Scholarship offered', up: 'Has a scholarship from you', down: '' },
] as const
export type FeatureKey = typeof FEATURES[number]['key']

/** Starting weights (log-odds). Intercept ≈ 55% acceptance for an average offer. */
export const PRIOR: Record<FeatureKey | 'bias', number> = {
  bias: 0.2, merit: -0.35, home: 0.6, afford: 0.35, early: 0.2, engaged: 0.3, scholarship: 0.6,
}
const PRIOR_STRENGTH = 4   // how many decided offers it takes to move a weight noticeably

// ── feature extraction ─────────────────────────────────────────────────────
type DateLike = { toDate?: () => Date; seconds?: number } | string | number | Date | null | undefined
const toDate = (raw: unknown): Date | null => {
  const v = raw as DateLike
  if (!v) return null
  const o = v as { toDate?: () => Date; seconds?: number }
  const d = typeof o.toDate === 'function' ? o.toDate() : typeof o.seconds === 'number' ? new Date(o.seconds * 1000) : new Date(v as string | number | Date)
  return isNaN(d.getTime()) ? null : d
}
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''))
  return isFinite(n) ? n : null
}
/** Free-text family income → rupees a year ("4.5 lakh", "450000", "6 LPA"). */
export function parseIncome(v: unknown): number | null {
  const s = String(v ?? '').toLowerCase()
  const n = num(s)
  if (n === null || n <= 0) return null
  if (/cr/.test(s)) return n * 1e7
  if (/l|lakh|lac|lpa/.test(s) || n < 1000) return n * 1e5
  return n
}
const clip = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

export function features(app: FirestoreRecord, program: FirestoreRecord | undefined, uniState: string): Record<FeatureKey, number> {
  const sp = (app.studentProfile ?? {}) as Record<string, unknown>
  const marks = num(sp.twelfthScore ?? sp.percentage ?? app.percentage)
  const state = String(sp.domicileState || sp.state || '').trim().toLowerCase()
  const income = parseIncome(sp.annualIncome)
  const fee = num(program?.annualFee ?? program?.fee)
  const applied = toDate(app.appliedAt ?? app.createdAt)
  const deadline = toDate(program?.applicationDeadline)
  const daysEarly = applied && deadline ? (deadline.getTime() - applied.getTime()) / 86400000 : null
  const scholarship = num(app.scholarshipAmount ?? (app.scholarship as { amount?: unknown } | undefined)?.amount) ?? (app.scholarshipAwarded ? 1 : 0)
  return {
    merit: marks === null ? 0 : clip((marks - 75) / 12, -2.5, 2.5),
    home: state && uniState ? (state === uniState.trim().toLowerCase() ? 1 : -1) : 0,
    afford: income && fee ? clip(Math.log(income / (fee * 2)), -2, 2) : 0,
    early: daysEarly === null ? 0 : clip(daysEarly / 30, -1, 3),
    engaged: Object.keys(sp).filter(k => k !== 'sharedAt').length >= 8 ? 1 : 0,
    scholarship: scholarship && scholarship > 0 ? 1 : 0,
  }
}

// ── model ─────────────────────────────────────────────────────────────────
export type Weights = Record<FeatureKey | 'bias', number>
const KEYS = FEATURES.map(f => f.key)
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
export const score = (w: Weights, x: Record<FeatureKey, number>) => sigmoid(w.bias + KEYS.reduce((s, k) => s + w[k] * x[k], 0))

export interface Example { x: Record<FeatureKey, number>; y: 0 | 1 }

/** MAP logistic regression: log-loss + (strength/2)·‖w − prior‖². */
export function fit(examples: Example[], prior: Weights = PRIOR, strength = PRIOR_STRENGTH): Weights {
  const w: Weights = { ...prior }
  if (!examples.length) return w
  const all = ['bias', ...KEYS] as (FeatureKey | 'bias')[]
  const lr = 1 / (examples.length * 0.25 + strength)   // ~1/Lipschitz constant
  for (let it = 0; it < 600; it++) {
    const g: Record<string, number> = Object.fromEntries(all.map(k => [k, strength * (w[k] - prior[k])]))
    for (const e of examples) {
      const err = score(w, e.x) - e.y
      g.bias += err
      for (const k of KEYS) g[k] += err * e.x[k]
    }
    for (const k of all) w[k] -= lr * g[k]
  }
  return w
}

export interface Evaluation { n: number; accuracy: number; brier: number; brierBaseRate: number; brierPrior: number; baseRate: number }

/** 5-fold cross-validation, only meaningful from ~20 decided offers. */
export function crossValidate(examples: Example[], folds = 5): Evaluation | null {
  if (examples.length < 20) return null
  const idx = examples.map((_, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101))
  let correct = 0, brier = 0, brierBase = 0, brierPrior = 0
  for (let f = 0; f < folds; f++) {
    const test = idx.filter((_, i) => i % folds === f).map(i => examples[i])
    const train = idx.filter((_, i) => i % folds !== f).map(i => examples[i])
    const w = fit(train)
    const base = train.reduce((s, e) => s + e.y, 0) / train.length
    for (const e of test) {
      const p = score(w, e.x)
      correct += Number((p >= 0.5) === (e.y === 1))
      brier += (p - e.y) ** 2
      brierBase += (base - e.y) ** 2
      brierPrior += (score(PRIOR, e.x) - e.y) ** 2
    }
  }
  const n = examples.length
  return { n, accuracy: correct / n, brier: brier / n, brierBaseRate: brierBase / n, brierPrior: brierPrior / n, baseRate: examples.reduce((s, e) => s + e.y, 0) / n }
}

/** Plain-language reasons: the features pushing this student's chance up or down the most. */
export function reasons(w: Weights, x: Record<FeatureKey, number>): { text: string; up: boolean }[] {
  return FEATURES
    .map(f => ({ f, c: w[f.key] * x[f.key] }))
    .filter(r => Math.abs(r.c) >= 0.12)
    .sort((a, b) => Math.abs(b.c) - Math.abs(a.c))
    .slice(0, 2)
    .map(({ f, c }) => ({ up: c > 0, text: (c > 0 ? f.up : f.down) || f.label }))
}

// ── planning ──────────────────────────────────────────────────────────────
/** P(exactly k acceptances) for independent offers with the given chances. */
export function acceptanceDistribution(ps: number[]): number[] {
  let dist = [1]
  for (const p of ps) {
    const next = new Array(dist.length + 1).fill(0)
    dist.forEach((q, k) => { next[k] += q * (1 - p); next[k + 1] += q * p })
    dist = next
  }
  return dist
}
const atLeast = (dist: number[], m: number) => dist.slice(Math.max(0, m)).reduce((s, q) => s + q, 0)

export interface OfferPlan {
  seatsLeft: number
  newOffers: number              // how many more offers to send now
  fillChance: number             // P(all seats filled)
  overfillChance: number         // P(more acceptances than seats)
  expectedAccepted: number
  reachable: boolean             // false when even every applicant is unlikely to fill the seats
  dist: number[]                 // acceptances from pending + new offers
}

/**
 * Offers are sent in rounds, like JoSAA. This round sends as many offers as possible
 * (from the top of the merit list) while keeping the chance of more acceptances than
 * seats at or below `maxOverbook`; the next round goes out once these students reply.
 */
export function planOffers(pending: number[], ranked: number[], seatsLeft: number, maxOverbook = 0.1): OfferPlan {
  const at = (n: number) => acceptanceDistribution([...pending, ...ranked.slice(0, n)])
  let n = 0
  let dist = at(0)
  while (n < ranked.length) {
    const next = at(n + 1)
    if (atLeast(next, seatsLeft + 1) > maxOverbook) break
    dist = next; n++
  }
  const ps = [...pending, ...ranked.slice(0, n)]
  return {
    seatsLeft, newOffers: n,
    fillChance: seatsLeft <= 0 ? 1 : atLeast(dist, seatsLeft),
    overfillChance: atLeast(dist, seatsLeft + 1),
    expectedAccepted: ps.reduce((s, p) => s + p, 0),
    reachable: seatsLeft <= 0 || atLeast(at(ranked.length), seatsLeft) >= 0.5,
    dist,
  }
}
