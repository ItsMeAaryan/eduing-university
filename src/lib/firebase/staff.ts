import { db } from './config'
import type { FirestoreRecord, StaffRole, Permission, StaffMember, ActorContext } from './types'
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  where,
  runTransaction
} from 'firebase/firestore'
import { logToTransaction } from './audit'

// Map of default permissions per role
export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ['view_dashboard', 'view_applications', 'edit_applications', 'verify_documents', 'generate_offers', 'generate_admit_cards', 'verify_payments', 'complete_enrollment', 'manage_programs', 'manage_staff', 'edit_university', 'view_reports', 'view_audit_logs'],
  super_admin: ['view_dashboard', 'view_applications', 'edit_applications', 'verify_documents', 'generate_offers', 'generate_admit_cards', 'verify_payments', 'complete_enrollment', 'manage_programs', 'manage_staff', 'view_reports', 'view_audit_logs'],
  admissions_head: ['view_dashboard', 'view_applications', 'edit_applications', 'verify_documents', 'generate_offers', 'generate_admit_cards', 'manage_programs', 'view_reports'],
  admissions_officer: ['view_dashboard', 'view_applications', 'edit_applications', 'generate_admit_cards'],
  document_officer: ['view_dashboard', 'view_applications', 'verify_documents'],
  finance_officer: ['view_dashboard', 'view_applications', 'verify_payments'],
  exam_coordinator: ['view_dashboard', 'generate_admit_cards'],
  registrar: ['view_dashboard', 'view_applications', 'verify_documents', 'complete_enrollment'],
  analyst: ['view_dashboard', 'view_reports'],
  support: ['view_dashboard', 'view_applications']
}

export const subscribeToStaff = (universityId: string, callback: (staff: StaffMember[]) => void) => {
  const q = query(collection(db, `universities/${universityId}/staff`))
  return onSnapshot(q, (snapshot) => {
    const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember))
    callback(staff)
  })
}

export const subscribeToInvitations = (universityId: string, callback: (invites: FirestoreRecord[]) => void) => {
  const q = query(collection(db, `universities/${universityId}/staffInvitations`))
  return onSnapshot(q, (snapshot) => {
    const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(invites)
  })
}

export const inviteStaff = async (universityId: string, data: { email: string; role: StaffRole; department: string; permissions: Permission[] }, actor: ActorContext) => {
  const q = query(collection(db, `universities/${universityId}/staffInvitations`), where('email', '==', data.email))
  const snap = await getDocs(q)
  const existingId = !snap.empty ? snap.docs[0].id : null

  await runTransaction(db, async (transaction) => {
    if (existingId) {
      const inviteRef = doc(db, `universities/${universityId}/staffInvitations`, existingId)
      transaction.update(inviteRef, {
        ...data,
        status: 'pending',
        invitedBy: actor.name,
        createdAt: serverTimestamp(),
        expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      logToTransaction(transaction, universityId, actor, {
        actionType: 'staff_invited',
        entityType: 'staff_invitation',
        entityId: existingId,
        newValue: { ...data, status: 'pending' }
      })
    } else {
      const newRef = doc(collection(db, `universities/${universityId}/staffInvitations`))
      transaction.set(newRef, {
        ...data,
        status: 'pending',
        invitedBy: actor.name,
        createdAt: serverTimestamp(),
        expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      logToTransaction(transaction, universityId, actor, {
        actionType: 'staff_invited',
        entityType: 'staff_invitation',
        entityId: newRef.id,
        newValue: { ...data, status: 'pending' }
      })
    }
  })
}

export const revokeInvitation = async (universityId: string, inviteId: string, actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    transaction.delete(doc(db, `universities/${universityId}/staffInvitations`, inviteId))
    logToTransaction(transaction, universityId, actor, {
      actionType: 'staff_invitation_revoked',
      entityType: 'staff_invitation',
      entityId: inviteId,
      newValue: { status: 'revoked' }
    })
  })
}

export const updateStaffPermissions = async (universityId: string, staffUid: string, permissions: Permission[], role: StaffRole, actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const staffRef = doc(db, `universities/${universityId}/staff`, staffUid)
    transaction.update(staffRef, { permissions, role })
    logToTransaction(transaction, universityId, actor, {
      actionType: 'staff_permissions_updated',
      entityType: 'staff',
      entityId: staffUid,
      newValue: { permissions, role }
    })
  })
}

export const toggleStaffStatus = async (universityId: string, staffUid: string, currentStatus: 'active' | 'suspended', actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const staffRef = doc(db, `universities/${universityId}/staff`, staffUid)
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    transaction.update(staffRef, { status: newStatus })
    logToTransaction(transaction, universityId, actor, {
      actionType: `staff_${newStatus}`,
      entityType: 'staff',
      entityId: staffUid,
      newValue: { status: newStatus }
    })
  })
}

export const removeStaff = async (universityId: string, staffUid: string, actor: ActorContext) => {
  await runTransaction(db, async (transaction) => {
    const staffRef = doc(db, `universities/${universityId}/staff`, staffUid)
    transaction.delete(staffRef)
    
    const userRef = doc(db, 'users', staffUid)
    transaction.update(userRef, { role: 'student', universityId: null })

    logToTransaction(transaction, universityId, actor, {
      actionType: 'staff_removed',
      entityType: 'staff',
      entityId: staffUid,
      newValue: { status: 'removed' }
    })
  })
}
