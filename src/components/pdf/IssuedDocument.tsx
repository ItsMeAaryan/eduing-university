'use client'

// Renders an issued document (offer letter, admit card, enrollment certificate)
// from the data saved in Firestore and downloads it as a PDF. Nothing is stored
// as a file, so this works on Firebase's free plan.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { generatePdfFromNode } from './PdfGenerator'
import { OfferLetterTemplate } from './OfferLetterTemplate'
import { AdmitCardTemplate } from './AdmitCardTemplate'
import { EnrollmentCertificateTemplate } from './EnrollmentCertificateTemplate'
import type { GeneratedDocument, GeneratedDocumentType } from '@/lib/firebase/generated_documents'

type Data = Record<string, string>

export function renderIssuedTemplate(type: GeneratedDocumentType, d: Data) {
  if (type === 'offer_letter') {
    return (
      <OfferLetterTemplate
        universityName={d.universityName}
        studentName={d.studentName}
        applicationId={d.applicationId}
        programName={d.programName}
        department={d.department}
        academicYear={d.academicYear}
        feeSummary={d.feeSummary}
        date={d.date}
        lastAcceptanceDate={d.lastAcceptanceDate}
      />
    )
  }
  if (type === 'admit_card') {
    return (
      <AdmitCardTemplate
        universityName={d.universityName}
        studentName={d.studentName}
        applicationId={d.applicationId}
        rollNumber={d.rollNumber}
        programName={d.programName}
        examName={d.examName}
        examDate={d.examDate}
        examTime={d.examTime}
        reportingTime={d.reportingTime}
        venue={d.venue}
        instructions={d.instructions}
      />
    )
  }
  return (
    <EnrollmentCertificateTemplate
      universityName={d.universityName}
      studentName={d.studentName}
      programName={d.programName}
      enrollmentNumber={d.enrollmentNumber}
      academicSession={d.academicSession}
      department={d.department}
      date={d.date}
    />
  )
}

const FILE_NAME: Record<string, string> = {
  offer_letter: 'Offer-Letter',
  admit_card: 'Admit-Card',
  enrollment_certificate: 'Enrollment-Certificate',
}

/** Builds the PDF in an off-screen container and starts the download. */
export async function downloadIssuedDocument(doc: GeneratedDocument) {
  if (!doc.data && doc.url) {
    window.open(doc.url, '_blank', 'noopener') // issued before documents moved to data
    return
  }
  if (!doc.data) throw new Error('This document has no content to download.')

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(renderIssuedTemplate(doc.type, doc.data!)))
    const node = host.firstElementChild as HTMLElement | null
    if (!node) throw new Error('Could not prepare the document.')
    const blob = await generatePdfFromNode(node)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${FILE_NAME[doc.type] ?? 'Document'}-${(doc.data.studentName || 'student').replace(/\s+/g, '-')}-v${doc.version ?? 1}.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } finally {
    root.unmount()
    host.remove()
  }
}
