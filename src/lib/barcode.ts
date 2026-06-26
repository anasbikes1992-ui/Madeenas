import jsPDF from 'jspdf'
import JsBarcode from 'jsbarcode'

export interface LabelData {
  name: string
  sku: string
  colorName?: string
  category?: string
  unit?: string
}

export async function generateProductLabelPDF(product: LabelData) {
  // Label size: 50mm x 25mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [50, 25]
  })

  // Create a temporary canvas for the barcode
  const canvas = document.createElement('canvas')
  
  try {
    JsBarcode(canvas, product.sku, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0
    })

    const barcodeData = canvas.toDataURL('image/png')

    // Header - Product Name
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(product.name.slice(0, 25), 2, 5)

    // Subheader - Color
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(`${product.colorName || ''}`.slice(0, 35), 2, 8)

    // Barcode Image
    doc.addImage(barcodeData, 'PNG', 2, 10, 46, 10)

    // SKU Text below barcode
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(product.sku, 25, 23, { align: 'center' })

    // Category / Unit
    doc.setFontSize(5)
    doc.setFont('helvetica', 'italic')
    doc.text(product.category || '', 2, 23)
    doc.text(product.unit || '', 48, 23, { align: 'right' })

    // Save/Download
    doc.save(`label-${product.sku}.pdf`)
  } catch (error) {
    console.error('Error generating barcode label:', error)
    throw error
  }
}

export async function generateBatchLabelsPDF(products: LabelData[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [50, 25]
  })

  const canvas = document.createElement('canvas')

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    if (i > 0) doc.addPage([50, 25], 'landscape')

    try {
      JsBarcode(canvas, p.sku, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false,
        margin: 0
      })

      const barcodeData = canvas.toDataURL('image/png')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(p.name.slice(0, 25), 2, 5)

      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(`${p.colorName || ''}`.slice(0, 35), 2, 8)

      doc.addImage(barcodeData, 'PNG', 2, 10, 46, 10)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(p.sku, 25, 23, { align: 'center' })

      doc.setFontSize(5)
      doc.setFont('helvetica', 'italic')
      doc.text(p.category || '', 2, 23)
      doc.text(p.unit || '', 48, 23, { align: 'right' })
    } catch (e) {
      console.error(`Error on product ${p.sku}:`, e)
    }
  }

  doc.save(`batch-labels-${new Date().getTime()}.pdf`)
}
