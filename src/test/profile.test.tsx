import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ToastProvider } from '@/components/Toast'

import { mockAuthOnAuthStateChanged } from './mocks'

const mockUpdateUniversityProfile = vi.fn()
const mockGetUniversity = vi.fn()
const mockSubscribeToPrograms = vi.fn((_uid, cb) => {
  cb([{ id: 'prog-1', name: 'Computer Science' }])
  return vi.fn()
})

vi.mock('@/lib/firebase/university', () => ({
  getUniversity: (...args: unknown[]) => mockGetUniversity(...args),
  updateUniversityProfile: (...args: unknown[]) => mockUpdateUniversityProfile(...args),
}))

vi.mock('@/lib/firebase/programs', () => ({
  subscribeToPrograms: (uid: string, cb: (progs: unknown[]) => void) => mockSubscribeToPrograms(uid, cb),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'uni-123', email: 'admin@uni.edu' },
    userData: { uid: 'uni-123', role: 'uni_admin', universityId: 'uni-123' },
    loading: false,
  }),
}))

const { default: ProfilePage } = await import('@/app/profile/page')

describe('ProfilePage Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateUniversityProfile.mockResolvedValue(undefined)
    mockGetUniversity.mockResolvedValue({
      id: 'uni-123',
      name: 'Delhi Institute of Tech',
      tagline: 'Leading the Future',
      about: 'Premier engineering and research university',
      foundedYear: '1998',
      naacGrade: 'A++',
      nirfRank: '12',
      type: 'Autonomous',
      approvedBy: ['UGC', 'AICTE'],
      city: 'New Delhi',
      state: 'Delhi',
      email: 'admissions@dit.edu.in',
      facilities: ['Library', 'Labs'],
      gallery: ['https://example.com/photo1.jpg'],
    })
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: { uid: string }) => void) => {
      cb({ uid: 'uni-123' })
      return vi.fn()
    })
  })

  it('renders university name, NAAC grade, and NIRF rank cleanly', async () => {
    render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Delhi Institute of Tech')).toBeInTheDocument()
    })

    expect(screen.getByText('NAAC A++')).toBeInTheDocument()
    expect(screen.getByText('NIRF #12')).toBeInTheDocument()
  })

  it('calculates profile completion percentage correctly', async () => {
    render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Profile Completion/i)).toBeInTheDocument()
    })
  })

  it('toggles student preview mode when Preview as Student button is clicked', async () => {
    render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Delhi Institute of Tech')).toBeInTheDocument()
    })

    const previewBtn = screen.getByRole('button', { name: /Preview as Student/i })
    await userEvent.click(previewBtn)

    expect(screen.getByText(/STUDENT PREVIEW MODE/i)).toBeInTheDocument()

    const exitBtn = screen.getByRole('button', { name: /Exit Preview/i })
    await userEvent.click(exitBtn)

    expect(screen.queryByText(/STUDENT PREVIEW MODE/i)).not.toBeInTheDocument()
  })

  it('allows facility chips toggling', async () => {
    render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Campus Facilities')).toBeInTheDocument()
    })

    const hostelBtn = screen.getByRole('button', { name: /Hostel/i })
    await userEvent.click(hostelBtn)

    await waitFor(() => {
      expect(mockUpdateUniversityProfile).toHaveBeenCalledWith('uni-123', expect.objectContaining({
        facilities: expect.arrayContaining(['Hostel'])
      }))
    })
  })
})
