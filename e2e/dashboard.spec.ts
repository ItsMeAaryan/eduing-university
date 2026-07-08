import { test, expect } from '@playwright/test'

/**
 * Dashboard smoke tests (authenticated routes)
 *
 * These tests use a real authenticated session — they require a test user
 * to be pre-created in Firebase with approvalStatus: 'approved'.
 *
 * Setup:
 *   1. Create a test university account in Firebase manually or via
 *      scripts/create_admin.js (for the admin test account)
 *   2. Set environment variables:
 *        TEST_UNI_EMAIL=testuni@test.eduing.in
 *        TEST_UNI_PASSWORD=TestPassword123!
 *        TEST_ADMIN_EMAIL=admin@eduing.in
 *        TEST_ADMIN_PASSWORD=AdminPassword123!
 *
 * Without these env vars, the tests skip gracefully rather than failing.
 */

const UNI_EMAIL = process.env.TEST_UNI_EMAIL
const UNI_PASSWORD = process.env.TEST_UNI_PASSWORD
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
}

test.describe('Dashboard (authenticated)', () => {
  test.skip(!UNI_EMAIL, 'TEST_UNI_EMAIL not set — skipping authenticated tests')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, UNI_EMAIL!, UNI_PASSWORD!)
  })

  test('dashboard loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1, [aria-label]').first()).toBeVisible()
  })

  test('sidebar navigation links work', async ({ page }) => {
    // Applications link
    await page.getByRole('link', { name: /applications/i }).click()
    await expect(page).toHaveURL(/\/applications/)

    // Programs link
    await page.getByRole('link', { name: /programs/i }).click()
    await expect(page).toHaveURL(/\/programs/)
  })

  test('programs page renders and has h1', async ({ page }) => {
    await page.goto('/programs')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('settings change-password button is clickable', async ({ page }) => {
    // Phase 1 fix regression: onClick was on outer div, not button
    await page.goto('/settings')
    const changeBtn = page.getByRole('button', { name: /change/i })
    await expect(changeBtn).toBeVisible()
    // Should be focusable via keyboard too
    await changeBtn.focus()
    await expect(changeBtn).toBeFocused()
  })

  test('profile page loads without crash', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/profile/)
  })

  test('analytics page loads without crash', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page).toHaveURL(/\/analytics/)
  })
})

test.describe('Admin dashboard (authenticated)', () => {
  test.skip(!ADMIN_EMAIL, 'TEST_ADMIN_EMAIL not set — skipping admin authenticated tests')

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL!)
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/admin/, { timeout: 10_000 })
  })

  test('admin dashboard loads with stats', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin$/)
    // Stats cards should be visible
    await expect(page.getByText(/pending review/i)).toBeVisible()
    await expect(page.getByText(/approved/i)).toBeVisible()
  })

  test('tab filter works', async ({ page }) => {
    await page.getByRole('button', { name: /approved/i }).click()
    await expect(page.getByRole('button', { name: /approved/i })).toHaveClass(/bg-brand-primary/)
  })

  test('sign out works from admin panel', async ({ page }) => {
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
