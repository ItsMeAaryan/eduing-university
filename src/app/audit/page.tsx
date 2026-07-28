'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAuditLogsPage } from '@/lib/firebase/audit'
import type { AuditLog } from '@/lib/firebase/types'
import { useAuth } from '@/context/AuthContext'
import RouteGuard from '@/components/guards/RouteGuard'
import { Activity, Search, Filter, ChevronDown, ChevronRight, FileText, User, Calendar, Shield, Clock } from 'lucide-react'
import type { DocumentSnapshot } from 'firebase/firestore'

export default function AuditLogsPage() {
  const { userData, user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadLogs = async (isLoadMore = false) => {
    const uniId = userData?.universityId || user?.uid
    if (!uniId) return

    if (!isLoadMore) {
      setLoading(true)
      setLogs([])
      setLastDoc(null)
    }

    try {
      const currentLastDoc = isLoadMore ? lastDoc : null
      const res = await getAuditLogsPage(uniId, 20, currentLastDoc, {
        actionType: actionFilter
      })
      
      if (isLoadMore) {
        setLogs(prev => [...prev, ...res.logs])
      } else {
        setLogs(res.logs)
      }
      setLastDoc(res.lastDoc)
      setHasMore(res.logs.length === 20)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userData?.universityId || user?.uid) {
      loadLogs()
    }
  }, [userData?.universityId, user?.uid])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs()
    }, 500)
    return () => clearTimeout(timer)
  }, [actionFilter, searchTerm]) // Re-fetch on filter change

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.actorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase())
      
    return matchesSearch
  })

  return (
    <RouteGuard require="view_audit_logs">
      <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="text-brand-primary" size={32} />
              Enterprise Audit Logs
            </h1>
            <p className="text-text-secondary">Immutable record of all system activity and data mutations.</p>
          </div>
          
          <div className="flex gap-4">
            <button className="btn-secondary flex items-center gap-2">
              <Filter size={16} /> Advanced Filters
            </button>
            <button className="btn-primary flex items-center gap-2">
              <FileText size={16} /> Export Report
            </button>
          </div>
        </header>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-4 mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by actor, action, or entity ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-dark w-full pl-10"
            />
          </div>
          <select 
            value={actionFilter} 
            onChange={e => setActionFilter(e.target.value)}
            className="input-dark w-48 capitalize"
          >
            <option value="all">All Actions</option>
            <option value="application">Applications</option>
            <option value="document">Documents</option>
            <option value="payment">Payments</option>
            <option value="staff">Staff Management</option>
          </select>
        </div>

        <div className="flex-1 bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border bg-black/40">
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider w-10"></th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Timestamp</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Actor</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Action</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Entity</th>
                  <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 relative">
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                )}
                
                {!loading && filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`group hover:bg-white/5 transition-colors cursor-pointer ${expandedRow === log.id ? 'bg-white/5' : ''}`}
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <td className="p-4 text-text-muted">
                        <motion.div animate={{ rotate: expandedRow === log.id ? 90 : 0 }}>
                          <ChevronRight size={16} />
                        </motion.div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-text-secondary whitespace-nowrap">
                          <Clock size={14} className="text-brand-primary" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                            {log.actorName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white leading-none mb-1">{log.actorName}</p>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">{log.actorRole.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-text-muted" />
                          <span className="text-sm text-white capitalize">{log.actionType.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm text-text-secondary capitalize">{log.entityType}</p>
                          <p className="text-[10px] text-text-muted font-mono">{log.entityId.slice(0,8)}...</p>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          log.status === 'success' ? 'bg-brand-success/10 text-brand-success' :
                          log.status === 'failed' ? 'bg-brand-error/10 text-brand-error' :
                          'bg-brand-warning/10 text-brand-warning'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Expanded Diff Viewer */}
                    {expandedRow === log.id && (
                      <tr className="bg-black/40 border-b border-brand-border">
                        <td colSpan={6} className="p-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Metadata</h4>
                              <div className="bg-brand-surface border border-white/5 rounded-xl p-4 text-sm font-mono text-text-secondary space-y-2">
                                <p><span className="text-text-muted mr-4">Log ID:</span> {log.id}</p>
                                <p><span className="text-text-muted mr-4">Actor UID:</span> {log.actorUid}</p>
                                <p><span className="text-text-muted mr-4">Entity ID:</span> {log.entityId}</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Payload Diff</h4>
                              <div className="bg-brand-surface border border-white/5 rounded-xl p-4 text-sm font-mono overflow-x-auto">
                                {log.newValue ? (
                                  <pre className="text-brand-success">{JSON.stringify(log.newValue, null, 2)}</pre>
                                ) : (
                                  <span className="text-text-muted italic">No payload data</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                
                {!loading && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-text-muted">
                      <Shield size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No audit logs found matching your criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-brand-border bg-black/20 flex justify-between items-center text-sm text-text-muted">
            <div className="flex items-center gap-4">
              <span>Showing {filteredLogs.length} records</span>
              {hasMore && (
                <button
                  onClick={() => loadLogs(true)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded transition-colors"
                >
                  Load More
                </button>
              )}
            </div>
            <span className="flex items-center gap-2">Immutable Audit Trail Active <CheckCircle size={14} className="text-brand-success" /></span>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
