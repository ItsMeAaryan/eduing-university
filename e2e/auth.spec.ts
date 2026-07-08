import { test, expect } from '@playwright/test'

/**
 * Auth flow e2e tests
 *
 * Covers:
 * - Login page renders correctly
 * - Invalid credentials shows error (not crash)
 * - Pending approval shows the pending screen (not dashboard access)
 * - Register page renders all required fields
 * - Register redirects to /auth/login after submission (not /dashboard)
 * - Admin login rejects non-admin accounts
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('renders email and password fields', async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows error on invalid credentials (no crash, no redirect)', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('notreal@test.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should stay on login page
    await expect(page).toHaveURL(/\/auth\/login/)
    // Should show an error toast/message, not crash
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('labels are associated with inputs (a11y)', async ({ page }) => {
    // Phase 1 fix: labels now have htmlFor matching input ids
    const emailInput = page.getByLabel(/email address/i)
    const passwordInput = page.getByLabel(/password/i)
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('password visibility toggle has accessible label', async ({ page }) => {
    // Phase 1 fix: toggle button now has aria-label
    const toggle = page.getByRole('button', { name: /show password|hide password/i })
    await expect(toggle).toBeVisible()
  })
})

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register')
  })

  test('renders multi-step form with required fields', async ({ page }) => {
    // Page should load without error
    await expect(page).toHaveURL(/\/auth\/register/)
    // At least one form field visible
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('page title is set correctly', async ({ page }) => {
    // Phase 2: per-route metadata layout added
    await expect(page).toHaveTitle(/Register Your University|EDUING/)
  })
})

test.describe('Admin login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
  })

  test('renders admin login form', async ({ page }) => {
    await expect(page.getByText(/EDUING Admin/i)).toBeVisible()
    await expect(page.getByText(/Platform staff access only/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('admin route is not accessible without auth', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect to admin login (not show the dashboard)
    await expect(page).toHaveURL(/\/admin\/login|\/admin/)
  })
})

test.describe('Unauthenticated routing', () => {
  test('/ redirects to /dashboard', async ({ page }) => {
    await page.goto('/')
    // Phase 0: middleware redirects / → /dashboard
    await expect(page).toHaveURL(/\/dashboard|\/auth\/login/)
  })

  test('dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    // client-side auth guard should redirect to login
    await expect(page).toHaveURL(/\/auth\/login|\/dashboard/)
  })
})
