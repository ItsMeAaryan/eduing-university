import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { mockPush } from './mocks'
import { ToastProvider } from '@/components/Toast'

const mockUpdateProgram = vi.fn()
const mockAddProgram = vi.fn()
const mockDeleteProgram = vi.fn()
const mockSubscribeToPrograms = vi.fn((_uid, cb) => {
  cb([
    {
      id: 'prog-1',
      name: 'B.Tech Computer Science',
      level: 'UG',
      mode: 'Full-time',
      duration: '4 Years',
      totalSeats: 120,
      filledSeats: 30,
      annualFeeLpa: 2.5,
      status: 'Active',
      entranceExam: 'JEE',
    },
    {
      id: 'prog-2',
      name: 'M.Tech Data Science',
      level: 'PG',
      mode: 'Part-time',
      duration: '2 Years',
      totalSeats: 60,
      filledSeats: 10,
      annualFeeLpa: 1.8,
      status: 'Draft',
      entranceExam: 'GATE',
    },
  ])
  return vi.fn()
})

vi.mock('@/lib/firebase/programs', () => ({
  subscribeToPrograms: (uid: string, cb: (progs: unknown[]) => void) => mockSubscribeToPrograms(uid, cb),
  updateProgram: (...args: unknown[]) => mockUpdateProgram(...args),
  addProgram: (...args: unknown[]) => mockAddProgram(...args),
  deleteProgram: (...args: unknown[]) => mockDeleteProgram(...args),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'uni-123', email: 'admin@uni.edu' },
    userData: { uid: 'uni-123', role: 'uni_admin', universityId: 'uni-123' },
    loading: false,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/programs',
}))

const { default: ProgramsPage } = await import('@/app/programs/page')

describe('ProgramsPage Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders programs list with degree badges and seat capacity', async () => {
    render(
      <ToastProvider>
        <ProgramsPage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('B.Tech Computer Science')).toBeInTheDocument()
      expect(screen.getByText('M.Tech Data Science')).toBeInTheDocument()
    })

    expect(screen.getByText('UG')).toBeInTheDocument()
    expect(screen.getByText('PG')).toBeInTheDocument()
  })

  it('filters programs by degree level dropdown', async () => {
    render(
      <ToastProvider>
        <ProgramsPage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('B.Tech Computer Science')).toBeInTheDocument()
    })

    const select = screen.getByDisplayValue('All Degree Levels')
    await userEvent.selectOptions(select, 'PG')

    expect(screen.queryByText('B.Tech Computer Science')).not.toBeInTheDocument()
    expect(screen.getByText('M.Tech Data Science')).toBeInTheDocument()
  })

  it('toggles program status when clicking status badge', async () => {
    render(
      <ToastProvider>
        <ProgramsPage />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    const activeBtn = screen.getByRole('button', { name: 'Active' })
    await userEvent.click(activeBtn)

    await waitFor(() => {
      expect(mockUpdateProgram).toHaveBeenCalledWith('prog-1', expect.objectContaining({
        status: 'Draft'
      }))
    })
  })
})
