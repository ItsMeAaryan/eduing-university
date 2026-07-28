import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generatePdfFromElement = async (elementId: string): Promise<Blob> => {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`)
  }

  // Temporarily make the element visible if it's hidden
  const originalDisplay = element.style.display
  const originalPosition = element.style.position
  const originalZIndex = element.style.zIndex
  
  // We need to render it offscreen to not disturb the user, but it must be "visible" to html2canvas
  element.style.display = 'block'
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.top = '-9999px'
  element.style.zIndex = '-1'

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/jpeg', 1.0)
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    
    return pdf.output('blob')
  } finally {
    // Restore original styles
    element.style.display = originalDisplay
    element.style.position = originalPosition
    element.style.zIndex = originalZIndex
  }
}
