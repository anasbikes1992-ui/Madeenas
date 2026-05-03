import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './utils'

export async function exportInventoryMatrixPDF(data: any[], products: any[], locations: any[]) {
  const doc = new jsPDF('landscape')
  
  const warehouses = locations.filter(l => l.type === 'WAREHOUSE')
  const shops = locations.filter(l => l.type === 'SHOP')
  const allLocs = [...warehouses, ...shops]

  // Header
  doc.setFontSize(20)
  doc.setTextColor(79, 70, 229) // Indigo-600
  doc.text('Madeena Tex Inventory Matrix', 14, 20)
  
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 28)

  const head = [
    ['Product / SKU', ...allLocs.map(l => l.name), 'Total']
  ]

  const body = products.map(p => {
    const row = [
      `${p.name}\n(${p.sku})`
    ]
    
    let total = 0
    allLocs.forEach(loc => {
      const stock = data.find(s => s.productId === p.id && s.locationId === loc.id)
      const qty = stock?.quantity ?? 0
      total += qty
      row.push(qty > 0 ? qty.toLocaleString() : '—')
    })
    
    row.push(`${total.toLocaleString()} ${p.unit}`)
    return row
  })

  autoTable(doc, {
    head: head,
    body: body,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 }
    }
  })

  doc.save(`inventory-matrix-${new Date().toISOString().split('T')[0]}.pdf`)
}

export async function exportStockOutRequestsPDF(requests: any[]) {
  const doc = new jsPDF('landscape')
  
  doc.setFontSize(20)
  doc.setTextColor(79, 70, 229)
  doc.text('Stock-Out Requests Report', 14, 20)
  
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 28)

  const head = [
    ['Product', 'From', 'To', 'Qty Req', 'Qty Appr', 'Requested By', 'Status', 'Date']
  ]

  const body = requests.map(r => [
    `${r.product.name}\n${r.product.sku}`,
    r.fromLocation.name,
    r.toLocation?.name || '—',
    r.quantityRequested,
    r.quantityApproved || '—',
    r.requestedByUser.name,
    r.status,
    formatDate(r.createdAt)
  ])

  autoTable(doc, {
    head: head,
    body: body,
    startY: 35,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 }
  })

  doc.save(`stock-out-requests-${new Date().toISOString().split('T')[0]}.pdf`)
}
