// Loosely-typed shape for Firestore documents. Firestore's own SDK types
// document data as `DocumentData` (effectively `Record<string, any>`), so
// this is intentionally permissive on unknown fields rather than `unknown`
// — using `unknown` here would require an explicit type-guard/cast at every
// property access across the app's many read-only render paths, which
// isn't worth the churn for a document shape Firestore itself won't
// validate for us. The `id: string` guarantee (always present, added by
// callers from `doc.id`) is what actually matters here; centralizing the
// permissiveness in this one documented type is preferable to scattering
// untyped `any` throughout page and component files individually.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FirestoreRecord = { id: string } & Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FirestoreWriteData = Record<string, any>

export type Permission = 
  | 'view_dashboard'
  | 'view_applications'
  | 'edit_applications'
  | 'verify_documents'
  | 'generate_offers'
  | 'generate_admit_cards'
  | 'verify_payments'
  | 'complete_enrollment'
  | 'manage_programs'
  | 'manage_staff'
  | 'edit_university'
  | 'view_reports'
  | 'view_audit_logs'

export interface ActorContext {
  uid: string
  name: string
  role: string
}

export interface AuditLog extends FirestoreRecord {
  timestamp: string
  actorUid: string
  actorName: string
  actorRole: string
  universityId: string
  actionType: string
  entityType: string
  entityId: string
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
  status: 'success' | 'failed' | 'warning'
  metadata?: Record<string, any>
}

export type StaffRole = 
  | 'owner'
  | 'super_admin'
  | 'admissions_head'
  | 'admissions_officer'
  | 'document_officer'
  | 'finance_officer'
  | 'exam_coordinator'
  | 'registrar'
  | 'analyst'
  | 'support'

export interface StaffMember extends FirestoreRecord {
  uid: string
  name: string
  email: string
  role: StaffRole
  department?: string
  status: 'active' | 'suspended'
  permissions: Permission[]
  joinedAt: string
  lastLogin?: string
}
