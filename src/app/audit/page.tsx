'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAuditLogsPage } from '@/lib/firebase/audit'
import type { AuditLog } from '@/lib/firebase/types'
import { useAuth } from '@/context/AuthContext'
import RouteGuard from '@/components/guards/RouteGuard'
import { Activity, Search, ChevronRight, FileText, Shield, Clock, CheckCircle } from 'lucide-react'
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
    if (!isLoadMore) { setLoading(true); setLogs([]); setLastDoc(null) }
    try {
      const res = await getAuditLogsPage(uniId as string, 20, isLoadMore ? lastDoc : null, { actionType: actionFilter })
      setLogs(prev => isLoadMore ? [...prev, ...res.logs] : res.logs)
      setLastDoc(res.lastDoc)
      setHasMore(res.logs.length === 20)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userData?.universityId || user?.uid) loadLogs()
  }, [userData?.universityId, user?.uid])

  useEffect(() => {
    const t = setTimeout(() => loadLogs(), 400)
    return () => clearTimeout(t)
  }, [actionFilter, searchTerm])

  const filteredLogs = logs.filter(log =>
    log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RouteGuard require="view_audit_logs">
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Audit Logs</h1>
            <p className="page-subtitle">Immutable record of all system activity and data mutations</p>
          </div>
          <button className="btn-secondary" style={{ gap: '6px' }}>
            <FileText size={13} /> Export Report
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input
              placeholder="Search by actor, action, or entity ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '30px' }}
            />
          </div>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input-field" style={{ minWidth: '140px', cursor: 'pointer' }}>
            <option value="all">All actions</option>
            <option value="application">Applications</option>
            <option value="document">Documents</option>
            <option value="payment">Payments</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }} />
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><Shield size={18} /></div>
                        <p className="empty-state-title">No audit logs found</p>
                        <p className="empty-state-description">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      style={{ background: expandedRow === log.id ? 'var(--bg-card-hover)' : undefined, cursor: 'pointer' }}
                    >
                      {/* Expand chevron */}
                      <td style={{ paddingLeft: '14px', paddingRight: '0' }}>
                        <motion.div animate={{ rotate: expandedRow === log.id ? 90 : 0 }} style={{ display: 'flex', color: 'var(--text-faint)' }}>
                          <ChevronRight size={13} />
                        </motion.div>
                      </td>

                      {/* Timestamp */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          <Clock size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Actor */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--accent)', flexShrink: 0 }}>
                            {log.actorName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: 1.2 }}>{log.actorName}</div>
                            <div className="text-eyebrow">{log.actorRole.replace(/_/g, ' ')}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Activity size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {log.actionType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Entity */}
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{log.entityType}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-faint)' }}>{log.entityId.slice(0, 8)}…</div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'right' }}>
                        <span className={log.status === 'success' ? 'badge badge-success' : log.status === 'failed' ? 'badge badge-error' : 'badge badge-warning'}>
                          {log.status}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expandedRow === log.id && (
                      <tr style={{ background: 'var(--bg)' }}>
                        <td colSpan={6} style={{ padding: '0 14px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px' }}>
                            {/* Metadata */}
                            <div>
                              <div className="text-eyebrow" style={{ marginBottom: '8px' }}>Metadata</div>
                              <div style={{
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '7px',
                                padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.8,
                              }}>
                                <div><span style={{ color: 'var(--text-faint)' }}>LOG ID  </span><span style={{ color: 'var(--text-secondary)' }}>{log.id}</span></div>
                                <div><span style={{ color: 'var(--text-faint)' }}>ACTOR   </span><span style={{ color: 'var(--text-secondary)' }}>{log.actorUid}</span></div>
                                <div><span style={{ color: 'var(--text-faint)' }}>ENTITY  </span><span style={{ color: 'var(--text-secondary)' }}>{log.entityId}</span></div>
                              </div>
                            </div>

                            {/* Payload */}
                            <div>
                              <div className="text-eyebrow" style={{ marginBottom: '8px' }}>Payload</div>
                              <div style={{
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '7px',
                                padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', overflowX: 'auto', maxHeight: '140px', overflowY: 'auto',
                              }}>
                                {log.newValue ? (
                                  <pre style={{ margin: 0, color: 'var(--green)' }}>{JSON.stringify(log.newValue, null, 2)}</pre>
                                ) : (
                                  <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>No payload</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {filteredLogs.length} records
              </span>
              {hasMore && (
                <button onClick={() => loadLogs(true)} className="btn-ghost" style={{ height: '26px', fontSize: '12px' }}>
                  Load more
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <CheckCircle size={12} style={{ color: 'var(--green)' }} />
              Immutable audit trail active
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}