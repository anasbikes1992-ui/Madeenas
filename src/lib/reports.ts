import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './utils'

export interface SaleInvoiceItem {
  id?: string
  quantity: number
  unit?: string | null
  unitPrice: number
  subTotal?: number | null
  total?: number | null
  product: {
    name: string
    sku?: string | null
  }
}

export interface SaleInvoiceData {
  id: string
  receiptNo: string
  createdAt: string | Date
  customerName?: string | null
  customerPhone?: string | null
  paymentMode: string
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  totalAmount?: number | null
  note?: string | null
  location?: { name?: string | null } | null
  soldBy?: { name?: string | null } | null
  items: SaleInvoiceItem[]
}

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

type ExportSaleInvoiceOptions = {
  print?: boolean
}

export async function exportSaleInvoicePDF(sale: SaleInvoiceData, options?: ExportSaleInvoiceOptions) {
  const doc = new jsPDF()
  const issuedOn = formatDate(sale.createdAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 210, 34, 'F')

  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text('TAX INVOICE', 14, 16)
  doc.setFontSize(11)
  doc.text('Madeena Textile Management', 14, 24)
  doc.text('Colombo, Sri Lanka', 14, 30)

  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)
  doc.text(`Receipt No: ${sale.receiptNo}`, 140, 16)
  doc.text(`Issued: ${issuedOn}`, 140, 22)
  doc.text(`Payment: ${sale.paymentMode.replace(/_/g, ' ')}`, 140, 28)

  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('Bill To', 14, 46)
  doc.setTextColor(71, 85, 105)
  doc.text(sale.customerName || 'Walk-in customer', 14, 52)
  doc.text(sale.customerPhone || 'No phone recorded', 14, 58)
  doc.text(`Location: ${sale.location?.name || 'Store counter'}`, 14, 64)
  doc.text(`Handled by: ${sale.soldBy?.name || 'Sales desk'}`, 14, 70)

  autoTable(doc, {
    startY: 80,
    head: [['Product', 'SKU', 'Qty', 'Unit Price', 'Line Total']],
    body: sale.items.map((item) => [
      item.product.name,
      item.product.sku || '—',
      `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`,
      item.unitPrice.toFixed(2),
      (item.subTotal ?? item.total ?? item.quantity * item.unitPrice).toFixed(2),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120
  const summaryY = finalY + 12

  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('Subtotal', 138, summaryY)
  doc.text('VAT', 138, summaryY + 7)
  doc.text('Grand Total', 138, summaryY + 14)

  doc.setTextColor(15, 23, 42)
  doc.text(sale.subTotal.toFixed(2), 192, summaryY, { align: 'right' })
  doc.text(`${sale.taxAmount.toFixed(2)} (${sale.taxRate}%)`, 192, summaryY + 7, { align: 'right' })
  doc.setFontSize(12)
  doc.text(sale.grandTotal.toFixed(2), 192, summaryY + 14, { align: 'right' })

  if (sale.note) {
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text('Notes', 14, summaryY + 8)
    doc.text(doc.splitTextToSize(sale.note, 110), 14, summaryY + 14)
  }

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('All amounts are shown in Sri Lankan Rupees (LKR).', 14, 284)
  doc.text('Thank you for trading with Madeena Textile Management.', 14, 289)

  if (options?.print) {
    doc.autoPrint()
    const pdfBlobUrl = doc.output('bloburl')
    window.open(pdfBlobUrl, '_blank', 'noopener,noreferrer')
    return
  }

  doc.save(`invoice-${sale.receiptNo}.pdf`)
}
