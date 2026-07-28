'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, Loader2, Plus, ExternalLink } from 'lucide-react'
import { subscribeToGeneratedDocuments, saveGeneratedDocument } from '@/lib/firebase/generated_documents'
import type { GeneratedDocument } from '@/lib/firebase/generated_documents'
import { generatePdfFromElement } from './pdf/PdfGenerator'
import { OfferLetterTemplate } from './pdf/OfferLetterTemplate'
import { EnrollmentCertificateTemplate } from './pdf/EnrollmentCertificateTemplate'
import { useToast } from '@/components/Toast'
import { auth } from '@/lib/firebase/config'
import type { FirestoreRecord } from '@/lib/firebase/types'

interface GeneratedDocumentsSectionProps {
  app: FirestoreRecord
  universityName: string
}

export default function GeneratedDocumentsSection({ app, universityName }: GeneratedDocumentsSectionProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!app.id) return
    const unsub = subscribeToGeneratedDocuments(app.id, setDocuments)
    return () => unsub()
  }, [app.id])

  const handleGenerateOfferLetter = async () => {
    if (app.status !== 'selected') {
      toast.error('Application must be "Selected" to generate an offer letter.')
      return
    }

    setLoading(true)
    try {
      const user = auth.currentUser
      const generatedBy = user?.displayName || user?.email || 'University Admin'

      // Generate the PDF Blob
      const pdfBlob = await generatePdfFromElement('offer-letter-template')
      
      // Upload and Save
      await saveGeneratedDocument({
        appId: app.id,
        studentId: app.studentId,
        universityId: app.universityId,
        type: 'offer_letter',
        pdfBlob,
        actor: {
          uid: auth.currentUser?.uid || 'system',
          name: generatedBy,
          role: 'admin'
        },
        // Calculate new version based on existing offer letters
        version: documents.filter(d => d.type === 'offer_letter').length + 1
      })
      
      toast.success('Offer Letter generated successfully')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('PDF Generation Error:', error)
      toast.error(`Failed to generate Offer Letter: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const offerLetters = documents.filter(d => d.type === 'offer_letter')
  const admitCards = documents.filter(d => d.type === 'admit_card')
  const enrollments = documents.filter(d => d.type === 'enrollment_certificate')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="section-label m-0">Official Documents</h4>
      </div>

      {/* Offer Letter Section */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-sm font-bold text-white">Offer Letters</h5>
          <button
            onClick={handleGenerateOfferLetter}
            disabled={loading || app.status !== 'selected'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-brand-primary-text rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Generate New
          </button>
        </div>

        {app.status !== 'selected' && (
          <p className="text-[11px] text-brand-warning mb-3">
            * Application must be marked as &quot;Selected&quot; before generating an offer letter.
          </p>
        )}

        <div className="space-y-2">
          {offerLetters.length > 0 ? (
            offerLetters.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} title={`Offer Letter (v${doc.version})`} />
            ))
          ) : (
            <p className="text-xs text-text-muted italic">No offer letters generated yet.</p>
          )}
        </div>
      </div>

      {/* Admit Cards Section */}
      {admitCards.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <h5 className="text-sm font-bold text-white mb-4">Admit Cards</h5>
          <div className="space-y-2">
            {admitCards.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} title={`Admit Card (v${doc.version})`} />
            ))}
          </div>
        </div>
      )}

      {/* Enrollment Certificates Section */}
      {enrollments.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <h5 className="text-sm font-bold text-white mb-4">Enrollment Certificates</h5>
          <div className="space-y-2">
            {enrollments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} title={`Enrollment Certificate`} />
            ))}
          </div>
        </div>
      )}

      {/* Hidden Templates for html2canvas */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
        <OfferLetterTemplate 
          universityName={universityName}
          studentName={app.studentName || 'Student'}
          applicationId={app.id}
          programName={app.programName || 'Program'}
          date={new Date().toISOString()}
          // Using a fixed +14 days purely for the template generation props
          lastAcceptanceDate={new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()}
        />

        <EnrollmentCertificateTemplate
          universityName={universityName}
          studentName={app.studentName || 'Student'}
          programName={app.programName || 'Program'}
          enrollmentNumber={app.enrollmentDetails?.enrollmentNumber || 'TBD'}
          academicSession={app.enrollmentDetails?.academicSession || new Date().getFullYear().toString()}
          department={app.enrollmentDetails?.department || 'Department of Admissions'}
          date={new Date().toISOString()}
        />
      </div>
    </div>
  )
}

function DocumentCard({ doc, title }: { doc: GeneratedDocument, title: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center text-brand-primary-text">
          <FileText size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-[10px] text-text-muted">
            {(doc.generatedAt as any)?.seconds ? new Date((doc.generatedAt as any).seconds * 1000).toLocaleString() : 'Just now'} 
            {' • '} By {doc.generatedBy}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => window.open(doc.url, '_blank')}
          title="View PDF"
          className="p-2 text-text-muted hover:text-brand-primary-text hover:bg-brand-primary/10 rounded transition-colors"
        >
          <ExternalLink size={14} />
        </button>
        <a 
          href={doc.url}
          download
          title="Download PDF"
          className="p-2 text-text-muted hover:text-brand-primary-text hover:bg-brand-primary/10 rounded transition-colors"
        >
          <Download size={14} />
        </a>
      </div>
    </div>
  )
}
