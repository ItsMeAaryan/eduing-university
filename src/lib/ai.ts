import type { FirestoreRecord } from '@/lib/firebase/types'

// A small utility to simulate LLM network latency
const simulateLatency = (ms: number = 1500) => new Promise(resolve => setTimeout(resolve, ms))

export interface EligibilityResult {
  isEligible: boolean
  confidence: number // 0-100
  reasonsMet: string[]
  reasonsMissing: string[]
  concerns: string[]
}

export interface FraudAlert {
  level: 'low' | 'medium' | 'high'
  flags: string[]
  explanation: string
}

export const AI_SERVICE = {
  
  /**
   * Generates a concise applicant summary simulating an LLM processing the student's profile,
   * timeline, and documents.
   */
  async generateApplicantSummary(student: any): Promise<string> {
    await simulateLatency(1200)

    const name = student.studentName || student.studentProfile?.fullName || 'The applicant'
    const program = student.programName || 'their selected program'
    const state = student.studentProfile?.state || student.studentProfile?.domicileState || 'an unspecified state'
    
    let summary = `${name} is applying for ${program} from ${state}. `
    
    if (student.status === 'enrolled') {
      summary += `They have successfully completed all admission requirements, including fee payment, and are fully enrolled.`
    } else if (student.status === 'under_review') {
      summary += `Their application is currently under review. Documents are pending verification.`
    } else if (student.status === 'selected') {
      summary += `They have been selected and issued an offer letter, but have not yet completed the fee payment.`
    } else {
      summary += `Their current status is ${student.status.replace('_', ' ')}.`
    }

    if (student.tags && student.tags.length > 0) {
      summary += ` They are tagged as: ${student.tags.join(', ')}.`
    }

    return summary
  },

  /**
   * Analyzes an applicant's data against program requirements.
   * Returns a structured explainable evaluation.
   */
  async analyzeEligibility(student: any, program: any): Promise<EligibilityResult> {
    await simulateLatency(1800)

    const result: EligibilityResult = {
      isEligible: false,
      confidence: 85,
      reasonsMet: [],
      reasonsMissing: [],
      concerns: []
    }

    // Mock logic based on application data
    // Class 12 percentage the student declared (shared with the application)
    const declared = student.studentProfile?.twelfthScore ?? student.studentProfile?.percentage
    if (declared) {
      const pct = Number(declared)
      if (pct >= 60) {
        result.reasonsMet.push(`Class 12 percentage (${pct}%) meets the general 60% threshold.`)
      } else {
        result.reasonsMissing.push(`Class 12 percentage (${pct}%) is below the general 60% threshold.`)
      }
    } else {
      result.reasonsMissing.push(`The student hasn\u2019t shared a Class 12 percentage yet.`)
    }

    if (student.status === 'docs_verified' || student.status === 'selected' || student.status === 'enrolled') {
      result.reasonsMet.push(`Required documents have been verified by staff.`)
      result.isEligible = true
      result.confidence = 95
    } else {
      result.concerns.push(`Documents have not been fully verified yet.`)
      result.confidence = 60
    }

    return result
  },

  /**
   * Analyzes an applicant for unusual patterns compared to other applicants.
   */
  async detectFraud(student: any, allStudents: any[]): Promise<FraudAlert | null> {
    await simulateLatency(1000)

    const flags: string[] = []
    
    // Check for duplicate emails or phones in other applications
    const duplicates = allStudents.filter(s => 
      s.id !== student.id && 
      (
        (s.studentProfile?.email && s.studentProfile.email === student.studentProfile?.email) ||
        (s.studentProfile?.phone && s.studentProfile.phone === student.studentProfile?.phone)
      )
    )

    if (duplicates.length > 0) {
      flags.push(`Contact information (email/phone) matches ${duplicates.length} other application(s).`)
    }

    if (flags.length === 0) return null

    return {
      level: flags.length > 1 ? 'high' : 'medium',
      flags,
      explanation: `The AI detected potential anomalies in this application that require human verification before issuing an offer.`
    }
  },

  /**
   * Translates natural language into structured filters.
   */
  async parseSearchIntent(query: string): Promise<{ status?: string, tags?: string[] }> {
    await simulateLatency(800)
    
    const lowerQuery = query.toLowerCase()
    const filters: { status?: string, tags?: string[] } = {}

    if (lowerQuery.includes('pending payment') || lowerQuery.includes('awaiting payment')) {
      filters.status = 'selected'
    } else if (lowerQuery.includes('pending document') || lowerQuery.includes('under review')) {
      filters.status = 'under_review'
    } else if (lowerQuery.includes('enrolled')) {
      filters.status = 'enrolled'
    }

    if (lowerQuery.includes('scholarship')) {
      filters.tags = ['Scholarship']
    } else if (lowerQuery.includes('vip')) {
      filters.tags = ['VIP']
    }

    return filters
  },

  /**
   * Answers a staff question with the real AI model (via /api/ai), grounded in
   * the university's live admissions summary passed as `systemContext`.
   */
  async askCopilot(question: string, opts?: { systemContext?: string; history?: { role: 'user' | 'assistant'; content: string }[] }): Promise<string> {
    const { auth } = await import('@/lib/firebase/config')
    const token = await auth.currentUser?.getIdToken().catch(() => '')
    const system =
      'You are the EDUING Admissions Copilot for an Indian university\'s admissions office. ' +
      'Answer only questions about this university\'s admissions: applications, document checks, offers, seats, fees, enrollment and communication with applicants. ' +
      'Use the live data below; if the data does not contain the answer, say so plainly instead of guessing. Be concise and use Indian conventions (₹, lakh).' +
      (opts?.systemContext ? `\n\nLive data:\n${opts.systemContext}` : '')
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ messages: [{ role: 'system', content: system }, ...(opts?.history ?? []), { role: 'user', content: question }] }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'The AI Copilot is unavailable right now.')
    return (data.text as string) || 'I couldn\u2019t come up with an answer. Try rephrasing the question.'
  }
}
