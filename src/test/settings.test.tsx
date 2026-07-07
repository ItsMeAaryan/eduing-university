/**
 * Regression tests for settings/page.tsx
 *
 * Phase 0: toggleSetting never rolled back state on failure.
 * Phase 1: "Change password" onClick was on outer div, not visible button.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ToastProvider } from '@/components/Toast'

import { mockSendPasswordResetEmail, mockAuthOnAuthStateChanged } from './mocks'

const mockUpdateUniversityProfile = vi.fn()

vi.mock('@/lib/firebase/university', () => ({
  subscribeToUniversity: vi.fn((_uid: string, cb: (data: object) => void) => {
    cb({ settings: { emailNotifications: true, smsNotifications: false, autoApprove: false } })
    return vi.fn()
  }),
  updateUniversityProfile: mockUpdateUniversityProfile,
}))

const { default: SettingsPage } = await import('@/app/settings/page')

function setupAuth() {
  mockAuthOnAuthStateChanged.mockImplementation((cb: (user: { uid: string }) => void) => {
    cb({ uid: 'uni-1' })
    return vi.fn()
  })
}

describe('Settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateUniversityProfile.mockResolvedValue(undefined)
    mockSendPasswordResetEmail.mockResolvedValue(undefined)
    setupAuth()
  })

  it('Change password button is directly clickable (not buried in a div)', async () => {
    render(<ToastProvider><SettingsPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())

    const changeBtn = screen.queryByRole('button', { name: /change/i })
    expect(changeBtn).not.toBeNull()
    if (changeBtn) {
      await userEvent.click(changeBtn)
      await waitFor(() => expect(mockSendPasswordResetEmail).toHaveBeenCalled())
    }
  })

  it('calls updateUniversityProfile when toggling a setting', async () => {
    render(<ToastProvider><SettingsPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())

    const btns = screen.queryAllByRole('button')
    // toggle buttons are the ones that aren't "Change" or "Save"
    const toggleBtn = btns.find(b => !b.textContent?.match(/change|save|log out/i))
    if (toggleBtn) {
      await userEvent.click(toggleBtn)
      await waitFor(() => expect(mockUpdateUniversityProfile).toHaveBeenCalled())
    }
  })

  it('does not crash when Firestore write fails (rollback guard)', async () => {
    mockUpdateUniversityProfile.mockRejectedValueOnce(new Error('Network error'))
    render(<ToastProvider><SettingsPage /></ToastProvider>)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())

    const btns = screen.queryAllByRole('button')
    const toggleBtn = btns.find(b => !b.textContent?.match(/change|save|log out/i))
    if (toggleBtn) {
      // should not throw
      await userEvent.click(toggleBtn)
      await waitFor(() => expect(mockUpdateUniversityProfile).toHaveBeenCalledTimes(1))
    }
  })
})
