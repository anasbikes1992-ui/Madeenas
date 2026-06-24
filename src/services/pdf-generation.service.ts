import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  website?: string
  taxId?: string
  logo?: string // Base64 or URL
}

interface InvoiceItem {
  name: string
  description?: string
  quantity: number
  unitPrice: number
  taxRate?: number
  discount?: number
  total: number
}

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: Date
  dueDate?: Date
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  discountAmount?: number
  shippingCost?: number
  total: number
  paymentMethod?: string
  notes?: string
  terms?: string
}

interface ReceiptData {
  receiptNumber: string
  date: Date
  cashierName: string
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  discountAmount?: number
  total: number
  amountPaid: number
  change: number
  paymentMethod: string
}

interface StockReportData {
  title: string
  generatedDate: Date
  locationName: string
  products: Array<{
    sku: string
    name: string
    category: string
    quantity: number
    unitPrice: number
    totalValue: number
    reorderLevel: number
    status: 'in-stock' | 'low-stock' | 'out-of-stock'
  }>
  totalProducts: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

export class PDFGenerationService {
  private companyInfo: CompanyInfo

  constructor() {
    this.companyInfo = {
      name: process.env.COMPANY_NAME || 'Nexus Inventorytiles',
      address: process.env.COMPANY_ADDRESS || '123 Main Street, Colombo, Sri Lanka',
      phone: process.env.COMPANY_PHONE || '+94 11 234 5678',
      email: process.env.COMPANY_EMAIL || 'info@Nexus.lk',
      website: process.env.COMPANY_WEBSITE || 'www.Nexus.lk',
      taxId: process.env.COMPANY_TAX_ID || 'VAT123456789',
    }
  }

  /**
   * Generate professional invoice PDF
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    const doc = new jsPDF()

    // Company header
    this.addHeader(doc, 'INVOICE')

    // Invoice details
    doc.setFontSize(10)
    doc.text(`Invoice #: ${data.invoiceNumber}`, 14, 60)
    doc.text(`Date: ${this.formatDate(data.invoiceDate)}`, 14, 66)
    if (data.dueDate) {
      doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, 14, 72)
    }

    // Bill to section
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 85)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(data.customerName, 14, 91)
    if (data.customerAddress) {
      doc.text(data.customerAddress, 14, 97)
    }
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, 14, 103)
    }
    if (data.customerEmail) {
      doc.text(`Email: ${data.customerEmail}`, 14, 109)
    }

    // Items table
    const tableStartY = data.customerEmail ? 120 : 110

    autoTable(doc, {
      startY: tableStartY,
      head: [['Item', 'Qty', 'Unit Price', 'Tax', 'Discount', 'Total']],
      body: data.items.map((item) => [
        `${item.name}${item.description ? `\n${item.description}` : ''}`,
        item.quantity.toString(),
        `LKR ${item.unitPrice.toFixed(2)}`,
        item.taxRate ? `${(item.taxRate * 100).toFixed(0)}%` : '-',
        item.discount ? `LKR ${item.discount.toFixed(2)}` : '-',
        `LKR ${item.total.toFixed(2)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
    })

    // Totals section
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const totalsX = 140

    doc.setFontSize(10)
    doc.text('Subtotal:', totalsX, finalY)
    doc.text(`LKR ${data.subtotal.toFixed(2)}`, 180, finalY, { align: 'right' })

    if (data.discountAmount && data.discountAmount > 0) {
      doc.text('Discount:', totalsX, finalY + 6)
      doc.text(`- LKR ${data.discountAmount.toFixed(2)}`, 180, finalY + 6, { align: 'right' })
    }

    if (data.shippingCost && data.shippingCost > 0) {
      doc.text('Shipping:', totalsX, finalY + 12)
      doc.text(`LKR ${data.shippingCost.toFixed(2)}`, 180, finalY + 12, { align: 'right' })
    }

    doc.text('Tax:', totalsX, finalY + 18)
    doc.text(`LKR ${data.taxAmount.toFixed(2)}`, 180, finalY + 18, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', totalsX, finalY + 26)
    doc.text(`LKR ${data.total.toFixed(2)}`, 180, finalY + 26, { align: 'right' })

    // Payment method
    if (data.paymentMethod) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Payment Method: ${data.paymentMethod}`, 14, finalY + 26)
    }

    // Notes and terms
    if (data.notes) {
      doc.setFont('helvetica', 'bold')
      doc.text('Notes:', 14, finalY + 40)
      doc.setFont('helvetica', 'normal')
      doc.text(data.notes, 14, finalY + 46, { maxWidth: 180 })
    }

    if (data.terms) {
      const termsY = data.notes ? finalY + 60 : finalY + 40
      doc.setFont('helvetica', 'bold')
      doc.text('Terms & Conditions:', 14, termsY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(data.terms, 14, termsY + 6, { maxWidth: 180 })
    }

    // QR code for payment
    const qrCodeData = `INV:${data.invoiceNumber}|AMT:${data.total}|DUE:${data.dueDate ? this.formatDate(data.dueDate) : 'N/A'}`
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, { width: 200 })
    doc.addImage(qrCodeDataUrl, 'PNG', 160, finalY + 35, 40, 40)

    // Footer
    this.addFooter(doc)

    return Buffer.from(doc.output('arraybuffer'))
  }

  /**
   * Generate POS receipt
   */
  async generateReceipt(data: ReceiptData): Promise<Buffer> {
    // Thermal printer size: 80mm width
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // Width x Height (auto-extend)
    })

