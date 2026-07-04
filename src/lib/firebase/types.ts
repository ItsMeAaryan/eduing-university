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
