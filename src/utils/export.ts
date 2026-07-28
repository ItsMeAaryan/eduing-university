export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return

  const headers = Object.keys(data[0])
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header]
        // Handle objects or arrays safely
        if (typeof cell === 'object' && cell !== null) {
          if (cell.seconds) { // Firestore timestamp
            cell = new Date(cell.seconds * 1000).toISOString()
          } else {
            cell = JSON.stringify(cell)
          }
        }
        // Escape quotes and commas
        const strCell = String(cell ?? '').replace(/"/g, '""')
        return `"${strCell}"`
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