    let yPos = 10

    // Company name
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(this.companyInfo.name, 40, yPos, { align: 'center' })
    yPos += 6

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(this.companyInfo.address, 40, yPos, { align: 'center', maxWidth: 70 })
    yPos += 8
    doc.text(`Tel: ${this.companyInfo.phone}`, 40, yPos, { align: 'center' })
    yPos += 5
    doc.text(`Email: ${this.companyInfo.email}`, 40, yPos, { align: 'center' })
    yPos += 8

    // Receipt details
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RECEIPT', 40, yPos, { align: 'center' })
    yPos += 8

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Receipt #: ${data.receiptNumber}`, 5, yPos)
    yPos += 4
    doc.text(`Date: ${this.formatDate(data.date)}`, 5, yPos)
    yPos += 4
    doc.text(`Cashier: ${data.cashierName}`, 5, yPos)
    yPos += 8

    // Divider
    doc.line(5, yPos, 75, yPos)
    yPos += 4

    // Items
    data.items.forEach((item) => {
      doc.text(item.name, 5, yPos)
      yPos += 4
      doc.text(`  ${item.quantity} x LKR ${item.unitPrice.toFixed(2)}`, 5, yPos)
      doc.text(`LKR ${item.total.toFixed(2)}`, 75, yPos, { align: 'right' })
      yPos += 5
    })

    // Divider
    doc.line(5, yPos, 75, yPos)
    yPos += 4

