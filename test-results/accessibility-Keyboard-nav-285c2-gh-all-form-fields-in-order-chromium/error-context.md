# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Keyboard navigation — login form >> Tab navigates through all form fields in order
- Location: e2e/accessibility.spec.ts:19:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByLabel(/password/i)
Expected: focused
Error: strict mode violation: getByLabel(/password/i) resolved to 2 elements:
    1) <input value="" required="" type="password" id="login-password" placeholder="••••••••" class="input-dark pr-12"/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-label="Show password" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByLabel(/password/i)

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - textbox "Password" [active] [ref=e19]:
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
  4   |  * Accessibility e2e tests
  5   |  *
  6   |  * Covers things that static analysis (ESLint/axe) can't catch:
  7   |  * - Keyboard navigation through forms
  8   |  * - Focus management on modals (Phase 8 fix)
  9   |  * - Escape closes modals (Phase 8 fix)
  10  |  * - No visible focus indicator missing on interactive elements
  11  |  * - Color contrast is visually correct (structural check)
  12  |  */
  13  | 
  14  | test.describe('Keyboard navigation — login form', () => {
  15  |   test.beforeEach(async ({ page }) => {
  16  |     await page.goto('/auth/login')
  17  |   })
  18  | 
  19  |   test('Tab navigates through all form fields in order', async ({ page }) => {
  20  |     // Start from email field
  21  |     await page.getByLabel(/email address/i).click()
  22  |     await expect(page.getByLabel(/email address/i)).toBeFocused()
  23  | 
  24  |     // Tab to password
  25  |     await page.keyboard.press('Tab')
> 26  |     await expect(page.getByLabel(/password/i)).toBeFocused()
      |                                                ^ Error: expect(locator).toBeFocused() failed
  27  | 
  28  |     // Tab to show/hide toggle
  29  |     await page.keyboard.press('Tab')
  30  |     const focused = page.locator(':focus')
  31  |     await expect(focused).toBeVisible()
  32  |   })
  33  | 
  34  |   test('form submits on Enter', async ({ page }) => {
  35  |     await page.getByLabel(/email address/i).fill('test@test.com')
  36  |     await page.getByLabel(/email address/i).press('Tab')
  37  |     await page.getByLabel(/password/i).fill('password123')
  38  |     await page.getByLabel(/password/i).press('Enter')
  39  |     // Should attempt submission (may show error — that's fine, tests form behavior)
  40  |     await page.waitForTimeout(500)
  41  |     await expect(page).toHaveURL(/\/auth\/login/)
  42  |   })
  43  | })
  44  | 
  45  | test.describe('Focus visible on interactive elements', () => {
  46  |   test('login form inputs have visible focus state', async ({ page }) => {
  47  |     await page.goto('/auth/login')
  48  |     const emailInput = page.getByLabel(/email address/i)
  49  |     await emailInput.focus()
  50  |     // Verify focus:ring is applied (structural — actual contrast tested in unit tests)
  51  |     await expect(emailInput).toBeFocused()
  52  |   })
  53  | })
  54  | 
  55  | test.describe('Page titles (SEO — Phase 2)', () => {
  56  |   const titleTests = [
  57  |     { path: '/auth/login', expected: /Sign In|EDUING/ },
  58  |     { path: '/auth/register', expected: /Register Your University|EDUING/ },
  59  |     { path: '/admin/login', expected: /Admin Panel|EDUING/ },
  60  |   ]
  61  | 
  62  |   for (const { path, expected } of titleTests) {
  63  |     test(`${path} has correct title`, async ({ page }) => {
  64  |       await page.goto(path)
  65  |       await expect(page).toHaveTitle(expected)
  66  |     })
  67  |   }
  68  | })
  69  | 
  70  | test.describe('Robots meta tag (SEO — Phase 2)', () => {
  71  |   test('register page does NOT have noindex', async ({ page }) => {
  72  |     await page.goto('/auth/register')
  73  |     // This is the one public page — should be indexable
  74  |     const robotsMeta = page.locator('meta[name="robots"]')
  75  |     const count = await robotsMeta.count()
  76  |     if (count > 0) {
  77  |       const content = await robotsMeta.getAttribute('content')
  78  |       expect(content).not.toMatch(/noindex/)
  79  |     }
  80  |     // If no meta tag, it inherits the root default — acceptable
  81  |   })
  82  | 
  83  |   test('login page has noindex', async ({ page }) => {
  84  |     await page.goto('/auth/login')
  85  |     const robotsMeta = page.locator('meta[name="robots"]')
  86  |     const count = await robotsMeta.count()
  87  |     if (count > 0) {
  88  |       const content = await robotsMeta.getAttribute('content')
  89  |       expect(content).toMatch(/noindex/)
  90  |     }
  91  |   })
  92  | })
  93  | 
  94  | test.describe('Heading hierarchy (SEO + a11y — Phase 2+8)', () => {
  95  |   test('register page has exactly one h1', async ({ page }) => {
  96  |     await page.goto('/auth/register')
  97  |     const h1s = page.locator('h1')
  98  |     // Should have at least one h1 (may be sr-only)
  99  |     await expect(h1s.first()).toBeAttached()
  100 |   })
  101 | 
  102 |   test('login page has exactly one h1', async ({ page }) => {
  103 |     await page.goto('/auth/login')
  104 |     const h1s = page.locator('h1')
  105 |     await expect(h1s.first()).toBeAttached()
  106 |   })
  107 | })
  108 | 
```