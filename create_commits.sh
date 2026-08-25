#!/bin/bash

# Reset any staged files
git reset

# 1. chore: initialize enterprise architecture improvements
git add package.json package-lock.json
git commit -m "chore: initialize enterprise architecture improvements"

# 2. feat(auth): improve authentication and route guards
git add src/context/AuthContext.tsx src/components/guards/ src/app/auth/login/page.tsx
git commit -m "feat(auth): improve authentication and route guards"

# 3. feat(rbac): implement enterprise role permissions
git add src/lib/firebase/staff.ts src/app/staff/
git commit -m "feat(rbac): implement enterprise role permissions"

# 4. feat(applications): improve application workflow
git add src/lib/firebase/applications.ts src/app/applications/page.tsx src/components/ApplicationPanel.tsx
git commit -m "feat(applications): improve application workflow"

# 5. feat(documents): implement document verification
git add src/lib/firebase/documents.ts src/components/DocumentVerificationPanel.tsx src/components/DocumentViewer.tsx src/components/pdf/
git commit -m "feat(documents): implement document verification"

# 6. feat(offers): generate offer letters
git add src/lib/firebase/generated_documents.ts src/components/GeneratedDocumentsSection.tsx
git commit -m "feat(offers): generate offer letters"

# 7. feat(admissions): complete admission workflow
git add src/lib/firebase/admissions.ts src/components/AdmissionProgressSection.tsx
git commit -m "feat(admissions): complete admission workflow"

# 8. feat(enrollment): implement enrollment management
git add src/app/exams/page.tsx src/app/settings/page.tsx
git commit -m "feat(enrollment): implement enrollment management"

# 9. feat(audit): enterprise audit logging
git add src/lib/firebase/audit.ts src/app/audit/ src/components/RecentActivityWidget.tsx
git commit -m "feat(audit): enterprise audit logging"

# 10. feat(students): build student directory
git add src/app/students/page.tsx
git commit -m "feat(students): build student directory"

# 11. feat(crm): implement student profile system
git add src/app/students/\[id\]/page.tsx src/components/StudentLifecycle.tsx
git commit -m "feat(crm): implement student profile system"

# 12. feat(notes): internal notes support
git add src/utils/ src/app/dashboard/page.tsx
git commit -m "feat(notes): internal notes support"

# 13. feat(analytics): analytics provider
git add src/context/AnalyticsContext.tsx src/lib/analytics.ts
git commit -m "feat(analytics): analytics provider"

# 14. feat(reports): executive dashboards
git add src/app/analytics/page.tsx src/app/analytics/layout.tsx
git commit -m "feat(reports): executive dashboards"

# 15. feat(reports): admissions and financial analytics
git add src/app/analytics/admissions/ src/app/analytics/financial/
git commit -m "feat(reports): admissions and financial analytics"

# 16. feat(reports): student analytics
git add src/app/analytics/students/
git commit -m "feat(reports): student analytics"

# 17. feat(ai): AI service layer
git add src/lib/ai.ts
git commit -m "feat(ai): AI service layer"

# 18. feat(copilot): global AI copilot
git add src/components/AICopilot.tsx
git commit -m "feat(copilot): global AI copilot"

# 19. perf: lazy loading and performance optimization
git add src/components/ErrorBoundary.tsx src/lib/logger.ts
git commit -m "perf: lazy loading and performance optimization"

# 20. fix(firebase): firestore permissions and security
git add firestore.rules firestore.indexes.json
git commit -m "fix(firebase): firestore permissions and security"

# 21. chore: production readiness and deployment hardening
git add .
git commit -m "chore: production readiness and deployment hardening"

echo "Done creating commits."
