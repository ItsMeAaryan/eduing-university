// Shared mock factories used across test files.
// Firebase is mocked entirely — tests run in jsdom with no real network/auth.

import { vi } from 'vitest'

// ── Firebase Auth ────────────────────────────────────────────────────────────
export const mockSignInWithEmailAndPassword = vi.fn()
export const mockCreateUserWithEmailAndPassword = vi.fn()
export const mockSendPasswordResetEmail = vi.fn()
export const mockOnAuthStateChanged = vi.fn()
export const mockSignOut = vi.fn()

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null, signOut: mockSignOut })),
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: mockSignOut,
}))

// ── Firebase Firestore ───────────────────────────────────────────────────────
export const mockSetDoc = vi.fn()
export const mockGetDoc = vi.fn()
export const mockUpdateDoc = vi.fn()
export const mockAddDoc = vi.fn()
export const mockOnSnapshot = vi.fn()
export const mockServerTimestamp = vi.fn(() => ({ seconds: Date.now() / 1000 }))
export const mockDoc = vi.fn((_db, collection, id) => ({ path: `${collection}/${id}` }))
export const mockCollection = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: mockDoc,
  collection: mockCollection,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  addDoc: mockAddDoc,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp,
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  or: vi.fn(),
  FieldValue: { serverTimestamp: mockServerTimestamp },
}))

// ── Firebase Storage ─────────────────────────────────────────────────────────
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}))

// ── Firebase config ──────────────────────────────────────────────────────────
export const mockAuthOnAuthStateChanged = vi.fn()

vi.mock('@/lib/firebase/config', () => ({
  auth: {
    currentUser: { uid: 'uni-test', email: 'admin@test.edu' },
    onAuthStateChanged: mockAuthOnAuthStateChanged,
    signOut: mockSignOut,
  },
  db: {},
  storage: {},
  default: {},
}))

// ── Next.js navigation ───────────────────────────────────────────────────────
export const mockPush = vi.fn()
export const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
  usePathname: vi.fn(() => '/dashboard'),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    Object.assign(document.createElement('img'), { src, alt, ...props }),
}))
