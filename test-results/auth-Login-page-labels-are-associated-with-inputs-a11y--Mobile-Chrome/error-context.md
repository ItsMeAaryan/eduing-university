# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Login page >> labels are associated with inputs (a11y)
- Location: e2e/auth.spec.ts:37:7

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByLabel(/password/i)
Expected: "password"
Error: strict mode violation: getByLabel(/password/i) resolved to 2 elements:
    1) <input value="" required="" type="password" id="login-password" placeholder="••••••••" class="input-dark pr-12"/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-label="Show password" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByLabel(/password/i)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img "EDUING Logo" [ref=e7]
        - generic [ref=e8]: EDUING.in
      - heading "University Portal" [level=1] [ref=e9]
      - paragraph [ref=e10]: Sign in to manage your institution
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Email Address
        - textbox "Email Address" [ref=e14]:
          - /placeholder: admin@university.eduing.in
      - generic [ref=e15]:
        - generic [ref=e17]: Password
        - generic [ref=e18]:
          - textbox "Password" [ref=e19]:
            - /placeholder: ••••••••
          - button "Show password" [ref=e20]:
            - img [ref=e21]
      - button "Sign In" [ref=e24]
    - button "⚡ Autofill Demo" [ref=e26]:
      - img [ref=e27]
      - generic [ref=e29]: ⚡ Autofill Demo
  - button "Open Next.js Dev Tools" [ref=e35] [cursor=pointer]:
    - img [ref=e36]
  - alert [ref=e39]
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
> 42  |     await expect(passwordInput).toHaveAttribute('type', 'password')
      |                                 ^ Error: expect(locator).toHaveAttribute(expected) failed
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
  76  |     await expect(page.getByText(/EDUING Admin/i)).toBeVisible()
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