    // Totals
    doc.text('Subtotal:', 5, yPos)
    doc.text(`LKR ${data.subtotal.toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 4

    if (data.discountAmount && data.discountAmount > 0) {
      doc.text('Discount:', 5, yPos)
      doc.text(`- LKR ${data.discountAmount.toFixed(2)}`, 75, yPos, { align: 'right' })
      yPos += 4
    }

    doc.text('Tax:', 5, yPos)
    doc.text(`LKR ${data.taxAmount.toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL:', 5, yPos)
    doc.text(`LKR ${data.total.toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Payment: ${data.paymentMethod}`, 5, yPos)
    yPos += 4
    doc.text('Amount Paid:', 5, yPos)
    doc.text(`LKR ${data.amountPaid.toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 4
    doc.text('Change:', 5, yPos)
    doc.text(`LKR ${data.change.toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 8

    // Barcode
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, data.receiptNumber, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: false,
    })
    const barcodeDataUrl = canvas.toDataURL('image/png')
    doc.addImage(barcodeDataUrl, 'PNG', 10, yPos, 60, 15)
    yPos += 18

    // Thank you message
    doc.setFontSize(10)
    doc.text('Thank you for shopping!', 40, yPos, { align: 'center' })
    yPos += 5
    doc.setFontSize(8)
    doc.text('Visit us again soon!', 40, yPos, { align: 'center' })

    return Buffer.from(doc.output('arraybuffer'))
  }

  /**
   * Generate stock report PDF
   */
  async generateStockReport(data: StockReportData): Promise<Buffer> {
    const doc = new jsPDF()

    // Header
    this.addHeader(doc, data.title)

    // Report details
    doc.setFontSize(10)
    doc.text(`Generated: ${this.formatDate(data.generatedDate)}`, 14, 60)
    doc.text(`Location: ${data.locationName}`, 14, 66)
    doc.text(`Total Products: ${data.totalProducts}`, 14, 72)
    doc.text(`Low Stock Items: ${data.lowStockCount}`, 14, 78)
    doc.text(`Out of Stock Items: ${data.outOfStockCount}`, 14, 84)

    // Stock table
    autoTable(doc, {
      startY: 95,
      head: [['SKU', 'Product', 'Category', 'Qty', 'Unit Price', 'Value', 'Status']],
      body: data.products.map((product) => [
        product.sku,
        product.name,
        product.category,
        product.quantity.toString(),
        `LKR ${product.unitPrice.toFixed(2)}`,
        `LKR ${product.totalValue.toFixed(2)}`,
        product.status.replace('-', ' ').toUpperCase(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] },
      styles: { fontSize: 8 },
      columnStyles: {
        6: {
          cellWidth: 25,
          halign: 'center',
          fontStyle: 'bold',
        },
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.row.section === 'body') {
          const status = data.cell.text[0].toLowerCase()
          if (status.includes('out')) {
            data.cell.styles.textColor = [231, 76, 60] // Red
          } else if (status.includes('low')) {
            data.cell.styles.textColor = [230, 126, 34] // Orange
          } else {
            data.cell.styles.textColor = [39, 174, 96] // Green
          }
        }
      },
    })

    // Total value
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total Inventory Value:', 14, finalY)
    doc.text(`LKR ${data.totalValue.toFixed(2)}`, 200, finalY, { align: 'right' })

    // Footer
    this.addFooter(doc)

    return Buffer.from(doc.output('arraybuffer'))
  }

  /**
   * Add company header to PDF
   */
  private addHeader(doc: jsPDF, title: string) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(this.companyInfo.name, 14, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(this.companyInfo.address, 14, 28)
    doc.text(`Phone: ${this.companyInfo.phone}`, 14, 34)
    doc.text(`Email: ${this.companyInfo.email}`, 14, 40)
    if (this.companyInfo.website) {
      doc.text(`Website: ${this.companyInfo.website}`, 14, 46)
    }
    if (this.companyInfo.taxId) {
      doc.text(`Tax ID: ${this.companyInfo.taxId}`, 14, 52)
    }

    // Title on right side
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 200, 20, { align: 'right' })

    // Divider line
    doc.setDrawColor(41, 128, 185)
    doc.setLineWidth(0.5)
    doc.line(14, 55, 196, 55)
  }

  /**
   * Add footer to PDF
   */
  private addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages()
    const pageHeight = doc.internal.pageSize.height

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        pageHeight - 10,
        { align: 'center' }
      )
      doc.text(
        `Generated by ${this.companyInfo.name} | ${this.companyInfo.website || ''}`,
        doc.internal.pageSize.width / 2,
        pageHeight - 5,
        { align: 'center' }
      )
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date)
  }
}

// Export singleton instance
export const pdfGenerationService = new PDFGenerationService()
