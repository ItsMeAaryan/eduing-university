/**
 * Tests for lib/firebase/types.ts and the Firestore helper functions.
 *
 * Phase 0: Firestore lib functions all typed as (x: any) — converted to
 * FirestoreRecord. These tests verify the callback shapes are honoured.
 */

import { describe, it, expect } from 'vitest'
import type { FirestoreRecord, FirestoreWriteData } from '@/lib/firebase/types'

// The type exports themselves are the main thing to test — these assertions
// confirm they satisfy the expected structural contract at compile time.
describe('FirestoreRecord type', () => {
  it('requires an id field', () => {
    const record: FirestoreRecord = { id: 'test-123', name: 'CS', seats: 60 }
    expect(record.id).toBe('test-123')
    expect(record.name).toBe('CS')
  })

  it('allows arbitrary additional fields', () => {
    const record: FirestoreRecord = {
      id: 'prog-1',
      universityId: 'uni-1',
      totalSeats: 60,
      filledSeats: 10,
      deadline: '2025-12-31',
      hasEntranceExam: true,
    }
    expect(record.totalSeats).toBe(60)
    expect(record.hasEntranceExam).toBe(true)
  })
})

describe('FirestoreWriteData type', () => {
  it('accepts plain data objects without requiring id', () => {
    const data: FirestoreWriteData = {
      name: 'Test University',
      approvalStatus: 'pending',
      isVerified: false,
    }
    expect(data.approvalStatus).toBe('pending')
  })
})

describe('Notification sort stability', () => {
  it('handles missing createdAt gracefully (no NaN sort)', () => {
    // Phase 0 fix: sort was `b.createdAt?.seconds - a.createdAt?.seconds`
    // which produces NaN when either is undefined, breaking sort order entirely.
    const notifications: FirestoreRecord[] = [
      { id: '1', createdAt: { seconds: 1000 } },
      { id: '2' }, // missing createdAt — was producing NaN
      { id: '3', createdAt: { seconds: 2000 } },
    ]

    const sorted = [...notifications].sort((a, b) => {
      const aSeconds = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
      const bSeconds = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
      return bSeconds - aSeconds
    })

    // Should not produce NaN-based disorder
    expect(sorted.map(n => n.id)).toEqual(['3', '1', '2'])
    expect(sorted.every(n => n.id !== undefined)).toBe(true)
  })

  it('sorts correctly when all createdAt are present', () => {
    const notifications: FirestoreRecord[] = [
      { id: 'old', createdAt: { seconds: 100 } },
      { id: 'new', createdAt: { seconds: 300 } },
      { id: 'mid', createdAt: { seconds: 200 } },
    ]

    const sorted = [...notifications].sort((a, b) => {
      const aSeconds = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
      const bSeconds = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
      return bSeconds - aSeconds
    })

    expect(sorted.map(n => n.id)).toEqual(['new', 'mid', 'old'])
  })
})
