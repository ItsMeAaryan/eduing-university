import React from 'react'

interface OfferLetterProps {
  universityName: string
  studentName: string
  applicationId: string
  programName: string
  department?: string
  academicYear?: string
  feeSummary?: string
  date: string
  lastAcceptanceDate: string
}

export const OfferLetterTemplate: React.FC<OfferLetterProps> = ({
  universityName,
  studentName,
  applicationId,
  programName,
  department = 'Admissions Department',
  academicYear = new Date().getFullYear().toString(),
  feeSummary = 'Refer to the university portal for detailed fee structure.',
  date,
  lastAcceptanceDate
}) => {
  return (
    <div 
      id="offer-letter-template"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        background: '#ffffff',
        color: '#000000',
        fontFamily: '"Times New Roman", Times, serif',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10mm', marginBottom: '10mm' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
          {universityName}
        </h1>
        <p style={{ fontSize: '14px', margin: 0 }}>
          {department} | Official Offer of Admission
        </p>
      </div>

      {/* Meta Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15mm', fontSize: '12px' }}>
        <div>
          <strong>Date:</strong> {new Date(date).toLocaleDateString()}<br/>
          <strong>Ref No:</strong> ADM/{academicYear}/{applicationId.substring(0, 6).toUpperCase()}
        </div>
      </div>

      {/* Salutation */}
      <div style={{ marginBottom: '10mm', fontSize: '14px', lineHeight: '1.6' }}>
        <strong>To,</strong><br/>
        {studentName}<br/>
        <strong>Application ID:</strong> {applicationId}
      </div>

      {/* Body */}
      <div style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '15mm' }}>
        <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '10px' }}>
          Subject: Offer of Admission to {programName} ({academicYear})
        </p>
        <p>Dear {studentName},</p>
        <p>
          Congratulations! We are pleased to offer you provisional admission to the <strong>{programName}</strong> program at <strong>{universityName}</strong> for the academic session beginning {academicYear}.
        </p>
        <p>
          Your selection was based on your academic credentials and overall application. This offer is provisional and contingent upon the successful verification of all original documents and payment of the required fees.
        </p>
        <p>
          <strong>Conditions of Admission:</strong>
        </p>
        <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
          <li>Verification of original academic transcripts and certificates.</li>
          <li>Payment of the first semester/year tuition fee by the deadline.</li>
          <li>Adherence to the University&apos;s Code of Conduct.</li>
        </ul>
        <p>
          <strong>Fee Summary:</strong><br/>
          {feeSummary}
        </p>
        <p>
          Please note that this offer will automatically expire if you do not accept it and complete the necessary formalities by <strong>{new Date(lastAcceptanceDate).toLocaleDateString()}</strong>.
        </p>
      </div>

      {/* Footer / Signatures */}
      <div style={{ marginTop: '30mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '12px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', border: '1px dashed #ccc', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            [ QR ]
          </div>
          <p style={{ margin: 0 }}>Scan to Verify</p>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Authorized Signatory</p>
          <p style={{ margin: 0, fontSize: '12px' }}>Director of Admissions</p>
          <p style={{ margin: 0, fontSize: '12px' }}>{universityName}</p>
        </div>
      </div>
    </div>
  )
}
