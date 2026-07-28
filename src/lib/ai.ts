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

    const name = student.studentProfile?.firstName || 'The applicant'
    const program = student.programName || 'their selected program'
    const state = student.studentProfile?.state || 'an unspecified region'
    
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
    if (student.studentProfile?.percentage) {
      const pct = Number(student.studentProfile.percentage)
      if (pct >= 60) {
        result.reasonsMet.push(`Academic percentage (${pct}%) meets general requirements.`)
      } else {
        result.reasonsMissing.push(`Academic percentage (${pct}%) is below recommended threshold.`)
      }
    } else {
      result.reasonsMissing.push(`No academic percentage recorded in profile.`)
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
   * Simulates an AI Copilot response to staff questions.
   */
  async askCopilot(question: string, context?: any): Promise<string> {
    await simulateLatency(2000)
    
    const q = question.toLowerCase()

    if (q.includes('summarize')) {
      if (context?.student) {
        return await this.generateApplicantSummary(context.student)
      }
      return "I need a specific student profile to summarize."
    }

    if (q.includes('how many applications')) {
      return "Based on the latest data, there are 25 total applications. 5 are currently under review."
    }

    if (q.includes('draft') && q.includes('email')) {
      return `Subject: Action Required: Missing Documents\n\nDear Applicant,\n\nWe are currently reviewing your application. However, we noticed that some required documents are missing. Please log into the portal to upload them.\n\nRegards,\nAdmissions Team`
    }

    return "I am the Enterprise AI Copilot. I can summarize applicants, check eligibility, detect fraud, and draft communications based on the real-time University data. How can I assist you today?"
  }
}
