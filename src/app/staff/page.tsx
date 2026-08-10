'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import RouteGuard from '@/components/guards/RouteGuard'
import { getStaff, getInvitations, inviteStaff, revokeInvitation, updateStaffPermissions, toggleStaffStatus, removeStaff, ROLE_PERMISSIONS } from '@/lib/firebase/staff'
import type { StaffMember, StaffRole, Permission, FirestoreRecord } from '@/lib/firebase/types'
import { Shield, UserPlus, Search, Mail, Clock, ShieldAlert, Check, X, Edit2, UserMinus, Trash2, PowerOff } from 'lucide-react'
import { useToast } from '@/components/Toast'

const AVAILABLE_PERMISSIONS: { id: Permission, label: string }[] = [
  { id: 'view_dashboard', label: 'View Dashboard' },
  { id: 'view_applications', label: 'View Applications' },
  { id: 'edit_applications', label: 'Edit Applications' },
  { id: 'verify_documents', label: 'Verify Documents' },
  { id: 'generate_offers', label: 'Generate Offer Letters' },
  { id: 'generate_admit_cards', label: 'Generate Admit Cards' },
  { id: 'verify_payments', label: 'Verify Payments' },
  { id: 'complete_enrollment', label: 'Complete Enrollment' },
  { id: 'manage_programs', label: 'Manage Programs' },
  { id: 'manage_staff', label: 'Manage Staff' },
  { id: 'edit_university', label: 'Edit University Profile' },
  { id: 'view_reports', label: 'View Analytics & Reports' },
]

