import React from 'react'

interface AdmitCardProps {
  universityName: string
  studentName: string
  applicationId: string
  rollNumber: string
  programName: string
  examName: string
  examDate: string
  examTime: string
  reportingTime: string
  venue: string
  instructions: string
  photoUrl?: string
}

export const AdmitCardTemplate: React.FC<AdmitCardProps> = ({
  universityName,
  studentName,
  applicationId,
  rollNumber,
  programName,
  examName,
  examDate,
  examTime,
  reportingTime,
  venue,
  instructions,
  photoUrl
}) => {
  return (
    <div 
      id="admit-card-template"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        background: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      <div style={{ border: '2px solid #000', padding: '10mm', borderRadius: '8px', height: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '5mm', marginBottom: '8mm' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 5px 0', textTransform: 'uppercase' }}>
            {universityName}
          </h1>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
            {examName}
          </h2>
          <p style={{ fontSize: '14px', margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
            ADMIT CARD - PROVISIONAL
          </p>
        </div>

        {/* Top Details & Photo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10mm' }}>
          <table style={{ width: '70%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px', fontWeight: 'bold', width: '35%' }}>Roll Number:</td>
                <td style={{ padding: '6px' }}>{rollNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px', fontWeight: 'bold' }}>Application No:</td>
                <td style={{ padding: '6px' }}>{applicationId}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px', fontWeight: 'bold' }}>Candidate Name:</td>
                <td style={{ padding: '6px' }}>{studentName.toUpperCase()}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px', fontWeight: 'bold' }}>Program:</td>
                <td style={{ padding: '6px' }}>{programName}</td>
              </tr>
            </tbody>
          </table>

          {/* Photo Placeholder */}
          <div style={{ width: '35mm', height: '45mm', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>Affix Recent<br/>Passport Size<br/>Photograph</span>
            )}
          </div>
        </div>

        {/* Exam Schedule Table */}
        <div style={{ marginBottom: '10mm' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '5px', border: '1px solid #000', margin: '0 0 5px 0' }}>
            Examination Details
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #000' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold', width: '30%' }}>Date of Exam</td>
                <td style={{ padding: '8px', border: '1px solid #000', width: '70%' }}>{examDate}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>Reporting Time</td>
                <td style={{ padding: '8px', border: '1px solid #000' }}>{reportingTime}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>Exam Timing</td>
                <td style={{ padding: '8px', border: '1px solid #000' }}>{examTime}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>Test Center Venue</td>
                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>{venue}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm', marginBottom: '15mm', padding: '0 10mm' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', width: '45mm', marginBottom: '5px' }}></div>
            <p style={{ margin: 0, fontSize: '12px' }}>Candidate&apos;s Signature</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>(To be signed in front of invigilator)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', width: '45mm', marginBottom: '5px' }}></div>
            <p style={{ margin: 0, fontSize: '12px' }}>Invigilator&apos;s Signature</p>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: '11px', lineHeight: '1.4', borderTop: '1px dashed #000', paddingTop: '5mm' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>IMPORTANT INSTRUCTIONS FOR CANDIDATES</h4>
          <ol style={{ paddingLeft: '15px', margin: 0 }}>
            <li style={{ marginBottom: '3px' }}>The candidate must bring this Admit Card along with an original valid Photo ID proof to the test center.</li>
            <li style={{ marginBottom: '3px' }}>Candidates must report to the examination venue strictly at the Reporting Time. No candidate will be allowed entry after the commencement of the exam.</li>
            <li style={{ marginBottom: '3px' }}>Electronic devices, calculators, and study materials are strictly prohibited inside the examination hall.</li>
            <li style={{ marginBottom: '3px' }}>{instructions || 'Follow all instructions provided by the invigilator.'}</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
