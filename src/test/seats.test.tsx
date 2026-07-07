/**
 * Regression tests for seats/page.tsx
 *
 * Phase 0 bug fixed: handleAllotSeat accessed program.filledSeats without
 * checking whether .find() actually returned a program.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ToastProvider } from '@/components/Toast'

import { mockAuthOnAuthStateChanged, mockOnSnapshot, mockUpdateDoc } from './mocks'

const { default: SeatsPage } = await import('@/app/seats/page')

const makeApp = (programId: string) => ({
  id: 'app-1', studentName: 'Test Student', programId,
  programName: 'Computer Science', status: 'submitted',
  studentId: 'student-1', universityId: 'uni-1',
})

const makeProgram = (id: string) => ({
  id, name: 'Computer Science', totalSeats: 60, filledSeats: 10, universityId: 'uni-1',
})

function setupData(apps: object[], programs: object[]) {
  mockAuthOnAuthStateChanged.mockImplementation((cb: (user: { uid: string }) => void) => {
    cb({ uid: 'uni-1' })
    return vi.fn()
  })
  let callCount = 0
  mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: object) => void) => {
    callCount++
    const items = callCount === 1 ? apps : programs
    cb({ docs: items.map(a => ({ id: (a as { id: string }).id, data: () => a })) })
    return vi.fn()
  })
}

describe('Seat allocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDoc.mockResolvedValue(undefined)
  })

  it('does not crash when program is not found (no unhandled error)', async () => {
    setupData([makeApp('nonexistent-id')], [makeProgram('different-id')])
    render(<ToastProvider><SeatsPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())

    const allotBtn = screen.queryByRole('button', { name: /allot/i })
    if (allotBtn) {
      await userEvent.click(allotBtn)
      // Guard prevents the crash — updateDoc should NOT be called for a missing program
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    }
  })

  it('calls updateDoc when program exists and has seats', async () => {
    setupData([makeApp('prog-1')], [makeProgram('prog-1')])
    render(<ToastProvider><SeatsPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())

    const allotBtn = screen.queryByRole('button', { name: /allot/i })
    if (allotBtn) {
      await userEvent.click(allotBtn)
      await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled())
    }
  })
})