export default function StaffManagementPage() {
  const { userData, user } = useAuth()
  const { toast } = useToast()
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [invites, setInvites] = useState<FirestoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'directory' | 'invitations'>('directory')

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  const universityId = userData?.role === 'uni_admin' ? user?.uid : userData?.universityId

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!universityId) return
    let isUnmounted = false
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        const [staffData, invitesData] = await Promise.all([
          getStaff(universityId),
          getInvitations(universityId)
        ])
        if (!isUnmounted) {
          setStaff(staffData)
          setInvites(invitesData)
          setLoading(false)
        }
      } catch (err: any) {
        if (!isUnmounted) {
          console.error('Error fetching staff data:', err)
          if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
            setError('Staff data unavailable — check your permissions')
          } else {
            setError(err.message || 'Failed to load staff members')
          }
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => { 
      isUnmounted = true
    }
  }, [universityId])

  const filteredStaff = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <RouteGuard require="manage_staff">
      <div className="space-y-8 min-h-full">
        {error && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Staff Management</h1>
            <p className="text-text-secondary text-sm mt-1">Manage university personnel, roles, and access controls</p>
          </div>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
          >
            <UserPlus size={18} />
            <span>Invite Staff</span>
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-brand-surface border border-brand-border p-2 rounded-2xl">
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('directory')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'directory' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
            >
              Directory ({staff.length})
            </button>
            <button 
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 justify-center ${activeTab === 'invitations' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
            >
              Pending Invites
              {invites.filter(i => i.status === 'pending').length > 0 && (
                <span className="w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] text-white">
                  {invites.filter(i => i.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'directory' && (
              <motion.div key="dir" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStaff.map(member => (
                    <StaffCard 
                      key={member.id} 
                      member={member} 
                      universityId={universityId!} 
                      onEdit={() => setEditingStaff(member)}
                    />
                  ))}
                  {filteredStaff.length === 0 && (
                    <div className="col-span-full py-12 text-center text-text-muted text-sm border border-dashed border-white/10 rounded-2xl">
                      No staff members found.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'invitations' && (
              <motion.div key="inv" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/20 text-[11px] uppercase tracking-wider text-text-muted">
                        <th className="p-4 font-bold">Email</th>
                        <th className="p-4 font-bold">Role</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(invite => (
                        <tr key={invite.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                <Mail size={14} />
                              </div>
                              <span className="text-sm text-white font-medium">{invite.email}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-text-secondary capitalize">{invite.role?.replace(/_/g, ' ')}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-brand-warning/10 text-brand-warning text-[10px] font-bold uppercase rounded-md flex items-center gap-1 w-fit">
                              <Clock size={12} /> {invite.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => {
                                const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
                                revokeInvitation(universityId!, invite.id, actor)
                                toast.success('Invitation revoked')
                              }}
                              className="p-2 text-text-muted hover:text-brand-error transition-colors rounded-lg hover:bg-brand-error/10 inline-block"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {invites.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-text-muted text-sm">No pending invitations.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

      </div>

      <AnimatePresence>
        {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} universityId={universityId!} />}
        {editingStaff && <EditStaffModal member={editingStaff} onClose={() => setEditingStaff(null)} universityId={universityId!} />}
      </AnimatePresence>
    </RouteGuard>
  )
}

function StaffCard({ member, universityId, onEdit }: { member: StaffMember, universityId: string, onEdit: () => void }) {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const handleToggleStatus = async () => {
    try {
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      await toggleStaffStatus(universityId, member.uid, member.status, actor)
      toast.success(`Staff member ${member.status === 'active' ? 'suspended' : 'activated'}`)
    } catch (e) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className={`bg-brand-surface border ${member.status === 'suspended' ? 'border-brand-error/30 opacity-75' : 'border-brand-border'} rounded-2xl p-6 relative group overflow-hidden`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-brand-primary to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
            {member.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-white font-bold">{member.name}</h3>
            <p className="text-xs text-text-muted">{member.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
        </div>
      </div>

      <div className="mb-4">
        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-brand-primary-text capitalize">
          {member.role.replace(/_/g, ' ')}
        </span>
        {member.status === 'suspended' && (
          <span className="ml-2 px-2.5 py-1 bg-brand-error/10 text-brand-error text-xs font-bold uppercase rounded-lg">Suspended</span>
        )}
      </div>

      <div className="bg-black/20 p-3 rounded-xl border border-white/5 mb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
          <Shield size={14} /> Permissions ({member.permissions.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {member.permissions.slice(0, 3).map(p => (
            <span key={p} className="text-[10px] bg-white/5 text-text-secondary px-2 py-0.5 rounded border border-white/5">
              {p.replace(/_/g, ' ')}
            </span>
          ))}
          {member.permissions.length > 3 && (
            <span className="text-[10px] bg-white/5 text-text-secondary px-2 py-0.5 rounded border border-white/5">
              +{member.permissions.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-text-muted pt-4 border-t border-white/5">
        <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
        <button 
          onClick={handleToggleStatus}
          className={`flex items-center gap-1 font-bold ${member.status === 'active' ? 'hover:text-brand-error' : 'hover:text-brand-success'} transition-colors`}
        >
          <PowerOff size={14} />
          {member.status === 'active' ? 'Suspend' : 'Activate'}
        </button>
      </div>
    </div>
  )
}

function InviteModal({ onClose, universityId }: { onClose: () => void, universityId: string }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('admissions_officer')
  const [department, setDepartment] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>(ROLE_PERMISSIONS['admissions_officer'])
  const [loading, setLoading] = useState(false)

  const handleRoleChange = (r: StaffRole) => {
    setRole(r)
    setPermissions(ROLE_PERMISSIONS[r] || [])
  }

  const handleInvite = async () => {
    if (!email) return
    setLoading(true)
    try {
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      await inviteStaff(universityId, { email, role, department, permissions }, actor)
      toast.success('Invitation sent successfully')
      onClose()
    } catch(e) {
      toast.error('Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-200 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><UserPlus size={20} className="text-brand-primary" /> Invite New Staff</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="invite-email" className="block text-xs font-bold text-text-muted uppercase mb-1">Email Address</label>
              <input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-dark w-full text-sm" placeholder="staff@university.edu" />
            </div>
            <div>
              <label htmlFor="invite-dept" className="block text-xs font-bold text-text-muted uppercase mb-1">Department</label>
              <input id="invite-dept" type="text" value={department} onChange={e => setDepartment(e.target.value)} className="input-dark w-full text-sm" placeholder="e.g. Admissions" />
            </div>
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-xs font-bold text-text-muted uppercase mb-1">Role Template</label>
            <select id="invite-role" value={role} onChange={e => handleRoleChange(e.target.value as StaffRole)} className="input-dark w-full text-sm capitalize">
              {Object.keys(ROLE_PERMISSIONS).map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-xl p-4">
            <span className="block text-xs font-bold text-text-muted uppercase mb-3 flex items-center gap-2"><ShieldAlert size={14} /> Fine-tune Permissions</span>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_PERMISSIONS.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-white group">
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${permissions.includes(p.id) ? 'bg-brand-primary border-brand-primary text-white' : 'border-white/20 group-hover:border-white/40'}`}>
                    {permissions.includes(p.id) && <Check size={12} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={permissions.includes(p.id)} onChange={(e) => {
                    if (e.target.checked) setPermissions([...permissions, p.id])
                    else setPermissions(permissions.filter(x => x !== p.id))
                  }}/>
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-text-muted hover:text-white transition-colors">Cancel</button>
          <button onClick={handleInvite} disabled={loading || !email} className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg hover:bg-brand-primary/90 disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function EditStaffModal({ member, onClose, universityId }: { member: StaffMember, onClose: () => void, universityId: string }) {
  const { toast } = useToast()
  const [role, setRole] = useState<StaffRole>(member.role)
  const [permissions, setPermissions] = useState<Permission[]>(member.permissions)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const user = auth.currentUser
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      await updateStaffPermissions(universityId, member.uid, permissions, role, actor)
      toast.success('Staff updated successfully')
      onClose()
    } catch(e) {
      toast.error('Failed to update staff')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to permanently remove this staff member?')) return
    setLoading(true)
    try {
      const user = auth.currentUser
      const actor = { uid: user?.uid || 'system', name: user?.displayName || user?.email || 'Admin', role: 'admin' }
      await removeStaff(universityId, member.uid, actor)
      toast.success('Staff removed successfully')
      onClose()
    } catch(e) {
      toast.error('Failed to remove staff')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-200 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-brand-primary to-indigo-600 flex items-center justify-center text-lg font-bold text-white">
              {member.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{member.name}</h2>
              <p className="text-xs text-text-muted">{member.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <label htmlFor="edit-role" className="block text-xs font-bold text-text-muted uppercase mb-1">Role</label>
            <select id="edit-role" value={role} onChange={e => {
              const r = e.target.value as StaffRole
              setRole(r)
              setPermissions(ROLE_PERMISSIONS[r])
            }} className="input-dark w-full text-sm capitalize">
              {Object.keys(ROLE_PERMISSIONS).map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-xl p-4">
            <span className="block text-xs font-bold text-text-muted uppercase mb-3 flex items-center gap-2"><ShieldAlert size={14} /> Custom Permissions</span>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_PERMISSIONS.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-white group">
                  <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${permissions.includes(p.id) ? 'bg-brand-primary border-brand-primary text-white' : 'border-white/20 group-hover:border-white/40'}`}>
                    {permissions.includes(p.id) && <Check size={12} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={permissions.includes(p.id)} onChange={(e) => {
                    if (e.target.checked) setPermissions([...permissions, p.id])
                    else setPermissions(permissions.filter(x => x !== p.id))
                  }}/>
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-black/20 flex justify-between items-center">
          <button onClick={handleRemove} className="flex items-center gap-2 text-brand-error text-sm font-bold hover:bg-brand-error/10 px-4 py-2 rounded-lg transition-colors">
            <UserMinus size={16} /> Remove Staff
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-text-muted hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-lg hover:bg-brand-primary/90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
