/**
 * Tests for Toast.tsx
 *
 * Phase 0: toast.promise() was typed as Promise<any> → Promise<any>.
 * Now generic: Promise<T> → Promise<T>. This test verifies the resolved
 * value passes through correctly (type-level regression).
 */

import { describe, it, expect } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ToastProvider, useToast } from '@/components/Toast'

function ToastTrigger({ onReady }: { onReady: (toast: ReturnType<typeof useToast>['toast']) => void }) {
  const { toast } = useToast()
  onReady(toast)
  return <div>ready</div>
}

describe('Toast', () => {
  it('renders without crashing', () => {
    render(
      <ToastProvider>
        <div>test</div>
      </ToastProvider>
    )
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('toast.promise passes the resolved value through', async () => {
    let toastRef: ReturnType<typeof useToast>['toast'] | null = null

    render(
      <ToastProvider>
        <ToastTrigger onReady={(t) => { toastRef = t }} />
      </ToastProvider>
    )

    await waitFor(() => expect(toastRef).not.toBeNull())

    const result = await act(async () => {
      return toastRef!.promise(
        Promise.resolve({ id: 'test-123' }),
        { loading: 'Loading...', success: 'Done!', error: 'Failed' }
      )
    })

    expect(result).toEqual({ id: 'test-123' })
  })

  it('shows success toast message', async () => {
    let toastRef: ReturnType<typeof useToast>['toast'] | null = null

    render(
      <ToastProvider>
        <ToastTrigger onReady={(t) => { toastRef = t }} />
      </ToastProvider>
    )

    await waitFor(() => expect(toastRef).not.toBeNull())

    act(() => {
      toastRef!.success('University saved!')
    })

    await waitFor(() => {
      expect(screen.getByText('University saved!')).toBeInTheDocument()
    })
  })

  it('shows error toast message', async () => {
    let toastRef: ReturnType<typeof useToast>['toast'] | null = null

    render(
      <ToastProvider>
        <ToastTrigger onReady={(t) => { toastRef = t }} />
      </ToastProvider>
    )

    await waitFor(() => expect(toastRef).not.toBeNull())

    act(() => {
      toastRef!.error('Something went wrong')
    })

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })
})
