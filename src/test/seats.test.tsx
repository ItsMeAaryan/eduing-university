import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ToastProvider } from '@/components/Toast'

import { mockAuthOnAuthStateChanged, mockUpdateDoc } from './mocks'

const mockSubscribeToPrograms = vi.fn((_uid, cb) => {
  cb([
    {
      id: 'prog-1',
      name: 'Computer Science',
      totalSeats: 60,
      filledSeats: 10,
      universityId: 'uni-1',
      seatMatrix: { general: 40, obc: 27, sc: 15, st: 7.5, ews: 10.5, nri: 0 },
    },
  ])
  return vi.fn()
})

const mockSubscribeToApplications = vi.fn((_uid, cb) => {
  cb([
    {
      id: 'app-1',
      studentName: 'Test Student',
      programId: 'prog-1',
      programName: 'Computer Science',
      status: 'submitted',
      studentId: 'student-1',
      universityId: 'uni-1',
      category: 'General',
    },
  ])
  return vi.fn()
})

vi.mock('@/lib/firebase/programs', () => ({
  subscribeToPrograms: (uid: string, cb: (progs: unknown[]) => void) => mockSubscribeToPrograms(uid, cb),
  updateProgram: (...args: unknown[]) => mockUpdateDoc(...args),
}))

vi.mock('@/lib/firebase/applications', () => ({
  subscribeToApplications: (uid: string, cb: (apps: unknown[]) => void) => mockSubscribeToApplications(uid, cb),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'uni-1', email: 'admin@uni.edu' },
    userData: { uid: 'uni-1', role: 'uni_admin', universityId: 'uni-1' },
    loading: false,
  }),
}))

const { default: SeatsPage } = await import('@/app/seats/page')

describe('Seat allocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDoc.mockResolvedValue(undefined)
  })

  it('renders reservation matrix table and program selector', async () => {
    render(
      <ToastProvider>
        <SeatsPage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Seat Allocation')).toBeInTheDocument()
    })

    expect(screen.getAllByText('General (Open)')[0]).toBeInTheDocument()
    expect(screen.getAllByText('OBC (Other Backward Classes)')[0]).toBeInTheDocument()
  })

  it('calls updateDoc when Update Allocation button is clicked with 100% total', async () => {
    render(
      <ToastProvider>
        <SeatsPage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Seat Allocation')).toBeInTheDocument()
    })

    const updateBtn = screen.getByRole('button', { name: /Update Allocation/i })
    expect(updateBtn).not.toBeDisabled()

    await userEvent.click(updateBtn)
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled())
  })
})
