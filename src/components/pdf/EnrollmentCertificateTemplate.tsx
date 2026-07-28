import React from 'react'

interface EnrollmentCertificateProps {
  universityName: string
  studentName: string
  programName: string
  enrollmentNumber: string
  academicSession: string
  department: string
  date: string
}

export const EnrollmentCertificateTemplate: React.FC<EnrollmentCertificateProps> = ({
  universityName,
  studentName,
  programName,
  enrollmentNumber,
  academicSession,
  department,
  date
}) => {
  return (
    <div 
      id="enrollment-certificate-template"
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
      <div style={{ border: '4px double #000', padding: '15mm', borderRadius: '4px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10mm', marginBottom: '15mm' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0', textTransform: 'uppercase', color: '#1a365d' }}>
            {universityName}
          </h1>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#4a5568' }}>
            {department}
          </h2>
          <p style={{ fontSize: '16px', margin: 0, fontWeight: 'bold', letterSpacing: '2px' }}>
            CERTIFICATE OF ENROLLMENT
          </p>
        </div>

        {/* Body */}
        <div style={{ flex: 1, fontSize: '18px', lineHeight: '2', textAlign: 'justify', marginBottom: '20mm' }}>
          <p>
            This is to certify that <strong>{studentName.toUpperCase()}</strong> has been officially admitted and enrolled as a full-time student in the <strong>{programName}</strong> program for the academic session <strong>{academicSession}</strong>.
          </p>
          <div style={{ margin: '20mm 0', padding: '10mm', border: '1px solid #ccc', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <table style={{ width: '100%', fontSize: '16px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '40%', padding: '8px', fontWeight: 'bold' }}>Enrollment Number:</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>{enrollmentNumber}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Student Name:</td>
                  <td style={{ padding: '8px' }}>{studentName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Program:</td>
                  <td style={{ padding: '8px' }}>{programName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Department:</td>
                  <td style={{ padding: '8px' }}>{department}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Academic Session:</td>
                  <td style={{ padding: '8px' }}>{academicSession}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The university acknowledges the successful completion of all admission formalities, including document verification and fee payment. The student is now subject to the academic regulations and code of conduct of the university.
          </p>
        </div>

        {/* Footer / Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
          <div style={{ fontSize: '14px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {new Date(date).toLocaleDateString()}</p>
            <div style={{ width: '80px', height: '80px', border: '1px solid #000', margin: '10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
              [ QR CODE ]
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Registrar / Authorized Signatory</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{universityName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
