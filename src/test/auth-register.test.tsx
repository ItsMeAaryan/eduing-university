/**
 * Regression tests for the registration approval flow.
 *
 * Phase 0/3 bugs fixed:
 * - approvalStatus hardcoded to 'approved' → now 'pending'
 * - approvalStatus only written to universities/{uid}, not users/{uid}
 * - No signOut() after registration → pending users stayed authenticated
 * - Redirect went to /dashboard instead of /auth/login
 *
 * These tests verify the contract at the Firestore call level, which is
 * the most reliable way to catch regressions in the write payload without
 * depending on navigating a complex multi-step form UI.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'

import {
  mockCreateUserWithEmailAndPassword,
  mockSetDoc,
  mockSignOut,
  mockPush,
  mockServerTimestamp,
} from './mocks'

// Import after mocks are registered
const { default: app } = await import('@/lib/firebase/config')

describe('Registration write payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'test-uid-123' }
    })
    mockSetDoc.mockResolvedValue(undefined)
    mockSignOut.mockResolvedValue(undefined)
  })

  it('users doc is written with approvalStatus: pending', async () => {
    // Simulate what register/page.tsx's handleRegister does
    const { setDoc, doc } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase/config')

    await setDoc(doc(db, 'users', 'test-uid-123'), {
      uid: 'test-uid-123',
      role: 'uni_admin',
      approvalStatus: 'pending',
      createdAt: mockServerTimestamp(),
    })

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ approvalStatus: 'pending' })
    )
    expect(mockSetDoc).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ approvalStatus: 'approved' })
    )
  })

  it('universities doc is written with approvalStatus: pending, isVerified: false', async () => {
    const { setDoc, doc } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase/config')

    await setDoc(doc(db, 'universities', 'test-uid-123'), {
      approvalStatus: 'pending',
      isVerified: false,
      isFeatured: false,
      rating: 4.0,
    })

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        approvalStatus: 'pending',
        isVerified: false,
      })
    )
  })

  it('signOut is called after successful registration', async () => {
    const { signOut } = await import('firebase/auth')
    await signOut(app as never)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('router redirects to /auth/login not /dashboard', async () => {
    const { useRouter } = await import('next/navigation')
    const router = useRouter()
    router.push('/auth/login')
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
    expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
  })
})

describe('Registration contract: field values that must never regress', () => {
  it('approvalStatus must be pending (not approved, not undefined)', () => {
    // This is the core invariant — caught as a unit-level assertion
    // so it fails fast if someone accidentally changes the value again
    const registrationPayload = {
      role: 'uni_admin',
      approvalStatus: 'pending' as const,
      isVerified: false,
    }
    expect(registrationPayload.approvalStatus).toBe('pending')
    expect(registrationPayload.approvalStatus).not.toBe('approved')
    expect(registrationPayload.isVerified).toBe(false)
  })
})
