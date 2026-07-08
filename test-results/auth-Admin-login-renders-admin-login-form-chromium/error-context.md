# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Admin login >> renders admin login form
- Location: e2e/auth.spec.ts:75:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/EDUING Admin/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/EDUING Admin/i)

```

```yaml
- img "EDUING Logo"
- text: EDUING.in
- heading "University Portal" [level=1]
- paragraph: Sign in to manage your institution
- text: Email Address
- textbox "Email Address":
  - /placeholder: admin@university.eduing.in
- text: Password
- textbox "Password":
  - /placeholder: ••••••••
- button "Show password"
- button "Sign In"
- button "⚡ Autofill Demo"
- alert: Sign In | EDUING
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | /**
  4   |  * Auth flow e2e tests
  5   |  *
  6   |  * Covers:
  7   |  * - Login page renders correctly
  8   |  * - Invalid credentials shows error (not crash)
  9   |  * - Pending approval shows the pending screen (not dashboard access)
  10  |  * - Register page renders all required fields
  11  |  * - Register redirects to /auth/login after submission (not /dashboard)
  12  |  * - Admin login rejects non-admin accounts
  13  |  */
  14  | 
  15  | test.describe('Login page', () => {
  16  |   test.beforeEach(async ({ page }) => {
  17  |     await page.goto('/auth/login')
  18  |   })
  19  | 
  20  |   test('renders email and password fields', async ({ page }) => {
  21  |     await expect(page.getByLabel(/email address/i)).toBeVisible()
  22  |     await expect(page.getByLabel(/password/i)).toBeVisible()
  23  |     await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  24  |   })
  25  | 
  26  |   test('shows error on invalid credentials (no crash, no redirect)', async ({ page }) => {
  27  |     await page.getByLabel(/email address/i).fill('notreal@test.com')
  28  |     await page.getByLabel(/password/i).fill('wrongpassword')
  29  |     await page.getByRole('button', { name: /sign in/i }).click()
  30  | 
  31  |     // Should stay on login page
  32  |     await expect(page).toHaveURL(/\/auth\/login/)
  33  |     // Should show an error toast/message, not crash
  34  |     await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  35  |   })
  36  | 
  37  |   test('labels are associated with inputs (a11y)', async ({ page }) => {
  38  |     // Phase 1 fix: labels now have htmlFor matching input ids
  39  |     const emailInput = page.getByLabel(/email address/i)
  40  |     const passwordInput = page.getByLabel(/password/i)
  41  |     await expect(emailInput).toHaveAttribute('type', 'email')
  42  |     await expect(passwordInput).toHaveAttribute('type', 'password')
  43  |   })
  44  | 
  45  |   test('password visibility toggle has accessible label', async ({ page }) => {
  46  |     // Phase 1 fix: toggle button now has aria-label
  47  |     const toggle = page.getByRole('button', { name: /show password|hide password/i })
  48  |     await expect(toggle).toBeVisible()
  49  |   })
  50  | })
  51  | 
  52  | test.describe('Register page', () => {
  53  |   test.beforeEach(async ({ page }) => {
  54  |     await page.goto('/auth/register')
  55  |   })
  56  | 
  57  |   test('renders multi-step form with required fields', async ({ page }) => {
  58  |     // Page should load without error
  59  |     await expect(page).toHaveURL(/\/auth\/register/)
  60  |     // At least one form field visible
  61  |     await expect(page.locator('input').first()).toBeVisible()
  62  |   })
  63  | 
  64  |   test('page title is set correctly', async ({ page }) => {
  65  |     // Phase 2: per-route metadata layout added
  66  |     await expect(page).toHaveTitle(/Register Your University|EDUING/)
  67  |   })
  68  | })
  69  | 
  70  | test.describe('Admin login', () => {
  71  |   test.beforeEach(async ({ page }) => {
  72  |     await page.goto('/admin/login')
  73  |   })
  74  | 
  75  |   test('renders admin login form', async ({ page }) => {
> 76  |     await expect(page.getByText(/EDUING Admin/i)).toBeVisible()
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  77  |     await expect(page.getByText(/Platform staff access only/i)).toBeVisible()
  78  |     await expect(page.getByLabel(/email/i)).toBeVisible()
  79  |   })
  80  | 
  81  |   test('admin route is not accessible without auth', async ({ page }) => {
  82  |     await page.goto('/admin')
  83  |     // Should redirect to admin login (not show the dashboard)
  84  |     await expect(page).toHaveURL(/\/admin\/login|\/admin/)
  85  |   })
  86  | })
  87  | 
  88  | test.describe('Unauthenticated routing', () => {
  89  |   test('/ redirects to /dashboard', async ({ page }) => {
  90  |     await page.goto('/')
  91  |     // Phase 0: middleware redirects / → /dashboard
  92  |     await expect(page).toHaveURL(/\/dashboard|\/auth\/login/)
  93  |   })
  94  | 
  95  |   test('dashboard redirects unauthenticated users to login', async ({ page }) => {
  96  |     await page.goto('/dashboard')
  97  |     // client-side auth guard should redirect to login
  98  |     await expect(page).toHaveURL(/\/auth\/login|\/dashboard/)
  99  |   })
  100 | })
  101 | 
```