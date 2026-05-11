import { formatCurrency, formatTaxRate } from '@/lib/tax'

interface VATBreakdownProps {
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  className?: string
  showTitle?: boolean
}

export function VATBreakdown({
  subTotal,
  taxRate,
  taxAmount,
  grandTotal,
  className = '',
  showTitle = true,
}: VATBreakdownProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {showTitle && (
        <h3 className="text-sm font-semibold text-slate-700">Order Summary</h3>
      )}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subTotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>VAT ({formatTaxRate(taxRate)})</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-slate-900 pt-2 border-t border-slate-200">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}

interface VATBreakdownTableProps {
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  className?: string
}

export function VATBreakdownTable({
  subTotal,
  taxRate,
  taxAmount,
  grandTotal,
  className = '',
}: VATBreakdownTableProps) {
  return (
    <table className={`w-full text-sm ${className}`}>
      <tbody className="divide-y divide-slate-200">
        <tr>
          <td className="py-2 text-slate-600">Subtotal (before tax)</td>
          <td className="py-2 text-right font-medium">{formatCurrency(subTotal)}</td>
        </tr>
        <tr>
          <td className="py-2 text-slate-600">VAT ({formatTaxRate(taxRate)})</td>
          <td className="py-2 text-right font-medium">{formatCurrency(taxAmount)}</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="py-2 font-semibold text-slate-900">Grand Total</td>
          <td className="py-2 text-right font-bold text-lg text-slate-900">
            {formatCurrency(grandTotal)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
