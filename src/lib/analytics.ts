import type { FirestoreRecord, AuditLog, StaffMember } from '@/lib/firebase/types'

// -- Executive KPIs --
export function getExecutiveKPIs(apps: FirestoreRecord[]) {
  const totalReceived = apps.length
  const underReview = apps.filter(a => a.status === 'under_review').length
  const docsPending = apps.filter(a => a.status === 'docs_verified').length // docs verified but not selected
  const offersIssued = apps.filter(a => ['selected', 'seat_accepted', 'fee_paid', 'payment_verified', 'enrolled'].includes(a.status)).length
  const seatAccepted = apps.filter(a => ['seat_accepted', 'fee_paid', 'payment_verified', 'enrolled'].includes(a.status)).length
  const enrolled = apps.filter(a => a.status === 'enrolled').length

  const acceptanceRate = offersIssued > 0 ? (seatAccepted / offersIssued) * 100 : 0
  const enrollmentRate = offersIssued > 0 ? (enrolled / offersIssued) * 100 : 0

  let revenueCollected = 0
  let pendingRevenue = 0

  apps.forEach(app => {
    if (app.paymentDetails) {
      if (app.paymentDetails.status === 'verified') {
        revenueCollected += Number(app.paymentDetails.amount) || 0
      } else {
        pendingRevenue += Number(app.paymentDetails.amount) || 0
      }
    }
  })

  return {
    totalReceived,
    underReview,
    docsPending,
    offersIssued,
    seatAccepted,
    enrolled,
    acceptanceRate: acceptanceRate.toFixed(1),
    enrollmentRate: enrollmentRate.toFixed(1),
    revenueCollected,
    pendingRevenue
  }
}

// -- Funnel --
export function getConversionFunnel(apps: FirestoreRecord[]) {
  const funnel = [
    { stage: 'Applicants', count: apps.length },
    { stage: 'Docs Verified', count: apps.filter(a => ['docs_verified', 'selected', 'seat_accepted', 'fee_paid', 'payment_verified', 'enrolled'].includes(a.status)).length },
    { stage: 'Offers Issued', count: apps.filter(a => ['selected', 'seat_accepted', 'fee_paid', 'payment_verified', 'enrolled'].includes(a.status)).length },
    { stage: 'Seat Accepted', count: apps.filter(a => ['seat_accepted', 'fee_paid', 'payment_verified', 'enrolled'].includes(a.status)).length },
    { stage: 'Enrolled', count: apps.filter(a => a.status === 'enrolled').length },
  ]
  return funnel
}

// -- Program Distribution --
export function getProgramDistribution(apps: FirestoreRecord[], programs: FirestoreRecord[]) {
  const counts: Record<string, number> = {}
  programs.forEach(p => counts[p.name] = 0)
  apps.forEach(app => {
    if (app.programName) {
      counts[app.programName] = (counts[app.programName] || 0) + 1
    }
  })
  
  return Object.keys(counts).map(name => ({ name, value: counts[name] })).sort((a, b) => b.value - a.value)
}

// -- Daily Activity Trend --
export function getActivityTrend(auditLogs: AuditLog[], days: number = 30) {
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  const counts: Record<string, number> = {}
  dates.forEach(d => counts[d] = 0)

  auditLogs.forEach(log => {
    const dateStr = new Date(log.timestamp).toISOString().split('T')[0]
    if (counts[dateStr] !== undefined) {
      counts[dateStr]++
    }
  })

  return dates.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    actions: counts[date]
  }))
}

// -- Staff Productivity --
export function getStaffProductivity(auditLogs: AuditLog[], staff: StaffMember[]) {
  const staffActivity: Record<string, { name: string, role: string, actions: number, reviews: number }> = {}
  
  staff.forEach(s => {
    staffActivity[s.uid] = { name: s.name, role: s.role, actions: 0, reviews: 0 }
  })

  auditLogs.forEach(log => {
    if (staffActivity[log.actorUid]) {
      staffActivity[log.actorUid].actions++
      if (log.actionType.includes('status_changed') || log.actionType.includes('verify')) {
        staffActivity[log.actorUid].reviews++
      }
    } else {
      // Staff member might have been deleted, or is the admin owner
      staffActivity[log.actorUid] = { 
        name: log.actorName, 
        role: log.actorRole, 
        actions: 1, 
        reviews: log.actionType.includes('status') ? 1 : 0 
      }
    }
  })

  return Object.values(staffActivity).sort((a, b) => b.actions - a.actions)
}
